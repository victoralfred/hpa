#!/bin/bash
set -e

# Load environment variables
source test_backend_mtls.env

echo "Testing mTLS configuration:"
echo "GRPC_TLS_ENABLED=$GRPC_TLS_ENABLED"
echo "GRPC_MTLS_ENABLED=$GRPC_MTLS_ENABLED"
echo "GRPC_MTLS_SERVER_CERT=$GRPC_MTLS_SERVER_CERT"

# Start backend with timeout and capture gRPC server log
timeout 10s ./backend/build/hpa-backend 2>&1 | grep -A1 -B1 "Starting gRPC server" || echo "Timeout reached"