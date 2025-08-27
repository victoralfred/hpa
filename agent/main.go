package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	pb "github.com/victoralfred/hpa-agent/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Agent represents the HPA cluster agent
type Agent struct {
	// Configuration
	clusterID    string
	tenantID     string
	agentToken   string
	serverAddr   string
	agentVersion string

	// Connection
	conn   *grpc.ClientConn
	client pb.AgentServiceClient
	stream pb.AgentService_ConnectClient

	// State
	connected bool
	sessionID string
}

// Config holds agent configuration from environment
type Config struct {
	// Required
	ClusterID  string
	TenantID   string
	AgentToken string
	
	// Server connection
	GRPCEndpoint string
	
	// Optional
	AgentVersion      string
	HeartbeatInterval time.Duration
	LogLevel          string
	
	// TLS/mTLS
	TLSEnabled     bool
	TLSCertFile    string
	TLSKeyFile     string
	TLSCAFile      string
	TLSServerName  string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Try to load .env file if it exists
	_ = godotenv.Load()

	config := &Config{
		ClusterID:         os.Getenv("CLUSTER_ID"),
		TenantID:          os.Getenv("TENANT_ID"),
		AgentToken:        os.Getenv("AGENT_TOKEN"),
		GRPCEndpoint:      getEnvOrDefault("GRPC_ENDPOINT", "localhost:50051"),
		AgentVersion:      getEnvOrDefault("AGENT_VERSION", "1.0.0"),
		LogLevel:          getEnvOrDefault("LOG_LEVEL", "info"),
		TLSEnabled:        os.Getenv("TLS_ENABLED") == "true",
		TLSCertFile:       os.Getenv("TLS_CERT_FILE"),
		TLSKeyFile:        os.Getenv("TLS_KEY_FILE"),
		TLSCAFile:         os.Getenv("TLS_CA_FILE"),
		TLSServerName:     os.Getenv("TLS_SERVER_NAME"),
	}

	// Parse heartbeat interval
	heartbeatStr := getEnvOrDefault("HEARTBEAT_INTERVAL", "30s")
	heartbeat, err := time.ParseDuration(heartbeatStr)
	if err != nil {
		return nil, fmt.Errorf("invalid heartbeat interval: %w", err)
	}
	config.HeartbeatInterval = heartbeat

	// Validate required fields
	if config.ClusterID == "" {
		return nil, fmt.Errorf("CLUSTER_ID is required")
	}
	if config.TenantID == "" {
		return nil, fmt.Errorf("TENANT_ID is required")
	}
	if config.AgentToken == "" {
		return nil, fmt.Errorf("AGENT_TOKEN is required")
	}

	return config, nil
}

// NewAgent creates a new agent instance
func NewAgent(config *Config) *Agent {
	return &Agent{
		clusterID:    config.ClusterID,
		tenantID:     config.TenantID,
		agentToken:   config.AgentToken,
		serverAddr:   config.GRPCEndpoint,
		agentVersion: config.AgentVersion,
		connected:    false,
	}
}

// Connect establishes connection to the backend
func (a *Agent) Connect(ctx context.Context, config *Config) error {
	log.Printf("Connecting to backend at %s...", a.serverAddr)

	// Setup dial options
	var opts []grpc.DialOption

	// Configure TLS/mTLS
	if config.TLSEnabled {
		log.Println("TLS enabled, loading credentials...")
		creds, err := a.loadTLSCredentials(config)
		if err != nil {
			return fmt.Errorf("failed to load TLS credentials: %w", err)
		}
		opts = append(opts, grpc.WithTransportCredentials(creds))
	} else {
		log.Println("WARNING: Running without TLS (insecure)")
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}

	// Add keepalive parameters
	opts = append(opts, grpc.WithKeepaliveParams(keepalive.ClientParameters{
		Time:                30 * time.Second,
		Timeout:             10 * time.Second,
		PermitWithoutStream: true,
	}))

	// Establish connection
	conn, err := grpc.DialContext(ctx, a.serverAddr, opts...)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	a.conn = conn
	a.client = pb.NewAgentServiceClient(conn)

	// Wait for connection to be ready
	log.Println("Waiting for connection to be ready...")
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	for {
		state := conn.GetState()
		if state == connectivity.Ready {
			break
		}
		if !conn.WaitForStateChange(ctx, state) {
			return fmt.Errorf("connection timeout")
		}
	}

	log.Println("gRPC connection established")
	return nil
}

