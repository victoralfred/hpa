# HPA Agent-Backend Integration Tests

This directory contains comprehensive integration tests for the HPA (Horizontal Pod Autoscaler) multi-tenant autoscaling system, testing the interaction between the agent and backend components.

## Overview

The integration tests verify end-to-end functionality across the entire HPA system, including:

- **gRPC Communication**: Bidirectional streaming between agent and backend
- **Authentication & Authorization**: JWT token validation and mTLS security
- **Metrics Collection & Streaming**: Real-time metrics from multiple sources
- **Event Processing**: Kubernetes event streaming and processing
- **Agent Lifecycle**: Registration, heartbeat, and connection management
- **Scaling Operations**: Scaling intent delivery and response handling
- **Performance & Resilience**: Load testing and error recovery
- **Data Integrity**: Message transmission and processing accuracy

## Available Tests

### Core Functionality Tests

1. **TestAgentBackendConnectivity** - Basic gRPC connection establishment
2. **TestMetricsReporting** - End-to-end metrics collection and streaming
3. **TestEventStreaming** - Kubernetes event processing pipeline
4. **TestAgentRegistrationAndHeartbeat** - Agent lifecycle management
5. **TestBidirectionalCommunication** - Two-way message exchange
6. **TestErrorHandlingAndResilience** - Failure scenarios and recovery
7. **TestConcurrentOperations** - Multi-threaded operation handling

### Performance & Load Tests

8. **TestPerformanceUnderLoad** - High-throughput data processing
9. **TestConcurrentOperations** - Concurrent client handling
10. **BenchmarkMetricsProcessing** - Performance benchmarking

### Security Tests

11. **TestSecurityAndAuthentication** - Token validation and security
12. **TestDataIntegrity** - Message integrity and validation

## Quick Start

### Prerequisites

- Go 1.21 or later
- Docker and Docker Compose (for containerized tests)
- Access to backend and agent source code

### Running Tests

#### 1. Basic Integration Tests
```bash
# Run all integration tests
make test

# Run with verbose output
make test-verbose

# Run specific test
make test-single TEST=TestAgentBackendConnectivity
```

#### 2. Docker-based Tests
```bash
# Run tests in isolated containers
make docker-test

# This starts:
# - PostgreSQL database
# - Redis cache
# - Backend service
# - Mock Kubernetes API
# - Integration test runner
```

#### 3. Performance Testing
```bash
# Run performance-focused tests
make test-performance

# Run with race detection
make test-race
```

#### 4. Coverage Analysis
```bash
# Generate coverage report
make test-coverage

# View coverage.html in browser
```

## Test Environment Configuration

### Environment Variables

The tests use the following environment variables:

```bash
# Test Configuration
INTEGRATION_TEST_ENV=development    # Test environment (development/docker)
LOG_LEVEL=info                     # Logging level (debug/info/warn/error)
METRICS_INTERVAL=1s               # Metrics collection interval
TEST_TIMEOUT=120s                 # Individual test timeout

# Backend Connection
BACKEND_GRPC_ADDR=localhost:9090   # Backend gRPC address
BACKEND_HTTP_ADDR=localhost:8080   # Backend HTTP address

# Authentication
TEST_JWT_TOKEN=test-jwt-token      # Test authentication token
TEST_CLUSTER_ID=test-cluster-1     # Test cluster identifier

# Mock Services (for Docker tests)
MOCK_K8S_API_ADDR=localhost:8443   # Mock Kubernetes API
MOCK_PROMETHEUS_ADDR=localhost:9091 # Mock Prometheus
```

### Test Data Generation

The tests use configurable data generators:

```go
// Generate test metrics
generator := NewTestDataGenerator()
metricsReport := generator.GenerateMetricsReport("cluster-1", 100)

// Generate test events
eventReport := generator.GenerateEventReport("cluster-1", 50)

// Generate status updates
statusUpdate := generator.GenerateStatusUpdate("cluster-1")
```

## Test Architecture

### Components

```
┌─────────────────┐    ┌─────────────────┐
│ Integration     │    │ Backend Server  │
│ Test Suite      │◄──►│ (gRPC + HTTP)   │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
         ▲                       ▲
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Mock Agent      │    │ Database        │
│ Components      │    │ (PostgreSQL)    │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
```

### Test Flow

