import { Component, createSignal, onMount, For } from 'solid-js';
import { Card, Badge, LoadingSpinner, Table } from '~/components/ui';
import { DashboardMetrics, Cluster, Agent, AuditLog } from '~/types';
import api from '~/services/api';

const Dashboard: Component = () => {
  const [metrics, setMetrics] = createSignal<DashboardMetrics>({
    totalClusters: 0,
    activeClusters: 0,
    totalAgents: 0,
    connectedAgents: 0,
    totalCertificates: 0,
    expiringSoon: 0,
    activeTokens: 0,
    recentAudits: 0,
    systemHealth: 'healthy'
  });
  
  const [loading, setLoading] = createSignal(true);
  const [recentClusters, setRecentClusters] = createSignal<Cluster[]>([]);
  const [recentAgents, setRecentAgents] = createSignal<Agent[]>([]);
  const [recentAudits, setRecentAudits] = createSignal<AuditLog[]>([]);

  // Mock data - replace with actual API calls
  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock metrics data
      setMetrics({
        totalClusters: 12,
        activeClusters: 10,
        totalAgents: 45,
        connectedAgents: 42,
        totalCertificates: 28,
        expiringSoon: 3,
        activeTokens: 15,
        recentAudits: 127,
        systemHealth: 'healthy'
      });

      // Mock recent clusters
      setRecentClusters([
        {
          id: '1',
          name: 'production-us-east',
          status: 'active',
          version: '1.28.4',
          nodeCount: 15,
          region: 'us-east-1',
          createdAt: '2024-08-15T10:30:00Z',
          lastSeen: '2024-09-02T12:00:00Z',
          metrics: {
            cpuUsage: 65,
            memoryUsage: 72,
            podCount: 245,
            nodeCount: 15,
            hpaCount: 12
          }
        },
        {
          id: '2',
          name: 'staging-us-west',
          status: 'active',
          version: '1.27.8',
          nodeCount: 8,
          region: 'us-west-2',
          createdAt: '2024-08-10T14:20:00Z',
          lastSeen: '2024-09-02T11:55:00Z',
          metrics: {
            cpuUsage: 45,
            memoryUsage: 58,
            podCount: 128,
            nodeCount: 8,
            hpaCount: 6
          }
        }
      ]);

      // Mock recent agents
      setRecentAgents([
        {
          id: '1',
          name: 'agent-prod-01',
          clusterId: '1',
          status: 'connected',
          version: '2.1.0',
          lastHeartbeat: '2024-09-02T12:00:00Z',
          ipAddress: '10.0.1.15',
          port: 8443,
          tlsEnabled: true
        },
        {
          id: '2',
          name: 'agent-staging-01',
          clusterId: '2',
          status: 'connected',
          version: '2.1.0',
          lastHeartbeat: '2024-09-02T11:58:00Z',
          ipAddress: '10.0.2.23',
          port: 8443,
          tlsEnabled: true
        }
      ]);

      // Mock recent audit logs
      setRecentAudits([
        {
          id: '1',
          timestamp: '2024-09-02T11:45:00Z',
          userId: 'admin',
          userEmail: 'admin@example.com',
          action: 'CREATE_CERTIFICATE',
          resource: 'certificate',
          resourceId: 'cert-123',
          details: { name: 'prod-client-cert' },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          severity: 'medium'
        },
        {
          id: '2',
          timestamp: '2024-09-02T11:30:00Z',
          userId: 'operator',
          userEmail: 'operator@example.com',
          action: 'REVOKE_TOKEN',
          resource: 'token',
          resourceId: 'token-456',
          details: { reason: 'security_rotation' },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0',
          severity: 'high'
        }
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadDashboardData();
  });

  const MetricCard: Component<{
    title: string;
    value: number;
    total?: number;
    trend?: 'up' | 'down' | 'stable';
    variant?: 'default' | 'success' | 'warning' | 'error';
  }> = (props) => {
    const getVariantClasses = () => {
      switch (props.variant) {
        case 'success':
          return 'border-green-200 bg-green-50';
        case 'warning':
          return 'border-yellow-200 bg-yellow-50';
        case 'error':
          return 'border-red-200 bg-red-50';
        default:
          return 'border-gray-200 bg-white';
      }
    };

    const getTrendIcon = () => {
      switch (props.trend) {
        case 'up':
          return (
            <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M7 17l9.2-9.2M17 17V7m0 10H7" />
            </svg>
          );
        case 'down':
          return (
            <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M7 7l9.2 9.2M17 7v10m0-10H7" />
            </svg>
          );
        default:
          return (
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M5 12h14" />
            </svg>
          );
      }
    };

    return (
      <Card class={`border ${getVariantClasses()}`}>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">{props.title}</p>
            <div class="flex items-baseline space-x-2 mt-1">
              <p class="text-2xl font-semibold text-gray-900">
                {props.value}
                {props.total && <span class="text-base text-gray-500">/{props.total}</span>}
              </p>
              {props.trend && getTrendIcon()}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const clusterColumns = [
    { key: 'name', title: 'Cluster Name' },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'success' : 'error'} dot>
          {value}
        </Badge>
      )
    },
    { key: 'version', title: 'Version' },
    { key: 'nodeCount', title: 'Nodes' },
    { key: 'region', title: 'Region' }
  ];

  const agentColumns = [
    { key: 'name', title: 'Agent Name' },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'connected' ? 'success' : 'error'} dot>
          {value}
        </Badge>
      )
    },
    { key: 'version', title: 'Version' },
    { key: 'ipAddress', title: 'IP Address' },
    { 
      key: 'tlsEnabled', 
      title: 'TLS',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    }
  ];

  const auditColumns = [
    { 
      key: 'timestamp', 
      title: 'Time',
      render: (value: string) => new Date(value).toLocaleString()
    },
    { key: 'userEmail', title: 'User' },
    { key: 'action', title: 'Action' },
    { 
      key: 'severity', 
      title: 'Severity',
      render: (value: string) => (
        <Badge 
          variant={
            value === 'critical' ? 'error' : 
            value === 'high' ? 'warning' : 
            value === 'medium' ? 'info' : 'default'
          }
        >
          {value}
        </Badge>
      )
    }
  ];

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-gray-600 mt-1">Overview of your HPA platform</p>
      </div>

      {/* Metrics Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Clusters"
          value={metrics().activeClusters}
          total={metrics().totalClusters}
          trend="stable"
          variant="success"
        />
        <MetricCard
          title="Connected Agents"
          value={metrics().connectedAgents}
          total={metrics().totalAgents}
          trend="up"
          variant="success"
        />
        <MetricCard
          title="Certificates"
          value={metrics().totalCertificates}
          trend="stable"
          variant={metrics().expiringSoon > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Active Tokens"
          value={metrics().activeTokens}
          trend="down"
          variant="default"
        />
      </div>

      {/* System Health Status */}
      <Card>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class={`w-3 h-3 rounded-full ${
              metrics().systemHealth === 'healthy' ? 'bg-green-400' :
              metrics().systemHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <h3 class="text-lg font-medium">System Health</h3>
          </div>
          <Badge 
            variant={
              metrics().systemHealth === 'healthy' ? 'success' :
              metrics().systemHealth === 'warning' ? 'warning' : 'error'
            }
          >
            {metrics().systemHealth.charAt(0).toUpperCase() + metrics().systemHealth.slice(1)}
          </Badge>
        </div>
        
        {metrics().expiringSoon > 0 && (
          <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p class="text-sm text-yellow-800">
              <strong>Warning:</strong> {metrics().expiringSoon} certificate(s) expiring soon
            </p>
          </div>
        )}
      </Card>

      {/* Data Tables */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clusters */}
        <Card header={<h3 class="text-lg font-medium">Recent Clusters</h3>}>
          <Table
            data={recentClusters()}
            columns={clusterColumns}
            loading={loading()}
            emptyMessage="No clusters found"
          />
        </Card>

        {/* Recent Agents */}
        <Card header={<h3 class="text-lg font-medium">Recent Agents</h3>}>
          <Table
            data={recentAgents()}
            columns={agentColumns}
            loading={loading()}
            emptyMessage="No agents found"
          />
        </Card>
      </div>

      {/* Recent Activity */}
      <Card header={<h3 class="text-lg font-medium">Recent Activity</h3>}>
        <Table
          data={recentAudits()}
          columns={auditColumns}
          loading={loading()}
          emptyMessage="No recent activity"
        />
      </Card>
    </div>
  );
};

export default Dashboard;