// StartStream starts the bidirectional stream with authentication
func (a *Agent) StartStream(ctx context.Context) error {
	// Add JWT token to metadata
	md := metadata.Pairs("authorization", "Bearer "+a.agentToken)
	ctx = metadata.NewOutgoingContext(ctx, md)

	// Create stream
	stream, err := a.client.Connect(ctx)
	if err != nil {
		return fmt.Errorf("failed to create stream: %w", err)
	}

	a.stream = stream
	log.Println("Stream created, sending authentication...")

	// Send authentication message
	authMsg := &pb.AgentMessage{
		MessageId: generateMessageID(),
		Timestamp: timestamppb.Now(),
		Payload: &pb.AgentMessage_Auth{
			Auth: &pb.AuthRequest{
				ClusterId:    a.clusterID,
				AgentToken:   a.agentToken,
				AgentVersion: a.agentVersion,
				ClusterInfo: &pb.ClusterInfo{
					KubernetesVersion: "1.25.0", // TODO: Get actual version
					Provider:         os.Getenv("CLUSTER_PROVIDER"),
					Region:          os.Getenv("CLUSTER_REGION"),
				},
			},
		},
	}

	if err := stream.Send(authMsg); err != nil {
		return fmt.Errorf("failed to send auth message: %w", err)
	}

	// Wait for authentication response
	resp, err := stream.Recv()
	if err != nil {
		return fmt.Errorf("failed to receive auth response: %w", err)
	}

	// Handle auth response
	if authResp := resp.GetAuth(); authResp != nil {
		if !authResp.Authenticated {
			return fmt.Errorf("authentication failed: %s", authResp.Message)
		}
		a.sessionID = authResp.SessionId
		a.connected = true
		log.Printf("✓ Authentication successful! Session ID: %s", authResp.SessionId)
		return nil
	}

	return fmt.Errorf("unexpected response type: %T", resp.Payload)
}

// SendHeartbeat sends a heartbeat to the server
func (a *Agent) SendHeartbeat() error {
	if !a.connected || a.stream == nil {
		return fmt.Errorf("not connected")
	}

	msg := &pb.AgentMessage{
		MessageId: generateMessageID(),
		Timestamp: timestamppb.Now(),
		Payload: &pb.AgentMessage_Status{
			Status: &pb.StatusUpdate{
				ClusterId: a.clusterID,
				Status:    pb.ClusterStatus_CLUSTER_STATUS_HEALTHY,
				Message:   "Agent operational",
				Health: &pb.ClusterHealth{
					ApiServerHealthy:         true,
					EtcdHealthy:             true,
					ControllerManagerHealthy: true,
					SchedulerHealthy:        true,
					LastCheck:               timestamppb.Now(),
				},
			},
		},
	}

	if err := a.stream.Send(msg); err != nil {
		return fmt.Errorf("failed to send heartbeat: %w", err)
	}

	log.Printf("♥ Heartbeat sent at %s", time.Now().Format(time.RFC3339))
	return nil
}

// ListenForMessages listens for messages from the server
func (a *Agent) ListenForMessages(ctx context.Context) {
	log.Println("Listening for server messages...")
	
	for {
		select {
		case <-ctx.Done():
			return
		default:
			msg, err := a.stream.Recv()
			if err != nil {
				log.Printf("Error receiving message: %v", err)
				a.connected = false
				return
			}

			// Handle different message types
			switch payload := msg.Payload.(type) {
			case *pb.ServerMessage_Ack:
				log.Printf("← Received ACK for message: %s", payload.Ack.MessageId)
				
			case *pb.ServerMessage_ScalingIntent:
				log.Printf("← Received scaling intent: %s", payload.ScalingIntent.IntentId)
				// TODO: Implement scaling
				
			case *pb.ServerMessage_ConfigUpdate:
				log.Printf("← Received config update: %s", payload.ConfigUpdate.ConfigId)
				// TODO: Apply config
				
			case *pb.ServerMessage_Command:
				log.Printf("← Received command: %s", payload.Command.Type.String())
				// TODO: Execute command
				
			default:
				log.Printf("← Received message type: %T", payload)
			}
		}
	}
}

