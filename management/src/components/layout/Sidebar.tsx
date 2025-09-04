import { Component, For, Show, createSignal } from 'solid-js';

import { JSX } from 'solid-js';

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: () => JSX.Element;
  badge?: string | number;
  onClick?: (id: string) => void;
}

export interface SidebarProps {
  items: SidebarItem[];
  isOpen?: boolean;
  onClose?: () => void;
  activeItem?: string;
}

const Sidebar: Component<SidebarProps> = (props) => {
  const isActive = (itemId: string) => {
    return props.activeItem === itemId;
  };

  // Default navigation items
  const DashboardIcon = () => (
    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
    </svg>
  );

  const CertificateIcon = () => (
    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );

  const TokenIcon = () => (
    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );

  const SessionIcon = () => (
    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const UserIcon = () => (
    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  );

  const AuditIcon = () => (
    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const defaultItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: DashboardIcon },
    { id: 'certificates', label: 'Certificates', href: '/certificates', icon: CertificateIcon },
    { id: 'tokens', label: 'Tokens', href: '/tokens', icon: TokenIcon },
    { id: 'sessions', label: 'Sessions', href: '/sessions', icon: SessionIcon },
    { id: 'users', label: 'Users', href: '/users', icon: UserIcon },
    { id: 'audit', label: 'Security Audit', href: '/audit', icon: AuditIcon },
  ];

  const navigationItems = () => props.items.length > 0 ? props.items : defaultItems;

  return (
    <>
      {/* Mobile overlay */}
      <Show when={props.isOpen}>
        <div 
          style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 40; background-color: rgba(0,0,0,0.5); display: block;"
          onClick={() => props.onClose?.()}
        />
      </Show>

      {/* Sidebar */}
      <aside 
        style="position: fixed; top: 0; bottom: 0; left: 0; z-index: 50; width: 16rem; background-color: white; border-right: 1px solid #e5e7eb; transform: translateX(0);"
      >
        <div style="display: flex; flex-direction: column; height: 100%;">
          {/* Logo */}
          <div style="display: flex; align-items: center; justify-content: space-between; height: 4rem; padding: 0 1.5rem; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 2rem; height: 2rem; background-color: #2563eb; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 1.125rem;">H</span>
              </div>
              <span style="font-size: 1.25rem; font-weight: 600; color: #111827;">HPA Platform</span>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              style="padding: 0.5rem; border-radius: 0.375rem; color: #9ca3af; background: none; border: none; cursor: pointer;"
              onClick={() => props.onClose?.()}
            >
              <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;">Close sidebar</span>
              <svg style="width: 1.5rem; height: 1.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav style="flex: 1; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <For each={navigationItems()}>
              {(item) => (
                <button
                  type="button"
                  style={`display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; transition: all 150ms; width: 100%; text-align: left; border: none; cursor: pointer; ${
                    isActive(item.id)
                      ? 'background-color: #dbeafe; color: #1d4ed8;'
                      : 'background-color: transparent; color: #4b5563;'
                  }`}
                  onClick={() => {
                    item.onClick?.(item.id);
                    props.onClose?.();
                  }}
                >
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style={isActive(item.id) ? 'color: #3b82f6;' : 'color: #9ca3af;'}>
                      {item.icon()}
                    </div>
                    <span>{item.label}</span>
                  </div>

                  <Show when={item.badge}>
                    <span style="margin-left: auto; background-color: #f3f4f6; color: #4b5563; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem;">
                      {item.badge}
                    </span>
                  </Show>
                </button>
              )}
            </For>
          </nav>

          {/* Footer */}
          <div style="padding: 1rem; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 0.75rem; color: #6b7280; text-align: center;">
              © 2024 HPA Platform
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;