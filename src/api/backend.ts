// Typed HTTP client for the api-gateway-hono backend.
//
// Design notes:
//  - Single shared `apiFetch` does auth-token injection + JSON parsing +
//    401/403 handling. All resource methods build on it.
//  - `BACKEND_URL` comes from VITE_API_BASE_URL; falls back to `/api` (dev
//    proxy). When the backend is unreachable we degrade gracefully to the
//    mock provider so the UI stays demoable without a running server.
//  - Responses are normalized with transformers in `dto.ts` so callers
//    always get the frontend domain types from src/types.

import { API_BASE_URL } from '@/constants';
import type {
  AuthResponse, BackendBid, BackendRide, BidAck, BidsResponse,
  CreateRideResponse, DriverEarnings, FareEstimate, FinalizeFareResponse,
  QuoteResponse, AcceptBidResponse,
} from './types';
import { mockProvider } from './mock-provider';

const TOKEN_KEY = 'rideflow_auth_token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isMockMode(): boolean {
  // VITE_USE_MOCK=true forces mock. Otherwise we probe only on actual failure.
  return import.meta.env.VITE_USE_MOCK === 'true';
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // The session is an HttpOnly cookie (not readable by JS — defeats XSS token
  // theft). `credentials: 'include'` sends it with every request; there is no
  // Authorization header and nothing persisted client-side.
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  // 401 -> session invalid/expired; UI's auth guard redirects to /login.
  if (res.status === 401) {
    throw new ApiError(401, 'Session expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

// Wrap a call, falling back to the mock provider when the backend is
// unreachable (network error) or mock mode is forced.
async function withFallback<T>(
  real: () => Promise<T>,
  mock: () => Promise<T>,
): Promise<T> {
  if (isMockMode()) return mock();
  try {
    return await real();
  } catch (e) {
    // degrade to mock only for network/connection errors, not for 4xx logic
    // errors the user actually needs to see (bad OTP, wrong password...).
    if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401) {
      throw e;
    }
    if (e instanceof TypeError || (e instanceof ApiError && e.status >= 500)) {
      console.warn('[api] backend unreachable, using mock provider:', e.message);
      return mock();
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  sendOtp: (phone: string): Promise<AuthResponse> =>
    withFallback(
      () => apiFetch('/auth/otp/send', { method: 'POST', body: { phone }, auth: false }),
      () => mockProvider.sendOtp(phone),
    ),

  verifyOtp: (phone: string, code: string): Promise<AuthResponse> =>
    withFallback(
      () => apiFetch('/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false }),
      () => mockProvider.verifyOtp(phone, code),
    ),

  signup: (data: {
    enrollment_token: string;
    first_name?: string;
    last_name?: string;
    role: 'rider' | 'driver';
    password?: string;
  }): Promise<AuthResponse> =>
    withFallback(
      () => apiFetch('/auth/signup', { method: 'POST', body: data, auth: false }),
      () => mockProvider.signup(data),
    ),

  login: (phone: string, password: string): Promise<AuthResponse> =>
    withFallback(
      () => apiFetch('/auth/login', { method: 'POST', body: { phone, password }, auth: false }),
      () => mockProvider.login(phone, password),
    ),

  // Clears the HttpOnly session cookie server-side.
  logout: (): Promise<AuthResponse> =>
    withFallback(
      () => apiFetch('/auth/logout', { method: 'POST', auth: false }),
      async () => ({ success: true }),
    ),
};

// ---------------------------------------------------------------------------
// Rides (rider flow)
// ---------------------------------------------------------------------------

export const rideApi = {
  quote: (req: {
    pickup: { latitude: number; longitude: number; address?: string };
    dropoff: { latitude: number; longitude: number; address?: string };
    vehicle_type?: string;
    currency?: string;
  }): Promise<QuoteResponse> =>
    withFallback(
      () => apiFetch('/rides/quote', { method: 'POST', body: req }),
      () => mockProvider.quote(req),
    ),

  request: (req: {
    pickup: { latitude: number; longitude: number; address?: string };
    dropoff: { latitude: number; longitude: number; address?: string };
    rider_fare: number;
    vehicle_type?: string;
    currency?: string;
    search_radius_meters?: number;
  }): Promise<CreateRideResponse> =>
    withFallback(
      () => apiFetch('/rides/request', { method: 'POST', body: req }),
      () => mockProvider.requestRide(req),
    ),

  bids: (rideId: string): Promise<BidsResponse> =>
    withFallback(
      () => apiFetch(`/rides/${rideId}/bids`),
      () => mockProvider.bids(rideId),
    ),

  acceptBid: (rideId: string, bidId: string, driverId: string): Promise<AcceptBidResponse> =>
    withFallback(
      () => apiFetch(`/rides/${rideId}/accept-bid`, { method: 'POST', body: { bid_id: bidId, driver_id: driverId } }),
      () => mockProvider.acceptBid(rideId, bidId, driverId),
    ),

  finalize: (rideId: string, actualDistanceM: number, actualDurationS: number): Promise<FinalizeFareResponse> =>
    withFallback(
      () => apiFetch(`/rides/${rideId}/finalize`, { method: 'POST', body: { actual_distance_meters: actualDistanceM, actual_duration_seconds: actualDurationS } }),
      () => mockProvider.finalize(rideId, actualDistanceM, actualDurationS),
    ),
};

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

export const driverApi = {
  submitBid: (rideId: string, amount: number, etaSeconds: number, currency = 'USD'): Promise<BidAck> =>
    withFallback(
      () => apiFetch('/drivers/bids', { method: 'POST', body: { ride_id: rideId, amount, eta_seconds: etaSeconds, currency } }),
      () => mockProvider.driverBid(rideId, amount, etaSeconds),
    ),

  rides: (): Promise<{ success: boolean; rides: BackendRide[] }> =>
    withFallback(
      () => apiFetch('/drivers/rides'),
      () => mockProvider.driverRides(),
    ),

  earnings: (): Promise<{ success: boolean; earnings: DriverEarnings }> =>
    withFallback(
      () => apiFetch('/drivers/earnings'),
      () => mockProvider.driverEarnings(),
    ),
};

// Re-export backend bid type for transformers
export type { BackendBid, BackendRide, FareEstimate };
