import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.VITE_API_PROXY ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow any host so cloud preview/proxy domains (e2b.app, ngrok, etc) work.
    allowedHosts: true,
    cors: true,
    // Let Vite infer the HMR endpoint from the page origin. Hardcoding
    // wss/443 breaks local http development; inference works for both plain
    // localhost and https cloud preview proxies.
    proxy: {
      // The browser only ever talks to the Vite origin; requests are proxied to
      // the API server. Nothing in the client hardcodes localhost.
      '/api': { target: API_TARGET, changeOrigin: true },
      '/sitemap.xml': { target: API_TARGET, changeOrigin: true },
      '/robots.txt': { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: { host: '0.0.0.0', port: 5173 },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the router/vendor code so the initial page payload stays small.
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
