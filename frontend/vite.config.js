import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Listen on IPv4 loopback: on this machine connections to ::1 (IPv6 localhost) are dropped
  server: { host: '127.0.0.1', port: 5173 },
})
