import { Component, JSX, createSignal } from 'solid-js';
import Header from './Header';
import Sidebar, { SidebarItem } from './Sidebar';

export interface LayoutProps {
  title?: string;
  children?: JSX.Element;
  sidebarItems?: SidebarItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
  activeItem?: string;
}

const Layout: Component<LayoutProps> = (props) => {
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen());
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style="min-height: 100vh; background-color: #f9fafb;">
      {/* Sidebar */}
      <Sidebar
        items={props.sidebarItems || []}
        isOpen={sidebarOpen()}
        onClose={closeSidebar}
        activeItem={props.activeItem}
      />

      {/* Main content area */}
      <div style="padding-left: 16rem;">
        {/* Header */}
        <Header
          title={props.title}
          user={props.user}
          onMenuToggle={toggleSidebar}
          onLogout={props.onLogout}
        />

        {/* Page content */}
        <main style="padding: 2rem 0;">
          <div style="max-width: 80rem; margin: 0 auto; padding: 0 1rem;">
            {props.children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;