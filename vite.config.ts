import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // Use VITE_ prefixed env vars which are automatically exposed
    // NEVER expose sensitive API keys to the client bundle
    // Any API keys needed should be handled by the backend
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Core React
              if (id.includes('react-dom') || (id.includes('/react/') && !id.includes('react-'))) {
                return 'vendor-react';
              }
              // Router
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              // Data layer
              if (id.includes('@tanstack/react-query') || id.includes('axios')) {
                return 'vendor-data';
              }
              // Forms
              if (id.includes('react-hook-form')) {
                return 'vendor-forms';
              }
              // Icons (lucide is large)
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Monitoring
              if (id.includes('@sentry')) {
                return 'vendor-sentry';
              }
              // Realtime
              if (id.includes('socket.io') || id.includes('engine.io')) {
                return 'vendor-realtime';
              }
              // Offline storage
              if (id.includes('dexie')) {
                return 'vendor-dexie';
              }
            }
          },
        },
      },
    },
  };
});

