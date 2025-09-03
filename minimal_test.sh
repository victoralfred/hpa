#!/bin/bash
set -e

PROJECT_ROOT="/home/voseghale/projects/hpa"
BACKEND_ENV="$PROJECT_ROOT/test_backend_mtls.env"
AGENT_ENV="$PROJECT_ROOT/test_agent_mtls.env"

echo "=== Minimal Agent-Backend Test ==="

# Clean up any existing processes
killall hpa-backend 2>/dev/null || true
sleep 2

echo "1. Environment file contents:"
echo "BACKEND_ENV file:"
cat "$BACKEND_ENV" | grep -E "GRPC_(TLS|MTLS)_ENABLED" | head -5

echo ""
echo "AGENT_ENV file:"
cat "$AGENT_ENV" | grep -E "CLUSTER_ID|TENANT_ID|GRPC_ENDPOINT|TLS_ENABLED" | head -5

echo ""
echo "2. Starting backend (exact same command as quick-test.sh)..."
cd "$PROJECT_ROOT/backend"
env $(cat "$BACKEND_ENV" | grep -v '^#' | xargs) ./build/hpa-backend &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 8

# Check if backend is running and listening
echo ""
echo "3. Checking backend status..."
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend process is running"
else
    echo "❌ Backend process failed"
    exit 1
fi

if netstat -tln | grep -q ":50052 "; then
    echo "✅ Backend is listening on port 50052"
else
    echo "❌ Backend is NOT listening on port 50052"
    netstat -tln | grep ":50" || echo "No processes on 50xx ports"
fi

echo ""
echo "4. Starting agent (exact same command as quick-test.sh)..."
cd "$PROJECT_ROOT/agent"
timeout 15s env $(cat "$AGENT_ENV" | grep -v '^#' | xargs) ./build/hpa-agent &
AGENT_PID=$!
echo "Agent PID: $AGENT_PID"

# Wait for agent to try connecting
sleep 10

echo ""
echo "5. Results:"
if kill -0 $AGENT_PID 2>/dev/null; then
    echo "✅ Agent is still running"
    kill $AGENT_PID 2>/dev/null || true
else
    echo "ℹ️  Agent process completed (may be expected)"
fi

echo ""
echo "6. Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
wait 2>/dev/null || true
echo "✅ Cleanup complete"