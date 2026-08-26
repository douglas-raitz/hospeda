import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: (process.env.VITE_ALLOWED_HOSTS ?? '').split(',').filter(Boolean),
    hmr: hmrClientPort ? { clientPort: Number(hmrClientPort) } : undefined,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        xfwd: true,
      },
      '/admin': {
        target: apiTarget,
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
})
