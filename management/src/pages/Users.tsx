import { Component, createSignal, onMount } from 'solid-js';
import { Card, Button, Badge, Table, Modal, Input } from '~/components/ui';
import { User, CreateUserForm, UserRole } from '~/types';

const Users: Component = () => {
  const [users, setUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingUser, setEditingUser] = createSignal<User | null>(null);
  const [createForm, setCreateForm] = createSignal<CreateUserForm>({
    username: '',
    email: '',
    password: '',
    role: 'viewer'
  });

  const loadUsers = async () => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setUsers([
        {
          id: '1',
          username: 'admin',
          email: 'admin@hpa.local',
          role: 'admin',
          createdAt: '2024-01-15T10:30:00Z',
          lastLogin: '2024-09-02T11:45:00Z',
          status: 'active'
        },
        {
          id: '2',
          username: 'operator1',
          email: 'operator@hpa.local',
          role: 'operator',
          createdAt: '2024-02-01T14:20:00Z',
          lastLogin: '2024-09-02T09:30:00Z',
          status: 'active'
        },
        {
          id: '3',
          username: 'viewer1',
          email: 'viewer@hpa.local',
          role: 'viewer',
          createdAt: '2024-03-15T16:45:00Z',
          lastLogin: '2024-09-01T15:20:00Z',
          status: 'active'
        },
        {
          id: '4',
          username: 'temp_user',
          email: 'temp@hpa.local',
          role: 'viewer',
          createdAt: '2024-08-01T09:00:00Z',
          lastLogin: '2024-08-15T12:00:00Z',
          status: 'suspended'
        },
        {
          id: '5',
          username: 'old_admin',
          email: 'old.admin@hpa.local',
          role: 'admin',
          createdAt: '2023-12-01T08:30:00Z',
          status: 'inactive'
        }
      ]);

    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadUsers();
  });

  const handleCreateUser = async () => {
    try {
      console.log('Creating user:', createForm());
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateModal(false);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        role: 'viewer'
      });
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setCreateForm({
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role
    });
    setShowCreateModal(true);
  };

  const handleUpdateUser = async () => {
    const user = editingUser();
    if (!user) return;

    try {
      console.log('Updating user:', user.id, createForm());
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateModal(false);
      setEditingUser(null);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        role: 'viewer'
      });
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    if (confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this user?`)) {
      try {
        console.log('Toggling user status:', user.id, newStatus);
        loadUsers();
      } catch (error) {
        console.error('Failed to update user status:', error);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        console.log('Deleting user:', userId);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'Never';
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'error';
      case 'operator': return 'warning';
      case 'viewer': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const columns = [
    { 
      key: 'username', 
      title: 'Username',
      render: (value: string, record: User) => (
        <div>
          <div class="font-medium text-gray-900">{value}</div>
          <div class="text-sm text-gray-500">{record.email}</div>
        </div>
      )
    },
    { 
      key: 'role', 
      title: 'Role',
      render: (value: UserRole) => (
        <Badge variant={getRoleColor(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: User['status']) => (
        <Badge variant={getStatusColor(value)} dot>
          {value}
        </Badge>
      )
    },
    { 
      key: 'createdAt', 
      title: 'Created',
      render: (value: string) => formatDate(value)
    },
    { 
      key: 'lastLogin', 
      title: 'Last Login',
      render: (value?: string) => formatDate(value)
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: User) => (
        <div class="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditUser(record)}
          >
            Edit
          </Button>
          {record.status === 'active' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleUserStatus(record)}
            >
              Suspend
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleUserStatus(record)}
            >
              Activate
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteUser(record.id)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  const UserFormModal = () => (
    <Modal
      open={showCreateModal()}
      onClose={() => {
        setShowCreateModal(false);
        setEditingUser(null);
        setCreateForm({
          username: '',
          email: '',
          password: '',
          role: 'viewer'
        });
      }}
      title={editingUser() ? 'Edit User' : 'Create New User'}
      footer={
        <div class="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              setEditingUser(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={editingUser() ? handleUpdateUser : handleCreateUser}>
            {editingUser() ? 'Update User' : 'Create User'}
          </Button>
        </div>
      }
    >
      <div class="space-y-4">
        <Input
          label="Username"
          value={createForm().username}
          onInput={(e) => setCreateForm(prev => ({ ...prev, username: e.currentTarget.value }))}
          placeholder="Enter username"
          disabled={!!editingUser()}
        />
        
        <Input
          label="Email"
          type="email"
          value={createForm().email}
          onInput={(e) => setCreateForm(prev => ({ ...prev, email: e.currentTarget.value }))}
          placeholder="Enter email address"
        />

        <Input
          label={editingUser() ? 'New Password (leave empty to keep current)' : 'Password'}
          type="password"
          value={createForm().password}
          onInput={(e) => setCreateForm(prev => ({ ...prev, password: e.currentTarget.value }))}
          placeholder={editingUser() ? 'Leave empty to keep current password' : 'Enter password'}
        />
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={createForm().role}
            onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.currentTarget.value as UserRole }))}
          >
            <option value="viewer">Viewer - Read-only access</option>
            <option value="operator">Operator - Can manage resources</option>
            <option value="admin">Admin - Full system access</option>
          </select>
        </div>

        <div class="bg-gray-50 border border-gray-200 rounded-md p-3">
          <h4 class="text-sm font-medium text-gray-900 mb-2">Role Permissions</h4>
          <div class="text-xs text-gray-600 space-y-1">
            {createForm().role === 'admin' && (
              <div>
                <strong>Admin:</strong> Full access to all features including user management, 
                certificate management, token management, and system configuration.
              </div>
            )}
            {createForm().role === 'operator' && (
              <div>
                <strong>Operator:</strong> Can manage certificates, tokens, and monitor sessions. 
                Cannot manage users or system settings.
              </div>
            )}
            {createForm().role === 'viewer' && (
              <div>
                <strong>Viewer:</strong> Read-only access to dashboards, metrics, and logs. 
                Cannot make changes to the system.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          <p class="text-gray-600 mt-1">Manage user accounts, roles, and permissions</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          icon={
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Create User
        </Button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {users().filter(u => u.status === 'active').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Admins</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {users().filter(u => u.role === 'admin').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Suspended</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {users().filter(u => u.status === 'suspended').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                <dd class="text-lg font-medium text-gray-900">{users().length}</dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <Table
          data={users()}
          columns={columns}
          loading={loading()}
          emptyMessage="No users found"
        />
      </Card>

      {/* User Form Modal */}
      <UserFormModal />
    </div>
  );
};

export default Users;