// RunHeartbeatLoop runs the heartbeat loop
func (a *Agent) RunHeartbeatLoop(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if a.connected {
				if err := a.SendHeartbeat(); err != nil {
					log.Printf("Heartbeat failed: %v", err)
					a.connected = false
				}
			}
		}
	}
}

// loadTLSCredentials loads TLS credentials for mTLS
func (a *Agent) loadTLSCredentials(config *Config) (credentials.TransportCredentials, error) {
	if config.TLSCAFile != "" && config.TLSCertFile != "" && config.TLSKeyFile != "" {
		// mTLS with client certificate
		log.Printf("Loading mTLS credentials (cert: %s)", config.TLSCertFile)
		
		// TODO: Implement full mTLS loading
		// For now, use CA-only TLS
		return credentials.NewClientTLSFromFile(config.TLSCAFile, config.TLSServerName)
	} else if config.TLSCAFile != "" {
		// TLS with server verification only
		log.Printf("Loading TLS credentials (CA: %s)", config.TLSCAFile)
		return credentials.NewClientTLSFromFile(config.TLSCAFile, config.TLSServerName)
	}
	
	// System default TLS
	return credentials.NewTLS(nil), nil
}

// Disconnect closes the connection
func (a *Agent) Disconnect() {
	log.Println("Disconnecting from backend...")
	
	if a.stream != nil {
		a.stream.CloseSend()
	}
	
	if a.conn != nil {
		a.conn.Close()
	}
	
	a.connected = false
	log.Println("Disconnected")
}

// Run starts the agent with reconnection logic
func (a *Agent) Run(ctx context.Context, config *Config) {
	reconnectDelay := time.Second
	maxReconnectDelay := time.Minute

	for {
		select {
		case <-ctx.Done():
			return
		default:
			// Connect to backend
			if err := a.Connect(ctx, config); err != nil {
				log.Printf("Connection failed: %v", err)
				log.Printf("Retrying in %s...", reconnectDelay)
				time.Sleep(reconnectDelay)
				
				// Exponential backoff
				reconnectDelay *= 2
				if reconnectDelay > maxReconnectDelay {
					reconnectDelay = maxReconnectDelay
				}
				continue
			}

			// Start stream
			if err := a.StartStream(ctx); err != nil {
				log.Printf("Stream failed: %v", err)
				a.Disconnect()
				time.Sleep(reconnectDelay)
				continue
			}

			// Reset reconnect delay on successful connection
			reconnectDelay = time.Second

			// Start heartbeat in background
			heartbeatCtx, cancelHeartbeat := context.WithCancel(ctx)
			go a.RunHeartbeatLoop(heartbeatCtx, config.HeartbeatInterval)

			// Listen for messages (blocks until error or disconnect)
			a.ListenForMessages(heartbeatCtx)

			// Cancel heartbeat and disconnect
			cancelHeartbeat()
			a.Disconnect()

			// Wait before reconnecting
			log.Printf("Connection lost, reconnecting in %s...", reconnectDelay)
			time.Sleep(reconnectDelay)
		}
	}
}

// Helper functions
func generateMessageID() string {
	return fmt.Sprintf("msg-%d", time.Now().UnixNano())
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	log.Println("=== HPA Cluster Agent Starting ===")

	// Load configuration
	config, err := LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	log.Printf("Configuration loaded:")
	log.Printf("  Cluster ID: %s", config.ClusterID)
	log.Printf("  Tenant ID: %s", config.TenantID)
	log.Printf("  Server: %s", config.GRPCEndpoint)
	log.Printf("  TLS: %v", config.TLSEnabled)
	log.Printf("  Heartbeat: %s", config.HeartbeatInterval)

	// Create agent
	agent := NewAgent(config)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("\nShutdown signal received")
		cancel()
	}()

	// Run agent with automatic reconnection
	agent.Run(ctx, config)
	
	// Clean shutdown
	agent.Disconnect()
	log.Println("Agent stopped")
}