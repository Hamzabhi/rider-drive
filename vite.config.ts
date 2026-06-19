import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@': '/src',
    }
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
