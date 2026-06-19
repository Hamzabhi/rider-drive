import { createSignal, For, Show } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Card } from '@/components/ui';
import { Badge, Avatar } from '@/components/ui/badge';
import { mockRides } from '@/api/mock-data';
import { formatCurrency, formatDate, formatTime, formatDistance, formatDuration } from '@/utils/helpers';

type FilterStatus = 'all' | 'completed' | 'cancelled' | 'in_progress';

export default function RiderHistoryPage() {
  const [filter, setFilter] = createSignal<FilterStatus>('all');
  const [selected, setSelected] = createSignal<typeof mockRides[0] | null>(null);

  const filters: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'In Progress', value: 'in_progress' },
  ];

  const statusVariant = (status: string): 'success' | 'danger' | 'warning' | 'primary' | 'ghost' => {
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'danger';
    if (status === 'in_progress') return 'warning';
    return 'primary';
  };

  const filtered = () => {
    const s = filter();
    if (s === 'all') return mockRides;
    return mockRides.filter(r => r.status === s);
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Ride History</h1>
          <p class="text-text-secondary">View all your past rides</p>
        </div>

        {/* Filters */}
        <div class="flex gap-2 flex-wrap">
          <For each={filters}>{(f) => (
            <button
              onClick={() => setFilter(f.value)}
              class={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter() === f.value
                  ? 'bg-primary text-text-inverse'
                  : 'bg-surface border border-border text-text-secondary hover:border-primary'
              }`}
            >
              {f.label}
            </button>
          )}</For>
        </div>

        {/* Ride List */}
        <Show when={filtered().length > 0} fallback={
          <div class="text-center py-16">
            <svg class="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-text-secondary">No rides found</p>
          </div>
        }>
          <div class="space-y-3">
            <For each={filtered()}>{(ride) => (
              <Card hoverable onClick={() => setSelected(ride)}>
                <div class="flex items-start gap-4">
                  <Show when={ride.driver}>
                    <Avatar src={ride.driver!.avatar} name={`${ride.driver!.firstName} ${ride.driver!.lastName}`} size="md" />
                  </Show>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <Show when={ride.driver}>
                        <p class="font-medium text-text-primary">{ride.driver!.firstName} {ride.driver!.lastName}</p>
                      </Show>
                      <Badge variant={statusVariant(ride.status)} size="sm">{ride.status.replace('_', ' ')}</Badge>
                    </div>
                    <div class="space-y-1 text-sm text-text-secondary">
                      <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                        <span class="truncate">{ride.pickup.address}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
                        <span class="truncate">{ride.dropoff.address}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span>{formatDate(ride.createdAt)}</span>
                      <span>{formatTime(ride.createdAt)}</span>
                      <span>{formatDistance(ride.distance)}</span>
                      <span>{formatDuration(ride.duration)}</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="font-bold text-text-primary text-lg">{formatCurrency(ride.fare.total)}</p>
                    <Show when={ride.rating}>
                      <div class="flex items-center gap-1 justify-end mt-1">
                        <For each={Array(5).fill(0)}>{(_, i) => (
                          <svg class={`w-3 h-3 ${i() < (ride.rating ?? 0) ? 'text-warning' : 'text-border'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        )}</For>
                      </div>
                    </Show>
                  </div>
                </div>
              </Card>
            )}</For>
          </div>
        </Show>

        {/* Ride Detail Modal */}
        <Show when={selected()}>
          <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-overlay" onClick={() => setSelected(null)}>
            <div class="w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold text-text-primary">Ride Details</h2>
                <button onClick={() => setSelected(null)} class="text-text-muted hover:text-text-primary">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="space-y-4">
                <div class="flex items-center gap-3 p-3 bg-surface-variant rounded-lg">
                  <div class="w-2 h-2 rounded-full bg-success" />
                  <div>
                    <p class="text-xs text-text-muted">Pickup</p>
                    <p class="text-sm text-text-primary">{selected()!.pickup.address}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-surface-variant rounded-lg">
                  <div class="w-2 h-2 rounded-full bg-danger" />
                  <div>
                    <p class="text-xs text-text-muted">Dropoff</p>
                    <p class="text-sm text-text-primary">{selected()!.dropoff.address}</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="text-center p-3 bg-surface-variant rounded-lg">
                    <p class="text-xs text-text-muted">Fare</p>
                    <p class="font-bold text-text-primary">{formatCurrency(selected()!.fare.total)}</p>
                  </div>
                  <div class="text-center p-3 bg-surface-variant rounded-lg">
                    <p class="text-xs text-text-muted">Distance</p>
                    <p class="font-bold text-text-primary">{formatDistance(selected()!.distance)}</p>
                  </div>
                  <div class="text-center p-3 bg-surface-variant rounded-lg">
                    <p class="text-xs text-text-muted">Duration</p>
                    <p class="font-bold text-text-primary">{formatDuration(selected()!.duration)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
