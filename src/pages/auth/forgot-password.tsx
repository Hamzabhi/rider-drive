import { createSignal, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { AuthLayout } from '@/layouts/auth-layout';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui/toast';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!email()) {
      toast.add('Please enter your email', 'error');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
    toast.add('Reset link sent!', 'success');
  };

  return (
    <AuthLayout>
      <div class="space-y-6">
        <Show when={!submitted()} fallback={
          <>
            <div class="text-center">
              <div class="mx-auto w-16 h-16 bg-success-100 dark:bg-success/20 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-text-primary">Check your email</h1>
              <p class="text-text-secondary mt-1">We've sent a password reset link to {email()}</p>
            </div>
            <div class="text-center">
              <A href="/login" class="text-primary hover:underline font-medium">Back to sign in</A>
            </div>
          </>
        }>
          <div class="text-center">
            <div class="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-text-primary">Forgot password?</h1>
            <p class="text-text-secondary mt-1">No worries, we'll send you reset instructions</p>
          </div>

          <form onSubmit={handleSubmit} class="space-y-4">
            <Input label="Email" type="email" value={email()} onInput={e => setEmail(e.currentTarget.value)} placeholder="you@example.com" />
            <Button type="submit" class="w-full" isLoading={loading()}>Reset password</Button>
          </form>

          <p class="text-center text-sm text-text-secondary">
            <A href="/login" class="text-primary hover:underline font-medium">Back to sign in</A>
          </p>
        </Show>
      </div>
    </AuthLayout>
  );
}
