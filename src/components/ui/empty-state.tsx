import { type JSX, type ParentComponent, Show } from 'solid-js';
import { cn } from '@/utils/helpers';
import { Button } from './button';

type Illustration = 'rides' | 'history' | 'requests' | 'search' | 'wallet';

const illustrations: Record<Illustration, JSX.Element> = {
  rides: (
    <svg viewBox="0 0 200 160" class="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ridesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.2" />
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#ridesGrad)" />
      <path d="M40 110h120l-12-24H52l-12 24z" stroke="var(--primary)" stroke-width="2" fill="var(--primary)" fill-opacity="0.1" />
      <circle cx="55" cy="110" r="10" fill="var(--surface)" stroke="var(--primary)" stroke-width="2" />
      <circle cx="145" cy="110" r="10" fill="var(--surface)" stroke="var(--primary)" stroke-width="2" />
      <path d="M70 50 Q100 30 130 50" stroke="var(--primary)" stroke-width="2" stroke-dasharray="4 4" opacity="0.6" />
      <circle cx="70" cy="55" r="6" fill="var(--success)" />
      <circle cx="130" cy="55" r="6" fill="var(--danger)" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 200 160" class="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="histGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--secondary)" stop-opacity="0.15" />
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#histGrad)" />
      <circle cx="100" cy="72" r="36" stroke="var(--primary)" stroke-width="2" fill="var(--surface)" fill-opacity="0.5" />
      <path d="M100 52v24l14 10" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" />
      <rect x="52" y="118" width="96" height="8" rx="4" fill="var(--surface-variant)" />
      <rect x="64" y="132" width="72" height="6" rx="3" fill="var(--surface-variant)" opacity="0.6" />
    </svg>
  ),
  requests: (
    <svg viewBox="0 0 200 160" class="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="reqGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="var(--warning)" stop-opacity="0.12" />
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#reqGrad)" />
      <rect x="48" y="40" width="104" height="80" rx="12" stroke="var(--border)" stroke-width="2" fill="var(--surface)" fill-opacity="0.6" />
      <path d="M64 68h72M64 84h48M64 100h56" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" />
      <circle cx="148" cy="48" r="12" fill="var(--warning)" fill-opacity="0.2" stroke="var(--warning)" stroke-width="2" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 160" class="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="searchGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.15" />
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" rx="24" fill="url(#searchGrad)" />
      <circle cx="88" cy="72" r="28" stroke="var(--primary)" stroke-width="2.5" fill="var(--surface)" fill-opacity="0.4" />
      <path d="M108 92l24 24" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" />
      <path d="M60 120 Q100 100 140 120" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 200 160" class="w-full h-full" fill="none" aria-hidden="true">
      <rect width="200" height="160" rx="24" fill="var(--primary)" fill-opacity="0.06" />
      <rect x="44" y="52" width="112" height="72" rx="14" stroke="var(--primary)" stroke-width="2" fill="var(--surface)" fill-opacity="0.5" />
      <circle cx="132" cy="88" r="8" fill="var(--primary)" fill-opacity="0.3" />
      <rect x="56" y="68" width="48" height="6" rx="3" fill="var(--text-muted)" opacity="0.4" />
    </svg>
  ),
};

interface EmptyStateProps {
  illustration?: Illustration;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  class?: string;
}

export const EmptyState: ParentComponent<EmptyStateProps> = (props) => (
  <div class={cn('flex flex-col items-center text-center py-16 px-6', props.class)}>
    <div class="w-48 h-36 mb-8 rounded-2xl overflow-hidden ring-1 ring-border dark:ring-white/10 shadow-lg">
      {illustrations[props.illustration || 'rides']}
    </div>
    <h2 class="heading-section text-xl font-semibold text-text-primary mb-2">{props.title}</h2>
    <Show when={props.description}>
      <p class="text-text-secondary max-w-sm leading-relaxed">{props.description}</p>
    </Show>
    <Show when={props.actionLabel && props.onAction}>
      <Button class="mt-6" onClick={props.onAction}>{props.actionLabel}</Button>
    </Show>
    {props.children}
  </div>
);
