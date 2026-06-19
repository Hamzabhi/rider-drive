import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

export const formatDistance = (meters: number) => {
  const km = meters / 1000;
  return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
};

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
};

export const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatTime = (date: string | Date) =>
  new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

export const formatRelative = (date: string | Date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
