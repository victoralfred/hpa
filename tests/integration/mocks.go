package integration

import (
	"context"
	"sync"
	"time"

	"github.com/stretchr/testify/mock"
	"google.golang.org/protobuf/types/known/timestamppb"
	
	"github.com/victoralfred/hpa-agent/pkg/collectors"
	agent "github.com/victoralfred/hpa-shared/proto/agent/v1"
)

// MockAuthService provides authentication for integration tests
type MockAuthService struct {
	mock.Mock
	validTokens map[string]struct{
		TenantID  string
		ClusterID string
	}
	mu sync.RWMutex
}

func NewMockAuthService() *MockAuthService {
	return &MockAuthService{
		validTokens: map[string]struct{
			TenantID  string
			ClusterID string
		}{
			"test-jwt-token": {
				TenantID:  "tenant-1",
				ClusterID: "test-cluster-1",
			},
		},
	}
}

func (m *MockAuthService) ValidateToken(token string) (tenantID, clusterID string, err error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	if tokenInfo, exists := m.validTokens[token]; exists {
		return tokenInfo.TenantID, tokenInfo.ClusterID, nil
	}
	
	args := m.Called(token)
	return args.String(0), args.String(1), args.Error(2)
}

func (m *MockAuthService) SetValidToken(token, tenantID, clusterID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.validTokens[token] = struct {
		TenantID  string
		ClusterID string
	}{TenantID: tenantID, ClusterID: clusterID}
}

// MockClusterService manages cluster operations for integration tests
type MockClusterService struct {
	mock.Mock
	clusters map[string]*ClusterInfo
	mu       sync.RWMutex
}

type ClusterInfo struct {
	ID        string
	TenantID  string
	Status    string
	LastSeen  time.Time
	Metadata  map[string]string
}

func NewMockClusterService() *MockClusterService {
	return &MockClusterService{
		clusters: make(map[string]*ClusterInfo),
	}
}

func (m *MockClusterService) RegisterCluster(ctx context.Context, req *agent.RegisterClusterRequest) (*agent.RegisterClusterResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	cluster := &ClusterInfo{
		ID:       req.Name, // Use Name field instead of ClusterId
		TenantID: req.TenantId,
		Status:   "active",
		LastSeen: time.Now(),
		Metadata: req.Labels, // Use Labels instead of Metadata
	}
	
	m.clusters[req.Name] = cluster
	
	// Default response (no mock framework dependency)
	return &agent.RegisterClusterResponse{
		ClusterId:    req.Name,
		AgentToken:   "test-agent-token",
		GrpcEndpoint: "localhost:9090",
		TlsRequired:  false,
	}, nil
}

func (m *MockClusterService) UpdateClusterStatus(clusterID, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if cluster, exists := m.clusters[clusterID]; exists {
		cluster.Status = status
		cluster.LastSeen = time.Now()
	}
	
	return nil
}

func (m *MockClusterService) GetCluster(clusterID string) (*ClusterInfo, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	cluster, exists := m.clusters[clusterID]
	return cluster, exists
}

// MockMetricsService handles metrics storage and processing for integration tests
type MockMetricsService struct {
	mock.Mock
	receivedMetrics []*agent.MetricsReport
	receivedEvents  []*agent.EventReport
	mu              sync.RWMutex
}

func NewMockMetricsService() *MockMetricsService {
	return &MockMetricsService{
		receivedMetrics: make([]*agent.MetricsReport, 0),
		receivedEvents:  make([]*agent.EventReport, 0),
	}
}

func (m *MockMetricsService) StoreMetrics(ctx context.Context, report *agent.MetricsReport) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.receivedMetrics = append(m.receivedMetrics, report)
	
	return nil
}

func (m *MockMetricsService) StoreEvents(ctx context.Context, report *agent.EventReport) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.receivedEvents = append(m.receivedEvents, report)
	
	return nil
}

func (m *MockMetricsService) GetReceivedMetrics() []*agent.MetricsReport {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// Return copy to avoid race conditions
	result := make([]*agent.MetricsReport, len(m.receivedMetrics))
	copy(result, m.receivedMetrics)
	return result
}

