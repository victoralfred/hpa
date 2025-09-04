import { Component, createSignal, Show } from 'solid-js';
import { Card, Button, Input, Badge, Modal, LoadingSpinner } from '~/components/ui';

const Settings: Component = () => {
  const [activeTab, setActiveTab] = createSignal('general');
  const [showSaveModal, setShowSaveModal] = createSignal(false);
  const [savedSettings, setSavedSettings] = createSignal(false);

  // Settings state
  const [generalSettings, setGeneralSettings] = createSignal({
    platformName: 'HPA Management Platform',
    adminEmail: 'admin@hpa-platform.com',
    supportEmail: 'support@hpa-platform.com',
    timezone: 'UTC',
    language: 'en',
    theme: 'light'
  });

  const [securitySettings, setSecuritySettings] = createSignal({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireMFA: true,
    allowApiAccess: true,
    auditLogging: true,
    certificateValidityDays: 90
  });

  const [notificationSettings, setNotificationSettings] = createSignal({
    emailNotifications: true,
    certificateExpiry: true,
    agentDisconnected: true,
    systemAlerts: true,
    maintenanceMode: false,
    slackWebhook: '',
    discordWebhook: ''
  });

  const [backupSettings, setBackupSettings] = createSignal({
    enableAutoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    backupLocation: '/var/backups/hpa',
    enableEncryption: true
  });

  const handleSaveSettings = () => {
    setShowSaveModal(true);
    // Simulate save operation
    setTimeout(() => {
      setShowSaveModal(false);
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 3000);
    }, 1500);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: 'cog' },
    { id: 'security', label: 'Security', icon: 'shield' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'backup', label: 'Backup', icon: 'database' },
    { id: 'api', label: 'API Keys', icon: 'key' },
    { id: 'logs', label: 'System Logs', icon: 'document' }
  ];

  const getTabIcon = (iconType: string) => {
    const icons: Record<string, () => any> = {
      cog: () => (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      shield: () => (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      bell: () => (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      database: () => (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      key: () => (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      document: () => (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    };
    return icons[iconType]?.() || icons.cog();
  };

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
          <p class="text-gray-600 mt-1">Configure platform settings and preferences</p>
        </div>
        <div class="flex space-x-3">
          <Show when={savedSettings()}>
            <Badge variant="success">Settings saved successfully!</Badge>
          </Show>
          <Button onClick={handleSaveSettings}>
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </Button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div class="lg:w-64">
          <Card>
            <nav class="space-y-1">
              {tabs.map(tab => (
                <button
                  class={`w-full flex items-center space-x-3 px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
                    activeTab() === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <div class={activeTab() === tab.id ? 'text-blue-500' : 'text-gray-400'}>
                    {getTabIcon(tab.icon)}
                  </div>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div class="flex-1">
          <Card>
            {/* General Settings */}
            <Show when={activeTab() === 'general'}>
              <div class="space-y-6">
                <h3 class="text-lg font-medium text-gray-900">General Settings</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Platform Name</label>
                    <Input
                      type="text"
                      value={generalSettings().platformName}
                      onInput={(e) => setGeneralSettings(prev => ({ ...prev, platformName: e.currentTarget.value }))}
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Admin Email</label>
                    <Input
                      type="email"
                      value={generalSettings().adminEmail}
                      onInput={(e) => setGeneralSettings(prev => ({ ...prev, adminEmail: e.currentTarget.value }))}
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Support Email</label>
                    <Input
                      type="email"
                      value={generalSettings().supportEmail}
                      onInput={(e) => setGeneralSettings(prev => ({ ...prev, supportEmail: e.currentTarget.value }))}
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Timezone</label>
                    <select 
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={generalSettings().timezone}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.currentTarget.value }))}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Language</label>
                    <select 
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={generalSettings().language}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, language: e.currentTarget.value }))}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Theme</label>
                    <select 
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={generalSettings().theme}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, theme: e.currentTarget.value }))}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                </div>
              </div>
            </Show>

            {/* Security Settings */}
            <Show when={activeTab() === 'security'}>
              <div class="space-y-6">
                <h3 class="text-lg font-medium text-gray-900">Security Settings</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                    <Input
                      type="number"
                      value={securitySettings().sessionTimeout}
                      onInput={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.currentTarget.value) }))}
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Max Login Attempts</label>
                    <Input
                      type="number"
                      value={securitySettings().maxLoginAttempts}
                      onInput={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.currentTarget.value) }))}
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Password Min Length</label>
                    <Input
                      type="number"
                      value={securitySettings().passwordMinLength}
                      onInput={(e) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.currentTarget.value) }))}
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Certificate Validity (days)</label>
                    <Input
                      type="number"
                      value={securitySettings().certificateValidityDays}
                      onInput={(e) => setSecuritySettings(prev => ({ ...prev, certificateValidityDays: parseInt(e.currentTarget.value) }))}
                    />
                  </div>
                </div>
                
                <div class="space-y-4">
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="requireMFA" 
                      checked={securitySettings().requireMFA}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, requireMFA: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="requireMFA" class="ml-2 text-sm text-gray-700">Require Multi-Factor Authentication</label>
                  </div>
                  
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="allowApiAccess" 
                      checked={securitySettings().allowApiAccess}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, allowApiAccess: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="allowApiAccess" class="ml-2 text-sm text-gray-700">Allow API Access</label>
                  </div>
                  
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="auditLogging" 
                      checked={securitySettings().auditLogging}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, auditLogging: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="auditLogging" class="ml-2 text-sm text-gray-700">Enable Audit Logging</label>
                  </div>
                </div>
              </div>
            </Show>

            {/* Notification Settings */}
            <Show when={activeTab() === 'notifications'}>
              <div class="space-y-6">
                <h3 class="text-lg font-medium text-gray-900">Notification Settings</h3>
                
                <div class="space-y-4">
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="emailNotifications" 
                      checked={notificationSettings().emailNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailNotifications: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="emailNotifications" class="ml-2 text-sm text-gray-700">Email Notifications</label>
                  </div>
                  
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="certificateExpiry" 
                      checked={notificationSettings().certificateExpiry}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, certificateExpiry: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="certificateExpiry" class="ml-2 text-sm text-gray-700">Certificate Expiry Alerts</label>
                  </div>
                  
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="agentDisconnected" 
                      checked={notificationSettings().agentDisconnected}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, agentDisconnected: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="agentDisconnected" class="ml-2 text-sm text-gray-700">Agent Disconnection Alerts</label>
                  </div>
                  
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="systemAlerts" 
                      checked={notificationSettings().systemAlerts}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, systemAlerts: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="systemAlerts" class="ml-2 text-sm text-gray-700">System Alerts</label>
                  </div>
                  
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="maintenanceMode" 
                      checked={notificationSettings().maintenanceMode}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, maintenanceMode: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="maintenanceMode" class="ml-2 text-sm text-gray-700">Maintenance Mode</label>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Slack Webhook URL</label>
                    <Input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={notificationSettings().slackWebhook}
                      onInput={(e) => setNotificationSettings(prev => ({ ...prev, slackWebhook: e.currentTarget.value }))}
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Discord Webhook URL</label>
                    <Input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={notificationSettings().discordWebhook}
                      onInput={(e) => setNotificationSettings(prev => ({ ...prev, discordWebhook: e.currentTarget.value }))}
                    />
                  </div>
                </div>
              </div>
            </Show>

            {/* Backup Settings */}
            <Show when={activeTab() === 'backup'}>
              <div class="space-y-6">
                <h3 class="text-lg font-medium text-gray-900">Backup Settings</h3>
                
                <div class="space-y-4">
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="enableAutoBackup" 
                      checked={backupSettings().enableAutoBackup}
                      onChange={(e) => setBackupSettings(prev => ({ ...prev, enableAutoBackup: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="enableAutoBackup" class="ml-2 text-sm text-gray-700">Enable Automatic Backups</label>
                  </div>
                  
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      id="enableEncryption" 
                      checked={backupSettings().enableEncryption}
                      onChange={(e) => setBackupSettings(prev => ({ ...prev, enableEncryption: e.currentTarget.checked }))}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label for="enableEncryption" class="ml-2 text-sm text-gray-700">Enable Backup Encryption</label>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Backup Frequency</label>
                    <select 
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={backupSettings().backupFrequency}
                      onChange={(e) => setBackupSettings(prev => ({ ...prev, backupFrequency: e.currentTarget.value }))}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Retention (days)</label>
                    <Input
                      type="number"
                      value={backupSettings().retentionDays}
                      onInput={(e) => setBackupSettings(prev => ({ ...prev, retentionDays: parseInt(e.currentTarget.value) }))}
                    />
                  </div>
                  
                  <div class="col-span-full">
                    <label class="block text-sm font-medium text-gray-700">Backup Location</label>
                    <Input
                      type="text"
                      value={backupSettings().backupLocation}
                      onInput={(e) => setBackupSettings(prev => ({ ...prev, backupLocation: e.currentTarget.value }))}
                    />
                  </div>
                </div>
              </div>
            </Show>

            {/* API Keys */}
            <Show when={activeTab() === 'api'}>
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-medium text-gray-900">API Keys</h3>
                  <Button size="sm">
                    <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Generate New Key
                  </Button>
                </div>
                
                <div class="space-y-4">
                  <div class="border rounded-lg p-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="font-medium text-gray-900">Management API Key</h4>
                        <p class="text-sm text-gray-500">Full access to management APIs</p>
                        <code class="text-xs text-gray-600 font-mono">hpa_mgmt_xxxxxxxxxxxxxxxxxxxx</code>
                      </div>
                      <div class="flex space-x-2">
                        <Badge variant="success">Active</Badge>
                        <Button size="sm" variant="outline">Revoke</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="border rounded-lg p-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="font-medium text-gray-900">Read-Only API Key</h4>
                        <p class="text-sm text-gray-500">Read-only access to metrics and status</p>
                        <code class="text-xs text-gray-600 font-mono">hpa_readonly_xxxxxxxxxxxxxxxxxxxx</code>
                      </div>
                      <div class="flex space-x-2">
                        <Badge variant="success">Active</Badge>
                        <Button size="sm" variant="outline">Revoke</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* System Logs */}
            <Show when={activeTab() === 'logs'}>
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-medium text-gray-900">System Logs</h3>
                  <div class="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Logs
                    </Button>
                    <Button size="sm" variant="outline">
                      <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                  </div>
                </div>
                
                <div class="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
                  <pre class="text-green-400 text-sm font-mono">
{`2024-09-02 12:00:00 [INFO] System startup completed
2024-09-02 12:00:01 [INFO] Database connection established
2024-09-02 12:00:02 [INFO] Certificate validation successful
2024-09-02 12:00:03 [INFO] Agent connections initialized
2024-09-02 12:00:04 [INFO] Web server listening on port 8080
2024-09-02 12:01:00 [INFO] Heartbeat received from agent-prod-01
2024-09-02 12:01:15 [INFO] Heartbeat received from agent-staging-01
2024-09-02 12:01:30 [WARN] Agent agent-dev-01 missed heartbeat
2024-09-02 12:02:00 [INFO] Certificate expiry check completed
2024-09-02 12:02:15 [INFO] Backup process started
2024-09-02 12:02:45 [INFO] Backup completed successfully`}
                  </pre>
                </div>
              </div>
            </Show>
          </Card>
        </div>
      </div>

      {/* Save Modal */}
      <Show when={showSaveModal()}>
        <Modal
          open={showSaveModal()}
          onClose={() => {}}
          title="Saving Settings"
        >
          <div class="text-center py-4">
            <LoadingSpinner size="lg" />
            <p class="mt-2 text-gray-600">Saving your settings...</p>
          </div>
        </Modal>
      </Show>
    </div>
  );
};

export default Settings;