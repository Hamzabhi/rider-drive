import { createSignal, Show, For, createEffect, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Input, Card, EmptyState } from '@/components/ui';
import { Avatar, Badge, Skeleton } from '@/components/ui/badge';
import { bookingStore } from '@/store';
import { realtime } from '@/api/realtime';
import { formatCurrency, formatDuration, calculateDistance } from '@/utils/helpers';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/utils/helpers';

const STEPS = ['pickup', 'dropoff', 'fare', 'bids', 'confirm'] as const;
type Step = typeof STEPS[number];

const VEHICLE_OPTIONS = [
  { id: 'sedan' as const, label: 'Standard', desc: 'Everyday rides', icon: 'M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0l-2-4h12l-2 4' },
  { id: 'suv' as const, label: 'SUV', desc: 'Extra space', icon: 'M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0l-2-4h12l-2 4M6 13l-1.5-3A1 1 0 015.5 8h9a1 1 0 01.9.6L17 13' },
  { id: 'luxury' as const, label: 'Luxury', desc: 'Premium comfort', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
];

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
      <div class={cn('max-w-2xl mx-auto page-section', step() === 'bids' && 'pb-80')}>
        <div class="flex items-center gap-2">
          <For each={STEPS}>{(s) => (
            <div class={`flex-1 h-1.5 rounded-full transition-all duration-500 ${STEPS.indexOf(s) <= stepIndex() ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-surface-variant'}`} />
          )}</For>
        </div>

        <Show when={step() === 'pickup'}>
          <Card padding="lg">
            <h2 class="heading-section text-xl font-semibold text-text-primary mb-6">Where are you?</h2>
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
            <Button class="w-full mt-6" onClick={() => setStep('dropoff')} disabled={!pickup().address}>Continue</Button>
          </Card>
        </Show>

        <Show when={step() === 'dropoff'}>
          <Card padding="lg">
            <h2 class="heading-section text-xl font-semibold text-text-primary mb-6">Where to?</h2>
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
            <div class="flex gap-3 mt-6">
              <Button variant="outline" class="flex-1" onClick={() => setStep('pickup')}>Back</Button>
              <Button class="flex-1" onClick={() => handleQuote()} isLoading={loading()} disabled={!dropoff().address}>
                Get Fare
              </Button>
            </div>
          </Card>
        </Show>

        <Show when={step() === 'fare'}>
          <Card padding="lg">
            <h2 class="heading-section text-xl font-semibold text-text-primary mb-6">Set Your Fare</h2>

            <p class="text-sm font-medium text-text-secondary mb-3 heading-section">Choose ride type</p>
            <div class="grid grid-cols-3 gap-3 mb-8">
              <For each={VEHICLE_OPTIONS}>{(opt) => (
                <button
                  type="button"
                  onClick={() => setVehicleType(opt.id)}
                  class={cn(
                    'interactive-card flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center',
                    vehicleType() === opt.id
                      ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                      : 'border-border hover:border-primary/50 bg-surface'
                  )}
                >
                  <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={opt.icon}/>
                    </svg>
                  </div>
                  <span class="text-sm font-semibold text-text-primary">{opt.label}</span>
                  <span class="text-xs text-text-muted">{opt.desc}</span>
                </button>
              )}</For>
            </div>

            <div class="text-center py-6 px-4 rounded-2xl bg-surface-variant/60 dark:bg-surface-variant/40 mb-6">
              <p class="text-sm text-text-secondary mb-2">Suggested fare</p>
              <p class="text-4xl font-bold text-text-primary heading-page">
                {estimate() ? formatCurrency(estimate()!.suggestedFare) : '...'}
              </p>
              <p class="text-sm text-text-secondary mt-2">Based on {estimatedDistance().toFixed(1)} km trip</p>
            </div>

            <div class="space-y-5">
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
                class="input-range"
              />
              {estimate() && (
                <p class="text-center text-sm text-text-muted">
                  Recommended {formatCurrency(estimate()!.suggestedFare)} · minimum {formatCurrency(estimate()!.minimum)} ·
                  estimated {formatDuration(estimate()!.durationSeconds)}
                </p>
              )}
            </div>
            <div class="flex gap-3 mt-8">
              <Button variant="outline" class="flex-1" onClick={() => setStep('dropoff')}>Back</Button>
              <Button class="flex-1" onClick={handleFindDrivers} isLoading={loading()}>Find Drivers</Button>
            </div>
          </Card>
        </Show>

        <Show when={step() === 'bids'}>
          <Card padding="lg" class="text-center">
            <h2 class="heading-section text-xl font-semibold text-text-primary mb-2">Drivers are responding</h2>
            <p class="text-text-secondary mb-6">Review offers in the panel below and pick your driver</p>
            <div class="flex justify-center gap-2">
              <Skeleton class="h-3 w-24 rounded-full" />
              <Skeleton class="h-3 w-32 rounded-full" />
              <Skeleton class="h-3 w-20 rounded-full" />
            </div>
          </Card>
        </Show>
      </div>

      {/* Bidding drawer */}
      <Show when={step() === 'bids'}>
        <div class="bidding-drawer max-h-[75vh] flex flex-col">
          <div class="w-12 h-1 rounded-full bg-border dark:bg-white/20 mx-auto mt-3 mb-4 flex-shrink-0" />
          <div class="px-6 pb-2 flex-shrink-0">
            <h3 class="heading-section text-lg font-semibold text-text-primary">
              {loading() && bids().length === 0 ? 'Finding drivers...' : `${bids().length} driver${bids().length === 1 ? '' : 's'} available`}
            </h3>
            <p class="text-sm text-text-secondary mt-1">Select an offer to continue</p>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
            <Show when={loading() && bids().length === 0} fallback={
              <Show when={bids().length > 0} fallback={
                <EmptyState
                  illustration="search"
                  title="Waiting for drivers"
                  description={realtime.connected() ? 'Connected — offers will appear here shortly.' : 'Drivers notified — waiting for responses...'}
                  class="py-10"
                />
              }>
                <For each={bids()}>{(bid) => (
                  <button
                    onClick={() => handleSelectBid(bid.id)}
                    class={cn(
                      'interactive-card w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors',
                      bookingStore.selectedBid()?.id === bid.id
                        ? 'border-primary bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary/10'
                        : 'border-border dark:border-white/10 hover:border-primary/60 bg-surface/80'
                    )}
                  >
                    <Avatar src={bid.driver.avatar} name={`${bid.driver.firstName} ${bid.driver.lastName}`} size="lg" />
                    <div class="flex-1 text-left min-w-0">
                      <p class="font-semibold text-text-primary">{bid.driver.firstName} {bid.driver.lastName}</p>
                      <div class="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
                        <span class="flex items-center gap-1">
                          <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          {bid.driver.rating}
                        </span>
                        <span>·</span>
                        <span>{bid.driver.totalRides} rides</span>
                        <span>·</span>
                        <span>{bid.eta} min away</span>
                      </div>
                      <p class="text-xs text-text-muted mt-1 truncate">{bid.driver.vehicle.color} {bid.driver.vehicle.make} {bid.driver.vehicle.model}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <p class="text-lg font-bold text-text-primary">{formatCurrency(bid.amount)}</p>
                      <Badge variant={bid.amount <= proposedFare() ? 'success' : 'warning'} size="xs">
                        {bid.amount <= proposedFare() ? 'Within budget' : 'Above offer'}
                      </Badge>
                    </div>
                  </button>
                )}</For>
              </Show>
            }>
              <div class="space-y-3 py-2">
                <For each={[1, 2, 3]}>{() => (
                  <div class="flex items-center gap-4 p-4 rounded-xl border border-border dark:border-white/10">
                    <Skeleton class="w-12 h-12 rounded-full flex-shrink-0" />
                    <div class="flex-1 space-y-2">
                      <Skeleton class="h-4 w-32" />
                      <Skeleton class="h-3 w-48" />
                    </div>
                    <Skeleton class="h-6 w-16" />
                  </div>
                )}</For>
              </div>
            </Show>
          </div>

          <div class="flex gap-3 px-6 py-5 border-t border-border dark:border-white/10 flex-shrink-0 bg-surface/50 dark:bg-surface/30">
            <Button variant="outline" class="flex-1" onClick={() => { bookingStore.reset(); setStep('fare'); }}>Back</Button>
            <Button class="flex-1" onClick={handleConfirmRide} isLoading={loading()} disabled={!bookingStore.selectedBid()}>
              Confirm Ride
            </Button>
          </div>
        </div>
      </Show>
    </MainLayout>
  );
}
