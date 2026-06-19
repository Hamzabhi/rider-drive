import { createSignal, Show, For, onMount, createEffect } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card } from '@/components/ui';
import { Badge, Avatar, Spinner, Skeleton } from '@/components/ui/badge';
import { driverStore, authStore, notificationStore } from '@/store';
import { realtime } from '@/api/realtime';
import { bidToDomain } from '@/api/dto';
import { formatCurrency } from '@/utils/helpers';
import { useToast } from '@/components/ui/toast';
import type { Ride } from '@/types';

export default function DriverDashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = createSignal(false);
  const [counterOffer, setCounterOffer] = createSignal<number>(0);
  const [etaMinutes, setEtaMinutes] = createSignal<number>(5);

  // The currently-open ride request the driver is considering. We narrow the
  // RealtimeEvent union to the 'ride_request' variant with a type guard.
  const activeRequest = () => {
    const reqs = realtime.rideRequests();
    for (const r of reqs) {
      if (r.event === 'ride_request') return r;
    }
    return null;
  };

  onMount(() => {
    driverStore.loadEarnings();
    driverStore.loadRides();
  });

  const handleGoOnline = () => {
    driverStore.toggleOnline();
    toast.add(driverStore.isOnline() ? 'You are now online and receiving requests' : 'You are now offline', driverStore.isOnline() ? 'success' : 'info');
  };

  // Driver accepts the rider's proposed fare directly (no counter-offer).
  const handleAcceptRequest = async (req: NonNullable<ReturnType<typeof activeRequest>>) => {
    setLoading(true);
    try {
      await driverStore.submitBid(req.data.ride_id, req.data.rider_proposed_fare, etaMinutes() * 60);
      toast.add('Bid placed! Waiting for rider confirmation.', 'success');
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Failed to accept', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Driver counter-offers with a higher price (the InDrive model).
  const handleCounterOffer = async (req: NonNullable<ReturnType<typeof activeRequest>>) => {
    setLoading(true);
    try {
      await driverStore.submitBid(req.data.ride_id, counterOffer() || req.data.rider_proposed_fare, etaMinutes() * 60);
      toast.add(`Counter-offer of ${formatCurrency(counterOffer())} submitted`, 'success');
      setCounterOffer(0);
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Failed to submit counter-offer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const earnings = driverStore.earnings();
  const user = authStore.user();

  return (
    <MainLayout>
      <div class="page-section">
        {/* Status Toggle */}
        <Card class="flex items-center justify-between" padding="lg">
          <div class="flex items-center gap-4">
            <Avatar name={`${user?.firstName ?? 'Driver'} ${user?.lastName ?? ''}`} size="lg" />
            <div>
              <p class="font-semibold text-text-primary">{user?.firstName ?? 'Driver'}</p>
              <div class="flex items-center gap-2">
                <div class={`w-2 h-2 rounded-full ${driverStore.isOnline() ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
                <span class="text-sm text-text-secondary">
                  {driverStore.isOnline() ? (realtime.connected() ? 'Online' : 'Connecting...') : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant={driverStore.isOnline() ? 'danger' : 'success'}
            onClick={handleGoOnline}
          >
            {driverStore.isOnline() ? 'Go Offline' : 'Go Online'}
          </Button>
        </Card>

        {/* Active Ride Request */}
        <Show when={activeRequest()} keyed>
          {(req) => (
            <Card class="border-2 border-warning interactive-card animate-slide-in-up" padding="lg">
              <div class="flex items-start justify-between mb-3">
                <Badge variant="warning" size="sm" dot>New Request</Badge>
                <span class="text-sm text-text-secondary">Offer expires in {req.data.expires_in}s</span>
              </div>
              <div class="space-y-2 mb-4">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-success" />
                  <span class="text-sm text-text-primary">Pickup: {req.data.pickup_lat.toFixed(4)}, {req.data.pickup_lng.toFixed(4)}</span>
                </div>
              </div>
              <div class="bg-surface-variant rounded-lg p-4 mb-4">
                <p class="text-sm text-text-secondary">Rider is offering</p>
                <p class="text-3xl font-bold text-text-primary">{formatCurrency(req.data.rider_proposed_fare)}</p>
                <p class="text-xs text-text-muted mt-1">Vehicle: {req.data.vehicle_type}</p>
              </div>

              <div class="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label class="text-xs text-text-secondary">Counter-offer ($)</label>
                  <input
                    type="number"
                    value={counterOffer() || ''}
                    onInput={(e) => setCounterOffer(Number(e.currentTarget.value))}
                    placeholder={String(req.data.rider_proposed_fare)}
                    class="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label class="text-xs text-text-secondary">ETA (min)</label>
                  <input
                    type="number"
                    value={etaMinutes()}
                    onInput={(e) => setEtaMinutes(Number(e.currentTarget.value))}
                    class="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div class="flex gap-2">
                <Button variant="outline" class="flex-1" onClick={() => handleAcceptRequest(req)} isLoading={loading()}>Accept Offer</Button>
                <Button class="flex-1" onClick={() => handleCounterOffer(req)} isLoading={loading()} disabled={!counterOffer()}>Counter-Offer</Button>
              </div>
            </Card>
          )}
        </Show>

        {/* Earnings Summary */}
        <div>
          <h2 class="heading-section text-lg font-semibold text-text-primary mb-4">Your Earnings</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card padding="lg" class="interactive-card">
              <p class="text-sm text-text-secondary">Today</p>
              <p class="text-xl font-bold text-text-primary mt-1">{formatCurrency(earnings.today)}</p>
            </Card>
            <Card padding="lg" class="interactive-card">
              <p class="text-sm text-text-secondary">This Week</p>
              <p class="text-xl font-bold text-text-primary mt-1">{formatCurrency(earnings.week)}</p>
            </Card>
            <Card padding="lg" class="interactive-card">
              <p class="text-sm text-text-secondary">This Month</p>
              <p class="text-xl font-bold text-text-primary mt-1">{formatCurrency(earnings.month)}</p>
            </Card>
          </div>
        </div>

        {/* Recent Rides */}
        <Show when={driverStore.rides().length > 0}>
          <div>
            <h2 class="heading-section text-lg font-semibold text-text-primary mb-4">Recent Rides</h2>
            <div class="space-y-2">
              <For each={driverStore.rides()}>{(ride) => (
                <Card padding="sm" class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-text-primary capitalize">{ride.status.replace('_', ' ')}</p>
                    <p class="text-xs text-text-muted">{new Date(ride.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p class="font-semibold text-text-primary">{formatCurrency(ride.fare.total)}</p>
                </Card>
              )}</For>
            </div>
          </div>
        </Show>

        <Show when={driverStore.isOnline() && !activeRequest()}>
          <div class="flex flex-col items-center justify-center py-16 px-6">
            <div class="space-y-3 w-full max-w-sm mb-6">
              <Skeleton class="h-4 w-full rounded-lg" />
              <Skeleton class="h-4 w-48 mx-auto rounded-lg" />
              <Skeleton class="h-24 w-full rounded-xl" />
            </div>
            <Spinner size="md" />
            <p class="text-text-secondary mt-4 text-center leading-relaxed">Waiting for ride requests...</p>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
