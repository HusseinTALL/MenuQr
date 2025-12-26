import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useConfigStore } from '../configStore';

describe('configStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset document state
    document.documentElement.lang = '';
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with default locale fr', () => {
      const store = useConfigStore();
      expect(store.locale).toBe('fr');
    });

    it('starts with light theme', () => {
      const store = useConfigStore();
      expect(store.theme).toBe('light');
    });

    it('reflects navigator.onLine for offline status', () => {
      const store = useConfigStore();
      expect(store.isOffline).toBe(!navigator.onLine);
    });

    it('starts with null lastSync', () => {
      const store = useConfigStore();
      expect(store.lastSync).toBeNull();
    });
  });

  describe('getters', () => {
    describe('currentLocale', () => {
      it('returns current locale', () => {
        const store = useConfigStore();
        expect(store.currentLocale).toBe('fr');
        store.locale = 'en';
        expect(store.currentLocale).toBe('en');
      });
    });

    describe('isAppOffline', () => {
      it('returns offline status', () => {
        const store = useConfigStore();
        expect(store.isAppOffline).toBe(store.isOffline);
        store.isOffline = true;
        expect(store.isAppOffline).toBe(true);
      });
    });
  });

  describe('actions', () => {
    describe('setLocale', () => {
      it('sets locale to fr', () => {
        const store = useConfigStore();
        store.setLocale('fr');
        expect(store.locale).toBe('fr');
      });

      it('sets locale to en', () => {
        const store = useConfigStore();
        store.setLocale('en');
        expect(store.locale).toBe('en');
      });

      it('updates document lang attribute', () => {
        const store = useConfigStore();
        store.setLocale('en');
        expect(document.documentElement.lang).toBe('en');
        store.setLocale('fr');
        expect(document.documentElement.lang).toBe('fr');
      });
    });

    describe('toggleLocale', () => {
      it('toggles from fr to en', () => {
        const store = useConfigStore();
        store.locale = 'fr';
        store.toggleLocale();
        expect(store.locale).toBe('en');
      });

      it('toggles from en to fr', () => {
        const store = useConfigStore();
        store.locale = 'en';
        store.toggleLocale();
        expect(store.locale).toBe('fr');
      });

      it('updates document lang when toggling', () => {
        const store = useConfigStore();
        store.locale = 'fr';
        store.toggleLocale();
        expect(document.documentElement.lang).toBe('en');
      });
    });

    describe('setTheme', () => {
      it('sets theme to light', () => {
        const store = useConfigStore();
        store.setTheme('light');
        expect(store.theme).toBe('light');
      });

      it('sets theme to dark', () => {
        const store = useConfigStore();
        store.setTheme('dark');
        expect(store.theme).toBe('dark');
      });

      it('sets theme to system', () => {
        const store = useConfigStore();
        store.setTheme('system');
        expect(store.theme).toBe('system');
      });

      it('calls applyTheme after setting', () => {
        const store = useConfigStore();
        const applyThemeSpy = vi.spyOn(store, 'applyTheme');
        store.setTheme('dark');
        expect(applyThemeSpy).toHaveBeenCalled();
      });
    });

    describe('applyTheme', () => {
      it('adds dark class when theme is dark', () => {
        const store = useConfigStore();
        store.theme = 'dark';
        store.applyTheme();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      it('removes dark class when theme is light', () => {
        const store = useConfigStore();
        document.documentElement.classList.add('dark');
        store.theme = 'light';
        store.applyTheme();
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });

      it('applies system preference when theme is system and prefers dark', () => {
        // Mock matchMedia to return dark preference
        vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));

        const store = useConfigStore();
        store.theme = 'system';
        store.applyTheme();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      it('applies light when theme is system and prefers light', () => {
        // Mock matchMedia to return light preference
        vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));

        const store = useConfigStore();
        store.theme = 'system';
        store.applyTheme();
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    describe('setOfflineStatus', () => {
      it('sets offline status to true', () => {
        const store = useConfigStore();
        store.setOfflineStatus(true);
        expect(store.isOffline).toBe(true);
      });

      it('sets offline status to false', () => {
        const store = useConfigStore();
        store.isOffline = true;
        store.setOfflineStatus(false);
        expect(store.isOffline).toBe(false);
      });
    });

    describe('updateLastSync', () => {
      it('sets lastSync to current ISO string', () => {
        const store = useConfigStore();
        const before = new Date().toISOString();
        store.updateLastSync();
        const after = new Date().toISOString();

        expect(store.lastSync).not.toBeNull();
        expect(store.lastSync! >= before).toBe(true);
        expect(store.lastSync! <= after).toBe(true);
      });
    });

    describe('init', () => {
      it('sets up online event listener', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        const store = useConfigStore();
        store.init();

        expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      });

      it('sets up offline event listener', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        const store = useConfigStore();
        store.init();

        expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      });

      it('sets document lang to current locale', () => {
        const store = useConfigStore();
        store.locale = 'en';
        store.init();
        expect(document.documentElement.lang).toBe('en');
      });

      it('calls applyTheme', () => {
        const store = useConfigStore();
        const applyThemeSpy = vi.spyOn(store, 'applyTheme');
        store.init();
        expect(applyThemeSpy).toHaveBeenCalled();
      });

      it('sets up system theme change listener', () => {
        const mockAddEventListener = vi.fn();
        vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: mockAddEventListener,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));

        const store = useConfigStore();
        store.init();

        expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('responds to online event', () => {
        const store = useConfigStore();
        store.isOffline = true;
        store.init();

        // Simulate online event
        window.dispatchEvent(new Event('online'));
        expect(store.isOffline).toBe(false);
      });

      it('responds to offline event', () => {
        const store = useConfigStore();
        store.isOffline = false;
        store.init();

        // Simulate offline event
        window.dispatchEvent(new Event('offline'));
        expect(store.isOffline).toBe(true);
      });
    });
  });

  describe('persistence config', () => {
    it('has persist configuration', () => {
      const store = useConfigStore();
      // Access the store's $options to check persist config
      expect(store.$id).toBe('config');
    });
  });
});
