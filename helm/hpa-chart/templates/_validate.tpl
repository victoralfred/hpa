{{/*
Validate required secrets are provided
*/}}
{{- define "hpa-chart.validateSecrets" -}}
{{- if not .Values.backend.secrets.JWT_SECRET -}}
  {{- fail "ERROR: backend.secrets.JWT_SECRET is required. Set it using --set backend.secrets.JWT_SECRET=<your-secret> or in a values override file" -}}
{{- end -}}
{{- if and .Values.postgresql.enabled (not .Values.postgresql.auth.password) -}}
  {{- fail "ERROR: postgresql.auth.password is required when PostgreSQL is enabled. Set it using --set postgresql.auth.password=<your-password>" -}}
{{- end -}}
{{- if and .Values.postgresql.enabled (not .Values.postgresql.auth.postgresPassword) -}}
  {{- fail "ERROR: postgresql.auth.postgresPassword is required when PostgreSQL is enabled. Set it using --set postgresql.auth.postgresPassword=<your-password>" -}}
{{- end -}}
{{- if and .Values.redis.enabled .Values.redis.auth.enabled (not .Values.redis.auth.password) -}}
  {{- fail "ERROR: redis.auth.password is required when Redis auth is enabled. Set it using --set redis.auth.password=<your-password>" -}}
{{- end -}}
{{- end -}}

{{/*
Generate a random secret if not provided (for development only)
*/}}
{{- define "hpa-chart.generateSecret" -}}
{{- if eq .Values.global.environment "development" -}}
  {{- randAlphaNum 32 | b64enc | quote -}}
{{- else -}}
  {{- fail "Secret generation is only allowed in development environment" -}}
{{- end -}}
{{- end -}}