func (m *MockMetricsService) GetReceivedEvents() []*agent.EventReport {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// Return copy to avoid race conditions
	result := make([]*agent.EventReport, len(m.receivedEvents))
	copy(result, m.receivedEvents)
	return result
}

func (m *MockMetricsService) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.receivedMetrics = m.receivedMetrics[:0]
	m.receivedEvents = m.receivedEvents[:0]
}

// MockMetricsCollector provides test metrics for the integration tests
type MockMetricsCollector struct {
	mock.Mock
	name        string
	interval    time.Duration
	enabled     bool
	testMetrics []collectors.Metric
	mu          sync.RWMutex
}

func NewMockMetricsCollector(name string, interval time.Duration) *MockMetricsCollector {
	return &MockMetricsCollector{
		name:        name,
		interval:    interval,
		enabled:     true,
		testMetrics: make([]collectors.Metric, 0),
	}
}

func (m *MockMetricsCollector) Name() string {
	args := m.Called()
	if args.Get(0) != nil {
		return args.String(0)
	}
	return m.name
}

func (m *MockMetricsCollector) Collect(ctx context.Context) ([]collectors.Metric, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).([]collectors.Metric), args.Error(1)
	}
	
	// Return test metrics with updated timestamps
	result := make([]collectors.Metric, len(m.testMetrics))
	for i, metric := range m.testMetrics {
		result[i] = metric
		result[i].Timestamp = time.Now()
	}
	
	return result, nil
}

func (m *MockMetricsCollector) Interval() time.Duration {
	args := m.Called()
	if args.Get(0) != nil {
		return args.Get(0).(time.Duration)
	}
	return m.interval
}

func (m *MockMetricsCollector) IsEnabled() bool {
	args := m.Called()
	if args.Get(0) != nil {
		return args.Bool(0)
	}
	return m.enabled
}

func (m *MockMetricsCollector) Close() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockMetricsCollector) Configure(config interface{}) error {
	args := m.Called(config)
	return args.Error(0)
}

func (m *MockMetricsCollector) SetMetrics(metrics []collectors.Metric) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.testMetrics = make([]collectors.Metric, len(metrics))
	copy(m.testMetrics, metrics)
}

func (m *MockMetricsCollector) SetEnabled(enabled bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.enabled = enabled
}

// MockScalingIntentHandler provides scaling intent handling for tests
type MockScalingIntentHandler struct {
	receivedIntents []*agent.ScalingIntent
	mu              sync.RWMutex
	handler         func(*agent.ScalingIntent)
}

func NewMockScalingIntentHandler() *MockScalingIntentHandler {
	return &MockScalingIntentHandler{
		receivedIntents: make([]*agent.ScalingIntent, 0),
	}
}

func (m *MockScalingIntentHandler) HandleScalingIntent(intent *agent.ScalingIntent) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.receivedIntents = append(m.receivedIntents, intent)
	
	if m.handler != nil {
		m.handler(intent)
	}
}

func (m *MockScalingIntentHandler) SetHandler(handler func(*agent.ScalingIntent)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handler = handler
}

func (m *MockScalingIntentHandler) GetReceivedIntents() []*agent.ScalingIntent {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	result := make([]*agent.ScalingIntent, len(m.receivedIntents))
	copy(result, m.receivedIntents)
	return result
}

func (m *MockScalingIntentHandler) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.receivedIntents = m.receivedIntents[:0]
}

// TestDataGenerator provides consistent test data
type TestDataGenerator struct{}

func NewTestDataGenerator() *TestDataGenerator {
	return &TestDataGenerator{}
}

