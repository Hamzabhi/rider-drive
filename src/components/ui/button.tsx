import { type JSX } from 'solid-js';
import { cn } from '@/utils/helpers';
import type { Size, Variant } from '@/types';

interface ButtonProps {
  variant?: Variant; size?: Size; isLoading?: boolean; isFullWidth?: boolean;
  leftIcon?: JSX.Element; rightIcon?: JSX.Element; class?: string;
  children?: JSX.Element; onClick?: () => void; type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-600',
  secondary: 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-800/50 dark:text-secondary-200 dark:hover:bg-secondary-700/50',
  success: 'bg-success text-text-inverse hover:bg-success-600',
  warning: 'bg-warning text-text-inverse hover:bg-warning-600',
  danger: 'bg-danger text-text-inverse hover:bg-danger-600',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-variant',
  outline: 'border-2 border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20',
};

const sizes: Record<Size, string> = {
  xs: 'text-xs px-2 py-1 gap-1', sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-base px-4 py-2 gap-2', lg: 'text-lg px-5 py-2.5 gap-2', xl: 'text-xl px-6 py-3 gap-2',
};

export const Button = (props: ButtonProps) => (
  <button type={props.type || 'button'}
    class={cn('inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variants[props.variant || 'primary'], sizes[props.size || 'md'],
      props.isFullWidth && 'w-full', props.isLoading && 'cursor-wait', props.class)}
    onClick={props.onClick} disabled={props.disabled || props.isLoading}>
    {props.isLoading && (
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>)}
    {!props.isLoading && props.leftIcon}{props.children}{!props.isLoading && props.rightIcon}
  </button>
);
