import { createSignal, createEffect } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { AuthLayout } from '@/layouts/auth-layout';
import { Button, Input } from '@/components/ui';
import { authStore } from '@/store';
import { useToast } from '@/components/ui/toast';

// InDrive-style login: enter phone -> we send an OTP -> user verifies on /verify-otp.
// Password login is also supported (the gateway exposes /auth/login) for
// accounts that chose a password at signup.
export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [phone, setPhone] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    if (authStore.isAuthenticated()) {
      const role = authStore.user()?.role;
      navigate(role === 'driver' ? '/driver' : role === 'admin' ? '/admin' : '/rider', { replace: true });
    }
  });

  const redirectForRole = () => {
    const role = authStore.user()?.role ?? 'rider';
    navigate(role === 'driver' ? '/driver' : role === 'admin' ? '/admin' : '/rider');
  };

  // Send OTP and route to the verify screen.
  const handleSendOtp = async (e: Event) => {
    e.preventDefault();
    if (!phone()) { toast.add('Please enter your phone number', 'error'); return; }
    setLoading(true);
    try {
      await authStore.sendOtp(phone());
      toast.add('Verification code sent', 'success');
      // Pass the phone forward via session storage so /verify-otp knows it.
      sessionStorage.setItem('pending_phone', phone());
      navigate('/verify-otp');
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Failed to send code', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Optional password login for accounts that set one.
  const handlePasswordLogin = async (e: Event) => {
    e.preventDefault();
    if (!phone() || !password()) { toast.add('Phone and password are required', 'error'); return; }
    setLoading(true);
    try {
      const res = await authStore.login(phone(), password());
      if (!res.success) { toast.add(res.error ?? 'Login failed', 'error'); return; }
      toast.add('Welcome back!', 'success');
      redirectForRole();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div class="space-y-5">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p class="text-text-secondary mt-1 text-sm">Sign in to continue to RideFlow</p>
        </div>

        <form onSubmit={handleSendOtp} class="space-y-4">
          <Input
            label="Phone number"
            type="tel"
            value={phone()}
            onInput={e => setPhone(e.currentTarget.value)}
            placeholder="+1 (555) 000-0000"
            leftIcon={
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            }
          />
          <Button type="submit" isFullWidth isLoading={loading()}>Send Verification Code</Button>
        </form>

        <div class="relative">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-border"/></div>
          <div class="relative flex justify-center text-xs"><span class="px-2 bg-background text-text-muted">or sign in with password</span></div>
        </div>

        <form onSubmit={handlePasswordLogin} class="space-y-4">
          <Input
            label="Phone number"
            type="tel"
            value={phone()}
            onInput={e => setPhone(e.currentTarget.value)}
            placeholder="+1 (555) 000-0000"
          />
          <Input
            label="Password"
            type="password"
            value={password()}
            onInput={e => setPassword(e.currentTarget.value)}
            placeholder="Enter your password"
            leftIcon={
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            }
          />
          <div class="flex justify-end">
            <A href="/forgot-password" class="text-sm text-primary hover:underline">Forgot password?</A>
          </div>
          <Button type="submit" variant="outline" isFullWidth isLoading={loading()}>Sign In with Password</Button>
        </form>

        <p class="text-center text-sm text-text-secondary">
          Don't have an account? <A href="/signup" class="text-primary hover:underline font-medium">Sign up</A>
        </p>
      </div>
    </AuthLayout>
  );
}