func (g *TestDataGenerator) GenerateMetricsReport(clusterID string, numMetrics int) *agent.MetricsReport {
	// Realistic Kubernetes workload data
	realWorkloads := []struct {
		namespace    string
		name         string
		workloadType string
		replicas     int32
		cpuPct       float64
		memPct       float64
		storagePct   float64
		podsRunning  int32
	}{
		{"kube-system", "coredns", "deployment", 2, 12.5, 8.3, 5.2, 2},
		{"kube-system", "kube-proxy", "daemonset", 3, 8.1, 4.7, 2.1, 3},
		{"default", "nginx-ingress-controller", "deployment", 1, 45.2, 32.1, 15.8, 1},
		{"monitoring", "prometheus-server", "deployment", 1, 78.3, 82.7, 45.2, 1},
		{"monitoring", "grafana", "deployment", 1, 15.4, 25.8, 8.9, 1},
		{"production", "webapp-frontend", "deployment", 3, 65.2, 48.7, 12.3, 3},
		{"production", "webapp-backend", "deployment", 2, 58.9, 72.4, 28.7, 2},
		{"production", "redis", "statefulset", 1, 23.7, 18.5, 35.2, 1},
		{"production", "postgres", "statefulset", 1, 42.8, 76.3, 68.4, 1},
		{"staging", "test-runner", "job", 0, 0.0, 0.0, 0.0, 0},
		{"logging", "elasticsearch", "statefulset", 3, 89.2, 91.7, 78.9, 3},
		{"logging", "logstash", "deployment", 2, 34.6, 42.1, 25.8, 2},
		{"logging", "kibana", "deployment", 1, 18.9, 28.3, 15.7, 1},
		{"cert-manager", "cert-manager", "deployment", 1, 5.2, 12.8, 3.4, 1},
		{"ingress-nginx", "ingress-nginx-controller", "deployment", 1, 28.7, 35.9, 8.2, 1},
	}
	
	workloadMetrics := make([]*agent.WorkloadMetric, 0)
	
	// Use realistic workload data, cycling through if numMetrics > len(realWorkloads)
	for i := 0; i < numMetrics && i < len(realWorkloads); i++ {
		workload := realWorkloads[i]
		
		workloadMetrics = append(workloadMetrics, &agent.WorkloadMetric{
			Namespace:         workload.namespace,
			WorkloadName:      workload.name,
			WorkloadType:      workload.workloadType,
			Replicas:          workload.replicas,
			AvailableReplicas: workload.replicas, // Assume all replicas are available
			Usage: &agent.ResourceUsage{
				CpuPercentage:     workload.cpuPct,
				MemoryPercentage:  workload.memPct,
				StoragePercentage: workload.storagePct,
				PodsRunning:       workload.podsRunning,
			},
			CustomMetrics: map[string]float64{
				"cpu_usage_cores":          workload.cpuPct * 0.01 * 2.0, // Assume 2 CPU limit
				"memory_usage_bytes":       workload.memPct * 0.01 * 2147483648, // 2GB limit
				"network_rx_bytes_total":   float64(1000000 + i*500000),
				"network_tx_bytes_total":   float64(800000 + i*300000),
				"disk_io_read_bytes_total": float64(50000000 + i*10000000),
				"disk_io_write_bytes_total": float64(25000000 + i*5000000),
				"restarts_total":           float64(i % 3), // Some pods have restarts
			},
		})
	}
	
	// Calculate realistic cluster-level metrics based on workload data
	var totalCpu, totalMem, totalStorage float64
	var totalPods int32 = 0
	
	for _, metric := range workloadMetrics {
		totalCpu += metric.Usage.CpuPercentage
		totalMem += metric.Usage.MemoryPercentage  
		totalStorage += metric.Usage.StoragePercentage
		totalPods += metric.Usage.PodsRunning
	}
	
	avgCpu := totalCpu / float64(len(workloadMetrics))
	avgMem := totalMem / float64(len(workloadMetrics))
	avgStorage := totalStorage / float64(len(workloadMetrics))
	
	return &agent.MetricsReport{
		ClusterId:       clusterID,
		Timestamp:       timestamppb.Now(),
		WorkloadMetrics: workloadMetrics,
		ClusterMetrics: &agent.ClusterMetrics{
			OverallUsage: &agent.ResourceUsage{
				CpuPercentage:     avgCpu,
				MemoryPercentage:  avgMem,
				StoragePercentage: avgStorage,
				PodsRunning:       totalPods,
			},
			TotalNodes:   4, // Realistic cluster size
			ReadyNodes:   4,
			TotalPods:    totalPods,
			RunningPods:  totalPods,
			CustomMetrics: map[string]float64{
				"cluster_cpu_cores_total":        16.0, // 4 nodes * 4 cores each
				"cluster_memory_bytes_total":     68719476736, // 64GB total
				"cluster_storage_bytes_total":    1099511627776, // 1TB total
				"cluster_network_rx_bytes_total": 500000000,
				"cluster_network_tx_bytes_total": 300000000,
				"cluster_pods_pending":           2,
				"cluster_pods_failed":            1,
				"cluster_nodes_not_ready":        0,
			},
		},
	}
}

