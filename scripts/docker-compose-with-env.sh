#!/bin/bash

# HPA Platform Docker Compose Wrapper
# This script ensures environment variables are loaded before running docker-compose

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Environment file
ENV_FILE="${PROJECT_ROOT}/.env.production"

echo -e "${GREEN}🐳 HPA Docker Compose Wrapper${NC}"
echo "=============================="

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Environment file not found${NC}"
    echo "Generating new environment file..."
    
    # Run the generate-env script
    if [ -f "${SCRIPT_DIR}/generate-env.sh" ]; then
        "${SCRIPT_DIR}/generate-env.sh"
    else
        echo -e "${RED}Error: generate-env.sh not found${NC}"
        exit 1
    fi
fi

# Load environment variables
echo "Loading environment variables from $ENV_FILE"
set -a  # Mark all new variables for export
source "$ENV_FILE"
set +a  # Turn off auto-export

# Verify critical variables are set
MISSING_VARS=()

if [ -z "$DB_PASSWORD" ]; then
    MISSING_VARS+=("DB_PASSWORD")
fi

if [ -z "$REDIS_PASSWORD" ]; then
    MISSING_VARS+=("REDIS_PASSWORD")
fi

if [ -z "$JWT_SECRET" ]; then
    MISSING_VARS+=("JWT_SECRET")
fi

if [ -z "$AGENT_TOKEN" ]; then
    MISSING_VARS+=("AGENT_TOKEN")
fi

if [ -z "$GRAFANA_PASSWORD" ]; then
    MISSING_VARS+=("GRAFANA_PASSWORD")
fi

# Check if any variables are missing
if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please run: ./scripts/generate-env.sh"
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables are set${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Run docker-compose with all arguments passed to this script
echo "Running: docker-compose -f docker-compose.production.yml --env-file .env.production $@"
docker-compose -f docker-compose.production.yml --env-file .env.production "$@"