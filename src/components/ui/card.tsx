import { type JSX, type ParentComponent } from 'solid-js';
import { cn } from '@/utils/helpers';

interface CardProps { variant?: 'elevated' | 'outlined' | 'filled'; padding?: 'none' | 'sm' | 'md' | 'lg'; class?: string; onClick?: () => void; hoverable?: boolean; }

const variants = {
  elevated: 'bg-surface shadow-md dark:shadow-none dark:border dark:border-white/10',
  outlined: 'bg-surface border border-border dark:border-white/10',
  filled: 'bg-surface-variant',
};
const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };

export const Card: ParentComponent<CardProps> = (props) => (
  <div class={cn('rounded-xl transition-all duration-200', variants[props.variant || 'elevated'],
    paddings[props.padding || 'md'], props.hoverable && 'cursor-pointer interactive-card',
    props.onClick && 'cursor-pointer', props.class)}
    onClick={props.onClick} role={props.onClick ? 'button' : undefined}>
    {props.children}
  </div>
);

export const CardHeader = (props: { title?: string; subtitle?: string; action?: JSX.Element; class?: string }) => (
  <div class={cn('flex items-start justify-between', props.class)}>
    <div>{props.title && <h3 class="text-lg font-semibold text-text-primary">{props.title}</h3>}
      {props.subtitle && <p class="text-sm text-text-secondary">{props.subtitle}</p>}</div>
    {props.action}
  </div>
);
