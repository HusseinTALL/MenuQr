import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import App from './App.vue';
import router from './router';
import i18n from './i18n';
import setupAntd from './plugins/antd';
import { initializeSentry } from './plugins/sentry';

import './assets/styles/main.css';
// Ant Design styles
import 'ant-design-vue/dist/reset.css';
// Client theme overrides for mobile-optimized Ant Design
import './styles/client-theme.css';
// Admin responsive styles
import './styles/admin-responsive.css';

// Create Vue app
const app = createApp(App);

// Initialize Sentry error tracking (must be early, before other plugins)
initializeSentry(app, router);

// Create Pinia store with persistence
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Use plugins
app.use(pinia);
app.use(router);
app.use(i18n);

// Setup Ant Design Vue (admin + client interfaces)
setupAntd(app);

// Mount app
app.mount('#app');

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.VITE_ENABLE_PWA === 'true') {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Show update prompt to user
        // eslint-disable-next-line no-alert
        if (confirm('Une nouvelle version est disponible. Mettre à jour ?')) {
          window.location.reload();
        }
      },
      onOfflineReady() {
        console.info('App ready to work offline');
      },
      onRegistered(registration) {
        console.info('Service Worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('Service Worker registration error:');
      },
    });
  });
}
