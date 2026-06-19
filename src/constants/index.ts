export * from './app';

export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) => `Must be no more than ${max}`,
  passwordMatch: 'Passwords do not match',
  invalidOtp: 'Invalid verification code',
  passwordStrength: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
};

export const errorMessages = {
  networkError: 'Unable to connect to the server. Please check your internet connection.',
  serverError: 'An unexpected error occurred. Please try again later.',
  unauthorized: 'You are not authorized to perform this action.',
  forbidden: 'Access denied.',
  notFound: 'The requested resource was not found.',
  validationError: 'Please check your input and try again.',
  sessionExpired: 'Your session has expired. Please log in again.',
  rideNotFound: 'Ride not found.',
  driverNotFound: 'Driver not found.',
  noDriversAvailable: 'No drivers are currently available in your area.',
  paymentFailed: 'Payment processing failed. Please try again.',
};

export const successMessages = {
  loginSuccess: 'Welcome back!',
  signupSuccess: 'Account created successfully!',
  logoutSuccess: 'You have been logged out.',
  profileUpdated: 'Profile updated successfully.',
  passwordChanged: 'Password changed successfully.',
  rideBooked: 'Your ride has been booked!',
  rideCancelled: 'Your ride has been cancelled.',
  paymentSuccess: 'Payment completed successfully.',
  walletRecharged: 'Wallet recharged successfully.',
  withdrawn: 'Withdrawal processed successfully.',
  savedLocationAdded: 'Location saved successfully.',
  savedLocationRemoved: 'Location removed successfully.',
  otpSent: 'Verification code sent to your email.',
  otpVerified: 'Verification successful!',
};

export const infoMessages = {
  searchingForDrivers: 'Searching for available drivers...',
  driverArriving: 'Your driver is on the way!',
  rideInProgress: 'Enjoy your ride!',
  arrivingSoon: 'You will arrive shortly.',
  noOngoingRides: 'No ongoing rides.',
  noPastRides: 'No past rides.',
  noNotifications: 'No new notifications.',
  emptyWallet: 'Your wallet is empty.',
};
