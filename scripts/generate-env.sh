#!/bin/bash

# HPA Platform Environment Variable Generator
# This script generates secure environment variables for production deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Environment file path
ENV_FILE="${PROJECT_ROOT}/.env.production"

echo -e "${BLUE}🔐 HPA Platform Environment Generator${NC}"
echo "======================================="

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate secure token
generate_token() {
    openssl rand -hex 32
}

# Check if .env.production already exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Warning: $ENV_FILE already exists${NC}"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing environment file."
        
        # Source the existing file to export variables
        set -a
        source "$ENV_FILE"
        set +a
        
        echo -e "${GREEN}✓ Environment variables loaded from $ENV_FILE${NC}"
        exit 0
    fi
    
    # Backup existing file
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Existing file backed up"
fi

echo "Generating secure passwords and tokens..."

# Generate secure values
DB_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_token)
AGENT_TOKEN=$(generate_token)
GRAFANA_PASSWORD=$(generate_password)
GRAFANA_USER="admin"

# Get system information
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "localhost")
HOSTNAME=$(hostname)

# Create .env.production file
cat > "$ENV_FILE" << EOF
# HPA Platform Production Environment Variables
# Generated on $(date)
# Host: $HOSTNAME

# ============================================
# Database Configuration
# ============================================
DB_USER=hpa_admin
DB_PASSWORD=$DB_PASSWORD
DB_NAME=hpa_db

# ============================================
# Redis Configuration
# ============================================
REDIS_PASSWORD=$REDIS_PASSWORD

# ============================================
# JWT & Security
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
REQUIRE_EMAIL_VERIFICATION=true

# ============================================
# Application Configuration
# ============================================
ENVIRONMENT=production
LOG_LEVEL=info
VERSION=1.0.0

# CORS Settings
ALLOWED_ORIGINS=http://$PUBLIC_IP,http://localhost,https://$PUBLIC_IP
FRONTEND_API_URL=http://$PUBLIC_IP/api

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Features
ENABLE_TRACING=false
TLS_ENABLED=false

# ============================================
# Agent Configuration
# ============================================
CLUSTER_ID=docker-cluster
CLUSTER_NAME=Docker Test Cluster
TENANT_ID=default
AGENT_TOKEN=$AGENT_TOKEN

# ============================================
# Monitoring (Grafana)
# ============================================
GRAFANA_USER=$GRAFANA_USER
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
GRAFANA_ROOT_URL=http://$PUBLIC_IP:3001

# ============================================
# OAuth (Optional - leave empty if not using)
# ============================================
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=

# ============================================
# SSL/TLS Certificates (Optional)
# ============================================
ACM_CERTIFICATE_ARN=
CLOUDFRONT_CERTIFICATE_ARN=

# ============================================
# Domain Configuration (Optional)
# ============================================
DOMAIN_NAME=
EOF

# Set proper permissions (readable only by owner)
chmod 600 "$ENV_FILE"

echo -e "${GREEN}✓ Environment file created: $ENV_FILE${NC}"
echo ""
echo "Generated Credentials:"
echo "====================="
echo -e "${BLUE}Database:${NC}"
echo "  User: hpa_admin"
echo "  Password: $DB_PASSWORD"
echo ""
echo -e "${BLUE}Redis:${NC}"
echo "  Password: $REDIS_PASSWORD"
echo ""
echo -e "${BLUE}Grafana:${NC}"
echo "  User: $GRAFANA_USER"
echo "  Password: $GRAFANA_PASSWORD"
echo ""
echo -e "${BLUE}Agent Token:${NC}"
echo "  $AGENT_TOKEN"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Save these credentials securely!${NC}"
echo ""

# Export variables to current shell if requested
read -p "Do you want to export these variables to your current shell? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Export all variables
    export DB_USER=hpa_admin
    export DB_PASSWORD
    export DB_NAME=hpa_db
    export REDIS_PASSWORD
    export JWT_SECRET
    export JWT_ACCESS_TOKEN_EXPIRY=15m
    export JWT_REFRESH_TOKEN_EXPIRY=7d
    export REQUIRE_EMAIL_VERIFICATION=true
    export ENVIRONMENT=production
    export LOG_LEVEL=info
    export VERSION=1.0.0
    export ALLOWED_ORIGINS="http://$PUBLIC_IP,http://localhost,https://$PUBLIC_IP"
    export FRONTEND_API_URL="http://$PUBLIC_IP/api"
    export RATE_LIMIT_REQUESTS=100
    export RATE_LIMIT_WINDOW=1m
    export ENABLE_TRACING=false
    export TLS_ENABLED=false
    export CLUSTER_ID=docker-cluster
    export CLUSTER_NAME="Docker Test Cluster"
    export TENANT_ID=default
    export AGENT_TOKEN
    export GRAFANA_USER
    export GRAFANA_PASSWORD
    export GRAFANA_ROOT_URL="http://$PUBLIC_IP:3001"
    
    echo -e "${GREEN}✓ Variables exported to current shell${NC}"
fi

echo ""
echo "Next Steps:"
echo "==========="
echo "1. Review the generated .env.production file"
echo "2. Update any values specific to your environment"
echo "3. Run Docker Compose with: docker-compose -f docker-compose.production.yml --env-file .env.production up -d"
echo ""
echo -e "${BLUE}For automatic loading in future sessions, run:${NC}"
echo "  source .env.production"
echo ""
echo -e "${GREEN}Environment generation complete!${NC}"