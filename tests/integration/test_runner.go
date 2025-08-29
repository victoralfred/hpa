package integration

import (
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"
)

// IntegrationTestRunner manages the execution of integration tests
type IntegrationTestRunner struct {
	logger       *slog.Logger
	testTimeout  time.Duration
	setupTimeout time.Duration
}

// NewIntegrationTestRunner creates a new test runner
func NewIntegrationTestRunner() *IntegrationTestRunner {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	return &IntegrationTestRunner{
		logger:       logger,
		testTimeout:  30 * time.Second,
		setupTimeout: 10 * time.Second,
	}
}

// RunAllTests executes the complete integration test suite
func (r *IntegrationTestRunner) RunAllTests(t *testing.T) {
	r.logger.Info("Starting HPA Agent-Backend Integration Test Suite")
	
	// Note: Individual test functions are run by go test directly
	// This runner provides additional test orchestration capabilities
	r.logger.Info("Integration tests available:", 
		"tests", []string{
			"TestAgentBackendConnectivity",
			"TestMetricsReporting", 
			"TestEventStreaming",
			"TestAgentRegistrationAndHeartbeat",
			"TestBidirectionalCommunication",
			"TestErrorHandlingAndResilience",
			"TestConcurrentOperations",
			"TestPerformanceUnderLoad",
			"TestSecurityAndAuthentication", 
			"TestDataIntegrity",
		})

	// Tests are run individually by the go test framework
	r.logger.Info("Use 'go test -v ./...' to run all integration tests")
}

// Helper functions for test setup and cleanup

func CheckEnvironmentRequirements(t *testing.T) {
	// Check if required environment variables are set
	requiredEnvVars := []string{
		// Add any required environment variables here
	}
	
	for _, envVar := range requiredEnvVars {
		if os.Getenv(envVar) == "" {
			t.Skipf("Skipping integration test: %s environment variable not set", envVar)
		}
	}
}

func WaitForCondition(condition func() bool, timeout time.Duration, interval time.Duration) error {
	deadline := time.Now().Add(timeout)
	
	for time.Now().Before(deadline) {
		if condition() {
			return nil
		}
		time.Sleep(interval)
	}
	
	return fmt.Errorf("condition not met within timeout %v", timeout)
}

func AssertEventually(t *testing.T, condition func() bool, timeout time.Duration, message string) {
	err := WaitForCondition(condition, timeout, 100*time.Millisecond)
	if err != nil {
		t.Errorf("Assertion failed: %s - %v", message, err)
	}
}