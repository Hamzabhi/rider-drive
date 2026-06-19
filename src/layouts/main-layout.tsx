import { type ParentComponent, createSignal, Show, For, createEffect } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { cn } from '@/utils/helpers';
import { authStore, themeStore, notificationStore } from '@/store';
import { Avatar } from '@/components/ui/badge';
import { formatRelative } from '@/utils/helpers';

interface NavItem { path: string; label: string; icon: string }

const riderNav: NavItem[] = [
  { path: '/rider', label: 'Home', icon: 'home' },
  { path: '/rider/book', label: 'Book Ride', icon: 'car' },
  { path: '/rider/history', label: 'History', icon: 'clock' },
  { path: '/rider/wallet', label: 'Wallet', icon: 'wallet' },
  { path: '/rider/settings', label: 'Settings', icon: 'settings' },
  { path: '/admin/theme', label: 'Theme', icon: 'palette' },
];

const driverNav: NavItem[] = [
  { path: '/driver', label: 'Dashboard', icon: 'home' },
  { path: '/driver/requests', label: 'Requests', icon: 'list' },
  { path: '/driver/earnings', label: 'Earnings', icon: 'dollar' },
  { path: '/admin/theme', label: 'Theme', icon: 'palette' },
];

const adminNav: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: 'home' },
  { path: '/admin/users', label: 'Users', icon: 'users' },
  { path: '/admin/analytics', label: 'Analytics', icon: 'chart' },
  { path: '/admin/theme', label: 'Theme', icon: 'palette' },
];

const icons: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  car: 'M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0l-2-4h12l-2 4M6 13l-1.5-3A1 1 0 015.5 8h9a1 1 0 01.9.6L17 13m-11 0h11',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  wallet: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  list: 'M4 6h16M4 12h16M4 18h16',
  dollar: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  palette: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
};

