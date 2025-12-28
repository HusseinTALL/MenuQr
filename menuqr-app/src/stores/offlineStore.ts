import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  initDB,
  getValue,
  setValue,
  clearStore,
  STORES,
  isIndexedDBSupported,
} from '@/services/indexedDB';
import type { MenuData } from '@/types';

interface MenuCacheData {
  id: string;
  data: MenuData;
  timestamp: number;
  version: string;
}

interface SyncMetadata {
  key: string;
  lastSync: number;
  version: string;
}

const MENU_CACHE_KEY = 'cached-menu';
const SYNC_METADATA_KEY = 'sync-metadata';
const CACHE_VERSION = '1.0.0';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export const useOfflineStore = defineStore('offline', () => {
  // State
  const isInitialized = ref(false);
  const lastSyncTime = ref<number | null>(null);
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);
  const cachedMenuAvailable = ref(false);

  // Getters
  const lastSyncDate = computed(() => {
    if (!lastSyncTime.value) {
      return null;
    }
    return new Date(lastSyncTime.value);
  });

  const lastSyncFormatted = computed(() => {
    if (!lastSyncDate.value) {
      return null;
    }

    const now = new Date();
    const diff = now.getTime() - lastSyncDate.value.getTime();

    // Less than 1 minute
    if (diff < 60 * 1000) {
      return "À l'instant";
    }

    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `Il y a ${minutes} min`;
    }

    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `Il y a ${hours}h`;
    }

    // More than 24 hours
    return lastSyncDate.value.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  const isCacheStale = computed(() => {
    if (!lastSyncTime.value) {
      return true;
    }
    return Date.now() - lastSyncTime.value > CACHE_MAX_AGE;
  });

  // Actions
  async function initialize() {
    if (!isIndexedDBSupported()) {
      console.warn('[OfflineStore] IndexedDB not supported');
      isInitialized.value = true;
      return;
    }

    try {
      await initDB();

      // Load sync metadata
      const metadata = await getValue<SyncMetadata>(STORES.METADATA, SYNC_METADATA_KEY);
      if (metadata) {
        lastSyncTime.value = metadata.lastSync;
      }

      // Check if we have cached menu
      const cachedMenu = await getValue<MenuCacheData>(STORES.MENU, MENU_CACHE_KEY);
      cachedMenuAvailable.value = !!cachedMenu;

      isInitialized.value = true;
      console.info('[OfflineStore] Initialized successfully');
    } catch (_error) {
      console.error('[OfflineStore] Failed to initialize:');
      isInitialized.value = true;
    }
  }

  async function cacheMenu(menuData: MenuData): Promise<void> {
    if (!isIndexedDBSupported()) {
      return;
    }

    try {
      isSyncing.value = true;
      syncError.value = null;

      const cacheData: MenuCacheData = {
        id: MENU_CACHE_KEY,
        data: menuData,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };

      await setValue(STORES.MENU, cacheData);

      // Update sync metadata
      const metadata: SyncMetadata = {
        key: SYNC_METADATA_KEY,
        lastSync: Date.now(),
        version: CACHE_VERSION,
      };
      await setValue(STORES.METADATA, metadata);

      lastSyncTime.value = metadata.lastSync;
      cachedMenuAvailable.value = true;

      console.info('[OfflineStore] Menu cached successfully');
    } catch (_error) {
      console.error('[OfflineStore] Failed to cache menu:');
      syncError.value = 'Échec de la mise en cache du menu';
    } finally {
      isSyncing.value = false;
    }
  }

  async function getCachedMenu(): Promise<MenuData | null> {
    if (!isIndexedDBSupported()) {
      return null;
    }

    try {
      const cachedData = await getValue<MenuCacheData>(STORES.MENU, MENU_CACHE_KEY);

      if (!cachedData) {
        console.info('[OfflineStore] No cached menu found');
        return null;
      }

      // Check version compatibility
      if (cachedData.version !== CACHE_VERSION) {
        console.info('[OfflineStore] Cache version mismatch, ignoring cached data');
        return null;
      }

      console.info('[OfflineStore] Retrieved cached menu from', new Date(cachedData.timestamp));
      return cachedData.data;
    } catch (_error) {
      console.error('[OfflineStore] Failed to get cached menu:');
      return null;
    }
  }

  async function clearCache(): Promise<void> {
    if (!isIndexedDBSupported()) {
      return;
    }

    try {
      await clearStore(STORES.MENU);
      await clearStore(STORES.METADATA);

      lastSyncTime.value = null;
      cachedMenuAvailable.value = false;

      console.info('[OfflineStore] Cache cleared');
    } catch (_error) {
      console.error('[OfflineStore] Failed to clear cache:');
    }
  }

  return {
    // State
    isInitialized,
    lastSyncTime,
    isSyncing,
    syncError,
    cachedMenuAvailable,

    // Getters
    lastSyncDate,
    lastSyncFormatted,
    isCacheStale,

    // Actions
    initialize,
    cacheMenu,
    getCachedMenu,
    clearCache,
  };
});
