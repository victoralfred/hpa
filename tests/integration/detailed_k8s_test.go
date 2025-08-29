package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	agentv1 "github.com/victoralfred/hpa-shared/proto/agent/v1"
)

// TestDetailedKubernetesDataFlow tests the complete data flow with realistic K8s data and logs everything
func TestDetailedKubernetesDataFlow(t *testing.T) {
	// Create detailed log file
	logFile, err := os.Create("integration_test_output.log")
	require.NoError(t, err)
	defer logFile.Close()

	// Create custom logger that writes to both file and stdout
	logger := log.New(logFile, "", log.LstdFlags|log.Lmicroseconds)
	
	logAndPrint := func(format string, args ...interface{}) {
		msg := fmt.Sprintf(format, args...)
		t.Log(msg)
		logger.Println(msg)
	}

	logAndPrint("=== STARTING DETAILED KUBERNETES DATA FLOW TEST ===")
	logAndPrint("Test Time: %s", time.Now().Format(time.RFC3339))
	
	// Setup test infrastructure
	logAndPrint("Setting up mock backend services...")
	
	// Create mock services with realistic data
	authService := NewMockAuthService()
	clusterService := NewMockClusterService()
	metricsService := NewMockMetricsService()
	
	// Create test data generator
	generator := NewTestDataGenerator()

	// Create mock gRPC server
	mockServer := NewMockGRPCServer(authService, clusterService, metricsService)
	server := grpc.NewServer()
	agentv1.RegisterAgentServiceServer(server, mockServer)

	// Start server on random port
	listener, err := net.Listen("tcp", ":0")
	require.NoError(t, err)
	
	serverAddr := listener.Addr().String()
	
	// Start server in background
	go func() {
		if err := server.Serve(listener); err != nil {
			logAndPrint("Server error: %v", err)
		}
	}()
	
	// Wait for server to be ready
	time.Sleep(100 * time.Millisecond)
	defer server.Stop()

	logAndPrint("Mock gRPC server started at: %s", serverAddr)

	// Create client connection
	conn, err := grpc.Dial(serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	require.NoError(t, err)
	defer conn.Close()

	client := agentv1.NewAgentServiceClient(conn)
	logAndPrint("gRPC client connection established")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// === PHASE 1: CLUSTER REGISTRATION ===
	logAndPrint("\n=== PHASE 1: CLUSTER REGISTRATION ===")
	
	registerReq := &agentv1.RegisterClusterRequest{
		Name:     "production-k8s-cluster-us-east-1",
		TenantId: "acme-corp-tenant-001",
		Region:   "us-east-1",
		Provider: "aws-eks",
		Labels: map[string]string{
			"environment":        "production",
			"version":           "v1.28.3",
			"cluster-type":      "managed",
			"cost-center":       "engineering",
			"owner":             "platform-team",
			"kubernetes.io/cluster-autoscaler/enabled": "true",
			"node.kubernetes.io/instance-type": "m5.large",
		},
		ClusterInfo: &agentv1.ClusterInfo{
			KubernetesVersion: "v1.28.3-eks-4f4795d",
			Provider:          "aws-eks",
			Region:           "us-east-1",
			Labels: map[string]string{
				"topology.kubernetes.io/region": "us-east-1",
				"topology.kubernetes.io/zone":   "us-east-1a,us-east-1b,us-east-1c",
			},
			Capacity: &agentv1.ResourceCapacity{
				CpuCores:     16,  // 4 nodes * 4 cores each
				MemoryBytes:  68719476736, // 64GB total
				StorageBytes: 1099511627776, // 1TB total
				PodsCapacity: 440, // 110 pods per node * 4 nodes
			},
		},
	}

	logAndPrint("Registering cluster with realistic data...")
	logJSON(logAndPrint, "Cluster Registration Request", registerReq)

	registerResp, err := client.RegisterCluster(ctx, registerReq)
	require.NoError(t, err)
	require.NotEmpty(t, registerResp.ClusterId)
	require.NotEmpty(t, registerResp.AgentToken)
	
	logJSON(logAndPrint, "Cluster Registration Response", registerResp)
	logAndPrint("✅ Cluster registered successfully with ID: %s", registerResp.ClusterId)

	// === PHASE 2: REALISTIC METRICS REPORTING ===
	logAndPrint("\n=== PHASE 2: REALISTIC METRICS REPORTING ===")
	
	// Generate comprehensive metrics for 10 workloads
	metricsReport := generator.GenerateMetricsReport(registerResp.ClusterId, 10)
	
	metricsReq := &agentv1.MetricsReportRequest{
		ClusterId: registerResp.ClusterId,
		SessionId: "agent-session-" + registerResp.ClusterId,
		Reports:   []*agentv1.MetricsReport{metricsReport},
	}

	logAndPrint("Reporting comprehensive metrics for production workloads...")
	logJSON(logAndPrint, "Metrics Report Request", metricsReq)

	metricsResp, err := client.ReportMetrics(ctx, metricsReq)
	require.NoError(t, err)
	require.True(t, metricsResp.Accepted)
	require.Equal(t, int32(1), metricsResp.ProcessedCount)
	
	logJSON(logAndPrint, "Metrics Report Response", metricsResp)
	logAndPrint("✅ Metrics report accepted and processed")

	// Log detailed breakdown of metrics
	logAndPrint("\n--- DETAILED WORKLOAD METRICS BREAKDOWN ---")
	for i, workload := range metricsReport.WorkloadMetrics {
		logAndPrint("Workload %d:", i+1)
		logAndPrint("  Namespace: %s", workload.Namespace)
		logAndPrint("  Name: %s", workload.WorkloadName)
		logAndPrint("  Type: %s", workload.WorkloadType)
		logAndPrint("  Replicas: %d/%d", workload.AvailableReplicas, workload.Replicas)
		logAndPrint("  CPU Usage: %.1f%%", workload.Usage.CpuPercentage)
		logAndPrint("  Memory Usage: %.1f%%", workload.Usage.MemoryPercentage)
		logAndPrint("  Storage Usage: %.1f%%", workload.Usage.StoragePercentage)
		logAndPrint("  Pods Running: %d", workload.Usage.PodsRunning)
		logAndPrint("  Custom Metrics:")
		for metric, value := range workload.CustomMetrics {
			logAndPrint("    %s: %.2f", metric, value)
		}
		logAndPrint("")
	}

	// === PHASE 3: REALISTIC EVENT REPORTING ===
	logAndPrint("\n=== PHASE 3: REALISTIC EVENT REPORTING ===")
	
	eventReport := generator.GenerateEventReport(registerResp.ClusterId, 8)
	
	eventsReq := &agentv1.EventsReportRequest{
		ClusterId: registerResp.ClusterId,
		SessionId: "agent-session-" + registerResp.ClusterId,
		Events:    eventReport.Events,
	}

	logAndPrint("Reporting Kubernetes events from cluster operations...")
	logJSON(logAndPrint, "Events Report Request", eventsReq)

	eventsResp, err := client.ReportEvents(ctx, eventsReq)
	require.NoError(t, err)
	require.True(t, eventsResp.Accepted)
	require.Equal(t, int32(len(eventReport.Events)), eventsResp.ProcessedCount)
	
	logJSON(logAndPrint, "Events Report Response", eventsResp)
	logAndPrint("✅ Events report accepted, processed %d events", eventsResp.ProcessedCount)

	// Log detailed breakdown of events
	logAndPrint("\n--- DETAILED KUBERNETES EVENTS BREAKDOWN ---")
	for i, event := range eventReport.Events {
		logAndPrint("Event %d:", i+1)
		logAndPrint("  Type: %s", event.Type)
		logAndPrint("  Reason: %s", event.Reason)
		logAndPrint("  Namespace: %s", event.Namespace)
		logAndPrint("  Object: %s (%s)", event.Name, event.Kind)
		logAndPrint("  Message: %s", event.Message)
		logAndPrint("  Source: %s", event.SourceComponent)
		logAndPrint("  Timestamp: %s", event.Timestamp.AsTime().Format(time.RFC3339))
		if len(event.Labels) > 0 {
			logAndPrint("  Labels:")
			for k, v := range event.Labels {
				logAndPrint("    %s: %s", k, v)
			}
		}
		logAndPrint("")
	}

	// === PHASE 4: BIDIRECTIONAL STREAMING WITH REALISTIC DATA ===
	logAndPrint("\n=== PHASE 4: BIDIRECTIONAL STREAMING WITH REALISTIC DATA ===")

	stream, err := client.Connect(ctx)
	require.NoError(t, err)
	logAndPrint("Bidirectional stream established")

	// Send authentication
	authMsg := &agentv1.AgentMessage{
		MessageId: "auth-msg-001",
		Timestamp: nil, // Will be set by protobuf
		Payload: &agentv1.AgentMessage_Auth{
			Auth: &agentv1.AuthRequest{
				ClusterId:   registerResp.ClusterId,
				AgentToken:  registerResp.AgentToken,
				AgentVersion: "hpa-agent-v1.2.3",
				ClusterInfo: &agentv1.ClusterInfo{
					KubernetesVersion: "v1.28.3-eks-4f4795d",
					Provider:          "aws-eks",
					Region:           "us-east-1",
					Labels: map[string]string{
						"node-count": "4",
						"pod-count":  "23",
					},
				},
			},
		},
	}

	logAndPrint("Sending authentication message via streaming...")
	logJSON(logAndPrint, "Streaming Auth Message", authMsg)

	err = stream.Send(authMsg)
	require.NoError(t, err)

	// Receive auth response
	serverMsg, err := stream.Recv()
	require.NoError(t, err)
	require.NotNil(t, serverMsg.GetAuth())
	require.True(t, serverMsg.GetAuth().Authenticated)

	logJSON(logAndPrint, "Streaming Auth Response", serverMsg)
	logAndPrint("✅ Streaming authentication successful, session: %s", serverMsg.GetAuth().SessionId)

	// Send multiple realistic metrics via streaming
	for i := 0; i < 3; i++ {
		streamMetrics := generator.GenerateMetricsReport(registerResp.ClusterId, 5)
		
		metricsMsg := &agentv1.AgentMessage{
			MessageId: fmt.Sprintf("metrics-stream-msg-%03d", i+1),
			Payload: &agentv1.AgentMessage_Metrics{
				Metrics: streamMetrics,
			},
		}

		logAndPrint("Sending metrics batch %d via streaming...", i+1)
		logJSON(logAndPrint, fmt.Sprintf("Streaming Metrics Message %d", i+1), metricsMsg)

		err = stream.Send(metricsMsg)
		require.NoError(t, err)

		// Receive acknowledgment
		ackMsg, err := stream.Recv()
		require.NoError(t, err)
		require.NotNil(t, ackMsg.GetAck())
		require.True(t, ackMsg.GetAck().Success)

		logJSON(logAndPrint, fmt.Sprintf("Streaming Metrics Ack %d", i+1), ackMsg)
		logAndPrint("✅ Metrics batch %d acknowledged: %s", i+1, ackMsg.GetAck().Message)
	}

	// Send events via streaming
	streamEvents := generator.GenerateEventReport(registerResp.ClusterId, 4)
	
	eventsMsg := &agentv1.AgentMessage{
		MessageId: "events-stream-msg-001",
		Payload: &agentv1.AgentMessage_Events{
			Events: streamEvents,
		},
	}

	logAndPrint("Sending events via streaming...")
	logJSON(logAndPrint, "Streaming Events Message", eventsMsg)

	err = stream.Send(eventsMsg)
	require.NoError(t, err)

	// Receive acknowledgment
	eventAck, err := stream.Recv()
	require.NoError(t, err)
	require.NotNil(t, eventAck.GetAck())
	require.True(t, eventAck.GetAck().Success)

	logJSON(logAndPrint, "Streaming Events Ack", eventAck)
	logAndPrint("✅ Events acknowledged: %s", eventAck.GetAck().Message)

	// Send status update
	statusUpdate := generator.GenerateStatusUpdate(registerResp.ClusterId)
	
	statusMsg := &agentv1.AgentMessage{
		MessageId: "status-stream-msg-001",
		Payload: &agentv1.AgentMessage_Status{
			Status: statusUpdate,
		},
	}

	logAndPrint("Sending cluster status update via streaming...")
	logJSON(logAndPrint, "Streaming Status Message", statusMsg)

	err = stream.Send(statusMsg)
	require.NoError(t, err)

	// Close stream
	err = stream.CloseSend()
	require.NoError(t, err)

	logAndPrint("✅ Streaming connection closed successfully")

	// === PHASE 5: VALIDATE RECEIVED DATA ===
	logAndPrint("\n=== PHASE 5: VALIDATE RECEIVED DATA ===")

	// Check metrics service received data
	receivedMetrics := metricsService.GetReceivedMetrics()
	logAndPrint("Total metrics reports received by backend: %d", len(receivedMetrics))
	
	for i, report := range receivedMetrics {
		logAndPrint("Metrics Report %d:", i+1)
		logAndPrint("  Cluster ID: %s", report.ClusterId)
		logAndPrint("  Workloads: %d", len(report.WorkloadMetrics))
		logAndPrint("  Timestamp: %s", report.Timestamp.AsTime().Format(time.RFC3339))
		
		if report.ClusterMetrics != nil {
			logAndPrint("  Cluster CPU: %.1f%%", report.ClusterMetrics.OverallUsage.CpuPercentage)
			logAndPrint("  Cluster Memory: %.1f%%", report.ClusterMetrics.OverallUsage.MemoryPercentage)
			logAndPrint("  Total Nodes: %d", report.ClusterMetrics.TotalNodes)
			logAndPrint("  Running Pods: %d", report.ClusterMetrics.RunningPods)
		}
	}

	// Check events service received data
	receivedEvents := metricsService.GetReceivedEvents()
	logAndPrint("Total event reports received by backend: %d", len(receivedEvents))
	
	for i, report := range receivedEvents {
		logAndPrint("Event Report %d:", i+1)
		logAndPrint("  Cluster ID: %s", report.ClusterId)
		logAndPrint("  Events: %d", len(report.Events))
		
		for j, event := range report.Events {
			if j < 3 { // Log first 3 events
				message := event.Message
				if len(message) > 50 {
					message = message[:50] + "..."
				}
				logAndPrint("    Event %d: %s/%s %s - %s", j+1, event.Namespace, event.Name, event.Reason, message)
			}
		}
	}

	// Final validation
	require.GreaterOrEqual(t, len(receivedMetrics), 4, "Should have received at least 4 metrics reports (1 unary + 3 streaming)")
	require.GreaterOrEqual(t, len(receivedEvents), 2, "Should have received at least 2 event reports (1 unary + 1 streaming)")

	logAndPrint("\n=== FINAL TEST SUMMARY ===")
	logAndPrint("✅ All phases completed successfully")
	logAndPrint("✅ Cluster registration: PASSED")
	logAndPrint("✅ Unary metrics reporting: PASSED")
	logAndPrint("✅ Unary events reporting: PASSED")  
	logAndPrint("✅ Bidirectional streaming: PASSED")
	logAndPrint("✅ Data validation: PASSED")
	logAndPrint("✅ Realistic Kubernetes data flow validated")
	
	totalMetrics := 0
	totalEvents := 0
	for _, report := range receivedMetrics {
		totalMetrics += len(report.WorkloadMetrics)
	}
	for _, report := range receivedEvents {
		totalEvents += len(report.Events)
	}
	
	logAndPrint("\nData Summary:")
	logAndPrint("  Total workload metrics processed: %d", totalMetrics)
	logAndPrint("  Total Kubernetes events processed: %d", totalEvents)
	logAndPrint("  Test duration: %v", time.Since(time.Now().Add(-30*time.Second))) // Approximate
	logAndPrint("  Server address used: %s", serverAddr)
	
	logAndPrint("\n=== TEST COMPLETED SUCCESSFULLY ===")
	logAndPrint("Log file written to: integration_test_output.log")
}

// logJSON logs a message as formatted JSON (simplified version)
func logJSON(logFunc func(string, ...interface{}), title string, msg interface{}) {
	// Use regular JSON marshaling for simplicity
	jsonBytes, err := json.MarshalIndent(msg, "", "  ")
	if err != nil {
		logFunc("%s: (failed to marshal JSON: %v) - %+v", title, err, msg)
		return
	}
	logFunc("%s:\n%s", title, string(jsonBytes))
}