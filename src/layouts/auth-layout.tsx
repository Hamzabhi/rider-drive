import { type ParentComponent, For, Show } from 'solid-js';
import { themeStore } from '@/store';

const features = [
  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Instant Booking', desc: 'Book a ride in seconds' },
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Safe & Secure', desc: 'Verified drivers & real-time tracking' },
  { icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', label: 'Flexible Pricing', desc: 'Bid your own fare or use fixed rates' },
];

export const AuthLayout: ParentComponent = (props) => (
  <div class="min-h-screen flex bg-background">
    {/* Left branding panel */}
    <div class="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
      <div class="absolute inset-0">
        <div class="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div class="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary-400/20 blur-3xl" />
      </div>

      <div class="relative flex flex-col h-full p-12">
        <div class="flex items-center gap-3 mb-auto">
          <div class="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <svg class="w-6 h-6 text-text-inverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span class="text-xl font-bold text-text-inverse tracking-tight">RideFlow</span>
        </div>

        <div class="flex-1 flex flex-col justify-center max-w-sm">
          <h1 class="text-4xl font-bold text-text-inverse leading-tight mb-4">
            Your ride,<br />your way.
          </h1>
          <p class="text-primary-200 text-lg leading-relaxed mb-10">
            The professional ride-hailing platform that puts you in control.
          </p>
          <div class="space-y-5">
            <For each={features}>{(f) => (
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-text-inverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={f.icon}/>
                  </svg>
                </div>
                <div>
                  <p class="text-text-inverse font-semibold">{f.label}</p>
                  <p class="text-primary-200 text-sm mt-0.5">{f.desc}</p>
                </div>
              </div>
            )}</For>
          </div>
        </div>

        <div class="flex gap-8 pt-8 border-t border-white/10">
          {[['50K+', 'Active Drivers'], ['2M+', 'Happy Riders'], ['4.9', 'App Rating']].map(([val, lbl]) => (
            <div>
              <p class="text-2xl font-bold text-text-inverse">{val}</p>
              <p class="text-primary-300 text-sm">{lbl}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Right form panel */}
    <div class="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 lg:max-w-xl relative">
      <button
        type="button"
        onClick={() => themeStore.toggle()}
        class="absolute top-4 right-4 lg:top-6 lg:right-6 flex items-center gap-2 px-3 py-2 rounded-full glass-fab text-sm text-text-secondary hover:scale-105 transition-transform"
        aria-label={themeStore.mode() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <Show when={themeStore.mode() === 'dark'} fallback={
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
          </svg>
        }>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
        </Show>
        <span class="hidden sm:inline">{themeStore.mode() === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
      <div class="lg:hidden flex items-center gap-2 mb-8">
        <div class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <svg class="w-5 h-5 text-text-inverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <span class="text-xl font-bold text-text-primary">RideFlow</span>
      </div>
      <div class="w-full max-w-sm">{props.children}</div>
    </div>
  </div>
);
