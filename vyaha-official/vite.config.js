import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/order': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/business': {
        target: 'http://localhost:5175',
        changeOrigin: true,
      },
    },
  },
})
