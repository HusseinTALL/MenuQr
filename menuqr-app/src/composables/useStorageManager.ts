import { ref, computed, onMounted } from 'vue';
import { STORES, initDB, clearStore } from '@/services/indexedDB';

/**
 * Storage usage statistics
 */
interface StorageStats {
  quota: number; // Total available storage in bytes
  usage: number; // Current usage in bytes
  percentage: number; // Usage percentage (0-100)
  available: number; // Available storage in bytes
}

/**
 * Cache entry information
 */
interface CacheInfo {
  name: string;
  size: number;
  entries: number;
  lastAccessed?: Date;
}

/**
 * Storage Manager Configuration
 */
interface StorageManagerConfig {
  // Warning threshold (percentage)
  quotaWarningThreshold?: number;
  // Critical threshold (percentage)
  quotaCriticalThreshold?: number;
  // Auto-cleanup when critical
  autoCleanup?: boolean;
  // Max age for cache entries in ms (default: 7 days)
  maxCacheAge?: number;
}

const DEFAULT_CONFIG: Required<StorageManagerConfig> = {
  quotaWarningThreshold: 80,
  quotaCriticalThreshold: 95,
  autoCleanup: true,
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Cache version for invalidation
const CACHE_VERSION = 'v1.0.0';
const SW_CACHE_PREFIX = 'menuqr-';

/**
 * Composable for managing browser storage (Cache API, IndexedDB, localStorage)
 * Provides monitoring, cleanup, and quota management
 */
export function useStorageManager(config: StorageManagerConfig = {}) {
  const options = { ...DEFAULT_CONFIG, ...config };

  // Reactive state
  const storageStats = ref<StorageStats | null>(null);
  const cacheInfos = ref<CacheInfo[]>([]);
  const isLoading = ref(false);
  const lastCleanup = ref<Date | null>(null);
  const error = ref<string | null>(null);

  // Computed
  const isQuotaWarning = computed(() => {
    if (!storageStats.value) {
      return false;
    }
    return storageStats.value.percentage >= options.quotaWarningThreshold;
  });

  const isQuotaCritical = computed(() => {
    if (!storageStats.value) {
      return false;
    }
    return storageStats.value.percentage >= options.quotaCriticalThreshold;
  });

  const formattedUsage = computed(() => {
    if (!storageStats.value) {
      return '0 B';
    }
    return formatBytes(storageStats.value.usage);
  });

  const formattedQuota = computed(() => {
    if (!storageStats.value) {
      return '0 B';
    }
    return formatBytes(storageStats.value.quota);
  });

  const formattedAvailable = computed(() => {
    if (!storageStats.value) {
      return '0 B';
    }
    return formatBytes(storageStats.value.available);
  });

  /**
   * Format bytes to human readable string
   */
  function formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get storage estimation using Storage API
   */
  async function getStorageEstimate(): Promise<StorageStats | null> {
    if (!navigator.storage || !navigator.storage.estimate) {
      console.warn('[StorageManager] Storage API not supported');
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;

      return {
        quota,
        usage,
        percentage: quota > 0 ? Math.round((usage / quota) * 100) : 0,
        available: quota - usage,
      };
    } catch (err) {
      console.error('[StorageManager] Failed to get storage estimate:', err);
      return null;
    }
  }

  /**
   * Get information about all Service Worker caches
   */
  async function getCacheInfos(): Promise<CacheInfo[]> {
    if (!('caches' in window)) {
      return [];
    }

    try {
      const cacheNames = await caches.keys();
      const infos: CacheInfo[] = [];

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();

        // Estimate size (rough approximation)
        let size = 0;
        for (const request of keys.slice(0, 50)) {
          // Sample first 50
          try {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.clone().blob();
              size += blob.size;
            }
          } catch {
            // Ignore errors for individual entries
          }
        }

        // Extrapolate if we sampled
        if (keys.length > 50) {
          size = Math.round((size / 50) * keys.length);
        }

        infos.push({
          name,
          size,
          entries: keys.length,
        });
      }

      return infos;
    } catch (err) {
      console.error('[StorageManager] Failed to get cache infos:', err);
      return [];
    }
  }

  /**
   * Refresh storage statistics
   */
  async function refreshStats(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const [stats, caches] = await Promise.all([getStorageEstimate(), getCacheInfos()]);

      storageStats.value = stats;
      cacheInfos.value = caches;

      // Auto cleanup if critical
      if (isQuotaCritical.value && options.autoCleanup) {
        console.warn('[StorageManager] Storage critical, triggering cleanup');
        await cleanupOldCaches();
      }
    } catch (err) {
      error.value = 'Erreur lors de la vérification du stockage';
      console.error('[StorageManager] Refresh failed:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Delete a specific cache by name
   */
  async function deleteCache(cacheName: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const result = await caches.delete(cacheName);
      if (result) {
        console.info(`[StorageManager] Deleted cache: ${cacheName}`);
        await refreshStats();
      }
      return result;
    } catch (err) {
      console.error(`[StorageManager] Failed to delete cache ${cacheName}:`, err);
      return false;
    }
  }

  /**
   * Clean up old and outdated caches
   */
  async function cleanupOldCaches(): Promise<number> {
    if (!('caches' in window)) {
      return 0;
    }

    let deletedCount = 0;

    try {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        // Delete old versioned caches (workbox pattern)
        if (cacheName.startsWith(SW_CACHE_PREFIX) && !cacheName.includes(CACHE_VERSION)) {
          const deleted = await caches.delete(cacheName);
          if (deleted) {
            deletedCount++;
            console.info(`[StorageManager] Cleaned old cache: ${cacheName}`);
          }
        }

        // Delete stale caches based on size/entries
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        // If cache is empty or very large, consider cleaning
        if (keys.length > 500) {
          // Clean oldest entries (keep newest 300)
          const toDelete = keys.slice(0, keys.length - 300);
          for (const request of toDelete) {
            await cache.delete(request);
          }
          console.info(`[StorageManager] Cleaned ${toDelete.length} old entries from ${cacheName}`);
        }
      }

      lastCleanup.value = new Date();
      await refreshStats();

      return deletedCount;
    } catch (err) {
      console.error('[StorageManager] Cleanup failed:', err);
      return 0;
    }
  }

  /**
   * Clear all caches (nuclear option)
   */
  async function clearAllCaches(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.info('[StorageManager] All caches cleared');

      await refreshStats();
    } catch (err) {
      console.error('[StorageManager] Failed to clear all caches:', err);
    }
  }

  /**
   * Clear IndexedDB data
   */
  async function clearIndexedDB(): Promise<void> {
    try {
      await initDB();
      await clearStore(STORES.MENU);
      await clearStore(STORES.METADATA);
      console.info('[StorageManager] IndexedDB cleared');

      await refreshStats();
    } catch (err) {
      console.error('[StorageManager] Failed to clear IndexedDB:', err);
    }
  }

  /**
   * Clear localStorage (excluding critical data)
   */
  function clearLocalStorage(keepCritical = true): void {
    if (keepCritical) {
      // Preserve cart and user preferences
      const criticalKeys = ['menuqr-cart', 'menuqr-config'];
      const preserved: Record<string, string | null> = {};

      criticalKeys.forEach((key) => {
        preserved[key] = localStorage.getItem(key);
      });

      localStorage.clear();

      Object.entries(preserved).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
        }
      });
    } else {
      localStorage.clear();
    }

    console.info('[StorageManager] localStorage cleared');
  }

  /**
   * Clear all storage (IndexedDB, Cache API, localStorage)
   */
  async function clearAllStorage(keepCritical = true): Promise<void> {
    isLoading.value = true;

    try {
      await Promise.all([clearAllCaches(), clearIndexedDB()]);
      clearLocalStorage(keepCritical);

      console.info('[StorageManager] All storage cleared');
    } finally {
      isLoading.value = false;
      await refreshStats();
    }
  }

  /**
   * Request persistent storage
   */
  async function requestPersistence(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.persist) {
      console.warn('[StorageManager] Persistence API not supported');
      return false;
    }

    try {
      const isPersisted = await navigator.storage.persist();
      console.info(`[StorageManager] Storage persistence: ${isPersisted ? 'granted' : 'denied'}`);
      return isPersisted;
    } catch (err) {
      console.error('[StorageManager] Failed to request persistence:', err);
      return false;
    }
  }

  /**
   * Check if storage is persisted
   */
  async function isPersisted(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.persisted) {
      return false;
    }

    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }

  /**
   * Get localStorage size estimate
   */
  function getLocalStorageSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        const value = localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    }
    // Multiply by 2 for UTF-16 encoding
    return total * 2;
  }

  /**
   * Get detailed storage breakdown
   */
  async function getStorageBreakdown(): Promise<{
    cacheApi: number;
    indexedDb: number;
    localStorage: number;
    total: number;
  }> {
    const caches = await getCacheInfos();
    const cacheApiSize = caches.reduce((sum, c) => sum + c.size, 0);
    const localStorageSize = getLocalStorageSize();

    // IndexedDB size is included in the storage estimate
    const estimate = await getStorageEstimate();
    const estimatedIndexedDb = (estimate?.usage || 0) - cacheApiSize - localStorageSize;

    return {
      cacheApi: cacheApiSize,
      indexedDb: Math.max(0, estimatedIndexedDb),
      localStorage: localStorageSize,
      total: estimate?.usage || 0,
    };
  }

  // Initialize on mount
  onMounted(() => {
    refreshStats();
  });

  return {
    // State
    storageStats,
    cacheInfos,
    isLoading,
    lastCleanup,
    error,

    // Computed
    isQuotaWarning,
    isQuotaCritical,
    formattedUsage,
    formattedQuota,
    formattedAvailable,

    // Actions
    refreshStats,
    deleteCache,
    cleanupOldCaches,
    clearAllCaches,
    clearIndexedDB,
    clearLocalStorage,
    clearAllStorage,
    requestPersistence,
    isPersisted,
    getStorageBreakdown,
    formatBytes,
  };
}

/**
 * Service Worker cache utilities
 */
export const swCacheUtils = {
  /**
   * Precache critical assets
   */
  async precacheCritical(urls: string[]): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cache = await caches.open(`${SW_CACHE_PREFIX}critical-${CACHE_VERSION}`);
      await cache.addAll(urls);
      console.info(`[StorageManager] Precached ${urls.length} critical assets`);
    } catch (err) {
      console.error('[StorageManager] Precache failed:', err);
    }
  },

  /**
   * Check if an asset is cached
   */
  async isCached(url: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const response = await caches.match(url);
      return !!response;
    } catch {
      return false;
    }
  },

  /**
   * Get cached response
   */
  async getCached(url: string): Promise<Response | undefined> {
    if (!('caches' in window)) {
      return undefined;
    }

    try {
      return await caches.match(url);
    } catch {
      return undefined;
    }
  },

  /**
   * Add a single URL to cache
   */
  async addToCache(
    url: string,
    cacheName = `${SW_CACHE_PREFIX}runtime-${CACHE_VERSION}`
  ): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cache = await caches.open(cacheName);
      await cache.add(url);
      return true;
    } catch (err) {
      console.error(`[StorageManager] Failed to cache ${url}:`, err);
      return false;
    }
  },
};
