import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// Dev backend targets (override via env if your services run elsewhere).
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const REALTIME_URL = process.env.REALTIME_URL || 'http://localhost:8081';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@': '/src',
    }
  },
  // Proxy /api and /ws to the backend so the browser talks to the SAME origin
  // as the app. This is what makes the HttpOnly session cookie flow in dev
  // (cross-origin cookies would need SameSite=None;Secure over HTTPS) and
  // fixes the 404s from requests landing on the Vite dev server itself.
  server: {
    proxy: {
      '/api': { target: GATEWAY_URL, changeOrigin: true },
      '/ws': { target: REALTIME_URL, changeOrigin: true, ws: true },
    },
  },
  build: {
    target: 'ES2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'solid-vendor': ['solid-js', '@solidjs/router'],
          'utils': ['clsx', 'date-fns', 'zod']
        }
      }
    }
  }
});
