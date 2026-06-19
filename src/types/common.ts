export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'rider' | 'driver' | 'admin';
  isVerified: boolean;
  isActive: boolean;
}

export interface Rider extends User {
  role: 'rider';
  savedLocations: SavedLocation[];
  wallet: Wallet;
  referralCode: string;
  loyaltyPoints: number;
  favoriteDrivers: string[];
}

export interface Driver extends User {
  role: 'driver';
  licenseNumber: string;
  vehicle: Vehicle;
  documents: DriverDocument[];
  isOnline: boolean;
  rating: number;
  totalRides: number;
  wallet: Wallet;
  level: DriverLevel;
}

export interface Vehicle extends BaseEntity {
  driverId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  type: VehicleType;
  capacity: number;
  features: string[];
}

export type VehicleType = 'sedan' | 'suv' | 'van' | 'luxury' | 'motorcycle';

export interface SavedLocation extends BaseEntity {
  userId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'home' | 'work' | 'other';
  isDefault: boolean;
}

export interface Wallet extends BaseEntity {
  userId: string;
  balance: number;
  currency: string;
}

export interface WalletTransaction extends BaseEntity {
  walletId: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  reference: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface DriverDocument extends BaseEntity {
  driverId: string;
  type: 'license' | 'insurance' | 'registration' | 'inspection';
  url: string;
  expiryDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type DriverLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Ride extends BaseEntity {
  riderId: string;
  driverId?: string;
  pickup: Location;
  dropoff: Location;
  status: RideStatus;
  fare: FareDetails;
  distance: number;
  duration: number;
  rating?: number;
  review?: string;
  driver?: Driver;
  rider?: Rider;
  vehicle?: Vehicle;
}

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export type RideStatus =
  | 'pending'
  | 'searching'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface FareDetails {
  base: number;
  distance: number;
  time: number;
  surge: number;
  discount: number;
  total: number;
  currency: string;
}

export interface Bid extends BaseEntity {
  rideId: string;
  driverId: string;
  driver: Driver;
  amount: number;
  eta: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: string;
}

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
}

export type NotificationType =
  | 'ride_request'
  | 'ride_accepted'
  | 'ride_started'
  | 'ride_completed'
  | 'payment_received'
  | 'promotion'
  | 'system';

export interface PromoCode extends BaseEntity {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscount: number;
  usageLimit: number;
  usageCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export interface Complaint extends BaseEntity {
  rideId: string;
  userId: string;
  type: 'safety' | 'cleanliness' | 'behavior' | 'route' | 'payment' | 'other';
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  resolution?: string;
}

export interface Analytics {
  totalRides: number;
  totalEarnings: number;
  totalUsers: number;
  totalDrivers: number;
  avgRating: number;
  ridesGrowth: number;
  earningsGrowth: number;
  activeDrivers: number;
  activeRiders: number;
}

export interface DashboardLayout {
  id: string;
  userId: string;
  widgets: WidgetConfig[];
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  config?: Record<string, unknown>;
}

export type WidgetType =
  | 'stats'
  | 'chart'
  | 'map'
  | 'recent_rides'
  | 'earnings'
  | 'notifications'
  | 'quick_actions';
