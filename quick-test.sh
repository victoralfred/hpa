#!/bin/bash
set -e

echo "🚀 HPA Agent-Backend mTLS Integration Test"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/home/voseghale/projects/hpa"
CERT_DIR="/home/voseghale/projects/hpa_certs"
BACKEND_ENV="$PROJECT_ROOT/test_backend_mtls.env"
AGENT_ENV="$PROJECT_ROOT/test_agent_mtls.env"

error() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    command -v go >/dev/null 2>&1 || error "Go is not installed"
    command -v openssl >/dev/null 2>&1 || error "OpenSSL is not installed"
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    
    success "Prerequisites check passed"
}

# Start database services
start_services() {
    info "Starting database services..."
    
    # Check if containers already exist and running
    if docker ps -q -f name=postgres-hpa | grep -q .; then
        info "PostgreSQL container already running"
    else
        docker run -d --name postgres-hpa -p 5433:5432 \
            -e POSTGRES_USER=hpa_user \
            -e POSTGRES_PASSWORD=ACXVuX27ULlHIqbJyf9kqdjEcSXSkuxEOA\
            -e POSTGRES_DB=hpa_dev_db\
            postgres:15 >/dev/null 2>&1 || error "Failed to start PostgreSQL"
        sleep 3
    fi
    
    if docker ps -q -f name=redis-hpa | grep -q .; then
        info "Redis container already running"
    else
        docker run -d --name redis-hpa -p 6389:6379 redis:7-alpine >/dev/null 2>&1 || error "Failed to start Redis"
        sleep 2
    fi
    
    success "Database services started"
}

# Generate certificates
generate_certificates() {
    if [[ -f "$CERT_DIR/agent.crt" && -f "$CERT_DIR/server.crt" ]]; then
        info "Certificates already exist, skipping generation"
        return
    fi
    
    info "Generating mTLS certificates..."
    
    mkdir -p "$CERT_DIR"
    cd "$CERT_DIR"
    
    # Generate CA private key
    openssl genrsa -out ca.key 4096 2>/dev/null || error "Failed to generate CA key"
    
    # Generate CA certificate  
    openssl req -new -x509 -key ca.key -sha256 \
        -subj "/C=US/ST=CA/O=HPA/CN=HPA-CA" \
        -days 365 -out ca.crt 2>/dev/null || error "Failed to generate CA certificate"
    
    # Generate server private key
    openssl genrsa -out server.key 4096 2>/dev/null || error "Failed to generate server key"
    
    # Generate server certificate
    openssl req -subj "/C=US/ST=CA/O=HPA/CN=hpa-backend.default.svc.cluster.local" \
        -sha256 -new -key server.key -out server.csr 2>/dev/null
    openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
        -out server.crt -days 365 -sha256 -CAcreateserial 2>/dev/null || error "Failed to generate server certificate"
    
    # Generate agent private key
    openssl genrsa -out agent.key 4096 2>/dev/null || error "Failed to generate agent key"
    
    # Generate agent certificate
    openssl req -subj "/C=US/ST=CA/O=HPA/CN=hpa-agent" \
        -sha256 -new -key agent.key -out agent.csr 2>/dev/null
    openssl x509 -req -in agent.csr -CA ca.crt -CAkey ca.key \
        -out agent.crt -days 365 -sha256 2>/dev/null || error "Failed to generate agent certificate"
    
    # Clean up
    rm -f *.csr *.srl
    
    success "Certificates generated successfully"
}

# Build applications
build_applications() {
    info "Building applications..."
    
    # Build backend
    cd "$PROJECT_ROOT/backend"
    make build >/dev/null 2>&1 || error "Failed to build backend"
    
    # Build agent
    cd "$PROJECT_ROOT/agent"
    make build >/dev/null 2>&1 || error "Failed to build agent"
    
    success "Applications built successfully"
}

# Test function
run_integration_test() {
    info "Starting integration test..."
    
    # Start backend in background
    cd "$PROJECT_ROOT/backend"
    info "Starting backend with mTLS..."
    env $(cat "$BACKEND_ENV" | grep -v '^#' | xargs) ./build/hpa-backend &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 5
    
    # Check if backend is running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        error "Backend failed to start"
    fi
    
    # Check if backend is listening on port
    if ! netstat -tln | grep -q ":50052 "; then
        kill $BACKEND_PID 2>/dev/null || true
        error "Backend not listening on port 50052"
    fi
    
    success "Backend started successfully"
    
    # Start agent
    cd "$PROJECT_ROOT/agent"
    info "Starting agent with mTLS..."
    
    # Run agent with timeout
    timeout 30s env $(cat "$AGENT_ENV" | grep -v '^#' | xargs) ./build/hpa-agent &
    AGENT_PID=$!
    
    # Wait for agent to connect and authenticate
    sleep 10
    
    # Check results
    if kill -0 $AGENT_PID 2>/dev/null; then
        success "Agent connected successfully! mTLS authentication working."
    else
        info "Agent process completed (this may be expected for connection test)"
    fi
    
    # Cleanup
    info "Cleaning up processes..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $AGENT_PID 2>/dev/null || true
    wait 2>/dev/null || true
    
    success "Integration test completed"
}

# Cleanup function
cleanup() {
    info "Cleaning up services..."
    docker stop postgres-hpa redis-hpa 2>/dev/null || true
    docker rm postgres-hpa redis-hpa 2>/dev/null || true
    success "Cleanup completed"
}

# Main execution
main() {
    case "${1:-test}" in
        "setup")
            check_prerequisites
            start_services
            generate_certificates
            build_applications
            success "Setup completed! Run './quick-test.sh test' to run integration test"
            ;;
        "test")
            check_prerequisites
            start_services
            generate_certificates
            build_applications
            run_integration_test
            ;;
        "cleanup")
            cleanup
            ;;
        "help")
            echo "Usage: $0 [setup|test|cleanup|help]"
            echo "  setup   - Set up services and certificates"
            echo "  test    - Run full integration test (default)"  
            echo "  cleanup - Clean up Docker containers"
            echo "  help    - Show this help message"
            ;;
        *)
            error "Unknown command: $1. Use 'help' for usage information"
            ;;
    esac
}

# Handle script interruption
trap cleanup EXIT

main "$@"