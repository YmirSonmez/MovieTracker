import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the build works unmodified from any GitHub Pages project
// path (https://USERNAME.github.io/REPOSITORY/) without hardcoding the repo
// name. Combined with HashRouter, this means the app never depends on
// server-side rewrite rules and cannot 404 on refresh or direct deep links.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the service worker ourselves (src/registerServiceWorker.ts)
      // via the virtual:pwa-register module instead of the default injected
      // <script>, because the auto-injected one only calls
      // navigator.serviceWorker.register() - it never actually applies an
      // update it finds. Without that, a new deploy sits fully downloaded
      // but inert until the visitor happens to fully close and reopen the
      // tab, which reads as "the new feature isn't there yet" even though
      // it shipped.
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: 'Movie Tracker',
        short_name: 'Movie Tracker',
        description: 'Kişisel film ve dizi takip paneli',
        theme_color: '#0b0b0d',
        background_color: '#0b0b0d',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
