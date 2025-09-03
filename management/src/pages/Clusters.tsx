import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { Card, Badge, LoadingSpinner, Table, Button, Input, Modal } from '~/components/ui';
import { Cluster } from '~/types';

const Clusters: Component = () => {
  const [clusters, setClusters] = createSignal<Cluster[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCluster, setSelectedCluster] = createSignal<Cluster | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showAddCluster, setShowAddCluster] = createSignal(false);

  // Mock data - replace with actual API calls
  const loadClusters = async () => {
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockClusters: Cluster[] = [
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
        },
        {
          id: '3',
          name: 'development-eu-central',
          status: 'inactive',
          version: '1.26.5',
          nodeCount: 3,
          region: 'eu-central-1',
          createdAt: '2024-07-20T09:15:00Z',
          lastSeen: '2024-09-01T18:30:00Z',
          metrics: {
            cpuUsage: 0,
            memoryUsage: 0,
            podCount: 0,
            nodeCount: 3,
            hpaCount: 0
          }
        },
        {
          id: '4',
          name: 'testing-ap-southeast',
          status: 'active',
          version: '1.28.2',
          nodeCount: 5,
          region: 'ap-southeast-1',
          createdAt: '2024-08-25T16:45:00Z',
          lastSeen: '2024-09-02T11:45:00Z',
          metrics: {
            cpuUsage: 35,
            memoryUsage: 42,
            podCount: 89,
            nodeCount: 5,
            hpaCount: 8
          }
        }
      ];
      
      setClusters(mockClusters);
    } catch (error) {
      console.error('Failed to load clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadClusters();
  });

  const filteredClusters = () => {
    const term = searchTerm().toLowerCase();
    return clusters().filter(cluster =>
      cluster.name.toLowerCase().includes(term) ||
      cluster.region.toLowerCase().includes(term) ||
      cluster.status.toLowerCase().includes(term)
    );
  };

  const handleViewDetails = (cluster: Cluster) => {
    setSelectedCluster(cluster);
    setShowDetails(true);
  };

  const handleAddCluster = () => {
    setShowAddCluster(true);
  };

  const columns = [
    { 
      key: 'name', 
      title: 'Cluster Name',
      render: (value: string, row: Cluster) => (
        <div class="flex items-center space-x-3">
          <div class={`w-3 h-3 rounded-full ${
            row.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          <span class="font-medium">{value}</span>
        </div>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'success' : 'default'} dot>
          {value}
        </Badge>
      )
    },
    { key: 'version', title: 'K8s Version' },
    { key: 'nodeCount', title: 'Nodes' },
    { key: 'region', title: 'Region' },
    {
      key: 'metrics.hpaCount',
      title: 'HPAs',
      render: (_: any, row: Cluster) => row.metrics?.hpaCount || 0
    },
    {
      key: 'lastSeen',
      title: 'Last Seen',
      render: (value: string) => {
        const date = new Date(value);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        return `${Math.floor(diffMinutes / 1440)}d ago`;
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: Cluster) => (
        <div class="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(row)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => console.log('Configure', row.id)}
          >
            Configure
          </Button>
        </div>
      )
    }
  ];

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Cluster Management</h1>
          <p class="text-gray-600 mt-1">Manage and monitor your Kubernetes clusters</p>
        </div>
        <Button onClick={handleAddCluster}>
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Cluster
        </Button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Clusters</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">{clusters().length}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Active Clusters</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">
                {clusters().filter(c => c.status === 'active').length}
              </p>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Nodes</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">
                {clusters().reduce((sum, c) => sum + c.nodeCount, 0)}
              </p>
            </div>
            <div class="p-3 bg-purple-100 rounded-full">
              <svg class="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total HPAs</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">
                {clusters().reduce((sum, c) => sum + (c.metrics?.hpaCount || 0), 0)}
              </p>
            </div>
            <div class="p-3 bg-yellow-100 rounded-full">
              <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <div class="flex items-center space-x-4">
          <div class="flex-1">
            <Input
              type="text"
              placeholder="Search clusters..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
            />
          </div>
          <Button variant="outline" onClick={loadClusters}>
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Clusters Table */}
      <Card header={<h3 class="text-lg font-medium">Clusters</h3>}>
        <Table
          data={filteredClusters()}
          columns={columns}
          loading={loading()}
          emptyMessage="No clusters found"
        />
      </Card>

      {/* Cluster Details Modal */}
      <Show when={showDetails()}>
        <Modal
          open={showDetails()}
          onClose={() => setShowDetails(false)}
          title="Cluster Details"
        >
          <Show when={selectedCluster()}>
            {(cluster) => (
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Name</label>
                    <p class="mt-1 text-sm text-gray-900">{cluster().name}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Status</label>
                    <Badge class="mt-1" variant={cluster().status === 'active' ? 'success' : 'default'}>
                      {cluster().status}
                    </Badge>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Version</label>
                    <p class="mt-1 text-sm text-gray-900">{cluster().version}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Region</label>
                    <p class="mt-1 text-sm text-gray-900">{cluster().region}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Nodes</label>
                    <p class="mt-1 text-sm text-gray-900">{cluster().nodeCount}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Created</label>
                    <p class="mt-1 text-sm text-gray-900">
                      {new Date(cluster().createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <Show when={cluster().metrics}>
                  {(metrics) => (
                    <div>
                      <h4 class="text-sm font-medium text-gray-700 mb-2">Metrics</h4>
                      <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>CPU Usage: {metrics().cpuUsage}%</div>
                        <div>Memory Usage: {metrics().memoryUsage}%</div>
                        <div>Pods: {metrics().podCount}</div>
                        <div>HPAs: {metrics().hpaCount}</div>
                      </div>
                    </div>
                  )}
                </Show>
              </div>
            )}
          </Show>
        </Modal>
      </Show>

      {/* Add Cluster Modal */}
      <Show when={showAddCluster()}>
        <Modal
          open={showAddCluster()}
          onClose={() => setShowAddCluster(false)}
          title="Add New Cluster"
        >
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Cluster Name</label>
              <Input type="text" placeholder="Enter cluster name" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Region</label>
              <select class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>us-east-1</option>
                <option>us-west-2</option>
                <option>eu-central-1</option>
                <option>ap-southeast-1</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Kubernetes Version</label>
              <select class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>1.28.4</option>
                <option>1.28.2</option>
                <option>1.27.8</option>
                <option>1.26.5</option>
              </select>
            </div>
            <div class="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddCluster(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowAddCluster(false)}>
                Add Cluster
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </div>
  );
};

export default Clusters;