export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';

export interface BaseEntity { id: string; createdAt: string; updatedAt: string; }

export interface User extends BaseEntity {
  email: string; phone: string; firstName: string; lastName: string;
  avatar?: string; role: 'rider' | 'driver' | 'admin'; isVerified: boolean; isActive: boolean;
}

export interface Rider extends User {
  role: 'rider'; savedLocations: SavedLocation[]; wallet: Wallet;
  referralCode: string; loyaltyPoints: number; favoriteDrivers: string[];
}

export interface Driver extends User {
  role: 'driver'; licenseNumber: string; vehicle: Vehicle;
  isOnline: boolean; rating: number; totalRides: number;
  wallet: Wallet; level: DriverLevel;
}

export interface Vehicle extends BaseEntity {
  driverId: string; make: string; model: string; year: number;
  color: string; plateNumber: string; type: VehicleType; capacity: number; features: string[];
}
export type VehicleType = 'sedan' | 'suv' | 'van' | 'luxury' | 'motorcycle';

export interface SavedLocation extends BaseEntity {
  userId: string; name: string; address: string;
  latitude: number; longitude: number; type: 'home' | 'work' | 'other'; isDefault: boolean;
}

export interface Wallet extends BaseEntity { userId: string; balance: number; currency: string; }

export interface WalletTransaction extends BaseEntity {
  walletId: string; type: 'credit' | 'debit'; amount: number; balance: number;
  reference: string; description: string; status: 'pending' | 'completed' | 'failed';
}

export type DriverLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Ride extends BaseEntity {
  riderId: string; driverId?: string; driver?: Driver; rider?: Rider; vehicle?: Vehicle;
  pickup: Location; dropoff: Location; status: RideStatus; fare: FareDetails;
  distance: number; duration: number; rating?: number; review?: string;
}

export interface Location { address: string; latitude: number; longitude: number; }

export type RideStatus = 'pending' | 'searching' | 'driver_assigned' | 'driver_arriving' |
  'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';

export interface FareDetails {
  base: number; distance: number; time: number; surge: number; discount: number; total: number; currency: string;
}

export interface Bid extends BaseEntity {
  rideId: string; driverId: string; driver: Driver; amount: number; eta: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired'; expiresAt: string;
}

export interface Notification extends BaseEntity {
  userId: string; type: string; title: string; message: string;
  data?: Record<string, unknown>; isRead: boolean;
}

export interface BookingState {
  step: 'pickup' | 'destination' | 'fare' | 'bids' | 'confirmation' | 'tracking' | 'dropoff' | 'confirm';
  pickup?: Location; dropoff?: Location; proposedFare?: number; selectedBid?: Bid; ride?: Ride;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Generic API envelope matching the gateway's { success, data?, error? } shape.
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
