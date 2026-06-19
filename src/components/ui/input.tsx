import { type JSX, splitProps, Show, createSignal } from 'solid-js';
import { cn } from '@/utils/helpers';
import type { Size } from '@/types';

interface InputProps {
  label?: string; error?: string; hint?: string; size?: Size;
  leftIcon?: JSX.Element; rightIcon?: JSX.Element; isFullWidth?: boolean;
  class?: string; type?: string; placeholder?: string; value?: string;
  onInput?: (e: InputEvent & { currentTarget: HTMLInputElement }) => void;
  disabled?: boolean; required?: boolean;
}

const sizes: Record<Size, string> = { xs: 'text-xs px-2 py-1', sm: 'text-sm px-3 py-1.5', md: 'text-base px-4 py-2', lg: 'text-lg px-5 py-2.5', xl: 'text-xl px-6 py-3' };

export const Input = (props: InputProps) => {
  const [focused, setFocused] = createSignal(false);
  return (
    <div class={cn('flex flex-col gap-1.5', props.isFullWidth && 'w-full', props.class)}>
      <Show when={props.label}><label class={cn('text-sm font-medium', props.error ? 'text-danger' : 'text-text-primary')}>
        {props.label}{props.required && <span class="text-danger ml-0.5">*</span>}
      </label></Show>
      <div class={cn('relative flex items-center rounded-lg border bg-bg-input transition-all',
        focused() && !props.error ? 'ring-2 ring-primary border-transparent' : 'border-border',
        props.error && 'ring-2 ring-danger', props.disabled && 'opacity-50 bg-surface-variant')}>
        <Show when={props.leftIcon}><span class="absolute left-3 text-text-muted">{props.leftIcon}</span></Show>
        <input type={props.type || 'text'} placeholder={props.placeholder} value={props.value}
          onInput={props.onInput} disabled={props.disabled} required={props.required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          class={cn('w-full bg-transparent outline-none text-text-primary placeholder:text-text-muted',
            sizes[props.size || 'md'], props.leftIcon && 'pl-10', props.rightIcon && 'pr-10')} />
        <Show when={props.rightIcon}><span class="absolute right-3 text-text-muted">{props.rightIcon}</span></Show>
      </div>
      <Show when={props.error}><p class="text-xs text-danger">{props.error}</p></Show>
      <Show when={props.hint && !props.error}><p class="text-xs text-text-muted">{props.hint}</p></Show>
    </div>
  );
};
