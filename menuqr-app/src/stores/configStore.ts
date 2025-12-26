import { defineStore } from 'pinia';
import type { AppConfig } from '@/types';

export const useConfigStore = defineStore('config', {
  state: (): AppConfig => ({
    locale: 'fr',
    theme: 'light',
    isOffline: !navigator.onLine,
    lastSync: null,
  }),

  getters: {
    /**
     * Get current locale
     */
    currentLocale: (state): 'fr' | 'en' => state.locale,

    /**
     * Check if app is offline
     */
    isAppOffline: (state): boolean => state.isOffline,
  },

  actions: {
    /**
     * Set locale
     */
    setLocale(locale: 'fr' | 'en') {
      this.locale = locale;
      document.documentElement.lang = locale;
    },

    /**
     * Toggle locale between FR and EN
     */
    toggleLocale() {
      this.setLocale(this.locale === 'fr' ? 'en' : 'fr');
    },

    /**
     * Set theme
     */
    setTheme(theme: 'light' | 'dark' | 'system') {
      this.theme = theme;
      this.applyTheme();
    },

    /**
     * Apply theme to document
     */
    applyTheme() {
      const isDark =
        this.theme === 'dark' ||
        (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      document.documentElement.classList.toggle('dark', isDark);
    },

    /**
     * Set offline status
     */
    setOfflineStatus(isOffline: boolean) {
      this.isOffline = isOffline;
    },

    /**
     * Update last sync time
     */
    updateLastSync() {
      this.lastSync = new Date().toISOString();
    },

    /**
     * Initialize config (call on app mount)
     */
    init() {
      // Set up online/offline listeners
      window.addEventListener('online', () => this.setOfflineStatus(false));
      window.addEventListener('offline', () => this.setOfflineStatus(true));

      // Apply saved locale
      document.documentElement.lang = this.locale;

      // Apply theme
      this.applyTheme();

      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme === 'system') {
          this.applyTheme();
        }
      });
    },
  },

  persist: {
    key: 'menuqr-config',
    storage: localStorage,
    pick: ['locale', 'theme', 'lastSync'],
  },
});
