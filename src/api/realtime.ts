// WebSocket client for the realtime-go service.
//
// Connects rider/driver clients to ws://<REALTIME_URL>/ws/{riders,drivers}
// and surfaces typed events. Auto-reconnects with backoff. All listeners
// are Solid signals, so components react automatically when a `bid_received`
// or `ride_request` arrives.

import { createSignal } from 'solid-js';
import { SOCKET_URL } from '@/constants';

export type RealtimeEvent =
  | { event: 'bid_received'; data: { bid_id: string; ride_id: string; driver_id: string; amount: number; eta_seconds: number; currency: string } }
  | { event: 'bid_accepted'; data: { ride_id: string; bid_id: string; fare: number } }
  | { event: 'bid_lost'; data: { ride_id: string; reason: string } }
  | { event: 'bid_expired'; data: { ride_id: string } }
  | { event: 'bid_window_expired'; data: { ride_id: string } }
  | { event: 'ride_request'; data: { ride_id: string; rider_id: string; pickup_lat: number; pickup_lng: number; rider_proposed_fare: number; currency: string; vehicle_type: string; expires_in: number } };

export interface RealtimeClient {
  connected: () => boolean;
  connect: (role: 'rider' | 'driver', id: string) => void;
  disconnect: () => void;
  // rider-side
  bidEvents: () => RealtimeEvent[];
  // driver-side
  rideRequests: () => RealtimeEvent[];
  // send a driver location ping (driver clients only)
  sendLocation: (lat: number, lng: number) => void;
}

const [connected, setConnected] = createSignal(false);
const [bidEvents, setBidEvents] = createSignal<RealtimeEvent[]>([]);
const [rideRequests, setRideRequests] = createSignal<RealtimeEvent[]>([]);

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentRole: 'rider' | 'driver' | null = null;
let currentId: string | null = null;
let reconnectAttempts = 0;

function wsBaseUrl(): string {
  // SOCKET_URL from env is the realtime-go origin (e.g. ws://localhost:8081).
  // If unset, fall back to a path on the same origin as the frontend.
  const env = (import.meta.env.VITE_REALTIME_URL as string | undefined) ?? SOCKET_URL;
  if (env) return env.replace(/\/$/, '');
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

function handleEvent(evt: RealtimeEvent): void {
  switch (evt.event) {
    case 'bid_received':
    case 'bid_accepted':
    case 'bid_lost':
    case 'bid_expired':
    case 'bid_window_expired':
      setBidEvents(prev => [...prev, evt]);
      break;
    case 'ride_request':
      setRideRequests(prev => [evt, ...prev].slice(0, 20));
      break;
  }
}

function connect(role: 'rider' | 'driver', id: string): void {
  if (socket && currentRole === role && currentId === id) return;
  disconnect();
  currentRole = role;
  currentId = id;

  // The realtime service authenticates the connection from the HttpOnly
  // session cookie, which the browser sends automatically on the WS handshake
  // (same-origin / proxied deployments). The id is derived from the verified
  // token server-side; we still pass ?id for logging/back-compat.
  const url = `${wsBaseUrl()}/ws/${role === 'driver' ? 'drivers' : 'riders'}?id=${encodeURIComponent(id)}`;
  try {
    socket = new WebSocket(url);
  } catch (e) {
    console.warn('[realtime] WebSocket unavailable, running in REST-poll mode:', e);
    return;
  }

  socket.onopen = () => {
    setConnected(true);
    reconnectAttempts = 0;
  };
  socket.onclose = () => {
    setConnected(false);
    scheduleReconnect();
  };
  socket.onerror = () => {
    socket?.close();
  };
  socket.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data) as RealtimeEvent;
      handleEvent(parsed);
    } catch {
      // ignore non-JSON frames (server pings)
    }
  };
}

function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  setConnected(false);
  setBidEvents([]);
  setRideRequests([]);
  currentRole = null;
  currentId = null;
}

function scheduleReconnect(): void {
  if (!currentRole || !currentId) return;
  if (reconnectAttempts >= 5) return; // give up after 5 tries
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 15_000);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => connect(currentRole!, currentId!), delay);
}

function sendLocation(lat: number, lng: number): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ lat, lng }));
  }
}

export const realtime: RealtimeClient = {
  connected,
  connect,
  disconnect,
  bidEvents,
  rideRequests,
  sendLocation,
};

// Helper: clear the bid event queue so a new booking flow doesn't replay old ones
export function clearBidEvents(): void {
  setBidEvents([]);
}
export function clearRideRequests(): void {
  setRideRequests([]);
}
