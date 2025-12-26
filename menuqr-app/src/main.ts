import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import App from './App.vue';
import router from './router';
import i18n from './i18n';

import './assets/styles/main.css';

// Create Vue app
const app = createApp(App);

// Create Pinia store with persistence
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Use plugins
app.use(pinia);
app.use(router);
app.use(i18n);

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
        console.error('Service Worker registration error:', error);
      },
    });
  });
}
