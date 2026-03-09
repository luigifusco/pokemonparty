import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiTarget = process.env.API_TARGET || 'http://localhost:3001';

// BASE_PATH env var controls where the app is served.
// Examples: 'pokemonparty' → '/pokemonparty/', '' or unset → '/'
const rawBase = (process.env.BASE_PATH ?? 'pokemonparty').replace(/^\/|\/$/g, '');
const base = rawBase ? `/${rawBase}/` : '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  publicDir: path.resolve(__dirname, '../assets-public'),
  server: {
    port: 5173,
    allowedHosts: ['luigifusco.dev'],
    proxy: {
      [`${base}socket.io`]: {
        target: apiTarget,
        ws: true,
      },
      [`${base}api`]: {
        target: apiTarget,
      },
    },
  },
});
