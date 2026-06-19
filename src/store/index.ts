// Global reactive state stores backed by the backend API client.
//
// Layout:
//   - authStore: session/token, signup/login/verify actions, role redirect
//   - bookingStore: ride booking flow (quote -> request -> live bids -> accept)
//   - driverStore: online state, earnings, ride requests (WS-driven)
//   - walletStore: balance + transactions
//   - notificationStore: in-app toasts/bell notifications
//
// The session itself lives in an HttpOnly cookie (managed by the gateway, not
// readable by JS). We cache only the non-sensitive user object in localStorage
// so a page reload keeps the UI logged in; the cookie carries the credential.

import { createSignal } from 'solid-js';
import { authApi, rideApi, driverApi } from '@/api/backend';
import { realtime, clearBidEvents } from '@/api/realtime';
import { bidToDomain, fareEstimateToDetails } from '@/api/dto';
import type {
  ApiResponse, PaginatedResponse, PaginationParams,
} from '@/types';
import type {
  User, Ride, Bid, WalletTransaction, Notification, BookingState, Driver,
} from '@/types';

const USER_KEY = 'rideflow_user';

function loadUser(): User | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}

// ----------------------------- Auth Store -------------------------------
const [authUser, setAuthUser] = createSignal<User | null>(loadUser());

