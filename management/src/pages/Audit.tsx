import { Component, createSignal, onMount } from 'solid-js';
import { Card, Badge, Table, Input, Button } from '~/components/ui';
import { AuditLog } from '~/types';

const Audit: Component = () => {
  const [auditLogs, setAuditLogs] = createSignal<AuditLog[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedSeverity, setSelectedSeverity] = createSignal<string>('all');
  const [dateRange, setDateRange] = createSignal<string>('7d');

  const loadAuditLogs = async () => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock audit log data
      setAuditLogs([
        {
          id: '1',
          timestamp: '2024-09-02T11:45:00Z',
          userId: 'admin',
          userEmail: 'admin@hpa.local',
          action: 'CREATE_CERTIFICATE',
          resource: 'certificate',
          resourceId: 'cert-123',
          details: { 
            name: 'prod-client-cert',
            type: 'client',
            subject: 'CN=prod-client,O=HPA Platform'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          severity: 'medium'
        },
        {
          id: '2',
          timestamp: '2024-09-02T11:30:00Z',
          userId: 'operator',
          userEmail: 'operator@hpa.local',
          action: 'REVOKE_TOKEN',
          resource: 'token',
          resourceId: 'token-456',
          details: { 
            tokenName: 'staging-token',
            reason: 'security_rotation'
          },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7)',
          severity: 'high'
        },
        {
          id: '3',
          timestamp: '2024-09-02T11:15:00Z',
          userId: 'admin',
          userEmail: 'admin@hpa.local',
          action: 'LOGIN_SUCCESS',
          resource: 'auth',
          resourceId: 'session-789',
          details: { 
            method: 'password',
            sessionDuration: '8h'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          severity: 'low'
        },
        {
          id: '4',
          timestamp: '2024-09-02T11:00:00Z',
          userId: 'unknown',
          userEmail: 'unknown',
          action: 'LOGIN_FAILED',
          resource: 'auth',
          resourceId: 'attempt-101',
          details: { 
            reason: 'invalid_credentials',
            attemptedUsername: 'admin',
            consecutiveFailures: 3
          },
          ipAddress: '203.0.113.10',
          userAgent: 'curl/7.68.0',
          severity: 'critical'
        },
        {
          id: '5',
          timestamp: '2024-09-02T10:45:00Z',
          userId: 'operator',
          userEmail: 'operator@hpa.local',
          action: 'TERMINATE_SESSION',
          resource: 'session',
          resourceId: 'session-abc',
          details: { 
            agentName: 'prod-agent-01',
            reason: 'maintenance'
          },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7)',
          severity: 'medium'
        },
        {
          id: '6',
          timestamp: '2024-09-02T10:30:00Z',
          userId: 'viewer',
          userEmail: 'viewer@hpa.local',
          action: 'DOWNLOAD_CERTIFICATE',
          resource: 'certificate',
          resourceId: 'cert-456',
          details: { 
            certificateName: 'staging-server-cert',
            downloadFormat: 'pem'
          },
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Linux; Ubuntu)',
          severity: 'low'
        },
        {
          id: '7',
          timestamp: '2024-09-02T10:15:00Z',
          userId: 'admin',
          userEmail: 'admin@hpa.local',
          action: 'CREATE_USER',
          resource: 'user',
          resourceId: 'user-new',
          details: { 
            username: 'new_operator',
            role: 'operator',
            email: 'new.operator@hpa.local'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          severity: 'high'
        },
        {
          id: '8',
          timestamp: '2024-09-02T10:00:00Z',
          userId: 'system',
          userEmail: 'system@hpa.local',
          action: 'CERTIFICATE_EXPIRED',
          resource: 'certificate',
          resourceId: 'cert-old',
          details: { 
            certificateName: 'old-client-cert',
            expiredSince: '2024-09-02T09:00:00Z',
            autoRevoked: true
          },
          ipAddress: '127.0.0.1',
          userAgent: 'HPA-System/1.0',
          severity: 'critical'
        }
      ]);

    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadAuditLogs();
  });

  const filteredLogs = () => {
    let logs = auditLogs();
    
    // Filter by search term
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      logs = logs.filter(log => 
        log.userEmail.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.resource.toLowerCase().includes(term) ||
        log.ipAddress.includes(term)
      );
    }
    
    // Filter by severity
    if (selectedSeverity() !== 'all') {
      logs = logs.filter(log => log.severity === selectedSeverity());
    }
    
    return logs;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) {
      return (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    }
    if (action.includes('CREATE')) {
      return (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      );
    }
    if (action.includes('DELETE') || action.includes('REVOKE')) {
      return (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    }
    if (action.includes('DOWNLOAD')) {
      return (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      );
    }
    // Default icon
    return (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const exportLogs = async () => {
    const logs = filteredLogs();
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Severity', 'Details'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.userEmail,
        log.action,
        log.resource,
        log.ipAddress,
        log.severity,
        JSON.stringify(log.details).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const columns = [
    { 
      key: 'timestamp', 
      title: 'Time',
      render: (value: string) => (
        <div class="text-sm text-gray-900">{formatTimestamp(value)}</div>
      ),
      width: '180px'
    },
    { 
      key: 'action', 
      title: 'Action',
      render: (value: string, record: AuditLog) => (
        <div class="flex items-center space-x-2">
          <div class="text-gray-500">{getActionIcon(value)}</div>
          <div>
            <div class="font-medium text-gray-900">{value.replace(/_/g, ' ')}</div>
            <div class="text-sm text-gray-500">{record.resource}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'userEmail', 
      title: 'User',
      render: (value: string, record: AuditLog) => (
        <div>
          <div class="font-medium text-gray-900">{value}</div>
          <div class="text-sm text-gray-500">{record.ipAddress}</div>
        </div>
      )
    },
    { 
      key: 'severity', 
      title: 'Severity',
      render: (value: string) => (
        <Badge variant={getSeverityColor(value)} size="sm">
          {value}
        </Badge>
      )
    },
    { 
      key: 'details', 
      title: 'Details',
      render: (value: Record<string, any>) => (
        <div class="max-w-xs">
          <div class="text-sm text-gray-900 truncate">
            {Object.entries(value).map(([key, val]) => (
              <div class="text-xs">
                <span class="font-medium">{key}:</span> {String(val)}
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Security Audit</h1>
          <p class="text-gray-600 mt-1">Monitor and review system security events and user activities</p>
        </div>
        <Button
          variant="outline"
          onClick={exportLogs}
          icon={
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          }
        >
          Export Logs
        </Button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Critical Events</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {auditLogs().filter(l => l.severity === 'critical').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">High Priority</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {auditLogs().filter(l => l.severity === 'high').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Login Events</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {auditLogs().filter(l => l.action.includes('LOGIN')).length}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                <dd class="text-lg font-medium text-gray-900">{auditLogs().length}</dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div class="flex-1">
            <Input
              placeholder="Search by user, action, resource, or IP address..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              leftIcon={
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          
          <div class="flex items-center space-x-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedSeverity()}
                onChange={(e) => setSelectedSeverity(e.currentTarget.value)}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={dateRange()}
                onChange={(e) => setDateRange(e.currentTarget.value)}
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <div class="mb-4 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">
            Security Events ({filteredLogs().length})
          </h3>
          <Badge variant="info" size="sm">
            Showing {filteredLogs().length} of {auditLogs().length} events
          </Badge>
        </div>
        
        <Table
          data={filteredLogs()}
          columns={columns}
          loading={loading()}
          emptyMessage="No audit logs found"
        />
      </Card>
    </div>
  );
};

export default Audit;