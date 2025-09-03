#!/bin/bash
set -e

echo "=== Debug Agent-Backend Connection ==="

# Load environment
source test_backend_mtls.env

echo "1. Environment variables loaded:"
echo "   GRPC_TLS_ENABLED=$GRPC_TLS_ENABLED"
echo "   GRPC_MTLS_ENABLED=$GRPC_MTLS_ENABLED"
echo "   GRPC_PORT=$GRPC_PORT"

echo ""
echo "2. Starting backend in background..."
cd backend
./build/hpa-backend &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to fully start
sleep 8

echo ""
echo "3. Checking if backend is listening on port 50052..."
if netstat -tln | grep -q ":50052 "; then
    echo "   ✅ Backend is listening on port 50052"
else
    echo "   ❌ Backend is NOT listening on port 50052"
    netstat -tln | grep ":50" || echo "   No processes listening on 50xx ports"
fi

echo ""
echo "4. Testing gRPC connection with grpcurl..."
if command -v grpcurl >/dev/null 2>&1; then
    timeout 5s grpcurl -plaintext localhost:50052 list || echo "   Connection failed or timeout"
else
    echo "   grpcurl not available, skipping connection test"
fi

echo ""
echo "5. Starting agent and monitoring connection..."
cd ../agent
source ../test_agent_mtls.env

echo "   Agent environment:"
echo "   GRPC_ENDPOINT=$GRPC_ENDPOINT"
echo "   TLS_ENABLED=$TLS_ENABLED"
echo "   AGENT_TOKEN set: $(if [[ -n "$AGENT_TOKEN" ]]; then echo "Yes"; else echo "No"; fi)"

echo ""
echo "   Starting agent (10 second timeout)..."
timeout 10s ./build/hpa-agent || echo "   Agent timeout or connection failed"

echo ""
echo "6. Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
wait 2>/dev/null || true
echo "   Cleanup complete"