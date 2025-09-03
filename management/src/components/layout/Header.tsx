import { Component, JSX, Show } from 'solid-js';

export interface HeaderProps {
  title?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onMenuToggle?: () => void;
  onLogout?: () => void;
}

const Header: Component<HeaderProps> = (props) => {
  const UserIcon = () => (
    <svg style="width: 1.5rem; height: 1.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const MenuIcon = () => (
    <svg style="width: 1.5rem; height: 1.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  const LogoutIcon = () => (
    <svg style="width: 1.25rem; height: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );

  return (
    <header style="background-color: white; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 30;">
      <div style="padding: 0 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 4rem;">
          {/* Left section */}
          <div style="display: flex; align-items: center; gap: 1rem;">
            {/* Mobile menu button */}
            <button
              type="button"
              style="padding: 0.5rem; border-radius: 0.375rem; color: #9ca3af; background: none; border: none; cursor: pointer;"
              onClick={() => props.onMenuToggle?.()}
            >
              <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;">Open sidebar</span>
              <MenuIcon />
            </button>

            {/* Title */}
            <Show when={props.title}>
              <h1 style="font-size: 1.5rem; font-weight: 600; color: #111827;">
                {props.title}
              </h1>
            </Show>
          </div>

          {/* Right section */}
          <div style="display: flex; align-items: center; gap: 1rem;">
            {/* Notifications */}
            <button
              type="button"
              style="padding: 0.5rem; color: #9ca3af; background: none; border: none; border-radius: 0.375rem; cursor: pointer;"
            >
              <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;">View notifications</span>
              <svg style="width: 1.5rem; height: 1.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User menu */}
            <Show when={props.user}>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="text-align: right; display: block;">
                  <p style="font-size: 0.875rem; font-weight: 500; color: #111827;">{props.user?.name}</p>
                  <p style="font-size: 0.75rem; color: #6b7280;">{props.user?.email}</p>
                </div>
                
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  {/* Avatar */}
                  <div style="height: 2rem; width: 2rem; background-color: #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <Show when={props.user?.avatar} fallback={<UserIcon />}>
                      <img
                        style="height: 2rem; width: 2rem; border-radius: 50%;"
                        src={props.user?.avatar}
                        alt={props.user?.name}
                      />
                    </Show>
                  </div>

                  {/* Logout button */}
                  <button
                    style="padding: 0.5rem; color: #9ca3af; background: none; border: none; border-radius: 0.375rem; cursor: pointer; display: flex; align-items: center;"
                    onClick={() => props.onLogout?.()}
                    title="Logout"
                  >
                    <LogoutIcon />
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;