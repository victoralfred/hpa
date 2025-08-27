--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: key_algorithm; Type: TYPE; Schema: public; Owner: hpa_admin
--

CREATE TYPE public.key_algorithm AS ENUM (
    'RS256',
    'RS384',
    'RS512',
    'ES256',
    'ES384',
    'ES512',
    'HS256',
    'HS384',
    'HS512'
);


ALTER TYPE public.key_algorithm OWNER TO hpa_admin;

--
-- Name: key_status; Type: TYPE; Schema: public; Owner: hpa_admin
--

CREATE TYPE public.key_status AS ENUM (
    'active',
    'inactive',
    'expired',
    'revoked',
    'pending'
);


ALTER TYPE public.key_status OWNER TO hpa_admin;

--
-- Name: audit_security_config_changes(); Type: FUNCTION; Schema: public; Owner: hpa_admin
--

CREATE FUNCTION public.audit_security_config_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    changed_fields TEXT[];
    user_id UUID;
BEGIN
    -- Get the user_id from updated_by column
    IF TG_OP = 'UPDATE' THEN
        user_id := NEW.updated_by;
        
        -- Determine changed fields
        changed_fields := ARRAY[]::TEXT[];
        
        IF OLD.require_mfa IS DISTINCT FROM NEW.require_mfa THEN
            changed_fields := array_append(changed_fields, 'require_mfa');
        END IF;
        IF OLD.mfa_grace_period_days IS DISTINCT FROM NEW.mfa_grace_period_days THEN
            changed_fields := array_append(changed_fields, 'mfa_grace_period_days');
        END IF;
        IF OLD.allowed_mfa_methods IS DISTINCT FROM NEW.allowed_mfa_methods THEN
            changed_fields := array_append(changed_fields, 'allowed_mfa_methods');
        END IF;
        IF OLD.password_policy IS DISTINCT FROM NEW.password_policy THEN
            changed_fields := array_append(changed_fields, 'password_policy');
        END IF;
        IF OLD.session_timeout_minutes IS DISTINCT FROM NEW.session_timeout_minutes THEN
            changed_fields := array_append(changed_fields, 'session_timeout_minutes');
        END IF;
        IF OLD.max_concurrent_sessions IS DISTINCT FROM NEW.max_concurrent_sessions THEN
            changed_fields := array_append(changed_fields, 'max_concurrent_sessions');
        END IF;
        IF OLD.allowed_oauth_providers IS DISTINCT FROM NEW.allowed_oauth_providers THEN
            changed_fields := array_append(changed_fields, 'allowed_oauth_providers');
        END IF;
        IF OLD.ip_whitelist IS DISTINCT FROM NEW.ip_whitelist THEN
            changed_fields := array_append(changed_fields, 'ip_whitelist');
        END IF;
        
        -- Insert audit record
        INSERT INTO security_config_audit (
            tenant_id, changed_by, change_type, 
            before_config, after_config, changed_fields,
            created_at
        ) VALUES (
            NEW.tenant_id, user_id, 'update',
            row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB, changed_fields,
            NOW()
        );
    ELSIF TG_OP = 'INSERT' THEN
        user_id := NEW.created_by;
        
        INSERT INTO security_config_audit (
            tenant_id, changed_by, change_type, 
            after_config, created_at
        ) VALUES (
            NEW.tenant_id, user_id, 'create',
            row_to_json(NEW)::JSONB, NOW()
        );
    ELSIF TG_OP = 'DELETE' THEN
        -- For delete operations, we'd need to pass user_id differently
        INSERT INTO security_config_audit (
            tenant_id, changed_by, change_type, 
            before_config, created_at
        ) VALUES (
            OLD.tenant_id, OLD.updated_by, 'delete',
            row_to_json(OLD)::JSONB, NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.audit_security_config_changes() OWNER TO hpa_admin;

--
-- Name: enforce_single_tenant_membership(); Type: FUNCTION; Schema: public; Owner: hpa_admin
--

CREATE FUNCTION public.enforce_single_tenant_membership() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if user already has a membership in another tenant
    IF EXISTS (
        SELECT 1 FROM memberships 
        WHERE user_id = NEW.user_id 
        AND tenant_id != NEW.tenant_id
    ) THEN
        RAISE EXCEPTION 'User % already belongs to another tenant', NEW.user_id;
    END IF;
    
    -- Update user's primary tenant
    UPDATE users 
    SET primary_tenant_id = NEW.tenant_id 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.enforce_single_tenant_membership() OWNER TO hpa_admin;

--
-- Name: handle_membership_deletion(); Type: FUNCTION; Schema: public; Owner: hpa_admin
--

CREATE FUNCTION public.handle_membership_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Clear user's primary tenant when membership is deleted
    UPDATE users 
    SET primary_tenant_id = NULL 
    WHERE id = OLD.user_id;
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION public.handle_membership_deletion() OWNER TO hpa_admin;

--
-- Name: promote_to_system_admin(text); Type: FUNCTION; Schema: public; Owner: hpa_admin
--

CREATE FUNCTION public.promote_to_system_admin(user_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM users WHERE email = user_email;

    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;

    UPDATE users SET is_system_admin = TRUE WHERE id = user_uuid;

    INSERT INTO memberships (
        user_id, tenant_id, role, is_primary, joined_at, updated_at
    ) VALUES (
        user_uuid, 'tenant_system_master', 'OWNER', TRUE, NOW(), NOW()
    ) ON CONFLICT (user_id, tenant_id) 
    DO UPDATE SET 
        role = 'OWNER',
        updated_at = NOW();

    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.promote_to_system_admin(user_email text) OWNER TO hpa_admin;

--
-- Name: revoke_system_admin(text); Type: FUNCTION; Schema: public; Owner: hpa_admin
--

CREATE FUNCTION public.revoke_system_admin(user_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM users WHERE email = user_email;

    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;

    UPDATE users SET is_system_admin = FALSE WHERE id = user_uuid;

    DELETE FROM memberships 
    WHERE user_id = user_uuid AND tenant_id = 'tenant_system_master';

    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.revoke_system_admin(user_email text) OWNER TO hpa_admin;

--
-- Name: update_mfa_updated_at(); Type: FUNCTION; Schema: public; Owner: hpa_admin
--

CREATE FUNCTION public.update_mfa_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_mfa_updated_at() OWNER TO hpa_admin;

--
-- Name: validate_ip_whitelist(inet[]); Type: FUNCTION; Schema: public; Owner: hpa_admin
--

CREATE FUNCTION public.validate_ip_whitelist(ip_list inet[]) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.validate_ip_whitelist(ip_list inet[]) OWNER TO hpa_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text,
    user_id uuid,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_system_action boolean DEFAULT false,
    event_type character varying(50) NOT NULL,
    session_id character varying(255),
    resource text,
    old_value text,
    new_value text,
    success boolean DEFAULT true,
    error_code character varying(50),
    error_msg text,
    metadata jsonb
);


ALTER TABLE public.audit_logs OWNER TO hpa_admin;

--
-- Name: device_fingerprints; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.device_fingerprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    fingerprint_hash character varying(255) NOT NULL,
    browser_info jsonb,
    screen_info jsonb,
    canvas_hash character varying(255),
    webgl_hash character varying(255),
    audio_hash character varying(255),
    fonts_hash character varying(255),
    first_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    trust_score numeric(3,2) DEFAULT 1.0,
    is_trusted boolean DEFAULT false
);


ALTER TABLE public.device_fingerprints OWNER TO hpa_admin;

--
-- Name: domains; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    domain text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verification_code text,
    verified_at timestamp with time zone,
    is_primary boolean DEFAULT false NOT NULL,
    is_auto_join boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.domains OWNER TO hpa_admin;

--
-- Name: goose_db_version; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.goose_db_version (
    id integer NOT NULL,
    version_id bigint NOT NULL,
    is_applied boolean NOT NULL,
    tstamp timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.goose_db_version OWNER TO hpa_admin;

--
-- Name: goose_db_version_id_seq; Type: SEQUENCE; Schema: public; Owner: hpa_admin
--

ALTER TABLE public.goose_db_version ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.goose_db_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invites; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    invited_by uuid NOT NULL,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    accepted_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    token text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invites OWNER TO hpa_admin;

--
-- Name: jwt_blacklist; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.jwt_blacklist (
    jti character varying(255) NOT NULL,
    token_hash character varying(255) NOT NULL,
    session_id character varying(255),
    blacklisted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expiry timestamp with time zone NOT NULL,
    reason character varying(100)
);


ALTER TABLE public.jwt_blacklist OWNER TO hpa_admin;

--
-- Name: key_rotation_history; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.key_rotation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    old_key_id uuid NOT NULL,
    new_key_id uuid NOT NULL,
    rotated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    rotated_by uuid,
    reason text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.key_rotation_history OWNER TO hpa_admin;

--
-- Name: key_usage_audit; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.key_usage_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_id uuid NOT NULL,
    operation character varying(50) NOT NULL,
    tenant_id text,
    user_id uuid,
    ip_address inet,
    user_agent text,
    success boolean NOT NULL,
    error_message text,
    token_id character varying(255),
    token_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.key_usage_audit OWNER TO hpa_admin;

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_owner boolean DEFAULT false NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone,
    accepted_at timestamp with time zone,
    expires_at timestamp with time zone,
    last_access_at timestamp with time zone,
    permissions jsonb,
    metadata jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text NOT NULL
);


ALTER TABLE public.memberships OWNER TO hpa_admin;

--
-- Name: mfa_verification_attempts; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.mfa_verification_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    method_type character varying(50) NOT NULL,
    attempt_type character varying(50) NOT NULL,
    ip_address inet,
    user_agent text,
    success boolean NOT NULL,
    failure_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mfa_verification_attempts OWNER TO hpa_admin;

--
-- Name: oauth_connections; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.oauth_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    provider_user_id text NOT NULL,
    provider_email text,
    provider_metadata jsonb,
    access_token text,
    refresh_token text,
    token_expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_used_at timestamp with time zone
);