1. **Setup Phase**
   - Start backend server with test configuration
   - Initialize mock services (K8s API, Prometheus)
   - Create agent components (streaming client, collectors)
   - Establish authentication credentials

2. **Test Execution**
   - Execute individual test scenarios
   - Verify expected behavior and responses
   - Collect metrics and performance data
   - Handle error cases and edge conditions

3. **Teardown Phase**
   - Close connections and stop services
   - Clean up test data and resources
   - Generate test reports and coverage data

### Mock Components

The tests include comprehensive mock implementations:

- **MockAuthService**: JWT token validation
- **MockClusterService**: Cluster registration and management
- **MockMetricsService**: Metrics storage and processing
- **MockMetricsCollector**: Test data generation
- **TestDataGenerator**: Consistent test data creation

## Performance Benchmarks

### Expected Performance Metrics

- **Throughput**: > 1,000 data points/second
- **Latency**: < 100ms for message processing
- **Memory Usage**: < 100MB during normal operation
- **Connection Handling**: > 100 concurrent connections
- **Error Rate**: < 1% under normal conditions

### Benchmark Tests

```bash
# Run performance benchmarks
make benchmark

# Results include:
# - Message processing throughput
# - Memory allocation patterns
# - CPU utilization
# - Network bandwidth usage
```

## Development Workflow

### Adding New Tests

1. **Create Test Function**
```go
func TestNewFeature(t *testing.T) {
    suite := SetupTestSuite(t)
    defer suite.TearDown(t)
    
    // Test implementation
}
```

2. **Update Test Runner**
```go
// Add to RunAllTests in test_runner.go
{"New_Feature", TestNewFeature},
```

3. **Add Test Documentation**
```markdown
## TestNewFeature
Tests the new feature functionality including:
- Feature setup and initialization
- Expected behavior verification
- Error handling and edge cases
```

### Debugging Tests

1. **Verbose Logging**
```bash
LOG_LEVEL=debug make test-verbose
```

2. **Single Test Execution**
```bash
make test-single TEST=TestSpecificFeature
```

3. **Docker Inspection**
```bash
# View running containers
docker-compose -f docker-compose.test.yml ps

# View logs
docker-compose -f docker-compose.test.yml logs backend
```

### Continuous Integration

The tests are designed for CI/CD integration:

```yaml
# GitHub Actions example
- name: Run Integration Tests
  run: |
    make validate-env
    make test-coverage
    make test-race
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.out
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify backend is running: `curl http://localhost:8080/health`
   - Check port availability: `netstat -tulpn | grep :9090`
   - Review firewall settings

2. **Authentication Failures**
   - Verify JWT token configuration
   - Check token expiration
   - Review auth service logs

3. **Test Timeouts**
   - Increase TEST_TIMEOUT environment variable
   - Check system resource usage
   - Review test parallelization settings

4. **Docker Issues**
   - Clean up: `make clean && docker system prune`
   - Rebuild images: `docker-compose build --no-cache`
   - Check logs: `docker-compose logs -f`

### Debug Commands

```bash
# Validate environment
make validate-env

# Run smoke test
make smoke-test

# Check service health
curl http://localhost:8080/health

# View test logs
tail -f test.log
```

## Contributing

### Guidelines

1. **Test Coverage**: Maintain > 80% coverage
2. **Performance**: Ensure tests complete within timeout
3. **Isolation**: Tests must not depend on external state
4. **Documentation**: Update README for new test scenarios
5. **Error Handling**: Include negative test cases

### Code Style

- Follow Go conventions and gofmt formatting
- Use descriptive test names and comments
- Include setup and teardown for each test
- Implement proper error handling and assertions
- Add performance benchmarks for critical paths

### Review Process

1. Run full test suite: `make test-coverage test-race`
2. Update documentation for new features
3. Verify Docker tests pass: `make docker-test`
4. Check performance regressions: `make benchmark`
5. Submit PR with test results and coverage report

## Monitoring and Observability

The integration tests include comprehensive monitoring:

- **Metrics Collection**: Real-time performance metrics
- **Logging**: Structured logs with correlation IDs
- **Tracing**: Request tracing across components
- **Health Checks**: Service availability monitoring
- **Alerting**: Failure detection and notification

This ensures reliable testing and early detection of issues in the HPA system.