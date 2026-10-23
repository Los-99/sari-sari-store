/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

const THEME_COLOR = '#0F6E56';

export default defineConfig({
  // GitHub Pages serves the app from /<repository-name>/. The deploy workflow
  // sets BASE_PATH; on your PC the app runs from the root (/).
  base: process.env.BASE_PATH ?? '/',

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  plugins: [
    svelte(),
    VitePWA({
      // Ask the user before switching to a new version, so a half-filled
      // form is never lost by an automatic reload.
      registerType: 'prompt',
      injectRegister: false,
      // The icons are already matched by workbox.globPatterns below.
      includeManifestIcons: false,
      manifest: {
        name: 'Sari-Sari Store',
        short_name: 'Sari-Sari',
        description: 'Offline product and inventory manager for your sari-sari store.',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: '#F6F7F5',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Save every app file on the phone so the app opens in airplane mode.
        // "wasm" covers the barcode-scanning engine. The manifest is added automatically.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],

  test: {
    include: ['src/**/*.test.ts'],
  },
});