func (g *TestDataGenerator) GenerateEventReport(clusterID string, numEvents int) *agent.EventReport {
	// Realistic Kubernetes events based on actual cluster operations
	realEvents := []struct {
		namespace       string
		name            string
		kind            string
		eventType       string
		reason          string
		message         string
		sourceComponent string
		labels          map[string]string
	}{
		{
			"kube-system", "coredns-7db6d8ff4d-xk2m7", "Pod", "Normal", "Scheduled",
			"Successfully assigned kube-system/coredns-7db6d8ff4d-xk2m7 to worker-node-01",
			"default-scheduler",
			map[string]string{"app": "coredns", "pod-template-hash": "7db6d8ff4d"},
		},
		{
			"kube-system", "coredns-7db6d8ff4d-xk2m7", "Pod", "Normal", "Pulling",
			"Pulling image \"k8s.gcr.io/coredns/coredns:v1.8.4\"",
			"kubelet",
			map[string]string{"app": "coredns", "pod-template-hash": "7db6d8ff4d"},
		},
		{
			"kube-system", "coredns-7db6d8ff4d-xk2m7", "Pod", "Normal", "Pulled",
			"Successfully pulled image \"k8s.gcr.io/coredns/coredns:v1.8.4\" in 12.34s",
			"kubelet",
			map[string]string{"app": "coredns", "pod-template-hash": "7db6d8ff4d"},
		},
		{
			"kube-system", "coredns-7db6d8ff4d-xk2m7", "Pod", "Normal", "Created",
			"Created container coredns",
			"kubelet",
			map[string]string{"app": "coredns", "pod-template-hash": "7db6d8ff4d"},
		},
		{
			"kube-system", "coredns-7db6d8ff4d-xk2m7", "Pod", "Normal", "Started",
			"Started container coredns",
			"kubelet",
			map[string]string{"app": "coredns", "pod-template-hash": "7db6d8ff4d"},
		},
		{
			"production", "webapp-frontend-deployment-5d4c7f9b8c-pq5rt", "Pod", "Warning", "Failed",
			"Error: ImagePullBackOff - Failed to pull image \"webapp:v2.1.3\": rpc error: code = NotFound",
			"kubelet",
			map[string]string{"app": "webapp-frontend", "version": "v2.1.3"},
		},
		{
			"production", "webapp-frontend-deployment-5d4c7f9b8c-pq5rt", "Pod", "Normal", "BackOff",
			"Back-off restarting failed container",
			"kubelet",
			map[string]string{"app": "webapp-frontend", "version": "v2.1.3"},
		},
		{
			"monitoring", "prometheus-server-6b8d5f4c7d-m9x2k", "Pod", "Warning", "Unhealthy",
			"Readiness probe failed: HTTP probe failed with statuscode: 503",
			"kubelet",
			map[string]string{"app": "prometheus-server", "component": "server"},
		},
		{
			"production", "redis-master-0", "Pod", "Normal", "Scheduled",
			"Successfully assigned production/redis-master-0 to worker-node-03",
			"default-scheduler",
			map[string]string{"app": "redis", "role": "master"},
		},
		{
			"logging", "elasticsearch-master-2", "Pod", "Warning", "FailedMount",
			"Unable to attach or mount volumes: unmounted volumes=[data], unattached volumes=[data elasticsearch-config kube-api-access-xyz]: timed out waiting for the condition",
			"kubelet",
			map[string]string{"app": "elasticsearch", "role": "master"},
		},
		{
			"default", "nginx-ingress-controller", "Deployment", "Normal", "ScalingReplicaSet",
			"Scaled up replica set nginx-ingress-controller-7c6f4c5d8f to 2",
			"deployment-controller",
			map[string]string{"app": "nginx-ingress", "tier": "ingress"},
		},
		{
			"production", "webapp-backend", "Deployment", "Normal", "ScalingReplicaSet",
			"Scaled down replica set webapp-backend-6b9c8f5d4e to 1 from 3",
			"deployment-controller",
			map[string]string{"app": "webapp-backend", "tier": "backend"},
		},
		{
			"kube-system", "kube-proxy-worker-node-02", "Pod", "Warning", "DNSConfigForming",
			"Nameserver limits were exceeded, some nameservers have been omitted",
			"kubelet",
			map[string]string{"controller-revision-hash": "abc123", "pod-template-generation": "1"},
		},
		{
			"cert-manager", "cert-manager-webhook-5f6b7c8d9e-xyz", "Pod", "Normal", "TLSHandshakeComplete",
			"TLS handshake completed successfully for webhook admission",
			"cert-manager-webhook",
			map[string]string{"app": "cert-manager", "component": "webhook"},
		},
		{
			"staging", "test-runner-job-abc123", "Job", "Normal", "SuccessfulCreate",
			"Created pod: test-runner-job-abc123-pod-1",
			"job-controller",
			map[string]string{"controller-uid": "abc-123-def", "job-name": "test-runner-job-abc123"},
		},
	}
	
	events := make([]*agent.KubernetesEvent, 0)
	
	// Use realistic event data, cycling through if numEvents > len(realEvents)
	for i := 0; i < numEvents; i++ {
		event := realEvents[i%len(realEvents)]
		
		events = append(events, &agent.KubernetesEvent{
			Namespace:       event.namespace,
			Name:            event.name,
			Kind:            event.kind,
			Type:            event.eventType,
			Reason:          event.reason,
			Message:         event.message,
			Timestamp:       timestamppb.Now(),
			SourceComponent: event.sourceComponent,
			Labels:          event.labels,
		})
	}
	
	return &agent.EventReport{
		ClusterId: clusterID,
		Events:    events,
	}
}

