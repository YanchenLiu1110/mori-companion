import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      // Lets `npm run dev` talk to the Netlify Function (via `netlify dev`)
      // or any local proxy exposing the same contract.
      '/api': 'http://localhost:8888',
    },
  },
});
