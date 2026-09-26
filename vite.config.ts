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
      // 'prompt': a new version downloads in the background and waits,
      // instead of taking over (and reloading the page) the moment it's
      // found - src/registerServiceWorker.ts switches over while the app is
      // hidden, so an update never lands in the middle of using it.
      registerType: 'prompt',
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
        // A real standalone page (Google's consent screen links to it), not
        // an SPA route - must never be answered with index.html.
        navigateFallbackDenylist: [/privacy\.html$/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
