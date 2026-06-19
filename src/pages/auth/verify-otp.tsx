import { createSignal, onMount, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { AuthLayout } from '@/layouts/auth-layout';
import { Button } from '@/components/ui';
import { authStore } from '@/store';
import { useToast } from '@/components/ui/toast';

// Backend mock OTP is "123456" — surface that hint here so the demo is usable
// without the console log lookup when running against the mock provider.
const MOCK_HINT = '123456';

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [otp, setOtp] = createSignal<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = createSignal(false);
  const [resendLoading, setResendLoading] = createSignal(false);
  const [countdown, setCountdown] = createSignal(60);
  // The phone we're verifying — carried over from login/signup.
  const [phone, setPhone] = createSignal('');

  let inputs: HTMLInputElement[] = [];

  onMount(() => {
    setPhone(sessionStorage.getItem('pending_phone') ?? '');
    const timer = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  });

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp()];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) inputs[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp()[index] && index > 0) inputs[index - 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text').slice(0, 6) ?? '';
    if (!/^\d+$/.test(pasted)) return;
    const next = [...otp()];
    pasted.split('').forEach((c, i) => { if (i < 6) next[i] = c; });
    setOtp(next);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const code = otp().join('');
    if (code.length !== 6) { toast.add('Please enter the complete 6-digit code', 'error'); return; }

    setLoading(true);
    try {
      // If we lost the phone context, route back to login rather than guessing.
      if (!phone()) { toast.add('Phone number missing, please sign in again', 'error'); navigate('/login'); return; }

      const res = await authStore.verifyOtp(phone(), code);
      if (res.error) {
        toast.add(res.error, 'error');
        return;
      }

      // New phone: complete signup using the enrollment token + stashed form.
      if (!res.exists) {
        const pending = sessionStorage.getItem('pending_signup');
        if (!res.enrollmentToken || !pending) {
          // Verified a phone with no account and no signup in progress.
          toast.add('No account found. Please sign up.', 'info');
          navigate('/signup');
          return;
        }
        const form = JSON.parse(pending) as { first_name?: string; last_name?: string; role: 'rider' | 'driver'; password?: string };
        const signupRes = await authStore.signup({
          enrollment_token: res.enrollmentToken,
          phone: phone(),
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          password: form.password,
        });
        if (!signupRes.success) { toast.add(signupRes.error ?? 'Signup failed', 'error'); return; }
        sessionStorage.removeItem('pending_signup');
      }

      if (!authStore.isAuthenticated()) {
        toast.add('Could not establish a session. Please try again.', 'error');
        return;
      }

      // Authenticated now — redirect by role.
      toast.add('Phone verified successfully!', 'success');
      const role = authStore.user()?.role ?? 'rider';
      navigate(role === 'driver' ? '/driver' : role === 'admin' ? '/admin' : '/rider', { replace: true });
      sessionStorage.removeItem('pending_phone');
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone()) { navigate('/login'); return; }
    setResendLoading(true);
    try {
      await authStore.sendOtp(phone());
      setCountdown(60);
      toast.add('New code sent', 'success');
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Failed to resend', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div class="space-y-6">
        <div class="text-center">
          <div class="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-text-primary">Verify your number</h1>
          <p class="text-text-secondary mt-1 text-sm">
            Enter the 6-digit code sent to <span class="font-medium text-text-primary">{phone() || 'your phone'}</span>
          </p>
          <Show when={!import.meta.env.PROD}>
            <p class="text-xs text-text-muted mt-2">Demo code: <code class="font-mono font-bold">{MOCK_HINT}</code></p>
          </Show>
        </div>

        <form onSubmit={handleSubmit} class="space-y-6">
          <div class="flex justify-center gap-2" onPaste={handlePaste}>
            <For each={otp()}>{(_, index) => (
              <input
                ref={(el) => (inputs[index()] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otp()[index()]}
                onInput={(e) => handleChange(index(), e.currentTarget.value)}
                onKeyDown={(e) => handleKeyDown(index(), e)}
                class="w-12 h-12 text-center text-lg font-semibold border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-input text-text-primary transition-colors"
              />
            )}</For>
          </div>

          <Button type="submit" class="w-full" isLoading={loading()}>Verify</Button>
        </form>

        <div class="text-center">
          <p class="text-text-secondary text-sm">
            Didn't receive the code?{' '}
            {countdown() > 0 ? (
              <span class="text-text-muted">Resend in {countdown()}s</span>
            ) : (
              <button onClick={handleResend} disabled={resendLoading()} class="text-primary hover:underline font-medium">
                {resendLoading() ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
