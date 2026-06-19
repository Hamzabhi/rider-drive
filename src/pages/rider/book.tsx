import { createSignal, Show, For, createEffect, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Input, Card } from '@/components/ui';
import { Avatar, Badge, Spinner } from '@/components/ui/badge';
import { bookingStore, authStore } from '@/store';
import { realtime } from '@/api/realtime';
import { formatCurrency, formatDuration, calculateDistance } from '@/utils/helpers';
import { useToast } from '@/components/ui/toast';

const STEPS = ['pickup', 'dropoff', 'fare', 'bids', 'confirm'] as const;
type Step = typeof STEPS[number];

// Default NYC locations used when the user doesn't enable geolocation.
const DEFAULT_PICKUP = { address: 'Times Square, New York, NY', latitude: 40.7580, longitude: -73.9855 };
const DEFAULT_DROPOFF = { address: 'Central Park, New York, NY', latitude: 40.7829, longitude: -73.9654 };

export default function BookRidePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = createSignal<Step>('pickup');
  const [pickup, setPickup] = createSignal(DEFAULT_PICKUP);
  const [dropoff, setDropoff] = createSignal(DEFAULT_DROPOFF);
  const [proposedFare, setProposedFare] = createSignal(10);
  const [vehicleType, setVehicleType] = createSignal<'sedan' | 'suv' | 'luxury'>('sedan');

  const loading = bookingStore.loading;
  const estimate = bookingStore.estimate;
  const bids = bookingStore.bids;
  const rideId = bookingStore.rideId;

  // When bids come in via the WS client (auto-applied to the store) or via
  // REST polling, the list below updates reactively with no extra work here.

  // Poll bids every 2.5s while we're on the bids step (REST fallback for when
  // realtime-go's WebSocket isn't connected — e.g. dev with no backend).
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  createEffect(() => {
    if (step() === 'bids' && rideId()) {
      bookingStore.refreshBids();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => bookingStore.refreshBids(), 2500);
    } else if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  });

  const handleQuote = async () => {
    const est = await bookingStore.quoteFare(pickup(), dropoff(), vehicleType());
    if (!est) toast.add('Could not fetch a fare estimate', 'error');
    setStep('fare');
  };

  const handleFindDrivers = async () => {
    const newRideId = await bookingStore.requestRide(pickup(), dropoff(), proposedFare(), vehicleType());
    if (!newRideId) {
      toast.add('Could not request a ride', 'error');
      return;
    }
    // Step is set to 'bids' inside requestRide; explicit set keeps types tight.
    setStep('bids');
    toast.add('Searching for nearby drivers...', 'success');
  };

  const handleSelectBid = (bidId: string) => {
    const bid = bids().find(b => b.id === bidId);
    if (bid) bookingStore.setSelectedBid(bid);
  };

  const handleConfirmRide = async () => {
    const selected = bookingStore.selectedBid();
    if (!selected) {
      toast.add('Please select a driver', 'error');
      return;
    }
    const ok = await bookingStore.acceptBid(selected);
    if (!ok) {
      toast.add('Could not confirm the ride. Try another offer.', 'error');
      return;
    }
    toast.add('Ride confirmed! Driver is on the way.', 'success');
    navigate('/rider/tracking');
  };

  onMount(() => bookingStore.reset());

  const stepIndex = () => STEPS.indexOf(step());
  const estimatedDistance = () => {
    const est = estimate();
    if (est) return est.distanceMeters / 1000;
    return calculateDistance(pickup().latitude, pickup().longitude, dropoff().latitude, dropoff().longitude) / 1000;
  };

  return (
    <MainLayout>
      <div class="max-w-2xl mx-auto space-y-6">
        {/* Progress indicator */}
        <div class="flex items-center gap-2">
          <For each={STEPS}>{(s) => (
            <div class={`flex-1 h-1 rounded-full transition-colors ${STEPS.indexOf(s) <= stepIndex() ? 'bg-primary' : 'bg-surface-variant'}`} />
          )}</For>
        </div>

        <Show when={step() === 'pickup'}>
          <Card>
            <h2 class="text-lg font-semibold text-text-primary mb-4">Where are you?</h2>
            <Input
              label="Pickup Location"
              value={pickup().address}
              onInput={(e) => setPickup(prev => ({ ...prev, address: e.currentTarget.value }))}
              placeholder="Enter pickup address"
              leftIcon={
                <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" stroke-width="2"/>
                </svg>
              }
            />
            <Button class="w-full mt-4" onClick={() => setStep('dropoff')} disabled={!pickup().address}>Continue</Button>
          </Card>
        </Show>

        <Show when={step() === 'dropoff'}>
          <Card>
            <h2 class="text-lg font-semibold text-text-primary mb-4">Where to?</h2>
            <Input
              label="Dropoff Location"
              value={dropoff().address}
              onInput={(e) => setDropoff(prev => ({ ...prev, address: e.currentTarget.value }))}
              placeholder="Enter destination"
              leftIcon={
                <svg class="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              }
            />
            <div class="flex gap-2 mt-4">
              <Button variant="outline" class="flex-1" onClick={() => setStep('pickup')}>Back</Button>
              <Button class="flex-1" onClick={() => handleQuote()} isLoading={loading()} disabled={!dropoff().address}>
                Get Fare
              </Button>
            </div>
          </Card>
        </Show>

        <Show when={step() === 'fare'}>
          <Card>
            <h2 class="text-lg font-semibold text-text-primary mb-4">Set Your Fare</h2>
            <div class="text-center py-6">
              <p class="text-sm text-text-secondary mb-2">Suggested fare</p>
              <p class="text-3xl font-bold text-text-primary">
                {estimate() ? formatCurrency(estimate()!.suggestedFare) : '...'}
              </p>
              <p class="text-sm text-text-secondary mt-2">Based on {estimatedDistance().toFixed(1)} km trip</p>
            </div>
            <div class="space-y-4">
              <Input
                label="Your Fare Offer"
                type="number"
                value={String(proposedFare())}
                onInput={(e) => setProposedFare(Number(e.currentTarget.value))}
                leftIcon={<span class="text-text-secondary font-medium text-sm">$</span>}
              />
              <input
                type="range"
                min={estimate() ? Math.max(estimate()!.minimum, 5) : 5}
                max="50"
                value={proposedFare()}
                onInput={(e) => setProposedFare(Number(e.currentTarget.value))}
                class="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer"
              />
              {estimate() && (
                <p class="text-center text-sm text-text-muted">
                  Recommended {formatCurrency(estimate()!.suggestedFare)} · minimum {formatCurrency(estimate()!.minimum)} ·
                  estimated {formatDuration(estimate()!.durationSeconds)}
                </p>
              )}
            </div>
            <div class="flex gap-2 mt-4">
              <Button variant="outline" class="flex-1" onClick={() => setStep('dropoff')}>Back</Button>
              <Button class="flex-1" onClick={handleFindDrivers} isLoading={loading()}>Find Drivers</Button>
            </div>
          </Card>
        </Show>

        <Show when={step() === 'bids'}>
          <Card>
            <h2 class="text-lg font-semibold text-text-primary mb-4">
              {loading() ? 'Finding drivers...' : `${bids().length} drivers available`}
            </h2>
            <Show when={bids().length > 0 || !loading()} fallback={
              <div class="flex flex-col items-center py-8">
                <Spinner size="lg" />
                <p class="text-text-secondary mt-4">Searching for nearby drivers...</p>
              </div>
            }>
              <div class="space-y-3">
                <For each={bids()} fallback={
                  <p class="text-text-muted text-center py-6">
                    {realtime.connected() ? 'Connected — waiting for drivers to respond...' : 'Drivers notified — waiting for responses...'}
                  </p>
                }>{(bid) => (
                  <button
                    onClick={() => handleSelectBid(bid.id)}
                    class={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                      bookingStore.selectedBid()?.id === bid.id ? 'border-primary bg-primary-50 dark:bg-primary-900/20' : 'border-border hover:border-primary'
                    }`}
                  >
                    <Avatar src={bid.driver.avatar} name={`${bid.driver.firstName} ${bid.driver.lastName}`} size="lg" />
                    <div class="flex-1 text-left">
                      <p class="font-medium text-text-primary">{bid.driver.firstName} {bid.driver.lastName}</p>
                      <div class="flex items-center gap-2 text-sm text-text-secondary">
                        <span class="flex items-center gap-1">
                          <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          {bid.driver.rating}
                        </span>
                        <span>|</span>
                        <span>{bid.driver.totalRides} rides</span>
                        <span>|</span>
                        <span>{bid.eta} min away</span>
                      </div>
                      <p class="text-xs text-text-muted mt-1">{bid.driver.vehicle.color} {bid.driver.vehicle.make} {bid.driver.vehicle.model}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-bold text-text-primary">{formatCurrency(bid.amount)}</p>
                      <Badge variant={bid.amount <= proposedFare() ? 'success' : 'warning'} size="xs">
                        {bid.amount <= proposedFare() ? 'Within budget' : 'Above offer'}
                      </Badge>
                    </div>
                  </button>
                )}</For>
              </div>
            </Show>
            <div class="flex gap-2 mt-4">
              <Button variant="outline" class="flex-1" onClick={() => { bookingStore.reset(); setStep('fare'); }}>Back</Button>
              <Button class="flex-1" onClick={handleConfirmRide} isLoading={loading()} disabled={!bookingStore.selectedBid()}>
                Confirm Ride
              </Button>
            </div>
          </Card>
        </Show>
      </div>
    </MainLayout>
  );
}
