// In-memory mock provider that simulates the api-gateway-hono contract.
//
// Used as a fallback when the backend is unreachable (dev without docker
// compose running) or when VITE_USE_MOCK=true. The simulation mirrors the
// real backend's behavior: OTPs are echo'd to console, ride requests spawn
// 3 driver counter-offers within ~1.5s, accepting a bid locks the ride.

import { delay } from './mock-data';
import type {
  AuthResponse, BidAck, BidsResponse, BackendBid, BackendRide,
  CreateRideResponse, DriverEarnings, FareEstimate, FinalizeFareResponse,
  QuoteResponse, AcceptBidResponse,
} from './types';

const MOCK_OTP = '123456';

// haversine — same as the Rust engine, used for the local quote simulation.
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VEHICLE_RULES: Record<string, { base: number; perKm: number; perMin: number; fee: number; min: number }> = {
  sedan: { base: 2.5, perKm: 1.5, perMin: 0.25, fee: 0.5, min: 5 },
  suv: { base: 3.5, perKm: 2.0, perMin: 0.35, fee: 0.75, min: 7 },
  luxury: { base: 6.0, perKm: 3.5, perMin: 0.6, fee: 1.5, min: 12 },
  motorcycle: { base: 1.5, perKm: 0.75, perMin: 0.1, fee: 0.25, min: 3 },
};

// In-memory active rides + bids keyed by rideId, so the bid polling endpoint
// actually returns data the request endpoint just created.
const activeRides = new Map<string, { riderFare: number; bids: BackendBid[]; accepted?: BackendBid }>();

