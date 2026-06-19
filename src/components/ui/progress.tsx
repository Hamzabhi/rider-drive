import { type JSX } from 'solid-js';
import { cn } from '@/utils/helpers';

export const Spinner = (props: { size?: 'sm' | 'md' | 'lg'; class?: string }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <svg class={cn('animate-spin text-primary', sizes[props.size || 'md'], props.class)} viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
};

export const FullPageSpinner = (props: { text?: string }) => (
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      {props.text && <p class="text-text-secondary">{props.text}</p>}
    </div>
  </div>
);

export const ProgressBar = (props: { value: number; max?: number; class?: string }) => (
  <div class={cn('w-full h-2 bg-surface-variant rounded-full overflow-hidden', props.class)}>
    <div
      class="h-full bg-primary transition-all duration-300 rounded-full"
      style={{ width: `${(props.value / (props.max || 100)) * 100}%` }}
    />
  </div>
);
