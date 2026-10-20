const apiTarget = process.env.NUXT_API_PROXY ?? 'http://localhost:8080';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  devServer: { port: 5173 },

  css: ['normalize.css', 'leaflet/dist/leaflet.css', '~/assets/css/main.css'],
  tailwindcss: { cssPath: '~/assets/css/main.css', configPath: '~/tailwind.config.ts' },

  imports: {
    presets: [{ from: 'vue-i18n', imports: ['useI18n'] }],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'uk' },
      title: 'HelpRadar',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  // keep the session cookie first-party.
  routeRules: {
    '/api/**': { proxy: `${apiTarget}/api/**` },
  },

  runtimeConfig: {
    public: {
      mapTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      mapAttribution: '&copy; OpenStreetMap contributors',
    },
  },

  // avoid the dev-server manifest warm-up error in this SPA.
  experimental: { appManifest: false },

  vite: {
    // prebundle Leaflet to avoid a stale dependency response on first load.
    optimizeDeps: { include: ['leaflet'] },
  },

  typescript: { strict: true },
});