export const authStore = {
  user: authUser,
  token: () => !!authUser(),
  isAuthenticated: () => !!authUser(),
  role: () => authUser()?.role ?? null,

  // --- actions ---
  /** Send an OTP to a phone. Used by signup + login flows. */
  sendOtp: (phone: string) => authApi.sendOtp(phone),

  /**
   * Verify OTP. If the user exists, establish a session. If not, the backend
   * returns a short-lived enrollment_token the caller passes to signup().
   */
  verifyOtp: async (phone: string, code: string): Promise<{ exists: boolean; enrollmentToken?: string; error?: string }> => {
    const res = await authApi.verifyOtp(phone, code);
    if (!res.success) return { exists: false, error: res.error };
    if (res.exists && res.token && res.user) {
      const user: User = {
        id: res.user.id, email: '', phone,
        firstName: '', lastName: '',
        role: res.user.role, isVerified: true, isActive: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      // Session cookie is set by the gateway; we only cache the user object.
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setAuthUser(user);
    }
    return { exists: res.exists ?? false, enrollmentToken: res.enrollment_token };
  },

  signup: async (data: { enrollment_token: string; phone: string; first_name?: string; last_name?: string; role: 'rider' | 'driver'; password?: string }): Promise<{ success: boolean; error?: string }> => {
    const { phone, ...payload } = data; // phone is only for the local user object; backend takes it from the token
    const res = await authApi.signup(payload);
    if (!res.success) return { success: false, error: res.error };
    if (res.token && res.user) {
      const user: User = {
        id: res.user.id, email: '', phone,
        firstName: data.first_name ?? '', lastName: data.last_name ?? '',
        role: res.user.role, isVerified: true, isActive: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setAuthUser(user);
    }
    return { success: true };
  },

  login: async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const res = await authApi.login(phone, password);
    if (!res.success || !res.token || !res.user) return { success: false, error: res.error };
    const user: User = {
      id: res.user.id, email: '', phone,
      firstName: '', lastName: '',
      role: res.user.role, isVerified: true, isActive: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuthUser(user);
    return { success: true };
  },

  /** Update the current user's profile locally (e.g. after OTP verify fills in name). */
  updateUserFields: (fields: Partial<User>) => {
    setAuthUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...fields };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  },

  logout: () => {
    realtime.disconnect();
    void authApi.logout(); // clear the HttpOnly cookie server-side (best-effort)
    localStorage.removeItem(USER_KEY);
    setAuthUser(null);
  },
};

// --------------------------- Booking Store ------------------------------
// The InDrive flow: quote -> rider proposes price -> live counter-offers -> accept.
const [bookingStep, setBookingStep] = createSignal<BookingState['step']>('pickup');
const [bookingPickup, setBookingPickup] = createSignal<BookingState['pickup']>();
const [bookingDropoff, setBookingDropoff] = createSignal<BookingState['dropoff']>();
const [bookingFare, setBookingFare] = createSignal<number>(0);
const [bookingRideId, setBookingRideId] = createSignal<string | null>(null);
const [bookingBids, setBookingBids] = createSignal<Bid[]>([]);
const [selectedBid, setSelectedBid] = createSignal<Bid | undefined>();
const [bookingLoading, setBookingLoading] = createSignal(false);
const [bookingEstimate, setBookingEstimate] = createSignal<{
  suggestedFare: number; distanceMeters: number; durationSeconds: number; minimum: number;
} | null>(null);

export const bookingStore = {
  step: bookingStep, pickup: bookingPickup, dropoff: bookingDropoff,
  proposedFare: bookingFare, rideId: bookingRideId,
  bids: bookingBids, selectedBid, loading: bookingLoading, estimate: bookingEstimate,

  setStep: setBookingStep,
  setPickup: setBookingPickup,
  setDropoff: setBookingDropoff,
  setProposedFare: setBookingFare,

  /** Quote a fare from the Rust pricing engine (or mock fallback). */
  quoteFare: async (pickup: BookingState['pickup'], dropoff: BookingState['dropoff'], vehicleType = 'sedan') => {
    setBookingLoading(true);
    try {
      const res = await rideApi.quote({
        pickup: { latitude: pickup!.latitude, longitude: pickup!.longitude, address: pickup!.address },
        dropoff: { latitude: dropoff!.latitude, longitude: dropoff!.longitude, address: dropoff!.address },
        vehicle_type: vehicleType,
      });
      if (res.success && res.estimate) {
        setBookingEstimate({
          suggestedFare: res.estimate.suggested_fare,
          distanceMeters: res.estimate.distance_meters,
          durationSeconds: res.estimate.duration_seconds,
          minimum: res.estimate.minimum_fare,
        });
        setBookingFare(Math.round(res.estimate.suggested_fare));
        return res.estimate;
      }
    } finally {
      setBookingLoading(false);
    }
    return null;
  },

  /**
   * Submit the rider's proposed fare. Creates the ride in the backend and
   * triggers driver notification via realtime-go. Returns the new rideId.
   */
  requestRide: async (pickup: BookingState['pickup'], dropoff: BookingState['dropoff'], fare: number, vehicleType = 'sedan'): Promise<string | null> => {
    setBookingLoading(true);
    try {
      const res = await rideApi.request({
        pickup: { latitude: pickup!.latitude, longitude: pickup!.longitude, address: pickup!.address },
        dropoff: { latitude: dropoff!.latitude, longitude: dropoff!.longitude, address: dropoff!.address },
        rider_fare: fare,
        vehicle_type: vehicleType,
      });
      if (res.success && res.ride) {
        setBookingRideId(res.ride.id);
        setBookingFare(fare);
        setBookingStep('bids');
        // Connect to realtime as a rider to receive counter-offers
        const user = authStore.user();
        if (user) realtime.connect('rider', user.id);
        // Seed the bids list immediately (the backend notifies nearby drivers
        // asynchronously; polling/WS updates the list as they come in).
        setBookingBids([]);
        return res.ride.id;
      }
      return null;
    } finally {
      setBookingLoading(false);
    }
  },

  /** Poll bids for the active ride (REST fallback when WS isn't connected). */
  refreshBids: async (): Promise<void> => {
    const rideId = bookingRideId();
    if (!rideId) return;
    const res = await rideApi.bids(rideId);
    if (res.success && res.bids) {
      setBookingBids(res.bids.map(b => ({ ...bidToDomain(b), rideId })));
    }
  },

  /** Accept a specific counter-offer -> locks in the driver. */
  acceptBid: async (bid: Bid): Promise<boolean> => {
    const rideId = bookingRideId();
    if (!rideId) return false;
    setBookingLoading(true);
    try {
      const res = await rideApi.acceptBid(rideId, bid.id, bid.driverId);
      if (res.success) {
        setSelectedBid(bid);
        return true;
      }
      return false;
    } finally {
      setBookingLoading(false);
    }
  },

  /** Apply a realtime bid event (from the WS client) to the live list. */
  applyRealtimeBid: (evt: { event: 'bid_received'; data: { bid_id: string; driver_id: string; amount: number; eta_seconds: number; currency: string } }) => {
    if (evt.event !== 'bid_received') return;
    const rideId = bookingRideId();
    setBookingBids(prev => {
      if (prev.some(b => b.id === evt.data.bid_id)) return prev;
      const bid: Bid = {
        id: evt.data.bid_id,
        rideId: rideId ?? '',
        driverId: evt.data.driver_id,
        driver: bidToDomain({ id: evt.data.bid_id, driver_id: evt.data.driver_id, amount: evt.data.amount, eta_seconds: evt.data.eta_seconds, currency: evt.data.currency, status: 'pending', expires_at: new Date(Date.now() + 120_000).toISOString() }).driver,
        amount: evt.data.amount,
        eta: Math.round(evt.data.eta_seconds / 60),
        status: 'pending',
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return [...prev, bid].sort((a, b) => a.amount - b.amount);
    });
  },

  setSelectedBid,
  reset: () => {
    setBookingStep('pickup'); setBookingPickup(); setBookingDropoff();
    setBookingBids([]); setSelectedBid(); setBookingRideId(null);
    setBookingFare(0); setBookingEstimate(null);
    clearBidEvents();
  },
};

// --------------------------- Driver Store -------------------------------
const [driverOnline, setDriverOnline] = createSignal(false);
const [driverEarnings, setDriverEarnings] = createSignal<{ today: number; week: number; month: number; total: number }>({ today: 0, week: 0, month: 0, total: 0 });
const [driverRequests, setDriverRequests] = createSignal<Ride[]>([]);
const [driverRides, setDriverRides] = createSignal<Ride[]>([]);

export const driverStore = {
  isOnline: driverOnline,
  earnings: driverEarnings,
  requests: driverRequests,
  rides: driverRides,

  toggleOnline: () => {
    const next = !driverOnline();
    setDriverOnline(next);
    const user = authStore.user();
    if (next && user) {
      realtime.connect('driver', user.id);
      // Start a passive location heartbeat so the WS connection stays warm.
      // In a real driver app this would use the device GPS; here we just
      // send a sample coordinate to keep the server-side geo index alive.
      const sampleInterval = setInterval(() => {
        if (!driverOnline()) { clearInterval(sampleInterval); return; }
        realtime.sendLocation(40.7128, -74.006);
      }, 3000);
    } else {
      realtime.disconnect();
    }
  },

  setOnline: setDriverOnline,
  setEarnings: (e: { today: number; week: number; month: number }) => setDriverEarnings(v => ({ ...e, total: v.total })),
  setRequests: setDriverRequests,
  setRides: setDriverRides,

  loadEarnings: async (): Promise<void> => {
    const res = await driverApi.earnings();
    if (res.success) setDriverEarnings({ ...res.earnings, total: res.earnings.month * 6 });
  },

  loadRides: async (): Promise<void> => {
    const res = await driverApi.rides();
    if (res.success && res.rides) {
      const domain = res.rides.map(r => ({
        id: r.id,
        riderId: '',
        pickup: { address: '', latitude: 0, longitude: 0 },
        dropoff: { address: '', latitude: 0, longitude: 0 },
        status: r.status === 'assigned' ? 'driver_assigned' : r.status,
        fare: { base: 0, distance: 0, time: 0, surge: 1, discount: 0, total: r.agreed_fare ?? r.rider_fare, currency: r.currency },
        distance: 0, duration: 0,
        createdAt: r.created_at, updatedAt: r.created_at,
      } as Ride));
      setDriverRides(domain);
    }
  },

  /** Driver places a counter-offer on an open ride. */
  submitBid: async (rideId: string, amount: number, etaSeconds: number): Promise<boolean> => {
    const res = await driverApi.submitBid(rideId, amount, etaSeconds);
    return res.success;
  },
};

// --------------------------- Wallet Store -------------------------------
const [walletBalance, setWalletBalance] = createSignal(0);
const [walletTransactions, setWalletTransactions] = createSignal<WalletTransaction[]>([]);
export const walletStore = {
  balance: walletBalance, transactions: walletTransactions,
  setBalance: setWalletBalance, setTransactions: setWalletTransactions,
  addTransaction: (tx: WalletTransaction) => setWalletTransactions(prev => [tx, ...prev]),
};

// ------------------------ Notification Store ----------------------------
const seedNotifications: Notification[] = [
  { id: 'n1', userId: 'r1', type: 'ride_completed', title: 'Welcome to RideFlow', message: 'Your account is ready. Book your first ride and name your price!', isRead: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
const [notifications, setNotifications] = createSignal<Notification[]>(seedNotifications);
export const notificationStore = {
  notifications,
  unreadCount: () => notifications().filter(n => !n.isRead).length,
  setNotifications,
  markRead: (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n)),
  markAllRead: () => setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))),
  add: (notif: Notification) => setNotifications(prev => [notif, ...prev]),
};

