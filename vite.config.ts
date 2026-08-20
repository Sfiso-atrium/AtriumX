// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'AtriumX - Campus Marketplace & Study Space',
        short_name: 'AtriumX',
        description: 'Buy and sell in your residence, and keep your deadlines, timetable and budget in one place.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0F1E',
        theme_color: '#0A0F1E',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precaches the built app shell so it opens even with no signal.
        // Doesn't touch Supabase API calls - those still need real network.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
  base: '/',
})
