// Transformers that convert backend DTOs (snake_case JSON from the gateway)
// into the frontend domain types (src/types/common.ts) the UI consumes.

import type {
  BackendBid, BackendRide, FareEstimate,
} from './types';
import type { Bid, Ride, FareDetails, Location, User } from '@/types';

export function fareEstimateToDetails(est: FareEstimate): FareDetails {
  return {
    base: est.base_fare,
    distance: est.distance_fare,
    time: est.time_fare,
    surge: est.surge_multiplier,
    discount: 0,
    total: est.suggested_fare,
    currency: est.currency,
  };
}

// Bids come back without a populated `driver` object (the backend stores only
// driver_id). For the demo we synthesize a minimal Driver record so the UI's
// <Avatar>/<rating> components still render.
const DRIVER_NAMES: Record<string, { first: string; last: string; rating: number; total: number; avatar: string; vehicle: { make: string; model: string; color: string; type: import('@/types').VehicleType; capacity: number; plateNumber: string } }> = {
  'driver-a': { first: 'John', last: 'Smith', rating: 4.8, total: 1250, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', vehicle: { make: 'Toyota', model: 'Camry', color: 'Silver', type: 'sedan', capacity: 4, plateNumber: 'ABC-1234' } },
  'driver-b': { first: 'Sarah', last: 'Johnson', rating: 4.9, total: 2100, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', vehicle: { make: 'Honda', model: 'CR-V', color: 'Black', type: 'suv', capacity: 6, plateNumber: 'XYZ-5678' } },
  'driver-c': { first: 'Mike', last: 'Williams', rating: 4.7, total: 850, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', vehicle: { make: 'Mercedes', model: 'E-Class', color: 'White', type: 'luxury', capacity: 4, plateNumber: 'LUX-9999' } },
};

function synthDriver(driverId: string) {
  const name = DRIVER_NAMES[driverId] ?? { first: 'Driver', last: driverId.slice(-4), rating: 4.5, total: 100, avatar: '', vehicle: { make: 'Generic', model: 'Car', color: 'Grey', type: 'sedan', capacity: 4, plateNumber: '---' } };
  return {
    id: driverId,
    email: `${driverId}@indrive.app`,
    phone: '',
    firstName: name.first,
    lastName: name.last,
    avatar: name.avatar,
    role: 'driver' as const,
    isVerified: true,
    isActive: true,
    isOnline: true,
    rating: name.rating,
    totalRides: name.total,
    level: 'gold' as const,
    licenseNumber: '',
    documents: [],
    vehicle: { ...name.vehicle, id: `v-${driverId}`, driverId, year: 2022, features: ['AC', 'GPS'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    wallet: { id: `w-${driverId}`, userId: driverId, balance: 0, currency: 'USD', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function bidToDomain(b: BackendBid): Bid {
  return {
    id: b.id,
    rideId: '', // filled by caller
    driverId: b.driver_id,
    driver: synthDriver(b.driver_id),
    amount: b.amount,
    eta: Math.round(b.eta_seconds / 60),
    status: b.status === 'withdrawn' ? 'expired' : b.status,
    expiresAt: b.expires_at,
    createdAt: b.expires_at,
    updatedAt: b.expires_at,
  };
}

export function backendRideToDomain(r: BackendRide): Ride {
  const fare = r.agreed_fare ?? r.rider_fare;
  const fareDetails: FareDetails = {
    base: 0, distance: 0, time: 0, surge: 1, discount: 0,
    total: fare, currency: r.currency,
  };
  return {
    id: r.id,
    riderId: '',
    pickup: { address: '', latitude: 0, longitude: 0 } as Location,
    dropoff: { address: '', latitude: 0, longitude: 0 } as Location,
    status: r.status === 'assigned' ? 'driver_assigned' : r.status === 'searching' ? 'searching' : r.status,
    fare: fareDetails,
    distance: 0,
    duration: 0,
    createdAt: r.created_at,
    updatedAt: r.created_at,
  };
}

export function backendUserToDomain(u: { id: string; role: 'rider' | 'driver' | 'admin' }, phone: string, firstName?: string, lastName?: string): User {
  return {
    id: u.id,
    email: '',
    phone,
    firstName: firstName ?? '',
    lastName: lastName ?? '',
    role: u.role,
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
