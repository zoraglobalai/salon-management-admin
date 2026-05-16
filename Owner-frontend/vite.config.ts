import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5002',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            if ((err as any).code !== 'ECONNABORTED') {
              console.error('proxy error', err);
            }
          });
          proxy.on('econnreset', (_err, _req, _res) => {
            // Ignore transient websocket resets during backend restart/shutdown.
          });
        },
      },
    },
  },
})
