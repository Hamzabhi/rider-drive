import { type JSX, type ParentComponent } from 'solid-js';
import { cn } from '@/utils/helpers';
import type { Size, Variant } from '@/types';

interface BadgeProps { variant?: Variant | 'info'; size?: Size; dot?: boolean; class?: string; }

const variants: Record<Variant | 'info', string> = {
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800/40 dark:text-secondary-300',
  info: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
  danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
  ghost: 'bg-surface-variant text-text-secondary', outline: 'border border-current bg-transparent',
};
const sizes: Record<Size, string> = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-0.5', md: 'text-sm px-2.5 py-0.5', lg: 'text-sm px-3 py-1', xl: 'text-base px-3.5 py-1' };

export const Badge: ParentComponent<BadgeProps> = (props) => (
  <span class={cn('inline-flex items-center gap-1.5 font-medium rounded-full',
    variants[props.variant || 'primary'], sizes[props.size || 'md'], props.class)}>
    {props.dot && <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/>}{props.children}
  </span>
);

export const Avatar = (props: { src?: string; name?: string; size?: Size; class?: string }) => {
  const sizes: Record<Size, string> = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg', xl: 'w-16 h-16 text-xl' };
  const initials = () => props.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div class={cn('relative inline-flex items-center justify-center overflow-hidden rounded-full flex-shrink-0 bg-primary text-text-inverse', sizes[props.size || 'md'], props.class)}>
      {props.src ? <img src={props.src} alt={props.name} class="w-full h-full object-cover"/> : <span class="font-medium select-none">{initials()}</span>}
    </div>
  );
};

export const Spinner = (props: { size?: Size; class?: string }) => {
  const sizes: Record<Size, string> = { xs: 'w-4 h-4', sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return (
    <svg class={cn('animate-spin text-primary', sizes[props.size || 'md'], props.class)} viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
};

export const Skeleton = (props: { class?: string }) => (
  <div class={cn('skeleton-shimmer rounded h-4', props.class)}/>
);
