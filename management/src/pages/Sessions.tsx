import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { Card, Button, Badge, Table, LoadingSpinner } from '~/components/ui';
import { Session } from '~/types';

const Sessions: Component = () => {
  const [sessions, setSessions] = createSignal<Session[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [realTimeEnabled, setRealTimeEnabled] = createSignal(true);
  let intervalId: NodeJS.Timeout;

  const loadSessions = async () => {
    if (!realTimeEnabled()) setLoading(true);
    
    try {
      // Simulate API delay for initial load
      if (loading()) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // Mock sessions data with some randomization for real-time effect
      const baseSessions = [
        {
          id: '1',
          agentId: 'agent-prod-01',
          agentName: 'Production Agent 01',
          clusterId: '1',
          clusterName: 'production-us-east',
          status: 'active' as const,
          connectedAt: '2024-09-02T08:30:00Z',
          lastActivity: new Date().toISOString(),
          bytesTransferred: Math.floor(Math.random() * 1000000) + 5000000,
          requestCount: Math.floor(Math.random() * 1000) + 15000,
          errors: Math.floor(Math.random() * 5)
        },
        {
          id: '2',
          agentId: 'agent-staging-01',
          agentName: 'Staging Agent 01',
          clusterId: '2',
          clusterName: 'staging-us-west',
          status: 'active' as const,
          connectedAt: '2024-09-02T09:15:00Z',
          lastActivity: new Date(Date.now() - 30000).toISOString(),
          bytesTransferred: Math.floor(Math.random() * 500000) + 2000000,
          requestCount: Math.floor(Math.random() * 500) + 8000,
          errors: Math.floor(Math.random() * 3)
        },
        {
          id: '3',
          agentId: 'agent-dev-01',
          agentName: 'Development Agent 01',
          clusterId: '3',
          clusterName: 'dev-local',
          status: 'inactive' as const,
          connectedAt: '2024-09-02T07:00:00Z',
          lastActivity: new Date(Date.now() - 300000).toISOString(),
          bytesTransferred: Math.floor(Math.random() * 100000) + 500000,
          requestCount: Math.floor(Math.random() * 200) + 3000,
          errors: Math.floor(Math.random() * 2)
        },
        {
          id: '4',
          agentId: 'agent-test-01',
          agentName: 'Test Agent 01',
          clusterId: '4',
          clusterName: 'test-cluster',
          status: 'error' as const,
          connectedAt: '2024-09-02T10:00:00Z',
          lastActivity: new Date(Date.now() - 600000).toISOString(),
          bytesTransferred: Math.floor(Math.random() * 50000) + 100000,
          requestCount: Math.floor(Math.random() * 100) + 1000,
          errors: Math.floor(Math.random() * 10) + 5
        }
      ];

      setSessions(baseSessions);

    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRealTimeUpdates = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(loadSessions, 2000); // Update every 2 seconds
  };

  const stopRealTimeUpdates = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null as any;
    }
  };

  const toggleRealTime = () => {
    const newState = !realTimeEnabled();
    setRealTimeEnabled(newState);
    
    if (newState) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to terminate this session?')) {
      try {
        console.log('Terminating session:', sessionId);
        // await api.terminateSession(sessionId);
        loadSessions();
      } catch (error) {
        console.error('Failed to terminate session:', error);
      }
    }
  };

  onMount(() => {
    loadSessions();
    if (realTimeEnabled()) {
      startRealTimeUpdates();
    }
  });

  onCleanup(() => {
    stopRealTimeUpdates();
  });

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (dateString: string) => {
    const now = new Date().getTime();
    const connected = new Date(dateString).getTime();
    const diff = now - connected;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getLastActivityStatus = (lastActivity: string) => {
    const now = new Date().getTime();
    const activity = new Date(lastActivity).getTime();
    const diff = now - activity;
    
    if (diff < 30000) return 'active'; // Less than 30 seconds
    if (diff < 300000) return 'recent'; // Less than 5 minutes
    return 'idle';
  };

  const columns = [
    { 
      key: 'agentName', 
      title: 'Agent',
      render: (value: string, record: Session) => (
        <div>
          <div class="font-medium text-gray-900">{value}</div>
          <div class="text-sm text-gray-500">{record.clusterName}</div>
        </div>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: string, record: Session) => {
        const activityStatus = getLastActivityStatus(record.lastActivity || '');
        let variant: 'success' | 'warning' | 'error' = 'success';
        let displayStatus = value;
        
        if (value === 'error') {
          variant = 'error';
        } else if (value === 'inactive' || activityStatus === 'idle') {
          variant = 'warning';
          displayStatus = 'idle';
        } else if (activityStatus === 'recent') {
          variant = 'warning';
          displayStatus = 'recent';
        }
        
        return (
          <Badge variant={variant} dot>
            {displayStatus}
          </Badge>
        );
      }
    },
    { 
      key: 'connectedAt', 
      title: 'Duration',
      render: (value: string) => formatDuration(value)
    },
    { 
      key: 'bytesTransferred', 
      title: 'Data Transferred',
      render: (value: number) => formatBytes(value)
    },
    { 
      key: 'requestCount', 
      title: 'Requests',
      render: (value: number) => value.toLocaleString()
    },
    { 
      key: 'errors', 
      title: 'Errors',
      render: (value: number) => (
        <span class={value > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {value}
        </span>
      )
    },
    { 
      key: 'lastActivity', 
      title: 'Last Activity',
      render: (value?: string) => {
        if (!value) return 'Never';
        const diff = Date.now() - new Date(value).getTime();
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        return new Date(value).toLocaleTimeString();
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Session) => (
        <div class="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => console.log('View session details:', record.id)}
          >
            Details
          </Button>
          {record.status === 'active' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleTerminateSession(record.id)}
            >
              Terminate
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Session Monitor</h1>
          <p class="text-gray-600 mt-1">Monitor active agent connections and sessions</p>
        </div>
        
        <div class="flex items-center space-x-4">
          {/* Real-time toggle */}
          <div class="flex items-center space-x-2">
            <button
              type="button"
              class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                realTimeEnabled() ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              onClick={toggleRealTime}
            >
              <span class="sr-only">Enable real-time updates</span>
              <span
                class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  realTimeEnabled() ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span class="text-sm text-gray-700">Real-time updates</span>
            {realTimeEnabled() && (
              <div class="flex items-center space-x-1">
                <LoadingSpinner size="sm" />
                <span class="text-xs text-green-600">Live</span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => loadSessions()}
            icon={
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Active Sessions</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {sessions().filter(s => s.status === 'active').length}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Idle Sessions</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {sessions().filter(s => s.status === 'inactive').length}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Error Sessions</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {sessions().filter(s => s.status === 'error').length}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Data</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {formatBytes(sessions().reduce((sum, session) => sum + session.bytesTransferred, 0))}
                </dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <Table
          data={sessions()}
          columns={columns}
          loading={loading()}
          emptyMessage="No active sessions found"
        />
      </Card>
    </div>
  );
};

export default Sessions;