export const mockProvider = {
  async sendOtp(phone: string): Promise<AuthResponse> {
    await delay(400);
    console.log(`[mock] OTP for ${phone}: ${MOCK_OTP}`);
    return { success: true, exists: false };
  },

  async verifyOtp(phone: string, code: string): Promise<AuthResponse> {
    await delay(500);
    if (code !== MOCK_OTP) return { success: false, error: 'Invalid or expired code' };
    // Mirror the real flow: if a signup is in progress, return a (mock)
    // enrollment token so the caller completes signup; otherwise treat it as
    // an existing-user OTP login.
    const enrolling = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pending_signup');
    if (enrolling) {
      return { success: true, exists: false, enrollment_token: `mock-enrollment-${Date.now()}` };
    }
    return {
      success: true,
      exists: true,
      token: `mock-token-${Date.now()}`,
      user: { id: `mock-${phone}`, role: 'rider' },
    };
  },

  async signup(data: { enrollment_token: string; first_name?: string; last_name?: string; role: 'rider' | 'driver' }): Promise<AuthResponse> {
    await delay(700);
    return {
      success: true,
      token: `mock-token-${Date.now()}`,
      user: { id: `mock-${Date.now()}`, role: data.role },
    };
  },

  async login(phone: string, _password: string): Promise<AuthResponse> {
    await delay(600);
    return {
      success: true,
      token: `mock-token-${Date.now()}`,
      user: { id: `mock-${phone}`, role: phone.includes('driver') ? 'driver' : 'rider' },
    };
  },

  async quote(req: {
    pickup: { latitude: number; longitude: number };
    dropoff: { latitude: number; longitude: number };
    vehicle_type?: string;
    currency?: string;
  }): Promise<QuoteResponse> {
    await delay(500);
    const rule = VEHICLE_RULES[req.vehicle_type ?? 'sedan'] ?? VEHICLE_RULES.sedan;
    const distM = haversineM(req.pickup.latitude, req.pickup.longitude, req.dropoff.latitude, req.dropoff.longitude);
    const secs = Math.round(distM / (30_000 / 3_600));
    const surge = 1.0;
    const total = Math.max(rule.min, (rule.base + (distM / 1000) * rule.perKm + (secs / 60) * rule.perMin) * surge + rule.fee);
    const estimate: FareEstimate = {
      base_fare: rule.base,
      distance_fare: (distM / 1000) * rule.perKm,
      time_fare: (secs / 60) * rule.perMin,
      surge_multiplier: surge,
      booking_fee: rule.fee,
      suggested_fare: Math.round(total * 100) / 100,
      minimum_fare: rule.min,
      currency: req.currency ?? 'USD',
      distance_meters: distM,
      duration_seconds: secs,
      encoded_polyline: '',
    };
    return { success: true, estimate };
  },

  async requestRide(req: {
    pickup: { latitude: number; longitude: number; address?: string };
    dropoff: { latitude: number; longitude: number; address?: string };
    rider_fare: number;
    currency?: string;
  }): Promise<CreateRideResponse> {
    await delay(1500);
    const rideId = `ride-${Date.now()}`;
    // spawn 3 driver counter-offers over the next ~1.5s (simulating the
    // realtime-go WebSocket bid_received pushes)
    const driverIds = ['driver-a', 'driver-b', 'driver-c'];
    const bids: BackendBid[] = driverIds.map((id, i) => ({
      id: `bid-${rideId}-${i}`,
      driver_id: id,
      amount: Math.round((req.rider_fare * (1 + (i - 1) * 0.08)) * 100) / 100,
      eta_seconds: [180, 240, 300][i],
      currency: req.currency ?? 'USD',
      status: 'pending',
      expires_at: new Date(Date.now() + 120_000).toISOString(),
    }));
    activeRides.set(rideId, { riderFare: req.rider_fare, bids });
    return {
      success: true,
      ride: { id: rideId, status: 'searching', rider_fare: req.rider_fare, currency: req.currency ?? 'USD' },
      matching: { ride_id: rideId, notified_driver_ids: driverIds, nearby_driver_count: 3 },
    };
  },

  async bids(rideId: string): Promise<BidsResponse> {
    await delay(300);
    const ride = activeRides.get(rideId);
    return { success: true, bids: ride ? [...ride.bids].sort((a, b) => a.amount - b.amount) : [] };
  },

  async acceptBid(rideId: string, bidId: string, _driverId: string): Promise<AcceptBidResponse> {
    await delay(700);
    const ride = activeRides.get(rideId);
    if (!ride) return { success: false, ride_id: rideId, assigned_driver_id: '', agreed_fare: 0 };
    const bid = ride.bids.find(b => b.id === bidId);
    if (!bid) return { success: false, ride_id: rideId, assigned_driver_id: '', agreed_fare: 0 };
    bid.status = 'accepted';
    ride.accepted = bid;
    ride.bids.forEach(b => { if (b.id !== bidId) b.status = 'expired'; });
    return { success: true, ride_id: rideId, assigned_driver_id: bid.driver_id, agreed_fare: bid.amount };
  },

  async finalize(rideId: string, distM: number, durS: number): Promise<FinalizeFareResponse> {
    await delay(400);
    const ride = activeRides.get(rideId);
    const agreed = ride?.accepted?.amount ?? ride?.riderFare ?? 10;
    const estimate: FareEstimate = {
      base_fare: 2.5, distance_fare: (distM / 1000) * 1.5, time_fare: (durS / 60) * 0.25,
      surge_multiplier: 1, booking_fee: 0.5, suggested_fare: agreed, minimum_fare: 5,
      currency: 'USD', distance_meters: distM, duration_seconds: durS, encoded_polyline: '',
    };
    return { success: true, ride_id: rideId, final_fare: agreed, estimate };
  },

  async driverBid(rideId: string, amount: number, etaSeconds: number): Promise<BidAck> {
    await delay(500);
    return { success: true, bid_id: `bid-${Date.now()}`, ttl_seconds: 120 };
  },

  async driverRides(): Promise<{ success: boolean; rides: BackendRide[] }> {
    await delay(400);
    return {
      success: true,
      rides: [
        { id: 'r1', status: 'completed', rider_fare: 12.5, agreed_fare: 12.5, currency: 'USD', vehicle_type: 'sedan', created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 'r2', status: 'in_progress', rider_fare: 18, agreed_fare: 18, currency: 'USD', vehicle_type: 'suv', created_at: new Date().toISOString() },
      ],
    };
  },

  async driverEarnings(): Promise<{ success: boolean; earnings: DriverEarnings }> {
    await delay(400);
    return { success: true, earnings: { today: 125.5, week: 675.25, month: 2450 } };
  },
};