export const MainLayout: ParentComponent = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = createSignal(false);
  const [profileOpen, setProfileOpen] = createSignal(false);
  const [notifOpen, setNotifOpen] = createSignal(false);

  createEffect(() => {
    if (!authStore.isAuthenticated()) navigate('/login');
  });

  const user = () => authStore.user();
  const navItems = () => {
    const role = user()?.role;
    if (role === 'driver') return driverNav;
    if (role === 'admin') return adminNav;
    return riderNav;
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  const handleNotifClick = (id: string) => {
    notificationStore.markRead(id);
  };

  return (
    <div class="min-h-screen bg-background">
      {/* Sidebar backdrop */}
      <Show when={sidebarOpen()}>
        <div class="fixed inset-0 z-20 bg-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
      </Show>

      {/* Sidebar */}
      <aside class={cn(
        'fixed top-0 left-0 z-30 h-full w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0',
        sidebarOpen() ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div class="flex items-center gap-3 h-16 px-5 border-b border-border flex-shrink-0">
          <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-text-inverse shadow-md">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span class="text-lg font-bold text-text-primary tracking-tight">RideFlow</span>
        </div>

        {/* User info strip */}
        <div class="px-4 py-3 border-b border-border flex-shrink-0">
          <div class="flex items-center gap-3">
            <Avatar name={`${user()?.firstName || 'U'} ${user()?.lastName || ''}`} size="sm" />
            <div class="min-w-0">
              <p class="text-sm font-medium text-text-primary truncate">{user()?.firstName} {user()?.lastName}</p>
              <p class="text-xs text-text-muted capitalize">{user()?.role}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav class="flex-1 overflow-y-auto p-3 space-y-0.5">
          <For each={navItems()}>{(item) => (
            <button
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              class={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-150',
                isActive(item.path)
                  ? 'bg-primary text-text-inverse shadow-sm'
                  : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary'
              )}
            >
              <svg class="w-4.5 h-4.5 flex-shrink-0" style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[item.icon]}/>
              </svg>
              <span class="font-medium">{item.label}</span>
            </button>
          )}</For>
        </nav>

        {/* Bottom actions */}
        <div class="p-3 border-t border-border flex-shrink-0 space-y-0.5">
          <button
            onClick={() => themeStore.toggle()}
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface-variant transition-colors"
          >
            <Show when={themeStore.mode() === 'dark'} fallback={
              <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            }>
              <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </Show>
            <span>{themeStore.mode() === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-danger hover:bg-danger-50 dark:hover:bg-danger/10 transition-colors"
          >
            <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div class="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header class="sticky top-0 z-10 h-16 bg-surface/95 backdrop-blur border-b border-border flex items-center gap-2 px-4">
          <button
            class="lg:hidden p-2 rounded-lg hover:bg-surface-variant"
            onClick={() => setSidebarOpen(true)}
          >
            <svg class="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Page title from nav */}
          <div class="hidden sm:block">
            <p class="text-sm font-semibold text-text-primary">
              {navItems().find(n => n.path === location.pathname)?.label || 'RideFlow'}
            </p>
          </div>

          <div class="flex-1" />

          {/* Notification Bell */}
          <div class="relative">
            <button
              onClick={() => { setNotifOpen(!notifOpen()); setProfileOpen(false); }}
              class="relative p-2 rounded-lg hover:bg-surface-variant text-text-secondary transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <Show when={notificationStore.unreadCount() > 0}>
                <span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger text-text-inverse text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {notificationStore.unreadCount()}
                </span>
              </Show>
            </button>

            <Show when={notifOpen()}>
              <div class="absolute right-0 mt-2 w-80 bg-surface rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in">
                <div class="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p class="font-semibold text-text-primary">Notifications</p>
                  <Show when={notificationStore.unreadCount() > 0}>
                    <button onClick={() => notificationStore.markAllRead()} class="text-xs text-primary hover:underline">
                      Mark all read
                    </button>
                  </Show>
                </div>
                <div class="max-h-72 overflow-y-auto divide-y divide-border">
                  <For each={notificationStore.notifications()} fallback={
                    <p class="text-sm text-text-muted text-center py-6">No notifications</p>
                  }>{(n) => (
                    <button
                      onClick={() => handleNotifClick(n.id)}
                      class={cn('w-full text-left px-4 py-3 hover:bg-surface-variant transition-colors', !n.isRead && 'bg-primary-50/50 dark:bg-primary-900/10')}
                    >
                      <div class="flex items-start gap-3">
                        <div class={cn('mt-0.5 w-2 h-2 rounded-full flex-shrink-0', !n.isRead ? 'bg-primary' : 'bg-transparent')} />
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-text-primary">{n.title}</p>
                          <p class="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                          <p class="text-xs text-text-muted mt-1">{formatRelative(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  )}</For>
                </div>
              </div>
            </Show>
          </div>

          {/* Profile */}
          <div class="relative">
            <button
              onClick={() => { setProfileOpen(!profileOpen()); setNotifOpen(false); }}
              class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-surface-variant transition-colors"
            >
              <Avatar name={`${user()?.firstName || 'U'} ${user()?.lastName || ''}`} size="sm" />
              <span class="hidden sm:block text-sm font-medium text-text-primary">{user()?.firstName}</span>
              <svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <Show when={profileOpen()}>
              <div class="absolute right-0 mt-2 w-52 bg-surface rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in">
                <div class="px-4 py-3 border-b border-border">
                  <p class="text-sm font-semibold text-text-primary">{user()?.firstName} {user()?.lastName}</p>
                  <p class="text-xs text-text-muted mt-0.5">{user()?.email}</p>
                </div>
                <div class="py-1">
                  <button
                    onClick={() => { navigate(user()?.role === 'rider' ? '/rider/settings' : '/driver'); setProfileOpen(false); }}
                    class="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-variant transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons.settings}/>
                    </svg>
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    class="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger-50 dark:hover:bg-danger/10 transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </header>

        {/* Content */}
        <main class="flex-1 p-4 md:p-6">{props.children}</main>
      </div>

      {/* Close dropdowns on outside click */}
      <Show when={notifOpen() || profileOpen()}>
        <div class="fixed inset-0 z-[5]" onClick={() => { setNotifOpen(false); setProfileOpen(false); }} />
      </Show>
    </div>
  );
};
