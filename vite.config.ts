import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Las Pages Functions no corren con Vite: se levantan aparte con
    // `npm run dev:api` (wrangler pages dev) y Vite les pasa /api/*.
    proxy: {
      '/api': {
        target: process.env.LUNE_FUNCTIONS_URL || 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
})
