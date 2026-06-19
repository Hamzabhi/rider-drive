import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { MainLayout } from '@/layouts/main-layout';
import { Button, Card } from '@/components/ui';
import { Avatar, Badge } from '@/components/ui/badge';
import { mockDrivers, mockRides } from '@/api/mock-data';
import { formatCurrency } from '@/utils/helpers';
import { useToast } from '@/components/ui/toast';

type TrackingStatus = 'driver_assigned' | 'driver_arriving' | 'driver_arrived' | 'in_progress' | 'completed';

const STATUS_STEPS: { key: TrackingStatus; label: string; desc: string }[] = [
  { key: 'driver_assigned', label: 'Driver Assigned', desc: 'Your driver has accepted the ride' },
  { key: 'driver_arriving', label: 'Driver En Route', desc: 'Your driver is heading to you' },
  { key: 'driver_arrived', label: 'Driver Arrived', desc: 'Your driver is waiting for you' },
  { key: 'in_progress', label: 'Ride in Progress', desc: 'Enjoy your ride!' },
  { key: 'completed', label: 'Completed', desc: 'You have reached your destination' },
];

const STATUS_ORDER: TrackingStatus[] = ['driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed'];

export default function TrackingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const driver = mockDrivers[0];
  const ride = mockRides[0];

  const [status, setStatus] = createSignal<TrackingStatus>('driver_assigned');
  const [eta, setEta] = createSignal(5);
  const [showRating, setShowRating] = createSignal(false);
  const [rating, setRating] = createSignal(0);
  const [hoveredStar, setHoveredStar] = createSignal(0);

  const currentStep = () => STATUS_ORDER.indexOf(status());

  onMount(() => {
    // Simulate ride progression
    const etaInterval = setInterval(() => {
      setEta(e => Math.max(0, e - 1));
    }, 8000);

    const statusInterval = setInterval(() => {
      setStatus(prev => {
        const idx = STATUS_ORDER.indexOf(prev);
        if (idx < STATUS_ORDER.length - 1) {
          const next = STATUS_ORDER[idx + 1];
          toast.add(STATUS_STEPS.find(s => s.key === next)!.label, 'info');
          return next;
        }
        return prev;
      });
    }, 7000);

    onCleanup(() => {
      clearInterval(etaInterval);
      clearInterval(statusInterval);
    });
  });

  const handleComplete = () => {
    if (status() === 'completed') setShowRating(true);
  };

  const handleRatingSubmit = () => {
    toast.add('Thank you for your rating!', 'success');
    navigate('/rider');
  };

  return (
    <MainLayout>
      <div class="max-w-lg mx-auto space-y-4">
        {/* Status header */}
        <div class="text-center">
          <h1 class="text-xl font-bold text-text-primary">
            {STATUS_STEPS.find(s => s.key === status())?.label}
          </h1>
          <p class="text-sm text-text-secondary mt-0.5">
            {STATUS_STEPS.find(s => s.key === status())?.desc}
          </p>
        </div>

        {/* Map placeholder */}
        <div class="relative h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-border">
          {/* Fake map grid */}
          <svg class="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 220">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="400" height="220" fill="url(#grid)"/>
          </svg>

          {/* Route line */}
          <svg class="absolute inset-0 w-full h-full" viewBox="0 0 400 220">
            <path d="M 60 170 C 100 160 150 100 200 90 S 300 60 340 50"
              fill="none" stroke="var(--primary)" stroke-width="3"
              stroke-dasharray="8 4" stroke-linecap="round" class="opacity-70"/>

            {/* Pickup pin */}
            <circle cx="60" cy="170" r="8" fill="var(--success)" opacity="0.9"/>
            <circle cx="60" cy="170" r="4" fill="white"/>

            {/* Dropoff pin */}
            <circle cx="340" cy="50" r="8" fill="var(--danger)" opacity="0.9"/>
            <circle cx="340" cy="50" r="4" fill="white"/>

            {/* Animated driver dot */}
            <circle class="animate-pulse" cx="200" cy="90" r="10" fill="var(--primary)" opacity="0.3"/>
            <circle cx="200" cy="90" r="6" fill="var(--primary)"/>
            <circle cx="200" cy="90" r="3" fill="white"/>
          </svg>

          {/* ETA badge */}
          <Show when={status() !== 'completed' && status() !== 'in_progress'}>
            <div class="absolute top-3 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2">
              <div class="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span class="text-sm font-semibold text-text-primary">{eta()} min away</span>
            </div>
          </Show>

          {/* Labels */}
          <div class="absolute bottom-3 left-4 bg-surface/80 backdrop-blur px-2 py-1 rounded-lg text-xs text-success font-medium">
            Pickup
          </div>
          <div class="absolute top-3 right-4 bg-surface/80 backdrop-blur px-2 py-1 rounded-lg text-xs text-danger font-medium">
            Dropoff
          </div>
        </div>

        {/* Driver card */}
        <Card class="flex items-center gap-4">
          <Avatar src={driver.avatar} name={`${driver.firstName} ${driver.lastName}`} size="lg" />
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-text-primary">{driver.firstName} {driver.lastName}</p>
            <div class="flex items-center gap-1 text-sm text-text-secondary">
              <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              {driver.rating} · {driver.totalRides.toLocaleString()} trips
            </div>
            <p class="text-xs text-text-muted mt-0.5">{driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.plateNumber}</p>
          </div>
          <div class="flex flex-col gap-2">
            <button class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center hover:bg-primary-200 transition-colors">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            </button>
            <button class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
              <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </button>
          </div>
        </Card>

        {/* Status Progress */}
        <Card>
          <h3 class="text-sm font-semibold text-text-primary mb-4">Ride Progress</h3>
          <div class="space-y-3">
            <For each={STATUS_STEPS}>{(step, i) => {
              const stepIdx = STATUS_ORDER.indexOf(step.key);
              const isDone = currentStep() > stepIdx;
              const isCurrent = currentStep() === stepIdx;
              return (
                <div class="flex items-start gap-3">
                  <div class="flex flex-col items-center">
                    <div class={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone ? 'bg-success text-text-inverse' :
                      isCurrent ? 'bg-primary text-text-inverse ring-4 ring-primary/20' :
                      'bg-surface-variant text-text-muted'
                    }`}>
                      <Show when={isDone} fallback={
                        <span class="text-xs font-bold">{i() + 1}</span>
                      }>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                        </svg>
                      </Show>
                    </div>
                    <Show when={i() < STATUS_STEPS.length - 1}>
                      <div class={`w-0.5 h-5 mt-1 transition-colors ${isDone ? 'bg-success' : 'bg-border'}`} />
                    </Show>
                  </div>
                  <div class="pb-4">
                    <p class={`text-sm font-medium ${isCurrent ? 'text-primary' : isDone ? 'text-text-primary' : 'text-text-muted'}`}>
                      {step.label}
                    </p>
                    <Show when={isCurrent}>
                      <p class="text-xs text-text-secondary mt-0.5">{step.desc}</p>
                    </Show>
                  </div>
                </div>
              );
            }}</For>
          </div>
        </Card>

        {/* Fare info */}
        <Card class="flex items-center justify-between">
          <div>
            <p class="text-xs text-text-muted">Estimated fare</p>
            <p class="text-2xl font-bold text-text-primary">{formatCurrency(ride.fare.total)}</p>
          </div>
          <Badge variant={status() === 'completed' ? 'success' : 'primary'} size="md">
            {status() === 'completed' ? 'Paid' : 'Pending'}
          </Badge>
        </Card>

        {/* Actions */}
        <Show when={status() !== 'completed'}>
          <Button variant="danger" isFullWidth onClick={() => { toast.add('Cancellation requested', 'info'); navigate('/rider'); }}>
            Cancel Ride
          </Button>
        </Show>
        <Show when={status() === 'completed'}>
          <Button isFullWidth onClick={() => setShowRating(true)}>
            Rate your ride
          </Button>
        </Show>

        {/* Rating Modal */}
        <Show when={showRating()}>
          <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-overlay">
            <div class="w-full sm:max-w-sm bg-surface rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 animate-slide-up">
              <div class="text-center mb-6">
                <Avatar src={driver.avatar} name={`${driver.firstName} ${driver.lastName}`} size="xl" class="mx-auto mb-3" />
                <h2 class="text-xl font-bold text-text-primary">Rate your ride</h2>
                <p class="text-sm text-text-secondary mt-1">How was your trip with {driver.firstName}?</p>
              </div>

              <div class="flex justify-center gap-2 mb-6">
                <For each={[1, 2, 3, 4, 5]}>{(star) => (
                  <button
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    class="transition-transform hover:scale-110"
                  >
                    <svg
                      class={`w-10 h-10 transition-colors ${star <= (hoveredStar() || rating()) ? 'text-warning' : 'text-border'}`}
                      fill="currentColor" viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </button>
                )}</For>
              </div>

              <div class="space-y-2">
                <Button isFullWidth onClick={handleRatingSubmit} disabled={!rating()}>
                  Submit Rating
                </Button>
                <Button variant="ghost" isFullWidth onClick={() => navigate('/rider')}>
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
