/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  // Deployed at https://norrtou.github.io/activitydiary/
  base: '/activitydiary/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'adlogo.webp', 'adlogo-mark.webp'],
      manifest: {
        name: 'Activity Diary – Aktivitetsdagboken',
        short_name: 'Activity Diary',
        description:
          'Log your daily activities and see your occupational balance — private, offline-capable, in English and Swedish.',
        theme_color: '#2d5456',
        background_color: '#dce4ef',
        display: 'standalone',
        lang: 'en',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
