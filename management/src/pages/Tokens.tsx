import { Component, createSignal, onMount } from 'solid-js';
import { Card, Button, Badge, Table, Modal, Input } from '~/components/ui';
import { Token, CreateTokenForm, TokenScope } from '~/types';

const Tokens: Component = () => {
  const [tokens, setTokens] = createSignal<Token[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<CreateTokenForm>({
    name: '',
    scope: ['cluster:read'],
    expiresIn: 30
  });

  const loadTokens = async () => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setTokens([
        {
          id: '1',
          name: 'prod-agent-token',
          agentId: 'agent-prod-01',
          clusterId: '1',
          scope: ['cluster:read', 'cluster:write', 'agent:read', 'metrics:read'],
          status: 'active',
          createdAt: '2024-08-15T10:30:00Z',
          expiresAt: '2024-11-15T10:30:00Z',
          lastUsed: '2024-09-02T11:45:00Z',
          usageCount: 1247
        },
        {
          id: '2',
          name: 'monitoring-readonly',
          scope: ['metrics:read', 'cluster:read'],
          status: 'active',
          createdAt: '2024-08-20T14:20:00Z',
          expiresAt: '2024-11-20T14:20:00Z',
          lastUsed: '2024-09-02T12:00:00Z',
          usageCount: 892
        },
        {
          id: '3',
          name: 'temp-admin-token',
          scope: ['cluster:read', 'cluster:write', 'agent:read', 'agent:write', 'certificates:read'],
          status: 'expired',
          createdAt: '2024-07-01T09:00:00Z',
          expiresAt: '2024-08-01T09:00:00Z',
          lastUsed: '2024-07-31T18:30:00Z',
          usageCount: 234
        }
      ]);

    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadTokens();
  });

  const handleCreateToken = async () => {
    try {
      console.log('Creating token:', createForm());
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        scope: ['cluster:read'],
        expiresIn: 30
      });
      loadTokens();
    } catch (error) {
      console.error('Failed to create token:', error);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      try {
        console.log('Revoking token:', id);
        loadTokens();
      } catch (error) {
        console.error('Failed to revoke token:', error);
      }
    }
  };

  const handleRotateToken = async (id: string) => {
    if (confirm('Are you sure you want to rotate this token? The old token will be invalidated.')) {
      try {
        console.log('Rotating token:', id);
        loadTokens();
      } catch (error) {
        console.error('Failed to rotate token:', error);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'Never';
  };

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    return expiryDate <= sevenDaysFromNow && expiryDate > now;
  };

  const columns = [
    { 
      key: 'name', 
      title: 'Token Name',
      render: (value: string) => <div class="font-medium text-gray-900">{value}</div>
    },
    { 
      key: 'scope', 
      title: 'Scope',
      render: (value: TokenScope[]) => (
        <div class="flex flex-wrap gap-1">
          {value.map((scope, index) => (
            <Badge size="sm" variant="info">
              {scope}
            </Badge>
          ))}
        </div>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: string, record: Token) => {
        let variant: 'success' | 'warning' | 'error' = 'success';
        
        if (value === 'expired' || value === 'revoked') {
          variant = 'error';
        } else if (isExpiringSoon(record.expiresAt)) {
          variant = 'warning';
        }
        
        return (
          <Badge variant={variant} dot>
            {isExpiringSoon(record.expiresAt) && value === 'active' ? 'Expiring Soon' : value}
          </Badge>
        );
      }
    },
    { 
      key: 'expiresAt', 
      title: 'Expires',
      render: (value?: string) => formatDate(value)
    },
    { 
      key: 'usageCount', 
      title: 'Usage Count',
      render: (value: number) => value.toLocaleString()
    },
    { 
      key: 'lastUsed', 
      title: 'Last Used',
      render: (value?: string) => formatDate(value)
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Token) => (
        <div class="flex items-center space-x-2">
          {record.status === 'active' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRotateToken(record.id)}
              >
                Rotate
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleRevokeToken(record.id)}
              >
                Revoke
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  const scopeOptions: { value: TokenScope; label: string }[] = [
    { value: 'cluster:read', label: 'Cluster Read' },
    { value: 'cluster:write', label: 'Cluster Write' },
    { value: 'agent:read', label: 'Agent Read' },
    { value: 'agent:write', label: 'Agent Write' },
    { value: 'metrics:read', label: 'Metrics Read' },
    { value: 'certificates:read', label: 'Certificates Read' },
    { value: 'certificates:write', label: 'Certificates Write' }
  ];

  const CreateTokenModal = () => (
    <Modal
      open={showCreateModal()}
      onClose={() => setShowCreateModal(false)}
      title="Create New Token"
      size="lg"
      footer={
        <div class="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateToken}>
            Create Token
          </Button>
        </div>
      }
    >
      <div class="space-y-4">
        <Input
          label="Token Name"
          value={createForm().name}
          onInput={(e) => setCreateForm(prev => ({ ...prev, name: e.currentTarget.value }))}
          placeholder="e.g., monitoring-token"
        />
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Permissions
          </label>
          <div class="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
            {scopeOptions.map((option) => (
              <label class="flex items-center">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={createForm().scope.includes(option.value)}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setCreateForm(prev => ({
                      ...prev,
                      scope: checked 
                        ? [...prev.scope, option.value]
                        : prev.scope.filter(s => s !== option.value)
                    }));
                  }}
                />
                <span class="ml-2 text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label="Expires In (days)"
          type="number"
          value={createForm().expiresIn || ''}
          onInput={(e) => setCreateForm(prev => ({ 
            ...prev, 
            expiresIn: e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined 
          }))}
          min="1"
          max="365"
          helperText="Leave empty for no expiration"
        />
      </div>
    </Modal>
  );

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Token Management</h1>
          <p class="text-gray-600 mt-1">Manage API tokens for agents and applications</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          icon={
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Create Token
        </Button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Active Tokens</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {tokens().filter(t => t.status === 'active').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {tokens().filter(t => isExpiringSoon(t.expiresAt)).length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Expired/Revoked</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {tokens().filter(t => t.status === 'expired' || t.status === 'revoked').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Usage</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {tokens().reduce((sum, token) => sum + token.usageCount, 0).toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <Table
          data={tokens()}
          columns={columns}
          loading={loading()}
          emptyMessage="No tokens found"
        />
      </Card>

      <CreateTokenModal />
    </div>
  );
};

export default Tokens;