import { createSignal, For, Show } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card, Input } from '@/components/ui';
import { Badge, Avatar } from '@/components/ui/badge';
import { mockRider, mockDrivers } from '@/api/mock-data';
import { formatDate } from '@/utils/helpers';
import type { User } from '@/types';

type UserRole = 'all' | 'rider' | 'driver' | 'admin';

const allUsers: User[] = [
  mockRider,
  ...mockDrivers,
  {
    id: 'a1', email: 'admin@rideflow.com', phone: '+1000000000', firstName: 'Admin',
    lastName: 'User', role: 'admin', isVerified: true, isActive: true,
    createdAt: '2024-01-01', updatedAt: '2024-01-01',
  },
];

export default function AdminUsersPage() {
  const [search, setSearch] = createSignal('');
  const [roleFilter, setRoleFilter] = createSignal<UserRole>('all');
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);

  const roles: { label: string; value: UserRole }[] = [
    { label: 'All', value: 'all' },
    { label: 'Riders', value: 'rider' },
    { label: 'Drivers', value: 'driver' },
    { label: 'Admins', value: 'admin' },
  ];

  const filtered = () => {
    const q = search().toLowerCase();
    return allUsers.filter(u => {
      const matchRole = roleFilter() === 'all' || u.role === roleFilter();
      const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  };

  const roleVariant = (role: string): 'primary' | 'warning' | 'success' | 'danger' => {
    if (role === 'driver') return 'warning';
    if (role === 'admin') return 'danger';
    return 'primary';
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-text-primary">Users</h1>
            <p class="text-text-secondary">{allUsers.length} total users</p>
          </div>
          <Button>
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add User
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div class="flex flex-col sm:flex-row gap-4">
            <Input
              class="flex-1"
              placeholder="Search by name or email..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
              leftIcon={
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              }
            />
            <div class="flex gap-2">
              <For each={roles}>{(r) => (
                <button
                  onClick={() => setRoleFilter(r.value)}
                  class={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    roleFilter() === r.value
                      ? 'bg-primary text-text-inverse'
                      : 'bg-surface-variant text-text-secondary hover:bg-primary/10'
                  }`}
                >
                  {r.label}
                </button>
              )}</For>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border text-left">
                <th class="pb-3 text-sm font-medium text-text-secondary">User</th>
                <th class="pb-3 text-sm font-medium text-text-secondary">Role</th>
                <th class="pb-3 text-sm font-medium text-text-secondary">Status</th>
                <th class="pb-3 text-sm font-medium text-text-secondary">Joined</th>
                <th class="pb-3 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <For each={filtered()}>{(user) => (
                <tr class="hover:bg-surface-variant/50 transition-colors">
                  <td class="py-3 pr-4">
                    <div class="flex items-center gap-3">
                      <Avatar
                        src={user.avatar}
                        name={`${user.firstName} ${user.lastName}`}
                        size="sm"
                      />
                      <div>
                        <p class="font-medium text-text-primary">{user.firstName} {user.lastName}</p>
                        <p class="text-xs text-text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 pr-4">
                    <Badge variant={roleVariant(user.role)} size="sm">{user.role}</Badge>
                  </td>
                  <td class="py-3 pr-4">
                    <Badge variant={user.isActive ? 'success' : 'danger'} size="sm" dot>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td class="py-3 pr-4">
                    <span class="text-sm text-text-secondary">{formatDate(user.createdAt)}</span>
                  </td>
                  <td class="py-3">
                    <div class="flex items-center gap-2">
                      <Button variant="ghost" size="xs" onClick={() => setSelectedUser(user)}>View</Button>
                      <Button variant="outline" size="xs">Edit</Button>
                    </div>
                  </td>
                </tr>
              )}</For>
            </tbody>
          </table>
        </div>

        {/* User Detail Modal */}
        <Show when={selectedUser()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setSelectedUser(null)}>
            <div class="w-full max-w-md bg-surface rounded-2xl shadow-2xl p-6 m-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-lg font-bold text-text-primary">User Profile</h2>
                <button onClick={() => setSelectedUser(null)} class="text-text-muted hover:text-text-primary">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="flex items-center gap-4 mb-6">
                <Avatar
                  src={selectedUser()!.avatar}
                  name={`${selectedUser()!.firstName} ${selectedUser()!.lastName}`}
                  size="xl"
                />
                <div>
                  <p class="text-xl font-bold text-text-primary">{selectedUser()!.firstName} {selectedUser()!.lastName}</p>
                  <p class="text-text-secondary">{selectedUser()!.email}</p>
                  <Badge variant={roleVariant(selectedUser()!.role)} size="sm" class="mt-1">{selectedUser()!.role}</Badge>
                </div>
              </div>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between p-2 rounded bg-surface-variant">
                  <span class="text-text-secondary">Phone</span>
                  <span class="text-text-primary font-medium">{selectedUser()!.phone}</span>
                </div>
                <div class="flex justify-between p-2 rounded bg-surface-variant">
                  <span class="text-text-secondary">Status</span>
                  <Badge variant={selectedUser()!.isActive ? 'success' : 'danger'} size="sm">{selectedUser()!.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div class="flex justify-between p-2 rounded bg-surface-variant">
                  <span class="text-text-secondary">Verified</span>
                  <Badge variant={selectedUser()!.isVerified ? 'success' : 'warning'} size="sm">{selectedUser()!.isVerified ? 'Yes' : 'No'}</Badge>
                </div>
                <div class="flex justify-between p-2 rounded bg-surface-variant">
                  <span class="text-text-secondary">Member Since</span>
                  <span class="text-text-primary font-medium">{formatDate(selectedUser()!.createdAt)}</span>
                </div>
              </div>
              <div class="flex gap-2 mt-6">
                <Button variant="danger" size="sm" class="flex-1">Suspend</Button>
                <Button size="sm" class="flex-1">Send Message</Button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
