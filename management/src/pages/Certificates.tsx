import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { Card, Button, Badge, Table, Modal, Input } from '~/components/ui';
import { Certificate, CreateCertificateForm } from '~/types';
import api from '~/services/api';

const Certificates: Component = () => {
  const [certificates, setCertificates] = createSignal<Certificate[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<CreateCertificateForm>({
    name: '',
    type: 'client',
    subject: '',
    validityDays: 365,
    keySize: 2048
  });

  const loadCertificates = async () => {
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock certificates data
      setCertificates([
        {
          id: '1',
          name: 'prod-client-cert',
          type: 'client',
          status: 'active',
          subject: 'CN=prod-client,O=HPA Platform',
          issuer: 'CN=HPA CA,O=HPA Platform',
          validFrom: '2024-01-15T00:00:00Z',
          validTo: '2025-01-15T00:00:00Z',
          serialNumber: '1A2B3C4D5E6F',
          fingerprint: 'SHA256:4f2a8b9c1d3e5f7a9b2c4d6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a',
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'staging-server-cert',
          type: 'server',
          status: 'active',
          subject: 'CN=staging.hpa.local,O=HPA Platform',
          issuer: 'CN=HPA CA,O=HPA Platform',
          validFrom: '2024-02-01T00:00:00Z',
          validTo: '2024-11-01T00:00:00Z',
          serialNumber: '2B3C4D5E6F7A',
          fingerprint: 'SHA256:5g3b9d2e4f6a8c1d5f8a2b4c6d9e1f3a5b7c9d2e4f6a8c1d5f8a2b4c6d9e1f3a',
          createdAt: '2024-02-01T14:20:00Z'
        },
        {
          id: '3',
          name: 'root-ca-cert',
          type: 'ca',
          status: 'active',
          subject: 'CN=HPA Root CA,O=HPA Platform',
          issuer: 'CN=HPA Root CA,O=HPA Platform',
          validFrom: '2024-01-01T00:00:00Z',
          validTo: '2029-01-01T00:00:00Z',
          serialNumber: '1A2B3C4D5E6F7A8B',
          fingerprint: 'SHA256:6h4c0e5f7a9c2d4f7a0b3c5d8e0f2a4b6c8d0e5f7a9c2d4f7a0b3c5d8e0f2a4b',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '4',
          name: 'expired-test-cert',
          type: 'client',
          status: 'expired',
          subject: 'CN=test-client,O=HPA Platform',
          issuer: 'CN=HPA CA,O=HPA Platform',
          validFrom: '2023-06-01T00:00:00Z',
          validTo: '2024-06-01T00:00:00Z',
          serialNumber: '3C4D5E6F7A8B',
          fingerprint: 'SHA256:7i5d1f6a8c3e5a1b4c6d9f2a4b7c9e2f5a8c1d4f7a0b3c6d9f2a5b8c1e4f7a0b',
          createdAt: '2023-06-01T09:15:00Z'
        }
      ]);

    } catch (error) {
      console.error('Failed to load certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadCertificates();
  });

  const handleCreateCertificate = async () => {
    try {
      console.log('Creating certificate:', createForm());
      // Here you would call the API
      // await api.createCertificate(createForm());
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        type: 'client',
        subject: '',
        validityDays: 365,
        keySize: 2048
      });
      loadCertificates();
    } catch (error) {
      console.error('Failed to create certificate:', error);
    }
  };

  const handleRevokeCertificate = async (id: string) => {
    if (confirm('Are you sure you want to revoke this certificate? This action cannot be undone.')) {
      try {
        console.log('Revoking certificate:', id);
        // await api.revokeCertificate(id);
        loadCertificates();
      } catch (error) {
        console.error('Failed to revoke certificate:', error);
      }
    }
  };

  const handleDownloadCertificate = async (cert: Certificate) => {
    try {
      console.log('Downloading certificate:', cert.id);
      // const blob = await api.downloadCertificate(cert.id);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.style.display = 'none';
      // a.href = url;
      // a.download = `${cert.name}.pem`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);
      
      alert('Certificate download functionality would be implemented here');
    } catch (error) {
      console.error('Failed to download certificate:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpiringSoon = (validTo: string) => {
    const expiryDate = new Date(validTo);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    return expiryDate <= thirtyDaysFromNow && expiryDate > now;
  };

  const columns = [
    { 
      key: 'name', 
      title: 'Certificate Name',
      render: (value: string, record: Certificate) => (
        <div class="font-medium text-gray-900">{value}</div>
      )
    },
    { 
      key: 'type', 
      title: 'Type',
      render: (value: string) => (
        <Badge variant="default">
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (value: string, record: Certificate) => {
        let variant: 'success' | 'warning' | 'error' = 'success';
        
        if (value === 'expired' || value === 'revoked') {
          variant = 'error';
        } else if (isExpiringSoon(record.validTo)) {
          variant = 'warning';
        }
        
        return (
          <Badge variant={variant} dot>
            {isExpiringSoon(record.validTo) && value === 'active' ? 'Expiring Soon' : value}
          </Badge>
        );
      }
    },
    { 
      key: 'subject', 
      title: 'Subject',
      render: (value: string) => (
        <span class="font-mono text-sm">{value}</span>
      )
    },
    { 
      key: 'validTo', 
      title: 'Expires',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Certificate) => (
        <div class="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadCertificate(record)}
          >
            Download
          </Button>
          {record.status === 'active' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleRevokeCertificate(record.id)}
            >
              Revoke
            </Button>
          )}
        </div>
      )
    }
  ];

  const CreateCertificateModal = () => (
    <Modal
      open={showCreateModal()}
      onClose={() => setShowCreateModal(false)}
      title="Create New Certificate"
      footer={
        <div class="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateCertificate}>
            Create Certificate
          </Button>
        </div>
      }
    >
      <div class="space-y-4">
        <Input
          label="Certificate Name"
          value={createForm().name}
          onInput={(e) => setCreateForm(prev => ({ ...prev, name: e.currentTarget.value }))}
          placeholder="e.g., prod-client-cert"
        />
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Certificate Type
          </label>
          <select
            class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={createForm().type}
            onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.currentTarget.value as 'client' | 'server' | 'ca' }))}
          >
            <option value="client">Client Certificate</option>
            <option value="server">Server Certificate</option>
            <option value="ca">CA Certificate</option>
          </select>
        </div>

        <Input
          label="Subject"
          value={createForm().subject}
          onInput={(e) => setCreateForm(prev => ({ ...prev, subject: e.currentTarget.value }))}
          placeholder="e.g., CN=example.com,O=Organization"
          helperText="Distinguished Name for the certificate"
        />

        <div class="grid grid-cols-2 gap-4">
          <Input
            label="Validity (days)"
            type="number"
            value={createForm().validityDays}
            onInput={(e) => setCreateForm(prev => ({ ...prev, validityDays: parseInt(e.currentTarget.value) || 365 }))}
            min="1"
            max="3650"
          />
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Key Size
            </label>
            <select
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={createForm().keySize}
              onChange={(e) => setCreateForm(prev => ({ ...prev, keySize: parseInt(e.currentTarget.value) }))}
            >
              <option value="2048">2048 bits</option>
              <option value="3072">3072 bits</option>
              <option value="4096">4096 bits</option>
            </select>
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
          <h1 class="text-2xl font-bold text-gray-900">Certificate Management</h1>
          <p class="text-gray-600 mt-1">Manage SSL/TLS certificates for your clusters and agents</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          icon={
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Create Certificate
        </Button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <dt class="text-sm font-medium text-gray-500 truncate">Active Certificates</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {certificates().filter(c => c.status === 'active').length}
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
                <dt class="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {certificates().filter(c => isExpiringSoon(c.validTo)).length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Expired/Revoked</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {certificates().filter(c => c.status === 'expired' || c.status === 'revoked').length}
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
                  <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Certificates</dt>
                <dd class="text-lg font-medium text-gray-900">{certificates().length}</dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Certificates Table */}
      <Card>
        <Table
          data={certificates()}
          columns={columns}
          loading={loading()}
          emptyMessage="No certificates found"
        />
      </Card>

      {/* Create Certificate Modal */}
      <CreateCertificateModal />
    </div>
  );
};

export default Certificates;