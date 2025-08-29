# HPA Agent-Backend Integration Tests Makefile

.PHONY: help test test-verbose test-coverage test-race clean setup docker-test

# Default target
help: ## Show this help message
	@echo "HPA Agent-Backend Integration Tests"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Environment setup
INTEGRATION_TEST_DIR := $(shell pwd)
PROJECT_ROOT := $(shell cd ../.. && pwd)
AGENT_DIR := $(PROJECT_ROOT)/agent
BACKEND_DIR := $(PROJECT_ROOT)/backend

# Go configuration
GO_MODULE := github.com/victoralfred/hpa-integration-tests
GO_VERSION := 1.21
TEST_TIMEOUT := 120s
TEST_PARALLEL := 4

# Test configuration
INTEGRATION_TEST_ENV := development
LOG_LEVEL := info
METRICS_INTERVAL := 1s

# Setup test environment
setup: ## Setup integration test environment
	@echo "Setting up integration test environment..."
	@go mod init $(GO_MODULE) 2>/dev/null || true
	@go mod tidy
	@echo "✅ Integration test environment ready"

# Run integration tests
test: ## Run integration tests
	@echo "Running HPA Agent-Backend integration tests..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=$(LOG_LEVEL) \
	 METRICS_INTERVAL=$(METRICS_INTERVAL) \
	 go test -v -timeout=$(TEST_TIMEOUT) -parallel=$(TEST_PARALLEL) ./...
	@echo "✅ Integration tests completed"

# Run tests with verbose output
test-verbose: ## Run integration tests with verbose output
	@echo "Running integration tests with verbose output..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=debug \
	 METRICS_INTERVAL=$(METRICS_INTERVAL) \
	 go test -v -timeout=$(TEST_TIMEOUT) -parallel=$(TEST_PARALLEL) -args -test.v ./...

# Run tests with coverage
test-coverage: ## Run integration tests with coverage reporting
	@echo "Running integration tests with coverage..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=$(LOG_LEVEL) \
	 METRICS_INTERVAL=$(METRICS_INTERVAL) \
	 go test -v -timeout=$(TEST_TIMEOUT) -parallel=$(TEST_PARALLEL) -coverprofile=coverage.out -covermode=atomic ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report generated: coverage.html"

# Run tests with race detection
test-race: ## Run integration tests with race detection
	@echo "Running integration tests with race detection..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=$(LOG_LEVEL) \
	 METRICS_INTERVAL=$(METRICS_INTERVAL) \
	 go test -v -timeout=$(TEST_TIMEOUT) -parallel=$(TEST_PARALLEL) -race ./...

# Run specific test
test-single: ## Run a specific test (make test-single TEST=TestName)
	@if [ -z "$(TEST)" ]; then \
		echo "Please specify TEST variable: make test-single TEST=TestAgentBackendConnectivity"; \
		exit 1; \
	fi
	@echo "Running test: $(TEST)"
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=debug \
	 go test -v -timeout=$(TEST_TIMEOUT) -run $(TEST) ./...

# Performance tests
test-performance: ## Run performance-focused integration tests
	@echo "Running performance integration tests..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=$(LOG_LEVEL) \
	 METRICS_INTERVAL=100ms \
	 go test -v -timeout=300s -run "TestPerformance|TestConcurrent" ./...

# Security tests
test-security: ## Run security-focused integration tests
	@echo "Running security integration tests..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=$(LOG_LEVEL) \
	 go test -v -timeout=$(TEST_TIMEOUT) -run "TestSecurity|TestAuth" ./...

# Docker-based integration tests
docker-test: ## Run integration tests in Docker containers
	@echo "Running Docker-based integration tests..."
	@docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from integration-tests
	@docker-compose -f docker-compose.test.yml down

# Build test binaries
build: ## Build integration test binaries
	@echo "Building integration test binaries..."
	@go test -c -o integration-tests ./...
	@echo "✅ Integration test binary built: integration-tests"