ALTER TABLE public.oauth_connections OWNER TO hpa_admin;

--
-- Name: refresh_token_usage; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.refresh_token_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(255),
    token_hash character varying(255) NOT NULL,
    used_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    new_token_hash character varying(255),
    ip_address inet,
    user_agent text,
    device_fingerprint character varying(255),
    success boolean DEFAULT true,
    failure_reason text
);


ALTER TABLE public.refresh_token_usage OWNER TO hpa_admin;

--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.revoked_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    jti text NOT NULL,
    user_id uuid,
    revoked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    reason text
);


ALTER TABLE public.revoked_tokens OWNER TO hpa_admin;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    description text,
    permissions jsonb NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid
);


ALTER TABLE public.roles OWNER TO hpa_admin;

--
-- Name: security_config_audit; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.security_config_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    changed_by uuid NOT NULL,
    change_type character varying(50) NOT NULL,
    before_config jsonb,
    after_config jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT security_config_audit_change_type_check CHECK (((change_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying])::text[])))
);


ALTER TABLE public.security_config_audit OWNER TO hpa_admin;

--
-- Name: session_anomalies; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.session_anomalies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(255),
    user_id uuid,
    anomaly_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    details jsonb,
    detected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    action_taken character varying(100)
);


ALTER TABLE public.session_anomalies OWNER TO hpa_admin;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    tenant_id character varying(255) NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    ip_address inet,
    user_agent text,
    last_activity timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    refresh_token_hash character varying(255),
    refresh_token_version integer DEFAULT 1,
    refresh_token_used_at timestamp with time zone,
    previous_refresh_token_hash character varying(255),
    token_binding_key bytea,
    device_fingerprint character varying(255),
    last_fingerprint_update timestamp with time zone
);


ALTER TABLE public.sessions OWNER TO hpa_admin;

