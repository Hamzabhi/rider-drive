import { createSignal, For, Show, onMount } from 'solid-js';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card, EmptyState } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { driverStore, authStore } from '@/store';
import { realtime } from '@/api/realtime';
import { formatCurrency } from '@/utils/helpers';
import { useToast } from '@/components/ui/toast';

interface RideRequest {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  distance: number;
  duration: number;
  eta: number;
  riderName: string;
  riderRating: number;
}

// Static demo fallback when the realtime WS hasn't delivered a real request.
const sampleRequests: RideRequest[] = [
  { id: 'r1', pickup: '123 Main St, Manhattan', dropoff: 'JFK Airport, Queens', fare: 45.00, distance: 18.5, duration: 35, eta: 4, riderName: 'Alex Johnson', riderRating: 4.8 },
  { id: 'r2', pickup: 'Times Square, Midtown', dropoff: 'Brooklyn Bridge, Brooklyn', fare: 22.50, distance: 6.2, duration: 18, eta: 7, riderName: 'Sarah Chen', riderRating: 5.0 },
  { id: 'r3', pickup: 'Central Park South', dropoff: 'Wall Street, Downtown', fare: 18.00, distance: 7.5, duration: 22, eta: 3, riderName: 'Mike Davis', riderRating: 4.6 },
];

export default function DriverRequestsPage() {
  const toast = useToast();
  const [localRequests, setLocalRequests] = createSignal(sampleRequests);
  const [accepting, setAccepting] = createSignal<string | null>(null);

  onMount(() => {
    if (!driverStore.isOnline()) {
      // Auto-go-online so the driver sees real requests flow in via WS.
      driverStore.toggleOnline();
    }
  });

  // Merge live WS requests with the static fallback. Narrow the union
  // to the 'ride_request' variant before reading its data fields.
  const requests = () => {
    const live = realtime.rideRequests().filter(r => r.event === 'ride_request') as Extract<import('@/api/realtime').RealtimeEvent, { event: 'ride_request' }>[];
    if (live.length > 0) {
      return live.slice(0, 5).map(r => ({
        id: r.data.ride_id,
        pickup: `${r.data.pickup_lat.toFixed(4)}, ${r.data.pickup_lng.toFixed(4)}`,
        dropoff: '(see rider screen)',
        fare: r.data.rider_proposed_fare,
        distance: 0,
        duration: 0,
        eta: 5,
        riderName: `Rider ${r.data.rider_id.slice(-4)}`,
        riderRating: 4.7,
      }));
    }
    return localRequests();
  };

  const handleAccept = async (req: RideRequest) => {
    setAccepting(req.id);
    try {
      await driverStore.submitBid(req.id, req.fare, req.eta * 60);
      setLocalRequests(prev => prev.filter(r => r.id !== req.id));
      toast.add('Bid accepted! Navigate to pickup.', 'success');
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Failed to accept ride', 'error');
    } finally {
      setAccepting(null);
    }
  };

  const handleDecline = (id: string) => {
    setLocalRequests(prev => prev.filter(r => r.id !== id));
    toast.add('Request declined', 'info');
  };

  return (
    <MainLayout>
      <div class="page-section">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="heading-page text-2xl font-bold text-text-primary">Ride Requests</h1>
            <p class="text-text-secondary mt-2">{requests().length} pending requests</p>
          </div>
          <Badge variant={requests().length > 0 ? 'warning' : 'ghost'} size="lg" dot={requests().length > 0}>
            {requests().length} New
          </Badge>
        </div>

        <Show when={requests().length > 0} fallback={
          <EmptyState
            illustration="requests"
            title="No requests right now"
            description="Stay online and new ride requests will appear here automatically."
          />
        }>
          <div class="space-y-5">
            <For each={requests()}>{(req) => (
              <Card class="animate-fade-in interactive-card" padding="lg">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span class="text-primary font-semibold">{req.riderName.charAt(0)}</span>
                    </div>
                    <div>
                      <p class="font-medium text-text-primary">{req.riderName}</p>
                      <div class="flex items-center gap-1 text-xs text-text-secondary">
                        <svg class="w-3 h-3 text-warning" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        {req.riderRating}
                      </div>
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">{req.eta} min away</Badge>
                </div>

                <div class="space-y-2 mb-4">
                  <div class="flex items-start gap-3">
                    <div class="mt-1.5 w-2.5 h-2.5 rounded-full bg-success flex-shrink-0" />
                    <div>
                      <p class="text-xs text-text-muted">Pickup</p>
                      <p class="text-sm text-text-primary">{req.pickup}</p>
                    </div>
                  </div>
                  <div class="ml-1 w-0.5 h-4 bg-border" />
                  <div class="flex items-start gap-3">
                    <div class="mt-1.5 w-2.5 h-2.5 rounded-full bg-danger flex-shrink-0" />
                    <div>
                      <p class="text-xs text-text-muted">Dropoff</p>
                      <p class="text-sm text-text-primary">{req.dropoff}</p>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4 p-3 bg-surface-variant rounded-lg mb-4">
                  <div class="text-center flex-1">
                    <p class="text-xs text-text-muted">Fare</p>
                    <p class="font-bold text-text-primary text-lg">{formatCurrency(req.fare)}</p>
                  </div>
                  <div class="w-px h-10 bg-border" />
                  <div class="text-center flex-1">
                    <p class="text-xs text-text-muted">Distance</p>
                    <p class="font-semibold text-text-primary">{req.distance} km</p>
                  </div>
                  <div class="w-px h-10 bg-border" />
                  <div class="text-center flex-1">
                    <p class="text-xs text-text-muted">Duration</p>
                    <p class="font-semibold text-text-primary">{req.duration} min</p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <Button variant="outline" class="flex-1" onClick={() => handleDecline(req.id)}>
                    Decline
                  </Button>
                  <Button class="flex-1" isLoading={accepting() === req.id} onClick={() => handleAccept(req)}>
                    Accept
                  </Button>
                </div>
              </Card>
            )}</For>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
