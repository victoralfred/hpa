#!/bin/bash

# HPA Platform Deployment Test Script
# This script performs a quick test of the deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================"
echo "HPA Platform Deployment Test"
echo "================================"
echo ""

# Test environment file generation
test_env_generation() {
    echo "Testing environment generation..."
    
    # Generate test environment file
    TEST_ENV=".env.test"
    
    # Create minimal test env file
    cat > "$TEST_ENV" << EOF
DB_USER=test_admin
DB_PASSWORD=test_password_123
DB_NAME=test_db
REDIS_PASSWORD=redis_test_123
JWT_SECRET=test_jwt_secret_456
AGENT_TOKEN=test_agent_token_789
GRAFANA_USER=admin
GRAFANA_PASSWORD=grafana_test_123
EOF
    
    # Test loading environment
    set -a
    source "$TEST_ENV"
    set +a
    
    if [ -n "$DB_PASSWORD" ] && [ -n "$REDIS_PASSWORD" ]; then
        echo -e "${GREEN}✓ Environment variables loaded successfully${NC}"
    else
        echo -e "${RED}✗ Failed to load environment variables${NC}"
        exit 1
    fi
    
    # Clean up test file
    rm -f "$TEST_ENV"
}

# Test docker-compose validation
test_docker_compose() {
    echo "Testing docker-compose configuration..."
    
    if docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker Compose configuration is valid${NC}"
    else
        echo -e "${RED}✗ Docker Compose configuration has errors${NC}"
        docker-compose -f docker-compose.production.yml config 2>&1 | head -20
        exit 1
    fi
}

# Test required directories
test_directories() {
    echo "Testing required directories..."
    
    REQUIRED_DIRS=(
        "backend"
        "frontend"
        "hpa-agent"
        "monitoring"
        "scripts"
        "nginx"
    )
    
    MISSING_DIRS=()
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            MISSING_DIRS+=("$dir")
        fi
    done
    
    if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ All required directories exist${NC}"
    else
        echo -e "${YELLOW}⚠ Missing directories: ${MISSING_DIRS[*]}${NC}"
    fi
}

# Test required files
test_files() {
    echo "Testing required files..."
    
    REQUIRED_FILES=(
        "docker-compose.production.yml"
        "deploy.sh"
        "scripts/generate-env.sh"
        "monitoring/prometheus.yml"
        "Dockerfile.agent"
    )
    
    MISSING_FILES=()
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            MISSING_FILES+=("$file")
        fi
    done
    
    if [ ${#MISSING_FILES[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ All required files exist${NC}"
    else
        echo -e "${RED}✗ Missing files: ${MISSING_FILES[*]}${NC}"
        exit 1
    fi
}

# Test Docker availability
test_docker() {
    echo "Testing Docker..."
    
    if docker version > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker is available${NC}"
    else
        echo -e "${RED}✗ Docker is not available${NC}"
        exit 1
    fi
    
    if docker-compose version > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker Compose is available${NC}"
    else
        echo -e "${RED}✗ Docker Compose is not available${NC}"
        exit 1
    fi
}

# Test network connectivity
test_network() {
    echo "Testing network connectivity..."
    
    if ping -c 1 google.com > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Internet connectivity is available${NC}"
    else
        echo -e "${YELLOW}⚠ No internet connectivity detected${NC}"
    fi
}

# Main test execution
main() {
    echo "Running deployment tests..."
    echo ""
    
    test_docker
    test_directories
    test_files
    test_env_generation
    test_docker_compose
    test_network
    
    echo ""
    echo "================================"
    echo -e "${GREEN}All tests passed!${NC}"
    echo "================================"
    echo ""
    echo "Ready to deploy with:"
    echo "  ./deploy.sh"
    echo ""
    echo "Or manually:"
    echo "  ./scripts/generate-env.sh"
    echo "  docker-compose -f docker-compose.production.yml --env-file .env.production up -d"
}

# Run main function
main