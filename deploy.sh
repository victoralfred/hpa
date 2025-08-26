#!/bin/bash

# HPA Platform Master Deployment Script
# This script handles the complete deployment process

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
echo $PROJECT_ROOT
echo -e "${BLUE}🚀 HPA Platform Deployment${NC}"
echo "==========================="
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found${NC}"
        echo "Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose not found${NC}"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Prerequisites check passed${NC}"
    echo ""
}

# Function to setup environment
setup_environment() {
    echo "Setting up environment variables..."
    
    ENV_FILE="${PROJECT_ROOT}/.env.production"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}No environment file found. Generating...${NC}"
        
        if [ -f "${PROJECT_ROOT}/scripts/generate-env.sh" ]; then
            # Run without interaction for automated deployment
            "${PROJECT_ROOT}/scripts/generate-env.sh" <<< "n"
        else
            echo -e "${RED}Error: generate-env.sh not found${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Using existing environment file${NC}"
    fi
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Verify critical variables
    if [ -z "$DB_PASSWORD" ] || [ -z "$REDIS_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
        echo -e "${RED}❌ Required environment variables are not set${NC}"
        echo "Please check your .env.production file"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
    echo ""
}

# Function to build images
build_images() {
    echo "Building Docker images..."
    
    # Check if environment file exists
    if [ -f .env.production ]; then
        # Build all services with environment file
        docker-compose -f docker-compose.production.yml --env-file .env.production build
    else
        # Build without environment file (will use defaults)
        docker-compose -f docker-compose.production.yml build
    fi
    
    echo -e "${GREEN}✓ Docker images built successfully${NC}"
    echo ""
}

# Function to start services
start_services() {
    echo "Starting services..."
    
    # Start all services
    docker-compose -f docker-compose.production.yml --env-file .env.production up -d
    
    echo -e "${GREEN}✓ Services started${NC}"
    echo ""
}

# Function to wait for services
wait_for_services() {
    echo "Waiting for services to be ready..."
    
    # Wait for backend
    echo -n "  Backend... "
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            echo -e "${GREEN}ready${NC}"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}timeout${NC}"
        fi
    done
    
    # Wait for frontend
    echo -n "  Frontend... "
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}ready${NC}"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}timeout${NC}"
        fi
    done
    
    # Wait for database
    echo -n "  Database... "
    for i in {1..30}; do
        if docker exec hpa_postgres_prod pg_isready -U hpa_admin > /dev/null 2>&1; then
            echo -e "${GREEN}ready${NC}"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}timeout${NC}"
        fi
    done
    
    echo ""
}

# Function to display access information
display_info() {
    # Get public IP
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "localhost")
    
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    echo "Access your application:"
    echo "  Frontend:    http://$PUBLIC_IP"
    echo "  Backend API: http://$PUBLIC_IP/api"
    echo "  Health:      http://$PUBLIC_IP/health"
    echo "  Grafana:     http://$PUBLIC_IP:3001"
    echo "  Prometheus:  http://$PUBLIC_IP:9090"
    echo "  Agent Health: http://localhost:8081/health"
    echo ""
    echo "Credentials:"
    echo "  Check .env.production for all credentials"
    echo ""
    echo "Useful commands:"
    echo "  View logs:       docker-compose -f docker-compose.production.yml logs -f"
    echo "  Stop services:   docker-compose -f docker-compose.production.yml down"
    echo "  Restart:         docker-compose -f docker-compose.production.yml restart"
    echo "  Check status:    docker-compose -f docker-compose.production.yml ps"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
}

# Main deployment flow
main() {
    cd "$PROJECT_ROOT"
    
    # Parse command line arguments
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            setup_environment
            build_images
            start_services
            wait_for_services
            display_info
            ;;
        start)
            setup_environment
            start_services
            wait_for_services
            display_info
            ;;
        stop)
            setup_environment
            docker-compose -f docker-compose.production.yml --env-file .env.production down
            echo -e "${GREEN}✓ Services stopped${NC}"
            ;;
        restart)
            setup_environment
            docker-compose -f docker-compose.production.yml --env-file .env.production restart
            echo -e "${GREEN}✓ Services restarted${NC}"
            ;;
        status)
            setup_environment
            docker-compose -f docker-compose.production.yml --env-file .env.production ps
            ;;
        logs)
            setup_environment
            docker-compose -f docker-compose.production.yml --env-file .env.production logs -f
            ;;
        clean)
            read -p "This will remove all containers, volumes, and images. Are you sure? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker-compose -f docker-compose.production.yml --env-file .env.production down -v --rmi all
                echo -e "${GREEN}✓ Cleanup complete${NC}"
            fi
            ;;
        *)
            echo "Usage: $0 {deploy|start|stop|restart|status|logs|clean}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment (build + start)"
            echo "  start    - Start services without building"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  status   - Show service status"
            echo "  logs     - Show service logs"
            echo "  clean    - Remove all containers, volumes, and images"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"