// ----------------------------- Legacy API -------------------------------
// Backwards compat: old client.ts API surface re-exported for pages we
// haven't migrated yet (admin panels still use mock data).
export interface LegacyApiClient {
  get<T>(endpoint: string): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>>;
  patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}
export const apiClient: LegacyApiClient = {
  get: async <T>(endpoint: string) => ({ success: false, error: 'use backend client' }) as ApiResponse<T>,
  post: async <T>(endpoint: string) => ({ success: false, error: 'use backend client' }) as ApiResponse<T>,
  put: async <T>(endpoint: string) => ({ success: false, error: 'use backend client' }) as ApiResponse<T>,
  patch: async <T>(endpoint: string) => ({ success: false, error: 'use backend client' }) as ApiResponse<T>,
  delete: async <T>(endpoint: string) => ({ success: false, error: 'use backend client' }) as ApiResponse<T>,
};

// --------------------------- Bridge to realtime -------------------------
// When the realtime WS receives a bid, push it into the booking store so
// the BookRidePage updates live without polling.
import { realtime as rt } from '@/api/realtime';
import { createEffect, onCleanup } from 'solid-js';

let realtimeBound = false;
export function bindRealtimeToStores(): void {
  if (realtimeBound) return;
  realtimeBound = true;
  createEffect(() => {
    const events = rt.bidEvents();
    if (events.length === 0) return;
    const latest = events[events.length - 1];
    if (latest && latest.event === 'bid_received') {
      bookingStore.applyRealtimeBid(latest as { event: 'bid_received'; data: { bid_id: string; driver_id: string; amount: number; eta_seconds: number; currency: string } });
    }
  });
}

// Re-export theme store so existing imports from '@/store' still resolve
export { themeStore } from '@/theme/themeStore';

// Re-export types used elsewhere
export type { ApiResponse, PaginatedResponse, PaginationParams };
export type { Driver };