# Run tests with JSON output for CI
test-json: ## Run tests with JSON output for CI systems
	@echo "Running integration tests with JSON output..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=$(LOG_LEVEL) \
	 go test -v -timeout=$(TEST_TIMEOUT) -parallel=$(TEST_PARALLEL) -json ./... > test-results.json
	@echo "✅ Test results saved to test-results.json"

# Benchmark tests
benchmark: ## Run benchmark tests
	@echo "Running integration benchmarks..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=error \
	 go test -v -timeout=600s -bench=. -benchmem ./...

# Clean up test artifacts
clean: ## Clean up test artifacts and temporary files
	@echo "Cleaning up integration test artifacts..."
	@rm -f coverage.out coverage.html
	@rm -f test-results.json
	@rm -f integration-tests
	@rm -f *.log *.prof
	@docker-compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
	@echo "✅ Clean up completed"

# Development helpers
dev-setup: ## Setup development environment for integration tests
	@echo "Setting up development environment..."
	@$(MAKE) setup
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install gotest.tools/gotestsum@latest
	@echo "✅ Development environment ready"

# Lint integration tests
lint: ## Run linter on integration test code
	@echo "Running linter on integration tests..."
	@golangci-lint run ./...
	@echo "✅ Linting completed"

# Format code
fmt: ## Format integration test code
	@echo "Formatting integration test code..."
	@go fmt ./...
	@goimports -w .
	@echo "✅ Code formatting completed"

# Generate test documentation
docs: ## Generate integration test documentation
	@echo "Generating integration test documentation..."
	@go doc -all . > INTEGRATION_TESTS.md
	@echo "✅ Documentation generated: INTEGRATION_TESTS.md"

# Continuous testing during development
watch: ## Run tests continuously during development
	@echo "Starting continuous testing (press Ctrl+C to stop)..."
	@which fswatch >/dev/null 2>&1 || (echo "fswatch not installed. Install with: brew install fswatch" && exit 1)
	@fswatch -o . | xargs -n1 -I{} make test

# Environment validation
validate-env: ## Validate test environment
	@echo "Validating integration test environment..."
	@go version | grep -q "$(GO_VERSION)" || (echo "Go $(GO_VERSION) required" && exit 1)
	@docker --version >/dev/null 2>&1 || echo "Warning: Docker not available for container tests"
	@kubectl version --client >/dev/null 2>&1 || echo "Warning: kubectl not available for Kubernetes tests"
	@echo "✅ Environment validation completed"

# Quick smoke test
smoke-test: ## Run quick smoke tests to verify basic functionality
	@echo "Running smoke tests..."
	@INTEGRATION_TEST_ENV=$(INTEGRATION_TEST_ENV) \
	 LOG_LEVEL=warn \
	 go test -v -timeout=30s -run "TestAgentBackendConnectivity" ./...
	@echo "✅ Smoke tests completed"

# Test with different Go versions (requires Docker)
test-go-versions: ## Test with multiple Go versions using Docker
	@echo "Testing with multiple Go versions..."
	@for version in 1.20 1.21 1.22; do \
		echo "Testing with Go $$version..."; \
		docker run --rm -v $(PWD):/work -w /work golang:$$version go test -timeout=$(TEST_TIMEOUT) ./... || exit 1; \
	done
	@echo "✅ Multi-version testing completed"

# Generate test report
report: ## Generate comprehensive test report
	@echo "Generating comprehensive test report..."
	@$(MAKE) test-coverage
	@$(MAKE) test-json
	@echo "Test Summary:" > test-report.md
	@echo "=============" >> test-report.md
	@echo "" >> test-report.md
	@echo "Coverage: $(shell go tool cover -func=coverage.out | tail -1 | awk '{print $$3}')" >> test-report.md
	@echo "Results: See test-results.json" >> test-report.md
	@echo "✅ Test report generated: test-report.md"