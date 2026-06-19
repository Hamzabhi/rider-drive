import { createSignal, Show, For, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card } from '@/components/ui';
import { Avatar, Badge } from '@/components/ui/badge';
import { authStore, walletStore } from '@/store';
import { mockRides, mockRider } from '@/api/mock-data';
import { formatCurrency } from '@/utils/helpers';

export default function RiderHomePage() {
  const navigate = useNavigate();
  const user = authStore.user;
  // Wallet balance: pulled from walletStore when live, falls back to a demo value.
  const balance = () => walletStore.balance() || 150;
  const loyaltyPoints = 2450;

  const quickActions = [
    { label: 'Book Ride', icon: 'M8 17h8M8 17v-4m8 4v-4', path: '/rider/book' },
    { label: 'Track Ride', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', path: '/rider/tracking' },
    { label: 'Wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', path: '/rider/wallet' },
    { label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', path: '/rider/history' },
  ];

  return (
    <MainLayout>
      <div class="space-y-6">
        {/* Welcome Section */}
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-text-primary">Hello, {user()?.firstName || 'Rider'}!</h1>
            <p class="text-text-secondary">Where would you like to go today?</p>
          </div>
          <Avatar name={`${user()?.firstName || 'U'} ${user()?.lastName || ''}`} size="lg" />
        </div>

        {/* Quick Actions */}
        <div class="grid grid-cols-4 gap-3">
          <For each={quickActions}>{(action) => (
            <button
              onClick={() => navigate(action.path)}
              class="flex flex-col items-center gap-2 p-4 bg-surface rounded-xl border border-border hover:border-primary transition-colors"
            >
              <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={action.icon}/>
                </svg>
              </div>
              <span class="text-sm font-medium text-text-primary">{action.label}</span>
            </button>
          )}</For>
        </div>

        {/* Wallet Balance Card */}
        <Card class="bg-gradient-to-r from-primary-500 to-primary-700 text-text-inverse border-none">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm opacity-80">Wallet Balance</p>
              <p class="text-3xl font-bold mt-1">{formatCurrency(balance())}</p>
            </div>
            <Button variant="outline" class="border-white/30 text-text-inverse hover:bg-white/10" onClick={() => navigate('/rider/wallet')}>
              Top Up
            </Button>
          </div>
          <div class="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p class="text-xs opacity-70">Loyalty Points</p>
              <p class="text-lg font-semibold">{loyaltyPoints.toLocaleString()}</p>
            </div>
            <div>
              <p class="text-xs opacity-70">Total Rides</p>
              <p class="text-lg font-semibold">{mockRides.length}</p>
            </div>
          </div>
        </Card>

        {/* Saved Locations */}
        <div>
          <h2 class="text-lg font-semibold text-text-primary mb-3">Saved Locations</h2>
          <div class="space-y-2">
            <For each={mockRider.savedLocations}>{(loc) => (
              <button
                onClick={() => navigate('/rider/book')}
                class="w-full flex items-center gap-3 p-3 bg-surface rounded-lg border border-border hover:border-primary transition-colors text-left"
              >
                <div class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center">
                  <Show when={loc.type === 'home'} fallback={
                    <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M9 20h6a2 2 0 002-2V8a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  }>
                    <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                  </Show>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-text-primary">{loc.name}</p>
                  <p class="text-sm text-text-secondary truncate">{loc.address}</p>
                </div>
                <Badge variant="ghost" size="sm">{loc.type}</Badge>
              </button>
            )}</For>
          </div>
        </div>

        {/* Recent Rides */}
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-text-primary">Recent Rides</h2>
            <button onClick={() => navigate('/rider/history')} class="text-sm text-primary hover:underline">View All</button>
          </div>
          <div class="space-y-3">
            <For each={mockRides.slice(0, 2)}>{(ride) => (
              <Card class="flex items-center gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <p class="font-medium text-text-primary truncate">{ride.pickup.address.split(',')[0]}</p>
                    <svg class="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                    <p class="font-medium text-text-primary truncate">{ride.dropoff.address.split(',')[0]}</p>
                  </div>
                  <p class="text-sm text-text-secondary">{new Date(ride.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-text-primary">{formatCurrency(ride.fare.total)}</p>
                  <Badge variant={ride.status === 'completed' ? 'success' : 'warning'} size="sm">{ride.status}</Badge>
                </div>
              </Card>
            )}</For>
          </div>
        </div>

        {/* Book Ride CTA */}
        <Button class="w-full h-14 text-lg" onClick={() => navigate('/rider/book')}>
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Book a Ride
        </Button>
      </div>
    </MainLayout>
  );
}