--
-- Name: signing_keys; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.signing_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kid character varying(255) NOT NULL,
    private_key text NOT NULL,
    public_key text NOT NULL,
    is_primary boolean DEFAULT false,
    rotated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    algorithm public.key_algorithm DEFAULT 'RS256'::public.key_algorithm NOT NULL,
    secret text,
    status public.key_status DEFAULT 'active'::public.key_status NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    rotated_from uuid,
    rotation_reason text,
    not_before timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    not_after timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '90 days'::interval) NOT NULL,
    last_used_at timestamp with time zone,
    use_count bigint DEFAULT 0 NOT NULL,
    created_by uuid,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    revocation_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT only_one_primary CHECK (((is_primary = false) OR ((is_primary = true) AND (status = 'active'::public.key_status)))),
    CONSTRAINT valid_dates CHECK ((not_before < not_after)),
    CONSTRAINT valid_key_type CHECK ((((algorithm = ANY (ARRAY['RS256'::public.key_algorithm, 'RS384'::public.key_algorithm, 'RS512'::public.key_algorithm, 'ES256'::public.key_algorithm, 'ES384'::public.key_algorithm, 'ES512'::public.key_algorithm])) AND (private_key IS NOT NULL) AND (secret IS NULL)) OR ((algorithm = ANY (ARRAY['HS256'::public.key_algorithm, 'HS384'::public.key_algorithm, 'HS512'::public.key_algorithm])) AND (private_key IS NULL) AND (secret IS NOT NULL)))),
    CONSTRAINT valid_revocation CHECK ((((revoked_at IS NULL) AND (revoked_by IS NULL) AND (revocation_reason IS NULL)) OR ((revoked_at IS NOT NULL) AND (revocation_reason IS NOT NULL)))),
    CONSTRAINT valid_rotation CHECK ((((rotated_from IS NULL) AND (rotated_at IS NULL) AND (rotation_reason IS NULL)) OR ((rotated_from IS NOT NULL) AND (rotated_at IS NOT NULL))))
);


ALTER TABLE public.signing_keys OWNER TO hpa_admin;

--
-- Name: tenant_security_configs; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.tenant_security_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    require_mfa boolean DEFAULT false,
    mfa_grace_period_days integer DEFAULT 7,
    allowed_mfa_methods text[] DEFAULT ARRAY['totp'::text, 'backup_code'::text],
    password_policy jsonb DEFAULT '{"min_length": 12, "max_age_days": 90, "history_count": 5, "require_numbers": true, "require_special": true, "require_lowercase": true, "require_uppercase": true}'::jsonb,
    session_timeout_minutes integer DEFAULT 1440,
    max_concurrent_sessions integer DEFAULT 5,
    allowed_oauth_providers text[] DEFAULT ARRAY[]::text[],
    ip_whitelist inet[] DEFAULT ARRAY[]::inet[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT check_allowed_mfa_methods CHECK ((allowed_mfa_methods <@ ARRAY['totp'::text, 'backup_code'::text, 'sms'::text, 'email'::text])),
    CONSTRAINT check_allowed_oauth_providers CHECK ((allowed_oauth_providers <@ ARRAY['google'::text, 'github'::text, 'microsoft'::text, 'okta'::text, 'auth0'::text])),
    CONSTRAINT check_max_sessions CHECK (((max_concurrent_sessions >= 1) AND (max_concurrent_sessions <= 50))),
    CONSTRAINT check_mfa_grace_period CHECK (((mfa_grace_period_days >= 0) AND (mfa_grace_period_days <= 90))),
    CONSTRAINT check_password_policy_structure CHECK (((password_policy ? 'min_length'::text) AND (password_policy ? 'require_uppercase'::text) AND (password_policy ? 'require_lowercase'::text) AND (password_policy ? 'require_numbers'::text) AND (password_policy ? 'require_special'::text) AND (password_policy ? 'max_age_days'::text) AND (password_policy ? 'history_count'::text) AND (((password_policy ->> 'min_length'::text))::integer >= 8) AND (((password_policy ->> 'min_length'::text))::integer <= 128) AND (((password_policy ->> 'max_age_days'::text))::integer >= 0) AND (((password_policy ->> 'max_age_days'::text))::integer <= 365) AND (((password_policy ->> 'history_count'::text))::integer >= 0) AND (((password_policy ->> 'history_count'::text))::integer <= 24))),
    CONSTRAINT check_session_timeout CHECK (((session_timeout_minutes >= 5) AND (session_timeout_minutes <= 43200)))
);


ALTER TABLE public.tenant_security_configs OWNER TO hpa_admin;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    region text DEFAULT 'eu-west'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    display_name text,
    description text,
    logo_url text,
    website text,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    plan text DEFAULT 'free'::text,
    is_system boolean DEFAULT false
);


ALTER TABLE public.tenants OWNER TO hpa_admin;

--
-- Name: user_mfa_configs; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.user_mfa_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mfa_enabled boolean DEFAULT false,
    totp_secret text,
    totp_verified boolean DEFAULT false,
    backup_codes text[],
    backup_codes_generated_at timestamp with time zone,
    recovery_email text,
    recovery_phone text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_mfa_configs OWNER TO hpa_admin;

--
-- Name: user_mfa_methods; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.user_mfa_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    method_type character varying(50) NOT NULL,
    is_primary boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    configuration jsonb,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_mfa_methods OWNER TO hpa_admin;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    tenant_id text NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_roles OWNER TO hpa_admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: hpa_admin
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text,
    email text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    first_name text,
    last_name text,
    display_name text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    is_email_verified boolean DEFAULT false NOT NULL,
    is_phone_verified boolean DEFAULT false NOT NULL,
    email_verified_at timestamp with time zone,
    phone_verified_at timestamp with time zone,
    last_login_at timestamp with time zone,
    login_count integer DEFAULT 0 NOT NULL,
    failed_login_count integer DEFAULT 0 NOT NULL,
    failed_login_last_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    metadata text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name text NOT NULL,
    is_system_admin boolean DEFAULT false,
    primary_tenant_id text,
    password_reset_token character varying(255),
    password_reset_expiry timestamp with time zone,
    password_reset_used boolean DEFAULT false,
    CONSTRAINT check_password_reset_token_expiry CHECK ((((password_reset_token IS NULL) AND (password_reset_expiry IS NULL)) OR ((password_reset_token IS NOT NULL) AND (password_reset_expiry IS NOT NULL))))
);


ALTER TABLE public.users OWNER TO hpa_admin;

--
-- Name: COLUMN users.password_reset_token; Type: COMMENT; Schema: public; Owner: hpa_admin
--

COMMENT ON COLUMN public.users.password_reset_token IS 'Secure token for password reset, separate from email verification';


--
-- Name: COLUMN users.password_reset_expiry; Type: COMMENT; Schema: public; Owner: hpa_admin
--

COMMENT ON COLUMN public.users.password_reset_expiry IS 'Expiry time for password reset token (shorter than email verification)';


