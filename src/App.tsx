import { Suspense, lazy, createEffect } from 'solid-js';
import { Router, Route, useNavigate } from '@solidjs/router';
import { ThemeProvider } from '@/theme';
import { ToastProvider } from '@/components/ui/toast';
import { FullPageSpinner } from '@/components/ui/progress';
import { authStore, bindRealtimeToStores } from '@/store';
import { realtime } from '@/api/realtime';
import './styles/index.css';

const LoginPage = lazy(() => import('@/pages/auth/login'));
const SignupPage = lazy(() => import('@/pages/auth/signup'));
const VerifyOTPPage = lazy(() => import('@/pages/auth/verify-otp'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password'));

const RiderHomePage = lazy(() => import('@/pages/rider/home'));
const BookRidePage = lazy(() => import('@/pages/rider/book'));
const RiderHistoryPage = lazy(() => import('@/pages/rider/history'));
const WalletPage = lazy(() => import('@/pages/rider/wallet'));
const RiderSettingsPage = lazy(() => import('@/pages/rider/settings'));
const TrackingPage = lazy(() => import('@/pages/rider/tracking'));

const DriverDashboardPage = lazy(() => import('@/pages/driver/dashboard'));
const DriverRequestsPage = lazy(() => import('@/pages/driver/requests'));
const DriverEarningsPage = lazy(() => import('@/pages/driver/earnings'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/dashboard'));
const AdminUsersPage = lazy(() => import('@/pages/admin/users'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/analytics'));
const ThemeSettingsPage = lazy(() => import('@/components/settings/ThemeSettings'));

function AppRoutes() {
  // Bind the realtime WebSocket events into the reactive stores so bid
  // arrivals automatically update the booking UI.
  bindRealtimeToStores();

  return (
    <Router>
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/verify-otp" component={VerifyOTPPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

      <Route path="/rider" component={RiderHomePage} />
      <Route path="/rider/book" component={BookRidePage} />
      <Route path="/rider/history" component={RiderHistoryPage} />
      <Route path="/rider/wallet" component={WalletPage} />
      <Route path="/rider/settings" component={RiderSettingsPage} />
      <Route path="/rider/tracking" component={TrackingPage} />

      <Route path="/driver" component={DriverDashboardPage} />
      <Route path="/driver/requests" component={DriverRequestsPage} />
      <Route path="/driver/earnings" component={DriverEarningsPage} />

      <Route path="/admin" component={AdminDashboardPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/admin/theme" component={ThemeSettingsPage} />
    </Router>
  );
}

export default function App() {
  // Disconnect the realtime socket whenever the session ends so we don't
  // leave a ghost connection tied to a logged-out user id.
  createEffect(() => {
    if (!authStore.isAuthenticated()) realtime.disconnect();
  });

  return (
    <ThemeProvider>
      <ToastProvider>
        <Suspense fallback={<FullPageSpinner text="Loading RideFlow..." />}>
          <AppRoutes />
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
}
