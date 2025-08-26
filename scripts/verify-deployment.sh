#!/bin/bash

# HPA Platform - Deployment Verification Script
# Checks that all services are running correctly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔍 HPA Platform Deployment Verification${NC}"
echo "========================================="

# Check if running on EC2 or locally
if [ -f /home/ubuntu/.ssh/authorized_keys ]; then
    DEPLOY_ENV="EC2"
else
    DEPLOY_ENV="LOCAL"
fi

echo "Environment: $DEPLOY_ENV"
echo ""

# Function to check service
check_service() {
    SERVICE=$1
    PORT=$2
    ENDPOINT=$3
    
    echo -n "Checking $SERVICE... "
    
    if curl -s -f http://localhost:$PORT$ENDPOINT > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Function to check docker container
check_container() {
    CONTAINER=$1
    
    echo -n "Container $CONTAINER... "
    
    STATUS=$(docker inspect -f '{{.State.Status}}' $CONTAINER 2>/dev/null || echo "not found")
    
    if [ "$STATUS" = "running" ]; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ $STATUS${NC}"
        return 1
    fi
}

echo "1. Docker Containers Status:"
echo "----------------------------"
check_container "hpa_postgres_prod"
check_container "hpa_redis_prod"
check_container "hpa_backend_prod"
check_container "hpa_frontend_prod"
check_container "hpa_nginx_prod"
check_container "hpa_agent_prod"
echo ""

echo "2. Service Health Checks:"
echo "-------------------------"
check_service "Backend Health" 8080 "/health"
check_service "Backend Ready" 8080 "/ready"
check_service "Frontend" 3000 "/"
check_service "Nginx" 80 "/nginx-health"
check_service "Agent Health" 8081 "/health"
echo ""

echo "3. Database Connectivity:"
echo "-------------------------"
echo -n "PostgreSQL... "
if docker exec hpa_postgres_prod pg_isready -U hpa_admin -d hpa_db > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "Redis... "
if docker exec hpa_redis_prod redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

echo "4. Resource Usage:"
echo "------------------"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | head -10
echo ""

echo "5. Recent Logs (Errors/Warnings):"
echo "----------------------------------"
docker-compose -f docker-compose.production.yml logs --tail 20 2>&1 | grep -E "(ERROR|WARN|error|warning)" | tail -5 || echo "No recent errors found"
echo ""

echo "6. Network Connectivity:"
echo "------------------------"
echo -n "External connectivity... "
if curl -s https://api.github.com > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "DNS resolution... "
if nslookup google.com > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi
echo ""

echo "7. Disk Usage:"
echo "--------------"
df -h | grep -E "^/dev/" | head -5
echo ""

echo "8. Application Endpoints:"
echo "-------------------------"
if [ "$DEPLOY_ENV" = "EC2" ]; then
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    echo "Frontend: http://$PUBLIC_IP"
    echo "Backend API: http://$PUBLIC_IP/api"
    echo "Health: http://$PUBLIC_IP/health"
    echo "Grafana: http://$PUBLIC_IP:3001"
    echo "Prometheus: http://$PUBLIC_IP:9090"
else
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost/api"
    echo "Health: http://localhost/health"
    echo "Grafana: http://localhost:3001"
    echo "Prometheus: http://localhost:9090"
fi
echo ""

# Summary
echo "========================================="
ERRORS=0

# Count any failures
if ! docker ps | grep -q hpa_backend_prod; then
    ((ERRORS++))
fi
if ! docker ps | grep -q hpa_frontend_prod; then
    ((ERRORS++))
fi
if ! curl -s http://localhost:8080/health | grep -q "ok"; then
    ((ERRORS++))
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Deployment is healthy.${NC}"
else
    echo -e "${YELLOW}⚠️  $ERRORS issue(s) detected. Please check the logs.${NC}"
fi
echo "========================================="