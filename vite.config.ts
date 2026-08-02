import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, independently-cacheable vendors into their own chunks.
        // recharts (only used by the Dashboard) is the big one.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          charts: ['recharts'],
        },
      },
    },
  },
});
