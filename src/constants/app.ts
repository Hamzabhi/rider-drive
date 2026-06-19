export const APP_NAME = 'RideFlow';
export const APP_DESCRIPTION = 'Professional Ride-Hailing Platform';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'rideflow_auth_token',
  REFRESH_TOKEN: 'rideflow_refresh_token',
  USER_DATA: 'rideflow_user_data',
  THEME: 'rideflow_theme',
  LANGUAGE: 'rideflow_language',
  SAVED_LOCATIONS: 'rideflow_saved_locations',
  DASHBOARD_LAYOUT: 'rideflow_dashboard_layout',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  OTP_VERIFICATION: '/verify-otp',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  RIDER: {
    HOME: '/rider',
    BOOKING: '/rider/book',
    RIDE: '/rider/ride/:id',
    TRACKING: '/rider/tracking/:id',
    PAYMENT: '/rider/payment/:id',
    HISTORY: '/rider/history',
    SAVED_LOCATIONS: '/rider/locations',
    WALLET: '/rider/wallet',
    NOTIFICATIONS: '/rider/notifications',
    SETTINGS: '/rider/settings',
    PROFILE: '/rider/profile',
  },

  DRIVER: {
    DASHBOARD: '/driver',
    REQUESTS: '/driver/requests',
    RIDE: '/driver/ride/:id',
    EARNINGS: '/driver/earnings',
    HISTORY: '/driver/history',
    WALLET: '/driver/wallet',
    DOCUMENTS: '/driver/documents',
    VEHICLES: '/driver/vehicles',
    PROFILE: '/driver/profile',
    SETTINGS: '/driver/settings',
  },

  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    DRIVERS: '/admin/drivers',
    VEHICLES: '/admin/vehicles',
    TRIPS: '/admin/trips',
    PAYMENTS: '/admin/payments',
    WALLET: '/admin/wallet',
    COMPLAINTS: '/admin/complaints',
    PROMOTIONS: '/admin/promotions',
    REPORTS: '/admin/reports',
    ANALYTICS: '/admin/analytics',
    SETTINGS: '/admin/settings',
  },
} as const;

export const VEHICLE_TYPES = {
  sedan: { label: 'Sedan', capacity: 4, icon: 'car' },
  suv: { label: 'SUV', capacity: 6, icon: 'suv' },
  van: { label: 'Van', capacity: 8, icon: 'van' },
  luxury: { label: 'Luxury', capacity: 4, icon: 'luxury' },
  motorcycle: { label: 'Motorcycle', capacity: 1, icon: 'motorcycle' },
} as const;

export const RIDE_STATUSES = {
  pending: { label: 'Pending', color: 'warning' },
  searching: { label: 'Searching', color: 'primary' },
  driver_assigned: { label: 'Driver Assigned', color: 'info' },
  driver_arriving: { label: 'Driver Arriving', color: 'primary' },
  driver_arrived: { label: 'Driver Arrived', color: 'success' },
  in_progress: { label: 'In Progress', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'danger' },
} as const;

export const DRIVER_LEVELS = {
  bronze: { label: 'Bronze', min: 0, max: 100 },
  silver: { label: 'Silver', min: 101, max: 500 },
  gold: { label: 'Gold', min: 501, max: 1000 },
  platinum: { label: 'Platinum', min: 1001, max: Infinity },
} as const;

export const FARE_CALCULATION = {
  BASE_FARE: 2.50,
  PER_KM: 1.50,
  PER_MINUTE: 0.25,
  MINIMUM_FARE: 5.00,
  SURGE_MULTIPLIER: 1.5,
  BOOKING_FEE: 0.50,
} as const;

export const DEFAULT_LOCATION = {
  latitude: 40.7128,
  longitude: -74.006,
  address: 'New York, NY',
};

export const CURRENCY = {
  code: 'USD',
  symbol: '$',
  decimals: 2,
};

export const TIME_FORMATS = {
  FULL: 'EEEE, MMMM d, yyyy h:mm a',
  SHORT: 'MMM d, h:mm a',
  TIME: 'h:mm a',
  DATE: 'MMM d, yyyy',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

export const TOAST_DURATION = 5000;

export const BID_EXPIRATION_SECONDS = 120;

export const OTP_LENGTH = 6;
export const OTP_EXPIRATION_SECONDS = 300;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
