// DTOs matching the api-gateway-hono REST contract (src/routes/*).
// These map 1:1 to the JSON the backend returns; transformers below
// adapt them into the domain shapes the UI uses (src/types/common.ts).

export interface BackendUser {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  role: 'rider' | 'driver' | 'admin';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  exists?: boolean;
  /** Short-lived token from /otp/verify (unknown phone) required by /signup. */
  enrollment_token?: string;
  token?: string;
  user?: { id: string; role: 'rider' | 'driver' | 'admin' };
  error?: string;
}

export interface FareEstimate {
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_multiplier: number;
  booking_fee: number;
  suggested_fare: number;
  minimum_fare: number;
  currency: string;
  distance_meters: number;
  duration_seconds: number;
  encoded_polyline: string;
}

export interface QuoteResponse {
  success: boolean;
  estimate?: FareEstimate;
  error?: string;
}

export interface RideRequestAck {
  ride_id: string;
  notified_driver_ids: string[];
  nearby_driver_count: number;
}

export interface CreateRideResponse {
  success: boolean;
  ride?: { id: string; status: string; rider_fare: number; currency: string };
  matching?: RideRequestAck;
  error?: string;
}

export interface BackendBid {
  id: string;
  driver_id: string;
  amount: number;
  eta_seconds: number;
  currency: string;
  status: 'pending' | 'accepted' | 'expired' | 'withdrawn';
  expires_at: string;
}

export interface BidsResponse {
  success: boolean;
  bids?: BackendBid[];
  error?: string;
}

export interface AcceptBidResponse {
  success: boolean;
  ride_id: string;
  assigned_driver_id: string;
  agreed_fare: number;
}

export interface FinalizeFareResponse {
  success: boolean;
  ride_id: string;
  final_fare: number;
  estimate: FareEstimate;
}

export interface BackendRide {
  id: string;
  status: 'searching' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  rider_fare: number;
  agreed_fare: number | null;
  currency: string;
  vehicle_type: string;
  created_at: string;
}

export interface DriverEarnings {
  today: number;
  week: number;
  month: number;
}

export interface BidAck {
  success: boolean;
  bid_id?: string;
  ttl_seconds?: number;
  error?: string;
}
