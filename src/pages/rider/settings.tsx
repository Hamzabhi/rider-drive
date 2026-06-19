import { createSignal, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card, Input } from '@/components/ui';
import { Avatar } from '@/components/ui/badge';
import { themeStore, authStore } from '@/store';
import { mockRider } from '@/api/mock-data';
import { useToast } from '@/components/ui/toast';

export default function RiderSettingsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = createSignal(false);
  const [profile, setProfile] = createSignal({
    firstName: mockRider.firstName,
    lastName: mockRider.lastName,
    email: mockRider.email,
    phone: mockRider.phone,
  });

  const update = (field: keyof ReturnType<typeof profile>) => (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    setProfile(prev => ({ ...prev, [field]: el.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.add('Profile updated successfully', 'success');
  };

  const notificationSettings = [
    { label: 'Ride updates', desc: 'Get notified when your ride status changes', enabled: true },
    { label: 'Promotions', desc: 'Receive special offers and discounts', enabled: true },
    { label: 'News & updates', desc: 'Platform news and new features', enabled: false },
  ];

  const [notifications, setNotifications] = createSignal(notificationSettings);

  const toggleNotification = (index: number) => {
    setNotifications(prev => prev.map((n, i) => i === index ? { ...n, enabled: !n.enabled } : n));
  };

  return (
    <MainLayout>
      <div class="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Settings</h1>
          <p class="text-text-secondary">Manage your account preferences</p>
        </div>

        {/* Profile */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Profile</h2>
          <div class="flex items-center gap-4 mb-6">
            <Avatar src={mockRider.avatar} name={`${mockRider.firstName} ${mockRider.lastName}`} size="xl" />
            <div>
              <p class="font-medium text-text-primary">{mockRider.firstName} {mockRider.lastName}</p>
              <p class="text-sm text-text-secondary">{mockRider.email}</p>
              <Button variant="ghost" size="sm" class="mt-1 -ml-2">Change photo</Button>
            </div>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <Input label="First name" value={profile().firstName} onInput={update('firstName')} />
              <Input label="Last name" value={profile().lastName} onInput={update('lastName')} />
            </div>
            <Input label="Email" type="email" value={profile().email} onInput={update('email')} />
            <Input label="Phone" type="tel" value={profile().phone} onInput={update('phone')} />
          </div>
          <Button class="mt-4" isLoading={saving()} onClick={handleSave}>Save Changes</Button>
        </Card>

        {/* Theme */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Appearance</h2>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-text-primary">Dark Mode</p>
              <p class="text-sm text-text-secondary">Switch between light and dark theme</p>
            </div>
            <button
              onClick={() => themeStore.toggle()}
              class={`relative w-12 h-6 rounded-full transition-colors ${themeStore.mode() === 'dark' ? 'bg-primary' : 'bg-surface-variant'}`}
            >
              <div class={`absolute top-1 w-4 h-4 rounded-full bg-bg-primary shadow transition-transform ${themeStore.mode() === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <button
            onClick={() => navigate('/admin/theme')}
            class="w-full flex items-center justify-between mt-4 p-3 rounded-lg hover:bg-surface-variant transition-colors"
          >
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
              </svg>
              <div class="text-left">
                <p class="font-medium text-text-primary">Advanced Theme Settings</p>
                <p class="text-sm text-text-secondary">Customize colors, typography & layout</p>
              </div>
            </div>
            <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </Card>

        {/* Notifications */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Notifications</h2>
          <div class="space-y-4">
            <For each={notifications()}>{(notif, i) => (
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-text-primary">{notif.label}</p>
                  <p class="text-sm text-text-secondary">{notif.desc}</p>
                </div>
                <button
                  onClick={() => toggleNotification(i())}
                  class={`relative w-12 h-6 rounded-full transition-colors ${notif.enabled ? 'bg-primary' : 'bg-surface-variant'}`}
                >
                  <div class={`absolute top-1 w-4 h-4 rounded-full bg-bg-primary shadow transition-transform ${notif.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            )}</For>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Security</h2>
          <div class="space-y-3">
            <button class="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-variant transition-colors">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <div class="text-left">
                  <p class="font-medium text-text-primary">Change Password</p>
                  <p class="text-sm text-text-secondary">Last changed 3 months ago</p>
                </div>
              </div>
              <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            <button class="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-variant transition-colors">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <div class="text-left">
                  <p class="font-medium text-text-primary">Two-Factor Authentication</p>
                  <p class="text-sm text-text-secondary">Add an extra layer of security</p>
                </div>
              </div>
              <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card class="border-2 border-danger-100 dark:border-danger-900/50">
          <h2 class="text-lg font-semibold text-danger mb-2">Danger Zone</h2>
          <p class="text-sm text-text-secondary mb-4">Irreversible actions for your account</p>
          <Button variant="danger" onClick={() => toast.add('This action requires confirmation', 'error')}>
            Delete Account
          </Button>
        </Card>
      </div>
    </MainLayout>
  );
}
