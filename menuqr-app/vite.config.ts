import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

// Cache version - bump this to invalidate all caches
const CACHE_VERSION = 'v1.0.0';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    basicSsl(), // Enable HTTPS for development (required for geolocation on iOS)
    VitePWA({
      registerType: 'prompt', // Show update prompt to user
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.svg',
        'images/dish-placeholder.svg',
        'offline.html',
      ],

      manifest: {
        name: 'MenuQR - Menu Digital',
        short_name: 'MenuQR',
        description: 'Menu digital pour restaurant avec commande WhatsApp',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        categories: ['food', 'lifestyle', 'shopping'],
        lang: 'fr',
        shortcuts: [
          {
            name: 'Voir le menu',
            short_name: 'Menu',
            url: '/menu',
            icons: [{ src: 'pwa-192x192.svg', sizes: '192x192' }],
          },
          {
            name: 'Mon panier',
            short_name: 'Panier',
            url: '/cart',
            icons: [{ src: 'pwa-192x192.svg', sizes: '192x192' }],
          },
        ],
      },

      workbox: {
        // Precache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,woff2,json}'],

        // Navigation fallback for SPA routing
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/offline\.html/],

        // Clean old caches on update
        cleanupOutdatedCaches: true,

        // Skip waiting to activate new service worker immediately
        skipWaiting: false, // Let user decide when to update

        // Client claims for immediate control
        clientsClaim: true,

        // Source map support
        sourcemap: false,

        runtimeCaching: [
          {
            // Menu data - NetworkFirst for fresh data, fallback to cache
            urlPattern: /\/data\/menu\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `menuqr-menu-data-${CACHE_VERSION}`,
              networkTimeoutSeconds: 5, // Fallback to cache after 5s
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              // Broadcast updates to clients
              broadcastUpdate: {
                channelName: 'menu-updates',
                options: {
                  headersToCheck: ['etag', 'last-modified'],
                },
              },
            },
          },
          {
            // Cache images from Cloudinary with optimized settings
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: `menuqr-cloudinary-${CACHE_VERSION}`,
              expiration: {
                maxEntries: 150, // Increased for more dishes
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                // Purge least recently used when limit reached
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              // Background sync for failed requests
              backgroundSync: {
                name: 'image-queue',
                options: {
                  maxRetentionTime: 60 * 24, // Retry for 24 hours (in minutes)
                },
              },
            },
          },
          {
            // Cache images from Unsplash (used for dish photos)
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: `menuqr-unsplash-${CACHE_VERSION}`,
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: `menuqr-gfonts-styles-${CACHE_VERSION}`,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache Google Fonts webfonts - immutable, cache forever
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: `menuqr-gfonts-webfonts-${CACHE_VERSION}`,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache static assets (JS, CSS) - CacheFirst with network fallback
            urlPattern: /\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `menuqr-static-${CACHE_VERSION}`,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                purgeOnQuotaError: true,
              },
            },
          },
          {
            // Cache local images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `menuqr-images-${CACHE_VERSION}`,
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                purgeOnQuotaError: true,
              },
            },
          },
          {
            // Catch-all for other assets - StaleWhileRevalidate
            urlPattern: /^https?:\/\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: `menuqr-others-${CACHE_VERSION}`,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: false, // Disabled in dev to avoid permission errors
        type: 'module',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core vendor chunk
          if (id.includes('node_modules')) {
            if (id.includes('vue') && !id.includes('vue-i18n')) {
              return 'vendor';
            }
            if (id.includes('pinia')) {
              return 'vendor';
            }
            if (id.includes('vue-i18n')) {
              return 'i18n';
            }
          }

          // Menu-related components chunk
          if (id.includes('/components/menu/') || id.includes('/views/MenuView')) {
            return 'menu';
          }

          // Cart-related components chunk
          if (id.includes('/components/cart/') || id.includes('/views/CartView') || id.includes('/views/CheckoutView')) {
            return 'cart';
          }
        },
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Performance optimizations
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    sourcemap: false,
    // Optimize asset inlining
    assetsInlineLimit: 4096, // 4KB - inline smaller assets
  },

  // Optimize dev server
  server: {
    port: 3000,
    open: true,
    cors: true,
    https: true, // Enable HTTPS (uses basicSsl plugin certificate)
    host: true, // Expose to network for mobile testing
    // Proxy API requests to backend (avoids mixed content issues with HTTPS)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Preview server config
  preview: {
    port: 4173,
  },
});