func (g *TestDataGenerator) GenerateStatusUpdate(clusterID string) *agent.StatusUpdate {
	return &agent.StatusUpdate{
		ClusterId: clusterID,
		Status:    agent.ClusterStatus_CLUSTER_STATUS_HEALTHY,
		Message:   "Kubernetes cluster is operational with all control plane components healthy. 23 pods running across 4 nodes with 2 pods pending deployment.",
		Health: &agent.ClusterHealth{
			ApiServerHealthy:         true,
			EtcdHealthy:              true,
			ControllerManagerHealthy: true,
			SchedulerHealthy:         true,
			LastCheck:                timestamppb.Now(),
			ComponentHealth: []*agent.HealthCheck{
				{
					Component: "kube-apiserver",
					Healthy:   true,
					Message:   "API server responding on port 6443, latency: 12ms",
					Timestamp: timestamppb.Now(),
				},
				{
					Component: "etcd",
					Healthy:   true,
					Message:   "etcd cluster healthy, 3/3 members available, DB size: 45MB",
					Timestamp: timestamppb.Now(),
				},
				{
					Component: "kube-controller-manager",
					Healthy:   true,
					Message:   "Controller manager active, 15 controllers running",
					Timestamp: timestamppb.Now(),
				},
				{
					Component: "kube-scheduler",
					Healthy:   true,
					Message:   "Scheduler active, successfully scheduling pods",
					Timestamp: timestamppb.Now(),
				},
				{
					Component: "coredns",
					Healthy:   true,
					Message:   "DNS resolution working, 2/2 CoreDNS pods ready",
					Timestamp: timestamppb.Now(),
				},
				{
					Component: "kubelet",
					Healthy:   false,
					Message:   "1 out of 4 nodes reporting kubelet issues: worker-node-02 last seen 5min ago",
					Timestamp: timestamppb.Now(),
				},
			},
		},
	}
}

func (g *TestDataGenerator) GenerateScalingIntent(clusterID string) *agent.ScalingIntent {
	return &agent.ScalingIntent{
		IntentId:          "scaling-intent-test-001",
		WorkloadNamespace: "default",
		WorkloadName:      "test-deployment",
		WorkloadType:      "deployment",
		TargetReplicas:    5,
		Reason:            "High CPU utilization detected",
		Strategy: &agent.ScalingStrategy{
			Type:           "rolling",
			MaxSurge:       2,
			MaxUnavailable: 1,
		},
	}
}

// MockGRPCServer implements the AgentService for integration testing
type MockGRPCServer struct {
	agent.UnimplementedAgentServiceServer
	authService    *MockAuthService
	clusterService *MockClusterService
	metricsService *MockMetricsService
}

