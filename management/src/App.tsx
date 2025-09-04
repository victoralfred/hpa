import { Component, createSignal } from 'solid-js';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import { Router, Route } from "@solidjs/router";
// Import UI components
import { SidebarItem } from './components/layout/Sidebar';

// Import styles
import './index.css';
import Auth from './pages/Auth';

const AppContent: Component = () => {
  const auth = useAuth();
  const [currentPage, setCurrentPage] = createSignal('dashboard');

  // Handle navigation
  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    console.log(`Navigating to: ${pageId}`);
  };

  // Navigation items for the sidebar
  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'clusters',
      label: 'Clusters',
      href: '/clusters',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'agents',
      label: 'Agents',
      href: '/agents',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'certificates',
      label: 'Certificates',
      href: '/certificates',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'tokens',
      label: 'Tokens',
      href: '/tokens',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'sessions',
      label: 'Sessions',
      href: '/sessions',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'users',
      label: 'Users',
      href: '/users',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'audit',
      label: 'Security Audit',
      href: '/audit',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: handleNavigation
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: () => (
        <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  // Page components
  const renderDashboard = () => (
    <div style="padding: 2rem;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Dashboard</h1>
      <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #374151;">System Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">5</div>
            <div style="color: #6b7280;">Active Clusters</div>
          </div>
          <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">12</div>
            <div style="color: #6b7280;">Running Agents</div>
          </div>
          <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">8</div>
            <div style="color: #6b7280;">Certificates</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClusters = () => (
    <div style="padding: 2rem;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Cluster Management</h1>
      <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #374151;">HPA Clusters</h2>
        <p style="color: #6b7280; margin-bottom: 1rem;">Manage your Horizontal Pod Autoscaler clusters</p>
        <div style="background: #f9fafb; padding: 1rem; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="color: #374151;">• cluster-prod-us-east-1 (Active)</p>
          <p style="color: #374151;">• cluster-staging-us-west-2 (Active)</p>
          <p style="color: #374151;">• cluster-dev-eu-west-1 (Active)</p>
        </div>
      </div>
    </div>
  );

  const renderAgents = () => (
    <div style="padding: 2rem;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Agent Management</h1>
      <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #374151;">Running Agents</h2>
        <p style="color: #6b7280; margin-bottom: 1rem;">Monitor and manage HPA agents across clusters</p>
        <div style="background: #f0fdf4; padding: 1rem; border-radius: 6px; border: 1px solid #d1fae5;">
          <p style="color: #15803d;">✅ 12 agents running successfully</p>
          <p style="color: #6b7280;">Last heartbeat: 30 seconds ago</p>
        </div>
      </div>
    </div>
  );

  const renderCertificates = () => (
    <div style="padding: 2rem;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Certificate Management</h1>
      <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #374151;">mTLS Certificates</h2>
        <p style="color: #6b7280; margin-bottom: 1rem;">Manage certificates for secure agent communication</p>
        <div style="background: #fef3c7; padding: 1rem; border-radius: 6px; border: 1px solid #fcd34d;">
          <p style="color: #92400e;">⚠️ 2 certificates expiring in 30 days</p>
          <p style="color: #6b7280;">Review and renew certificates as needed</p>
        </div>
      </div>
    </div>
  );

  const renderPage = () => {
    switch (currentPage()) {
      case 'dashboard': return renderDashboard();
      case 'clusters': return renderClusters();
      case 'agents': return renderAgents();
      case 'certificates': return renderCertificates();
      case 'tokens': 
        return (
          <div style="padding: 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Token Management</h1>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #6b7280;">Manage JWT tokens and authentication</p>
            </div>
          </div>
        );
      case 'sessions':
        return (
          <div style="padding: 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Session Management</h1>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #6b7280;">Monitor active user sessions</p>
            </div>
          </div>
        );
      case 'users':
        return (
          <div style="padding: 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">User Management</h1>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #6b7280;">Manage users, roles, and permissions</p>
            </div>
          </div>
        );
      case 'audit':
        return (
          <div style="padding: 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Security Audit</h1>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #6b7280;">Security logs and audit trails</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div style="padding: 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1f2937;">Settings</h1>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #6b7280;">System configuration and preferences</p>
            </div>
          </div>
        );
      default: 
        return renderDashboard();
    }
  };

  return (
    <Layout
      sidebarItems={sidebarItems}
      user={{
        name: auth.user()?.firstName && auth.user()?.lastName 
          ? `${auth.user()!.firstName} ${auth.user()!.lastName}`
          : auth.user()?.email || 'User',
        email: auth.user()?.email || '',
        avatar: auth.user()?.avatar
      }}
      onLogout={() => auth.logout()}
      activeItem={currentPage()}
    >
      {renderPage()}
    </Layout>
  );
};

const App: Component = () => {
  return (
    <AuthProvider>
      <Router>
        {/* Public routes */}
        <Route path="/login" component={Auth} />
        <Route path="/register" component={Auth} />
        <Route path="/reset-password" component={Auth} />

        {/* Protected routes */}
        <Route
          path="/*"
          component={() => (
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          )}
        />
      </Router>
    </AuthProvider>
  );
};
export default App;
