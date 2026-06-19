import { createSignal, Show } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { AuthLayout } from '@/layouts/auth-layout';
import { Button, Input } from '@/components/ui';
import { authStore } from '@/store';
import { useToast } from '@/components/ui/toast';

export default function SignupPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [firstName, setFirstName] = createSignal('');
  const [lastName, setLastName] = createSignal('');
  const [phone, setPhone] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirm, setConfirm] = createSignal('');
  const [role, setRole] = createSignal<'rider' | 'driver'>('rider');
  const [loading, setLoading] = createSignal(false);
  const [withPassword, setWithPassword] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!firstName() || !lastName() || !phone()) { toast.add('First name, last name and phone are required', 'error'); return; }
    if (withPassword()) {
      if (password() !== confirm()) { toast.add('Passwords do not match', 'error'); return; }
      if (password().length < 8) { toast.add('Password must be at least 8 characters', 'error'); return; }
    }

    setLoading(true);
    try {
      // Signup with the gateway. Then send an OTP for phone verification.
      const res = await authStore.signup({
        phone: phone(),
        first_name: firstName(),
        last_name: lastName(),
        role: role(),
        password: withPassword() ? password() : undefined,
      });
      if (!res.success) { toast.add(res.error ?? 'Signup failed', 'error'); return; }

      // Auto-fill name onto the user object created by the auth store.
      authStore.updateUserFields({ firstName: firstName(), lastName: lastName() });

      // If the backend issued a session token immediately, no OTP needed.
      if (authStore.isAuthenticated()) {
        toast.add('Account created!', 'success');
        navigate(role() === 'driver' ? '/driver' : '/rider', { replace: true });
        return;
      }

      // Otherwise, send an OTP and route to verification.
      await authStore.sendOtp(phone());
      sessionStorage.setItem('pending_phone', phone());
      toast.add('Verify your phone to finish signing up', 'success');
      navigate('/verify-otp');
    } catch (e) {
      toast.add(e instanceof Error ? e.message : 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div class="space-y-5">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-text-primary">Create an account</h1>
          <p class="text-text-secondary mt-1 text-sm">Join RideFlow and name your price</p>
        </div>

        {/* Role selector */}
        <div class="grid grid-cols-2 gap-2 p-1 bg-surface-variant rounded-lg">
          {(['rider', 'driver'] as const).map(r => (
            <button
              type="button"
              onClick={() => setRole(r)}
              class={`py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                role() === r ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >I'm a {r}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <Input label="First name" value={firstName()} onInput={e => setFirstName(e.currentTarget.value)} placeholder="John" />
            <Input label="Last name" value={lastName()} onInput={e => setLastName(e.currentTarget.value)} placeholder="Doe" />
          </div>
          <Input label="Phone number" type="tel" value={phone()} onInput={e => setPhone(e.currentTarget.value)} placeholder="+1 (555) 000-0000" />

          <button type="button" onClick={() => setWithPassword(!withPassword())} class="text-xs text-primary hover:underline">
            {withPassword() ? 'Use OTP-only signup' : 'Add a password instead'}
          </button>

          <Show when={withPassword()}>
            <Input label="Password" type="password" value={password()} onInput={e => setPassword(e.currentTarget.value)} placeholder="Min 8 characters" />
            <Input label="Confirm password" type="password" value={confirm()} onInput={e => setConfirm(e.currentTarget.value)} placeholder="Re-enter password" />
          </Show>

          <div class="flex items-start gap-2">
            <input type="checkbox" id="terms" class="mt-1 rounded border-border" required />
            <label for="terms" class="text-sm text-text-secondary">
              I agree to the <a href="#" class="text-primary hover:underline">Terms</a> and <a href="#" class="text-primary hover:underline">Privacy Policy</a>
            </label>
          </div>

          <Button type="submit" isFullWidth isLoading={loading()}>Create Account</Button>
        </form>

        <p class="text-center text-sm text-text-secondary">
          Already have an account? <A href="/login" class="text-primary hover:underline font-medium">Sign in</A>
        </p>
      </div>
    </AuthLayout>
  );
}
