package integration

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	agentv1 "github.com/victoralfred/hpa-shared/proto/agent/v1"
)

// TestSimpleGRPCConnectivity tests basic gRPC connectivity between agent and backend
func TestSimpleGRPCConnectivity(t *testing.T) {
	t.Log("Starting simple gRPC connectivity test")

	// Create mock services
	authService := NewMockAuthService()
	clusterService := NewMockClusterService()
	metricsService := NewMockMetricsService()

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
			t.Logf("Server error: %v", err)
		}
	}()
	
	// Wait for server to be ready
	time.Sleep(100 * time.Millisecond)
	defer server.Stop()

	t.Logf("Mock server started at %s", serverAddr)

	// Create client connection
	conn, err := grpc.Dial(serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	require.NoError(t, err)
	defer conn.Close()

	client := agentv1.NewAgentServiceClient(conn)

	// Test 1: Register Cluster
	registerReq := &agentv1.RegisterClusterRequest{
		Name:     "test-cluster-1",
		TenantId: "tenant-1",
		Region:   "us-east-1",
		Provider: "test",
		Labels: map[string]string{
			"environment": "test",
			"version":     "v1.0.0",
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	registerResp, err := client.RegisterCluster(ctx, registerReq)
	require.NoError(t, err)
	require.NotEmpty(t, registerResp.ClusterId)
	require.NotEmpty(t, registerResp.AgentToken)
	
	t.Logf("Cluster registered with ID: %s", registerResp.ClusterId)

	// Test 2: Heartbeat
	heartbeatReq := &agentv1.HeartbeatRequest{
		ClusterId: registerResp.ClusterId,
		SessionId: "test-session-1",
	}

	heartbeatResp, err := client.Heartbeat(ctx, heartbeatReq)
	require.NoError(t, err)
	require.True(t, heartbeatResp.Acknowledged)
	
	t.Logf("Heartbeat acknowledged at: %s", heartbeatResp.ServerTime.AsTime())

	// Test 3: Report Metrics (simplified)
	metricsReq := &agentv1.MetricsReportRequest{
		ClusterId: registerResp.ClusterId,
		SessionId: "test-session-1",
		Reports: []*agentv1.MetricsReport{
			{
				ClusterId: registerResp.ClusterId,
				WorkloadMetrics: []*agentv1.WorkloadMetric{
					{
						Namespace:    "default",
						WorkloadName: "test-app",
						WorkloadType: "deployment",
						Replicas:     3,
					},
				},
			},
		},
	}

	metricsResp, err := client.ReportMetrics(ctx, metricsReq)
	require.NoError(t, err)
	require.True(t, metricsResp.Accepted)
	require.Equal(t, int32(1), metricsResp.ProcessedCount)
	
	t.Logf("Metrics report accepted, processed %d reports", metricsResp.ProcessedCount)

	// Test 4: Report Events (simplified)
	eventsReq := &agentv1.EventsReportRequest{
		ClusterId: registerResp.ClusterId,
		SessionId: "test-session-1",
		Events: []*agentv1.KubernetesEvent{
			{
				Namespace: "default",
				Name:      "test-event",
				Kind:      "Pod",
				Type:      "Normal",
				Reason:    "Created",
				Message:   "Pod created successfully",
			},
		},
	}

	eventsResp, err := client.ReportEvents(ctx, eventsReq)
	require.NoError(t, err)
	require.True(t, eventsResp.Accepted)
	require.Equal(t, int32(1), eventsResp.ProcessedCount)
	
	t.Logf("Events report accepted, processed %d events", eventsResp.ProcessedCount)

	// Verify mock services received the data
	receivedMetrics := metricsService.GetReceivedMetrics()
	require.Len(t, receivedMetrics, 1)
	
	receivedEvents := metricsService.GetReceivedEvents()
	require.Len(t, receivedEvents, 1)

	t.Log("✅ Simple gRPC connectivity test passed")
}

// TestBidirectionalStreaming tests the Connect streaming RPC
func TestBidirectionalStreaming(t *testing.T) {
	t.Log("Starting bidirectional streaming test")

	// Create mock services
	authService := NewMockAuthService()
	clusterService := NewMockClusterService()
	metricsService := NewMockMetricsService()

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
			t.Logf("Server error: %v", err)
		}
	}()
	
	// Wait for server to be ready
	time.Sleep(100 * time.Millisecond)
	defer server.Stop()

	t.Logf("Mock server started at %s", serverAddr)

	// Create client connection
	conn, err := grpc.Dial(serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	require.NoError(t, err)
	defer conn.Close()

	client := agentv1.NewAgentServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Start bidirectional streaming
	stream, err := client.Connect(ctx)
	require.NoError(t, err)

	// Send auth message
	authMsg := &agentv1.AgentMessage{
		MessageId: "auth-001",
		Payload: &agentv1.AgentMessage_Auth{
			Auth: &agentv1.AuthRequest{
				ClusterId:  "test-cluster-1",
				AgentToken: "test-jwt-token",
			},
		},
	}

	err = stream.Send(authMsg)
	require.NoError(t, err)

	// Receive auth response
	serverMsg, err := stream.Recv()
	require.NoError(t, err)
	require.NotNil(t, serverMsg.GetAuth())
	require.True(t, serverMsg.GetAuth().Authenticated)

	t.Logf("Authentication successful, session ID: %s", serverMsg.GetAuth().SessionId)

	// Send metrics message
	metricsMsg := &agentv1.AgentMessage{
		MessageId: "metrics-001",
		Payload: &agentv1.AgentMessage_Metrics{
			Metrics: &agentv1.MetricsReport{
				ClusterId: "test-cluster-1",
				WorkloadMetrics: []*agentv1.WorkloadMetric{
					{
						Namespace:    "default",
						WorkloadName: "streaming-test-app",
						WorkloadType: "deployment",
						Replicas:     2,
					},
				},
			},
		},
	}

	err = stream.Send(metricsMsg)
	require.NoError(t, err)

	// Receive acknowledgment
	ackMsg, err := stream.Recv()
	require.NoError(t, err)
	require.NotNil(t, ackMsg.GetAck())
	require.True(t, ackMsg.GetAck().Success)

	t.Logf("Metrics acknowledged: %s", ackMsg.GetAck().Message)

	// Close stream
	err = stream.CloseSend()
	require.NoError(t, err)

	t.Log("✅ Bidirectional streaming test passed")
}