func NewMockGRPCServer(auth *MockAuthService, cluster *MockClusterService, metrics *MockMetricsService) *MockGRPCServer {
	return &MockGRPCServer{
		authService:    auth,
		clusterService: cluster,
		metricsService: metrics,
	}
}

func (s *MockGRPCServer) RegisterCluster(ctx context.Context, req *agent.RegisterClusterRequest) (*agent.RegisterClusterResponse, error) {
	return s.clusterService.RegisterCluster(ctx, req)
}

func (s *MockGRPCServer) Heartbeat(ctx context.Context, req *agent.HeartbeatRequest) (*agent.HeartbeatResponse, error) {
	return &agent.HeartbeatResponse{
		Acknowledged:    true,
		ServerTime:      timestamppb.Now(),
		NextHeartbeat:   nil, // Use default
	}, nil
}

func (s *MockGRPCServer) ReportMetrics(ctx context.Context, req *agent.MetricsReportRequest) (*agent.MetricsReportResponse, error) {
	for _, report := range req.Reports {
		err := s.metricsService.StoreMetrics(ctx, report)
		if err != nil {
			return &agent.MetricsReportResponse{
				Accepted:       false,
				ProcessedCount: 0,
				Errors:         []string{err.Error()},
			}, nil
		}
	}
	
	return &agent.MetricsReportResponse{
		Accepted:       true,
		ProcessedCount: int32(len(req.Reports)),
		Errors:         nil,
	}, nil
}

func (s *MockGRPCServer) ReportEvents(ctx context.Context, req *agent.EventsReportRequest) (*agent.EventsReportResponse, error) {
	eventReport := &agent.EventReport{
		ClusterId: req.ClusterId,
		Events:    req.Events,
	}
	
	err := s.metricsService.StoreEvents(ctx, eventReport)
	if err != nil {
		return &agent.EventsReportResponse{
			Accepted:       false,
			ProcessedCount: 0,
			Errors:         []string{err.Error()},
		}, nil
	}
	
	return &agent.EventsReportResponse{
		Accepted:       true,
		ProcessedCount: int32(len(req.Events)),
		Errors:         nil,
	}, nil
}

func (s *MockGRPCServer) Connect(stream agent.AgentService_ConnectServer) error {
	// Simple bidirectional stream implementation
	for {
		msg, err := stream.Recv()
		if err != nil {
			return err
		}
		
		// Handle different message types
		switch payload := msg.Payload.(type) {
		case *agent.AgentMessage_Auth:
			// Send auth response
			response := &agent.ServerMessage{
				MessageId: "auth-response-1",
				Timestamp: timestamppb.Now(),
				Payload: &agent.ServerMessage_Auth{
					Auth: &agent.AuthResponse{
						Authenticated: true,
						SessionId:     "test-session-1",
						Message:       "Authentication successful",
					},
				},
			}
			
			err = stream.Send(response)
			if err != nil {
				return err
			}
			
		case *agent.AgentMessage_Metrics:
			// Store metrics
			s.metricsService.StoreMetrics(stream.Context(), payload.Metrics)
			
			// Send acknowledgment
			ack := &agent.ServerMessage{
				MessageId: msg.MessageId + "-ack",
				Timestamp: timestamppb.Now(),
				Payload: &agent.ServerMessage_Ack{
					Ack: &agent.Acknowledgment{
						MessageId: msg.MessageId,
						Success:   true,
						Message:   "Metrics received",
					},
				},
			}
			
			err = stream.Send(ack)
			if err != nil {
				return err
			}
			
		case *agent.AgentMessage_Events:
			// Store events
			s.metricsService.StoreEvents(stream.Context(), payload.Events)
			
			// Send acknowledgment
			ack := &agent.ServerMessage{
				MessageId: msg.MessageId + "-ack",
				Timestamp: timestamppb.Now(),
				Payload: &agent.ServerMessage_Ack{
					Ack: &agent.Acknowledgment{
						MessageId: msg.MessageId,
						Success:   true,
						Message:   "Events received",
					},
				},
			}
			
			err = stream.Send(ack)
			if err != nil {
				return err
			}
		}
	}
}