--
-- Name: COLUMN users.password_reset_used; Type: COMMENT; Schema: public; Owner: hpa_admin
--

COMMENT ON COLUMN public.users.password_reset_used IS 'Flag to ensure one-time use of reset tokens';


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.audit_logs (id, tenant_id, user_id, ip_address, user_agent, created_at, is_system_action, event_type, session_id, resource, old_value, new_value, success, error_code, error_msg, metadata) FROM stdin;
\.


--
-- Data for Name: device_fingerprints; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.device_fingerprints (id, user_id, fingerprint_hash, browser_info, screen_info, canvas_hash, webgl_hash, audio_hash, fonts_hash, first_seen, last_seen, trust_score, is_trusted) FROM stdin;
\.


--
-- Data for Name: domains; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.domains (id, tenant_id, domain, is_verified, verification_code, verified_at, is_primary, is_auto_join, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: goose_db_version; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.goose_db_version (id, version_id, is_applied, tstamp) FROM stdin;
1	0	t	2025-08-26 14:58:05.4645
2	1	t	2025-08-26 14:58:05.481209
3	2	t	2025-08-26 14:58:05.643823
4	3	t	2025-08-26 14:58:05.650092
5	4	t	2025-08-26 14:58:05.661107
6	5	t	2025-08-26 14:58:05.678978
7	6	t	2025-08-26 14:58:05.726796
8	7	t	2025-08-26 14:58:05.733685
9	8	t	2025-08-26 14:58:05.756084
\.


--
-- Data for Name: invites; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.invites (id, tenant_id, email, role, invited_by, invited_at, accepted_at, expires_at, token, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: jwt_blacklist; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.jwt_blacklist (jti, token_hash, session_id, blacklisted_at, expiry, reason) FROM stdin;
\.


--
-- Data for Name: key_rotation_history; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.key_rotation_history (id, old_key_id, new_key_id, rotated_at, rotated_by, reason, metadata) FROM stdin;
\.


--
-- Data for Name: key_usage_audit; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.key_usage_audit (id, key_id, operation, tenant_id, user_id, ip_address, user_agent, success, error_message, token_id, token_type, created_at, metadata) FROM stdin;
ffd786a2-9376-43ee-946d-b3ea6fa38757	fb969b8f-3373-4155-9d27-4358aecba115	create	\N	\N	\N	\N	t	\N	\N	\N	2025-08-26 14:58:05.799606+00	{"algorithm": "RS256"}
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.memberships (id, tenant_id, user_id, created_at, is_owner, is_primary, joined_at, invited_by, invited_at, accepted_at, expires_at, last_access_at, permissions, metadata, updated_at, role) FROM stdin;
\.


--
-- Data for Name: mfa_verification_attempts; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.mfa_verification_attempts (id, user_id, method_type, attempt_type, ip_address, user_agent, success, failure_reason, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_connections; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.oauth_connections (id, user_id, provider, provider_user_id, provider_email, provider_metadata, access_token, refresh_token, token_expires_at, is_active, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: refresh_token_usage; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.refresh_token_usage (id, session_id, token_hash, used_at, new_token_hash, ip_address, user_agent, device_fingerprint, success, failure_reason) FROM stdin;
\.


--
-- Data for Name: revoked_tokens; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.revoked_tokens (id, jti, user_id, revoked_at, expires_at, reason) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.roles (id, tenant_id, name, description, permissions, is_system, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: security_config_audit; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.security_config_audit (id, tenant_id, changed_by, change_type, before_config, after_config, changed_fields, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: session_anomalies; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.session_anomalies (id, session_id, user_id, anomaly_type, severity, details, detected_at, resolved, resolved_at, action_taken) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.sessions (id, user_id, tenant_id, access_token, refresh_token, ip_address, user_agent, last_activity, expires_at, metadata, created_at, updated_at, refresh_token_hash, refresh_token_version, refresh_token_used_at, previous_refresh_token_hash, token_binding_key, device_fingerprint, last_fingerprint_update) FROM stdin;
\.


--
-- Data for Name: signing_keys; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.signing_keys (id, kid, private_key, public_key, is_primary, rotated_at, created_at, updated_at, algorithm, secret, status, version, rotated_from, rotation_reason, not_before, not_after, last_used_at, use_count, created_by, revoked_at, revoked_by, revocation_reason, metadata) FROM stdin;
fb969b8f-3373-4155-9d27-4358aecba115	a673fba215064934	MCdrkztK7f4mGVlvQm/YhOrQ+GOia4HFVdTBJwCTfHkiD8PuTR1TRsIAXHHuc1Z8coUp85J9kSbtxqYVROFjRnuuSFrX6EOdKzGb+JfcDvXNh7pq4XCli/4Eciuo3I+osds4tD2nmUQNCPitXxJ+uiGaxo2WY6FEkEc4kJj58AG4zijSmtA6umi0Pm82eQN1/7gShVh5VR1kpVjZnXlG8dlW+a1ThCl0u15FSuNETpx0guPlmOkE+CSJnXBW+RUsf4Rl5y4+RFOR53K3D8yteQhj+g07dHlF+pTWvDTL8Hxiix3OpK8wbuO72bWgcPYmMkNHOJJ4/VWPKoy3DJxN1kQsb10d1OveKZ48ODo93Z3c0LI2uRHFeTOoVWLL87id1wUkw6JdF5iAx1vP6Tp6NEPFwtOqOkODd0st/Ta8ttJXkfVN4FB6A4MHhBWRUCXouqORV9L7prBpe7ifODJZTNtg8Q8rsccZy/KaRQiADaD8ziDMMcaTBlxIN+cbRNrtjYWcxWSalnM5TCW5/y/net2R3haNrbvD0gXgUbecOBK6GO8W956OKG+tpHX2/U04yOxG4f8KHU6qJ8aYBJGAHy5APkAtSbC+VUzN7Grbq4HNdCRw/mSA3NItFgtCm6DtUjT1n9q6BZKsiPX0/WzY60uKxl1pwk+lVYvdHc18ujJPdwQqqMFem5ysGHqLN1w4I4N7vZUxEJ5Q18f5XuLr39poKeTqSkjiey02Wmf6xtWI0/we3A9dFFJF+8HxGyRREAWtXiVKjCQEozSazi2GL910iG2KAgKEd/fBIUR2/H7N3th6XxKPHQv9FeMCopdmGpfO2qwP5UWFR120ftST4wIvfoSb5qi2JrKkQxjM9TILP3i+bK1MROnm4ngwuMSQOdI56fVdeSbW7MqtVayaFAs+JOn9fiwBCVoFTrGDFbypCtui4FPMg6q4iNhgyLqp65Oz8NVnW5dXmBUshenqic7YGPDzrZY7ZoGeUI5AfZ3O3o3wm9Aa0PtL6ioiG5IjLNeuz+uZzd4PkiVjZS447iTQ+nQNsLjUrnuMsR3l8UMgUewmklJ2CQGuxgI9U3Rw0o789a1Y/2HFmng58eX2cvgN2MdXHrxgOdFY0nZ9MeeMEQaO6MyQOPMDntEe5zuk/k4F0yMGrtrwEjo+f1+a3ZCOwKcpILp5PbvgCuuaOMYSgjDRKqsf38coljhJEMvYs4YF8fVE7IUVU37LvyY9azI7xKfjLfxrC617Q7lyewnxeXpRACfuvevoYaSGcYcsED02PA6nFrsZYy8m/GAJtRTAPypF1KcGXZUcFlF4brt04PzmP+RyErbO8yq9gj/btY+ajbzvt+KJnZgTxgxrDbOYAbWF0N7X5zQBD5A6o9nUEYC5Rums/ivm81YCfkKBdU3vffcLO/MCX6KbGtQcmVxaNuJoNuXzA+cm3RPCostGJ1QWAh07SCM8/TY5yPaRsYlgPuLfr4n2ITkMjQU+RrHEdLgLgBn2liqaZGQGMqtrNEzLS0Y5AQJkFdpFi/oRe579+IeNtu/bGf09rt3Kycd77FnPLb0CENl7ZSmL1WUMsHaDdHChl7Q4GZOF3GYytqx0bkWE0foMP3x5/aLwSOCRahwLW5Xm8RxO4O3tNkO4Q7t5Z2mmk5arUj2xTEMS4Mu/xNuMI5Ud+sUvky/nD+YJpvDqhvMqn7J03koG+v+4Ih+o9krBRGgWbZ3RfgJzDzhh1ksONVadENLzZ9FN87RT1xb4QxzjlR78riAe25MBN4oBEx6k2ncCfNy4156CNSXrWVOIeooYCVvyC3cAsLXWwp3Oselg6b8xYW6QIrtnZuzlC73UybTUMc/1aeCoQMDtGp0fzO4dlvUCFn5+q/UZW3rroLnUiE8WFobpfwv2yWVszH5Ik42MV6FDn+5L8Snsk+B7qSoOnuffj58M85WVVOBJs/b+kz1ZBmeiDBzrY1Dlw5J6W0E09ICQdTGdD7oX572uJKmRH9l5WNW4zlvUnLfJUvfq5gRgdXczZi1Tl+ErwmCuhLCeIOXcX8dwSiTUfaTYoAR4mBFeRAkWUu6Dphna2Uk1IdN5K5jWuw3yMuHHjZfaK2kV3FyUCJK0caJhKtSwE22RJBzGlIytlbzaw19WRSTSgnodBNY8UJrIjb5YMoJ9Ri+vy1sR6TOSCIB+w/aqtoaR/0bVQa2MuF3wdv8JP2Prvx9Jy4KwStQ725XkbaR3+whP+iwxDwIq86dDajn4Jg1koTq9ANs/WoBXjxLcH7dul4gUvAWTyGKI9uFLYxFdabfloocenj1RBfTbl+6D0w==	-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3DmnjY5Syhx0PBUQ2KC6\n1RQhoEwMACzexyPtU7paPWa+MR2wSDx/9UgiS6F/Vx6dUxbhnXJfQYOyGc0VCa+h\nzYPl+MNyrr62xUeAn1+0LewA9Q+104heOSqHup+L3R/uokjtLb4qGLKLNwOPN6jc\nLPscXEfbLOx3HPOYEkCgJBEUhshmdAwBe7VvKObUniWHt2SCiLpWEoTNcTfa/W9i\nbqFo5qcCS7AJup9M+1i+NNw2xHzu2fV043CresIhQZ/uc4RcwwLTNO9mzkj+O3gw\nNhdqXrLp7yn5EYA/tCBK1NQ8YpHdwblsCgG23k2/X0kG3eAMovoh4F7WWEMaRv1E\nKwIDAQAB\n-----END PUBLIC KEY-----\n	t	\N	2025-08-26 14:58:05.799606+00	2025-08-26 14:58:05.929754+00	RS256	\N	active	1	\N	\N	2025-08-26 14:58:05.799606+00	2025-09-25 14:58:05.799606+00	\N	0	\N	\N	\N	\N	{"created": "2025-08-26T14:58:05Z", "initial": "true"}
\.


--
-- Data for Name: tenant_security_configs; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.tenant_security_configs (id, tenant_id, require_mfa, mfa_grace_period_days, allowed_mfa_methods, password_policy, session_timeout_minutes, max_concurrent_sessions, allowed_oauth_providers, ip_whitelist, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.tenants (id, name, region, created_at, display_name, description, logo_url, website, is_active, settings, updated_at, plan, is_system) FROM stdin;
tenant_system_master	System Administration	eu-west	2025-08-26 14:58:05.643823+00	System Administration	Internal system administration tenant	\N	\N	t	{}	2025-08-26 14:58:05.643823+00	free	t
tenant_default	Default Tenant	eu-west	2025-08-26 14:58:05.643823+00	Default Tenant	Default tenant for initial setup	\N	\N	t	{}	2025-08-26 14:58:05.643823+00	free	f
\.


--
-- Data for Name: user_mfa_configs; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.user_mfa_configs (id, user_id, mfa_enabled, totp_secret, totp_verified, backup_codes, backup_codes_generated_at, recovery_email, recovery_phone, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_mfa_methods; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.user_mfa_methods (id, user_id, method_type, is_primary, is_verified, configuration, last_used_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.user_roles (id, user_id, role_id, tenant_id, assigned_by, assigned_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: hpa_admin
--

COPY public.users (id, tenant_id, email, phone, password_hash, first_name, last_name, display_name, avatar_url, is_active, is_email_verified, is_phone_verified, email_verified_at, phone_verified_at, last_login_at, login_count, failed_login_count, failed_login_last_at, password_changed_at, metadata, created_at, updated_at, name, is_system_admin, primary_tenant_id, password_reset_token, password_reset_expiry, password_reset_used) FROM stdin;
\.


--
-- Name: goose_db_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hpa_admin
--

SELECT pg_catalog.setval('public.goose_db_version_id_seq', 9, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: device_fingerprints device_fingerprints_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.device_fingerprints
    ADD CONSTRAINT device_fingerprints_pkey PRIMARY KEY (id);


--
-- Name: device_fingerprints device_fingerprints_user_id_fingerprint_hash_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.device_fingerprints
    ADD CONSTRAINT device_fingerprints_user_id_fingerprint_hash_key UNIQUE (user_id, fingerprint_hash);


--
-- Name: domains domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_domain_key UNIQUE (domain);


--
-- Name: domains domains_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_pkey PRIMARY KEY (id);


--
-- Name: goose_db_version goose_db_version_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.goose_db_version
    ADD CONSTRAINT goose_db_version_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: jwt_blacklist jwt_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.jwt_blacklist
    ADD CONSTRAINT jwt_blacklist_pkey PRIMARY KEY (jti);


--
-- Name: key_rotation_history key_rotation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_rotation_history
    ADD CONSTRAINT key_rotation_history_pkey PRIMARY KEY (id);


--
-- Name: key_usage_audit key_usage_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_usage_audit
    ADD CONSTRAINT key_usage_audit_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (user_id, tenant_id);


--
-- Name: mfa_verification_attempts mfa_verification_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.mfa_verification_attempts
    ADD CONSTRAINT mfa_verification_attempts_pkey PRIMARY KEY (id);


--
-- Name: oauth_connections oauth_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_pkey PRIMARY KEY (id);


--
-- Name: oauth_connections oauth_connections_provider_provider_user_id_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_provider_provider_user_id_key UNIQUE (provider, provider_user_id);


--
-- Name: oauth_connections oauth_connections_user_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_user_id_provider_key UNIQUE (user_id, provider);


--
-- Name: refresh_token_usage refresh_token_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.refresh_token_usage
    ADD CONSTRAINT refresh_token_usage_pkey PRIMARY KEY (id);


--
-- Name: revoked_tokens revoked_tokens_jti_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_jti_key UNIQUE (jti);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: security_config_audit security_config_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.security_config_audit
    ADD CONSTRAINT security_config_audit_pkey PRIMARY KEY (id);


--
-- Name: session_anomalies session_anomalies_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.session_anomalies
    ADD CONSTRAINT session_anomalies_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: signing_keys signing_keys_kid_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.signing_keys
    ADD CONSTRAINT signing_keys_kid_key UNIQUE (kid);


--
-- Name: signing_keys signing_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.signing_keys
    ADD CONSTRAINT signing_keys_pkey PRIMARY KEY (id);


--
-- Name: tenant_security_configs tenant_security_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.tenant_security_configs
    ADD CONSTRAINT tenant_security_configs_pkey PRIMARY KEY (id);


--
-- Name: tenant_security_configs tenant_security_configs_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.tenant_security_configs
    ADD CONSTRAINT tenant_security_configs_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: sessions unique_refresh_token; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT unique_refresh_token UNIQUE (refresh_token_hash);


--
-- Name: tenant_security_configs unique_tenant_id; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.tenant_security_configs
    ADD CONSTRAINT unique_tenant_id UNIQUE (tenant_id);


--
-- Name: user_mfa_configs user_mfa_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_mfa_configs
    ADD CONSTRAINT user_mfa_configs_pkey PRIMARY KEY (id);


--
-- Name: user_mfa_configs user_mfa_configs_user_id_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_mfa_configs
    ADD CONSTRAINT user_mfa_configs_user_id_key UNIQUE (user_id);


--
-- Name: user_mfa_methods user_mfa_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_mfa_methods
    ADD CONSTRAINT user_mfa_methods_pkey PRIMARY KEY (id);


--
-- Name: user_mfa_methods user_mfa_methods_user_id_method_type_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_mfa_methods
    ADD CONSTRAINT user_mfa_methods_user_id_method_type_key UNIQUE (user_id, method_type);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_tenant_id_key UNIQUE (user_id, role_id, tenant_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_event_type; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_event_type ON public.audit_logs USING btree (event_type);


--
-- Name: idx_audit_logs_session; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_session ON public.audit_logs USING btree (session_id);


--
-- Name: idx_audit_logs_success; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_success ON public.audit_logs USING btree (success);


--
-- Name: idx_audit_logs_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_tenant ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_logs_tenant_id; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_logs_user_tenant_time; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_audit_logs_user_tenant_time ON public.audit_logs USING btree (user_id, tenant_id, created_at DESC);


--
-- Name: idx_device_fingerprints_hash; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_device_fingerprints_hash ON public.device_fingerprints USING btree (fingerprint_hash);


--
-- Name: idx_device_fingerprints_last_seen; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_device_fingerprints_last_seen ON public.device_fingerprints USING btree (last_seen);


--
-- Name: idx_device_fingerprints_user; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_device_fingerprints_user ON public.device_fingerprints USING btree (user_id);


--
-- Name: idx_domains_domain; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_domains_domain ON public.domains USING btree (domain);


--
-- Name: idx_domains_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_domains_tenant ON public.domains USING btree (tenant_id);


--
-- Name: idx_invites_email; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_invites_email ON public.invites USING btree (email);


--
-- Name: idx_invites_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_invites_tenant ON public.invites USING btree (tenant_id);


--
-- Name: idx_invites_token; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_invites_token ON public.invites USING btree (token);


--
-- Name: idx_jwt_blacklist_expiry; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_jwt_blacklist_expiry ON public.jwt_blacklist USING btree (expiry);


--
-- Name: idx_jwt_blacklist_session; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_jwt_blacklist_session ON public.jwt_blacklist USING btree (session_id);


--
-- Name: idx_key_rotation_history_new_key; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_key_rotation_history_new_key ON public.key_rotation_history USING btree (new_key_id);


--
-- Name: idx_key_rotation_history_old_key; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_key_rotation_history_old_key ON public.key_rotation_history USING btree (old_key_id);


--
-- Name: idx_key_usage_audit_key; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_key_usage_audit_key ON public.key_usage_audit USING btree (key_id, created_at DESC);


--
-- Name: idx_key_usage_audit_operation; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_key_usage_audit_operation ON public.key_usage_audit USING btree (operation, created_at DESC);


--
-- Name: idx_key_usage_audit_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_key_usage_audit_tenant ON public.key_usage_audit USING btree (tenant_id) WHERE (tenant_id IS NOT NULL);


--
-- Name: idx_memberships_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_memberships_tenant ON public.memberships USING btree (tenant_id);


--
-- Name: idx_memberships_user; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_memberships_user ON public.memberships USING btree (user_id);


--
-- Name: idx_mfa_verification_attempts_created_at; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_mfa_verification_attempts_created_at ON public.mfa_verification_attempts USING btree (created_at);


--
-- Name: idx_mfa_verification_attempts_user_id; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_mfa_verification_attempts_user_id ON public.mfa_verification_attempts USING btree (user_id);


--
-- Name: idx_oauth_connections_provider; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_oauth_connections_provider ON public.oauth_connections USING btree (provider);


--
-- Name: idx_oauth_connections_user_id; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_oauth_connections_user_id ON public.oauth_connections USING btree (user_id);


--
-- Name: idx_refresh_token_usage_hash; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_refresh_token_usage_hash ON public.refresh_token_usage USING btree (token_hash);


--
-- Name: idx_refresh_token_usage_session; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_refresh_token_usage_session ON public.refresh_token_usage USING btree (session_id);


--
-- Name: idx_refresh_token_usage_timestamp; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_refresh_token_usage_timestamp ON public.refresh_token_usage USING btree (used_at);


--
-- Name: idx_revoked_tokens_expires; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_revoked_tokens_expires ON public.revoked_tokens USING btree (expires_at);


--
-- Name: idx_revoked_tokens_jti; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_revoked_tokens_jti ON public.revoked_tokens USING btree (jti);


--
-- Name: idx_revoked_tokens_user; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_revoked_tokens_user ON public.revoked_tokens USING btree (user_id);


--
-- Name: idx_roles_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_roles_tenant ON public.roles USING btree (tenant_id);


--
-- Name: idx_security_config_audit_changed_by; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_security_config_audit_changed_by ON public.security_config_audit USING btree (changed_by);


--
-- Name: idx_security_config_audit_created_at; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_security_config_audit_created_at ON public.security_config_audit USING btree (created_at);


--
-- Name: idx_security_config_audit_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_security_config_audit_tenant ON public.security_config_audit USING btree (tenant_id);


--
-- Name: idx_session_anomalies_session; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_session_anomalies_session ON public.session_anomalies USING btree (session_id);


--
-- Name: idx_session_anomalies_timestamp; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_session_anomalies_timestamp ON public.session_anomalies USING btree (detected_at);


--
-- Name: idx_session_anomalies_type; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_session_anomalies_type ON public.session_anomalies USING btree (anomaly_type);


--
-- Name: idx_session_anomalies_user; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_session_anomalies_user ON public.session_anomalies USING btree (user_id);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_sessions_expires ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id);


--
-- Name: idx_signing_keys_kid; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_signing_keys_kid ON public.signing_keys USING btree (kid) WHERE (status = 'active'::public.key_status);


--
-- Name: idx_signing_keys_one_primary; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE UNIQUE INDEX idx_signing_keys_one_primary ON public.signing_keys USING btree (is_primary) WHERE ((is_primary = true) AND (status = 'active'::public.key_status));


--
-- Name: idx_signing_keys_primary; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_signing_keys_primary ON public.signing_keys USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_signing_keys_rotation; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_signing_keys_rotation ON public.signing_keys USING btree (rotated_from) WHERE (rotated_from IS NOT NULL);


--
-- Name: idx_signing_keys_status; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_signing_keys_status ON public.signing_keys USING btree (status);


--
-- Name: idx_signing_keys_validity; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_signing_keys_validity ON public.signing_keys USING btree (not_before, not_after) WHERE (status = 'active'::public.key_status);


--
-- Name: idx_single_system_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE UNIQUE INDEX idx_single_system_tenant ON public.tenants USING btree (is_system) WHERE (is_system = true);


--
-- Name: idx_tenant_security_configs_tenant_id; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_tenant_security_configs_tenant_id ON public.tenant_security_configs USING btree (tenant_id);


--
-- Name: idx_user_mfa_configs_user_id; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_user_mfa_configs_user_id ON public.user_mfa_configs USING btree (user_id);


--
-- Name: idx_user_mfa_methods_user_id; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_user_mfa_methods_user_id ON public.user_mfa_methods USING btree (user_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_user_roles_tenant ON public.user_roles USING btree (tenant_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_users_password_reset_token ON public.users USING btree (password_reset_token) WHERE (password_reset_token IS NOT NULL);


--
-- Name: idx_users_primary_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_users_primary_tenant ON public.users USING btree (primary_tenant_id);


--
-- Name: idx_users_system_admin; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_users_system_admin ON public.users USING btree (is_system_admin) WHERE (is_system_admin = true);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: hpa_admin
--

CREATE INDEX idx_users_tenant ON public.users USING btree (tenant_id);


--
-- Name: memberships enforce_single_tenant; Type: TRIGGER; Schema: public; Owner: hpa_admin
--

CREATE TRIGGER enforce_single_tenant BEFORE INSERT OR UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_single_tenant_membership();


--
-- Name: memberships handle_membership_delete; Type: TRIGGER; Schema: public; Owner: hpa_admin
--

CREATE TRIGGER handle_membership_delete AFTER DELETE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.handle_membership_deletion();


--
-- Name: tenant_security_configs trigger_audit_security_config; Type: TRIGGER; Schema: public; Owner: hpa_admin
--

CREATE TRIGGER trigger_audit_security_config AFTER INSERT OR DELETE OR UPDATE ON public.tenant_security_configs FOR EACH ROW EXECUTE FUNCTION public.audit_security_config_changes();


--
-- Name: oauth_connections update_oauth_connections_updated_at; Type: TRIGGER; Schema: public; Owner: hpa_admin
--

CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON public.oauth_connections FOR EACH ROW EXECUTE FUNCTION public.update_mfa_updated_at();


--
-- Name: tenant_security_configs update_tenant_security_configs_updated_at; Type: TRIGGER; Schema: public; Owner: hpa_admin
--

CREATE TRIGGER update_tenant_security_configs_updated_at BEFORE UPDATE ON public.tenant_security_configs FOR EACH ROW EXECUTE FUNCTION public.update_mfa_updated_at();


--
-- Name: user_mfa_configs update_user_mfa_configs_updated_at; Type: TRIGGER; Schema: public; Owner: hpa_admin
--

CREATE TRIGGER update_user_mfa_configs_updated_at BEFORE UPDATE ON public.user_mfa_configs FOR EACH ROW EXECUTE FUNCTION public.update_mfa_updated_at();


--
-- Name: user_mfa_methods update_user_mfa_methods_updated_at; Type: TRIGGER; Schema: public; Owner: hpa_admin
--

CREATE TRIGGER update_user_mfa_methods_updated_at BEFORE UPDATE ON public.user_mfa_methods FOR EACH ROW EXECUTE FUNCTION public.update_mfa_updated_at();


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: device_fingerprints device_fingerprints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.device_fingerprints
    ADD CONSTRAINT device_fingerprints_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: domains domains_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: invites invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: invites invites_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: jwt_blacklist jwt_blacklist_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.jwt_blacklist
    ADD CONSTRAINT jwt_blacklist_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: key_rotation_history key_rotation_history_new_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_rotation_history
    ADD CONSTRAINT key_rotation_history_new_key_id_fkey FOREIGN KEY (new_key_id) REFERENCES public.signing_keys(id) ON DELETE CASCADE;


--
-- Name: key_rotation_history key_rotation_history_old_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_rotation_history
    ADD CONSTRAINT key_rotation_history_old_key_id_fkey FOREIGN KEY (old_key_id) REFERENCES public.signing_keys(id) ON DELETE CASCADE;


--
-- Name: key_rotation_history key_rotation_history_rotated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_rotation_history
    ADD CONSTRAINT key_rotation_history_rotated_by_fkey FOREIGN KEY (rotated_by) REFERENCES public.users(id);


--
-- Name: key_usage_audit key_usage_audit_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_usage_audit
    ADD CONSTRAINT key_usage_audit_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.signing_keys(id);


--
-- Name: key_usage_audit key_usage_audit_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_usage_audit
    ADD CONSTRAINT key_usage_audit_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: key_usage_audit key_usage_audit_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.key_usage_audit
    ADD CONSTRAINT key_usage_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: memberships memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mfa_verification_attempts mfa_verification_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.mfa_verification_attempts
    ADD CONSTRAINT mfa_verification_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: oauth_connections oauth_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_token_usage refresh_token_usage_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.refresh_token_usage
    ADD CONSTRAINT refresh_token_usage_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: revoked_tokens revoked_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: roles roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: roles roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: security_config_audit security_config_audit_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.security_config_audit
    ADD CONSTRAINT security_config_audit_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: session_anomalies session_anomalies_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.session_anomalies
    ADD CONSTRAINT session_anomalies_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: session_anomalies session_anomalies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.session_anomalies
    ADD CONSTRAINT session_anomalies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: signing_keys signing_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.signing_keys
    ADD CONSTRAINT signing_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: signing_keys signing_keys_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.signing_keys
    ADD CONSTRAINT signing_keys_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- Name: signing_keys signing_keys_rotated_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.signing_keys
    ADD CONSTRAINT signing_keys_rotated_from_fkey FOREIGN KEY (rotated_from) REFERENCES public.signing_keys(id);


--
-- Name: tenant_security_configs tenant_security_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.tenant_security_configs
    ADD CONSTRAINT tenant_security_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tenant_security_configs tenant_security_configs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.tenant_security_configs
    ADD CONSTRAINT tenant_security_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_security_configs tenant_security_configs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.tenant_security_configs
    ADD CONSTRAINT tenant_security_configs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: user_mfa_configs user_mfa_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_mfa_configs
    ADD CONSTRAINT user_mfa_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_mfa_methods user_mfa_methods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_mfa_methods
    ADD CONSTRAINT user_mfa_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_primary_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_primary_tenant_id_fkey FOREIGN KEY (primary_tenant_id) REFERENCES public.tenants(id);


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hpa_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: mfa_verification_attempts; Type: ROW SECURITY; Schema: public; Owner: hpa_admin
--

ALTER TABLE public.mfa_verification_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_verification_attempts mfa_verification_attempts_policy; Type: POLICY; Schema: public; Owner: hpa_admin
--

CREATE POLICY mfa_verification_attempts_policy ON public.mfa_verification_attempts USING ((user_id = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- Name: oauth_connections; Type: ROW SECURITY; Schema: public; Owner: hpa_admin
--

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_connections oauth_connections_policy; Type: POLICY; Schema: public; Owner: hpa_admin
--

CREATE POLICY oauth_connections_policy ON public.oauth_connections USING ((user_id = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- Name: tenant_security_configs; Type: ROW SECURITY; Schema: public; Owner: hpa_admin
--

ALTER TABLE public.tenant_security_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_security_configs tenant_security_configs_policy; Type: POLICY; Schema: public; Owner: hpa_admin
--

CREATE POLICY tenant_security_configs_policy ON public.tenant_security_configs USING ((tenant_id IN ( SELECT memberships.tenant_id
   FROM public.memberships
  WHERE ((memberships.user_id = (current_setting('app.current_user_id'::text, true))::uuid) AND (memberships.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: user_mfa_configs; Type: ROW SECURITY; Schema: public; Owner: hpa_admin
--

ALTER TABLE public.user_mfa_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_mfa_configs user_mfa_configs_policy; Type: POLICY; Schema: public; Owner: hpa_admin
--

CREATE POLICY user_mfa_configs_policy ON public.user_mfa_configs USING ((user_id = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- Name: user_mfa_methods; Type: ROW SECURITY; Schema: public; Owner: hpa_admin
--

ALTER TABLE public.user_mfa_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: user_mfa_methods user_mfa_methods_policy; Type: POLICY; Schema: public; Owner: hpa_admin
--

CREATE POLICY user_mfa_methods_policy ON public.user_mfa_methods USING ((user_id = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- PostgreSQL database dump complete
--

