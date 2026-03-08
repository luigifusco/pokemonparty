import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiTarget = process.env.API_TARGET || 'http://localhost:3001';

export default defineConfig({
  base: '/pokemonparty/',
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
      '/pokemonparty/socket.io': {
        target: apiTarget,
        ws: true,
      },
      '/pokemonparty/api': {
        target: apiTarget,
      },
    },
  },
});
