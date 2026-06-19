// API barrel.
//
// Prefer importing from '@/api/backend' (typed Hono gateway client) and
// '@/api/realtime' (WebSocket). Mock data is kept only for admin panels
// that haven't been migrated to live APIs yet.

export { authApi, rideApi, driverApi, setToken } from './backend';
export type { ApiError } from './backend';
export type { AuthResponse, FareEstimate, BackendBid, BackendRide, DriverEarnings } from './types';
export { realtime, clearBidEvents, clearRideRequests } from './realtime';
export type { RealtimeEvent } from './realtime';

// Legacy exports kept for unmigrated admin pages + mock-data helpers.
export { mockRider, mockDrivers, mockRides, mockBids, mockTransactions, mockDriverEarnings, delay, mockApiCall } from './mock-data';
