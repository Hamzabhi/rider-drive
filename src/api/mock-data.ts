import type { User, Rider, Driver, Ride, Bid, Vehicle, WalletTransaction, Notification } from '@/types';

export const mockVehicles: Vehicle[] = [
  { id: 'v1', driverId: 'd1', make: 'Toyota', model: 'Camry', year: 2022, color: 'Silver', plateNumber: 'ABC-1234', type: 'sedan', capacity: 4, features: ['AC', 'GPS'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'v2', driverId: 'd2', make: 'Honda', model: 'CR-V', year: 2023, color: 'Black', plateNumber: 'XYZ-5678', type: 'suv', capacity: 6, features: ['AC', 'GPS', 'Leather'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'v3', driverId: 'd3', make: 'Mercedes', model: 'E-Class', year: 2023, color: 'White', plateNumber: 'LUX-9999', type: 'luxury', capacity: 4, features: ['AC', 'GPS', 'WiFi'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

export const mockDrivers: Driver[] = [
  { id: 'd1', email: 'john@driver.com', phone: '+1234567890', firstName: 'John', lastName: 'Smith', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', role: 'driver', isVerified: true, isActive: true, licenseNumber: 'DL123456', vehicle: mockVehicles[0], isOnline: true, rating: 4.8, totalRides: 1250, wallet: { id: 'w1', userId: 'd1', balance: 2450.75, currency: 'USD', createdAt: '2024-01-01', updatedAt: '2024-06-01' }, level: 'gold', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'd2', email: 'sarah@driver.com', phone: '+1234567891', firstName: 'Sarah', lastName: 'Johnson', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', role: 'driver', isVerified: true, isActive: true, licenseNumber: 'DL789012', vehicle: mockVehicles[1], isOnline: true, rating: 4.9, totalRides: 2100, wallet: { id: 'w2', userId: 'd2', balance: 3200.50, currency: 'USD', createdAt: '2024-01-01', updatedAt: '2024-06-01' }, level: 'platinum', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'd3', email: 'mike@driver.com', phone: '+1234567892', firstName: 'Mike', lastName: 'Williams', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', role: 'driver', isVerified: true, isActive: true, licenseNumber: 'DL345678', vehicle: mockVehicles[2], isOnline: true, rating: 4.7, totalRides: 850, wallet: { id: 'w3', userId: 'd3', balance: 1875.25, currency: 'USD', createdAt: '2024-01-01', updatedAt: '2024-06-01' }, level: 'silver', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

export const mockRider: Rider = {
  id: 'r1', email: 'rider@example.com', phone: '+1234567893', firstName: 'Alex', lastName: 'Rider',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  role: 'rider', isVerified: true, isActive: true,
  savedLocations: [
    { id: 'sl1', userId: 'r1', name: 'Home', address: '123 Main Street, New York, NY 10001', latitude: 40.748817, longitude: -73.985428, type: 'home', isDefault: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'sl2', userId: 'r1', name: 'Work', address: '456 Office Plaza, New York, NY 10002', latitude: 40.758896, longitude: -73.985130, type: 'work', isDefault: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  wallet: { id: 'wr1', userId: 'r1', balance: 150.00, currency: 'USD', createdAt: '2024-01-01', updatedAt: '2024-06-01' },
  referralCode: 'ALEX2024', loyaltyPoints: 2450, favoriteDrivers: ['d1', 'd2'],
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
};

export const mockRides: Ride[] = [
  { id: 'ride1', riderId: 'r1', driverId: 'd1', driver: mockDrivers[0], rider: mockRider, vehicle: mockVehicles[0], pickup: { address: '123 Main Street, New York, NY 10001', latitude: 40.748817, longitude: -73.985428 }, dropoff: { address: '456 Office Plaza, New York, NY 10002', latitude: 40.758896, longitude: -73.985130 }, status: 'completed', fare: { base: 2.50, distance: 5.25, time: 3.50, surge: 0, discount: 0, total: 11.25, currency: 'USD' }, distance: 8500, duration: 1800, rating: 5, review: 'Great ride!', createdAt: '2024-06-01T10:00:00Z', updatedAt: '2024-06-01T10:30:00Z' },
  { id: 'ride2', riderId: 'r1', driverId: 'd2', driver: mockDrivers[1], rider: mockRider, vehicle: mockVehicles[1], pickup: { address: 'Times Square, New York', latitude: 40.7580, longitude: -73.9855 }, dropoff: { address: 'Central Park, New York', latitude: 40.7829, longitude: -73.9654 }, status: 'in_progress', fare: { base: 2.50, distance: 4.00, time: 2.00, surge: 1.2, discount: 0, total: 10.20, currency: 'USD' }, distance: 5500, duration: 1200, createdAt: '2024-06-12T14:00:00Z', updatedAt: '2024-06-12T14:20:00Z' },
];

export const mockBids: Bid[] = [
  { id: 'bid1', rideId: 'ride-new', driverId: 'd1', driver: mockDrivers[0], amount: 12.00, eta: 5, status: 'pending', expiresAt: new Date(Date.now() + 120000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'bid2', rideId: 'ride-new', driverId: 'd2', driver: mockDrivers[1], amount: 11.50, eta: 3, status: 'pending', expiresAt: new Date(Date.now() + 120000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'bid3', rideId: 'ride-new', driverId: 'd3', driver: mockDrivers[2], amount: 18.00, eta: 8, status: 'pending', expiresAt: new Date(Date.now() + 120000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const mockTransactions: WalletTransaction[] = [
  { id: 't1', walletId: 'wr1', type: 'credit', amount: 100.00, balance: 150.00, reference: 'DEP-001', description: 'Added funds via credit card', status: 'completed', createdAt: '2024-06-10T10:00:00Z', updatedAt: '2024-06-10T10:00:00Z' },
  { id: 't2', walletId: 'wr1', type: 'debit', amount: 11.25, balance: 50.00, reference: 'RIDE-001', description: 'Ride payment', status: 'completed', createdAt: '2024-06-08T14:30:00Z', updatedAt: '2024-06-08T14:30:00Z' },
  { id: 't3', walletId: 'wr1', type: 'credit', amount: 50.00, balance: 61.25, reference: 'PROMO-001', description: 'Promotional credit', status: 'completed', createdAt: '2024-06-05T09:00:00Z', updatedAt: '2024-06-05T09:00:00Z' },
];

export const mockDriverEarnings = { today: 125.50, week: 675.25, month: 2450.00, total: 15780.00 };

export const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
export const mockApiCall = <T,>(data: T, ms = 500) => delay(ms).then(() => data);
