import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { Card, Badge, LoadingSpinner, Table, Button, Input, Modal } from '~/components/ui';
import { Agent } from '~/types';

const Agents: Component = () => {
  const [agents, setAgents] = createSignal<Agent[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedAgent, setSelectedAgent] = createSignal<Agent | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showAddAgent, setShowAddAgent] = createSignal(false);

  // Mock data - replace with actual API calls
  const loadAgents = async () => {
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockAgents: Agent[] = [
        {
          id: '1',
          name: 'agent-prod-01',
          clusterId: '1',
          status: 'connected',
          version: '2.1.0',
          lastHeartbeat: '2024-09-02T12:00:00Z',
          ipAddress: '10.0.1.15',
          port: 8443,
          tlsEnabled: true,
          clusterName: 'production-us-east'
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
          tlsEnabled: true,
          clusterName: 'staging-us-west'
        },
        {
          id: '3',
          name: 'agent-dev-01',
          clusterId: '3',
          status: 'disconnected',
          version: '2.0.5',
          lastHeartbeat: '2024-09-01T18:30:00Z',
          ipAddress: '10.0.3.45',
          port: 8443,
          tlsEnabled: true,
          clusterName: 'development-eu-central'
        },
        {
          id: '4',
          name: 'agent-test-01',
          clusterId: '4',
          status: 'connected',
          version: '2.1.0',
          lastHeartbeat: '2024-09-02T11:45:00Z',
          ipAddress: '10.0.4.12',
          port: 8443,
          tlsEnabled: false,
          clusterName: 'testing-ap-southeast'
        },
        {
          id: '5',
          name: 'agent-prod-02',
          clusterId: '1',
          status: 'error',
          version: '2.0.8',
          lastHeartbeat: '2024-09-02T10:15:00Z',
          ipAddress: '10.0.1.16',
          port: 8443,
          tlsEnabled: true,
          clusterName: 'production-us-east'
        },
        {
          id: '6',
          name: 'agent-staging-02',
          clusterId: '2',
          status: 'connecting',
          version: '2.1.0',
          lastHeartbeat: '2024-09-02T11:30:00Z',
          ipAddress: '10.0.2.24',
          port: 8443,
          tlsEnabled: true,
          clusterName: 'staging-us-west'
        }
      ];
      
      setAgents(mockAgents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadAgents();
  });

  const filteredAgents = () => {
    const term = searchTerm().toLowerCase();
    return agents().filter(agent =>
      agent.name.toLowerCase().includes(term) ||
      agent.clusterName?.toLowerCase().includes(term) ||
      agent.ipAddress?.includes(term) ||
      agent.status.toLowerCase().includes(term)
    );
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHeartbeatStatus = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) {
      return { status: 'error', text: 'Never' };
    }
    const now = new Date();
    const heartbeat = new Date(lastHeartbeat);
    const diffMinutes = Math.floor((now.getTime() - heartbeat.getTime()) / (1000 * 60));
    
    if (diffMinutes < 2) return { status: 'healthy', text: 'Just now' };
    if (diffMinutes < 5) return { status: 'warning', text: `${diffMinutes}m ago` };
    return { status: 'error', text: `${Math.floor(diffMinutes / 60)}h ago` };
  };

  const handleViewDetails = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDetails(true);
  };

  const handleAddAgent = () => {
    setShowAddAgent(true);
  };

  const handleRestartAgent = (agentId: string) => {
    console.log('Restart agent:', agentId);
    // Add restart functionality here
  };

  const columns = [
    { 
      key: 'name', 
      title: 'Agent Name',
      render: (value: string, row: Agent) => (
        <div class="flex items-center space-x-3">
          <div class={`w-3 h-3 rounded-full ${
            row.status === 'connected' ? 'bg-green-400' : 
            row.status === 'connecting' ? 'bg-yellow-400' :
            row.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
          }`} />
          <span class="font-medium">{value}</span>
        </div>
      )
    },
    { 
      key: 'clusterName', 
      title: 'Cluster',
      render: (value: string) => (
        <span class="text-sm text-gray-600">{value}</span>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: string) => (
        <Badge variant={getStatusVariant(value)} dot>
          {value}
        </Badge>
      )
    },
    { key: 'version', title: 'Version' },
    { 
      key: 'ipAddress', 
      title: 'IP Address',
      render: (value: string, row: Agent) => `${value || 'N/A'}:${row.port || 'N/A'}`
    },
    {
      key: 'tlsEnabled',
      title: 'TLS',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    },
    {
      key: 'lastHeartbeat',
      title: 'Last Heartbeat',
      render: (value: string) => {
        const heartbeat = getHeartbeatStatus(value);
        return (
          <span class={`text-sm ${
            heartbeat.status === 'healthy' ? 'text-green-600' :
            heartbeat.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {heartbeat.text}
          </span>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: Agent) => (
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
            onClick={() => handleRestartAgent(row.id)}
            disabled={row.status === 'disconnected'}
          >
            Restart
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
          <h1 class="text-2xl font-bold text-gray-900">Agent Management</h1>
          <p class="text-gray-600 mt-1">Monitor and manage HPA agents across clusters</p>
        </div>
        <Button onClick={handleAddAgent}>
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4v16m8-8H4" />
          </svg>
          Deploy Agent
        </Button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Agents</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">{agents().length}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Connected</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">
                {agents().filter(a => a.status === 'connected').length}
              </p>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Disconnected</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">
                {agents().filter(a => a.status === 'disconnected').length}
              </p>
            </div>
            <div class="p-3 bg-gray-100 rounded-full">
              <svg class="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">With Errors</p>
              <p class="text-2xl font-semibold text-gray-900 mt-1">
                {agents().filter(a => a.status === 'error').length}
              </p>
            </div>
            <div class="p-3 bg-red-100 rounded-full">
              <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              placeholder="Search agents..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
            />
          </div>
          <Button variant="outline" onClick={loadAgents}>
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Agents Table */}
      <Card header={<h3 class="text-lg font-medium">Agents</h3>}>
        <Table
          data={filteredAgents()}
          columns={columns}
          loading={loading()}
          emptyMessage="No agents found"
        />
      </Card>

      {/* Agent Details Modal */}
      <Show when={showDetails()}>
        <Modal
          open={showDetails()}
          onClose={() => setShowDetails(false)}
          title="Agent Details"
        >
          <Show when={selectedAgent()}>
            {(agent) => (
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Name</label>
                    <p class="mt-1 text-sm text-gray-900">{agent().name}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Status</label>
                    <Badge class="mt-1" variant={getStatusVariant(agent().status)}>
                      {agent().status}
                    </Badge>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Version</label>
                    <p class="mt-1 text-sm text-gray-900">{agent().version}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Cluster</label>
                    <p class="mt-1 text-sm text-gray-900">{agent().clusterName}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">IP Address</label>
                    <p class="mt-1 text-sm text-gray-900">{agent().ipAddress}:{agent().port}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">TLS</label>
                    <Badge class="mt-1" variant={agent().tlsEnabled ? 'success' : 'warning'}>
                      {agent().tlsEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Last Heartbeat</label>
                    <p class="mt-1 text-sm text-gray-900">
                      {agent().lastHeartbeat ? new Date(agent().lastHeartbeat!).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4">
                  <Button variant="outline" onClick={() => handleRestartAgent(agent().id)}>
                    Restart Agent
                  </Button>
                  <Button variant="outline">
                    View Logs
                  </Button>
                </div>
              </div>
            )}
          </Show>
        </Modal>
      </Show>

      {/* Add Agent Modal */}
      <Show when={showAddAgent()}>
        <Modal
          open={showAddAgent()}
          onClose={() => setShowAddAgent(false)}
          title="Deploy New Agent"
        >
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Agent Name</label>
              <Input type="text" placeholder="Enter agent name" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Target Cluster</label>
              <select class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>production-us-east</option>
                <option>staging-us-west</option>
                <option>development-eu-central</option>
                <option>testing-ap-southeast</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Port</label>
              <Input type="number" placeholder="8443" value="8443" />
            </div>
            <div class="flex items-center">
              <input type="checkbox" id="tls" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label for="tls" class="ml-2 text-sm text-gray-700">Enable TLS</label>
            </div>
            <div class="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddAgent(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowAddAgent(false)}>
                Deploy Agent
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </div>
  );
};

export default Agents;