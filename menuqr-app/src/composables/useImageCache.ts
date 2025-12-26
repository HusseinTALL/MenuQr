import { ref } from 'vue';
import {
  STORES,
  CACHE_TTL,
  setValueWithExpiry,
  getValueWithExpiry,
  cleanExpiredEntries,
  cleanLRUEntries,
  isIndexedDBSupported,
  initDB,
} from '@/services/indexedDB';

/**
 * Cached image data
 */
interface CachedImage {
  url: string;
  blob: Blob;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * Image cache statistics
 */
interface ImageCacheStats {
  totalCached: number;
  totalSize: number;
  hitRate: number;
}

// In-memory cache for quick access
const memoryCache = new Map<string, string>();

// Stats
let cacheHits = 0;
let cacheMisses = 0;

// Max images to keep in IndexedDB
const MAX_CACHED_IMAGES = 100;

// Max size for a single image (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Composable for caching dish images in IndexedDB
 * Provides offline access to previously viewed images
 */
export function useImageCache() {
  const isInitialized = ref(false);
  const isCaching = ref(false);
  const error = ref<string | null>(null);

  /**
   * Initialize the image cache
   */
  async function initialize(): Promise<void> {
    if (!isIndexedDBSupported()) {
      console.warn('[ImageCache] IndexedDB not supported');
      isInitialized.value = true;
      return;
    }

    try {
      await initDB();
      isInitialized.value = true;
      console.info('[ImageCache] Initialized');

      // Clean expired images in background
      cleanExpiredEntries(STORES.IMAGES).catch(() => {});
    } catch (err) {
      console.error('[ImageCache] Initialization failed:', err);
      error.value = "Échec de l'initialisation du cache d'images";
    }
  }

  /**
   * Generate a cache key from URL
   */
  function getCacheKey(url: string): string {
    // Create a hash-like key from the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `img_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Fetch and cache an image
   */
  async function cacheImage(url: string): Promise<string | null> {
    if (!isIndexedDBSupported() || !url) {
      return null;
    }

    const cacheKey = getCacheKey(url);

    // Check memory cache first
    if (memoryCache.has(cacheKey)) {
      cacheHits++;
      return memoryCache.get(cacheKey) || null;
    }

    // Check IndexedDB cache
    try {
      const cached = await getValueWithExpiry<CachedImage>(STORES.IMAGES, cacheKey);

      if (cached) {
        cacheHits++;
        const objectUrl = URL.createObjectURL(cached.blob);
        memoryCache.set(cacheKey, objectUrl);
        return objectUrl;
      }
    } catch {
      // Continue to fetch
    }

    // Fetch the image
    cacheMisses++;
    isCaching.value = true;

    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      // Skip if too large
      if (blob.size > MAX_IMAGE_SIZE) {
        console.info(`[ImageCache] Image too large to cache: ${blob.size} bytes`);
        return url;
      }

      // Get image dimensions if possible
      let width: number | undefined;
      let height: number | undefined;

      if (blob.type.startsWith('image/')) {
        try {
          const img = await createImageBitmap(blob);
          width = img.width;
          height = img.height;
          img.close();
        } catch {
          // Ignore dimension errors
        }
      }

      // Store in IndexedDB
      const cacheData: CachedImage = {
        url,
        blob,
        mimeType: blob.type,
        width,
        height,
      };

      await setValueWithExpiry(STORES.IMAGES, cacheKey, cacheData, CACHE_TTL.IMAGES);

      // Cleanup if we have too many images
      await cleanLRUEntries(STORES.IMAGES, MAX_CACHED_IMAGES);

      // Create object URL for immediate use
      const objectUrl = URL.createObjectURL(blob);
      memoryCache.set(cacheKey, objectUrl);

      return objectUrl;
    } catch (err) {
      console.error('[ImageCache] Failed to cache image:', err);
      return url; // Fall back to original URL
    } finally {
      isCaching.value = false;
    }
  }

  /**
   * Get a cached image (memory or IndexedDB)
   */
  async function getCachedImage(url: string): Promise<string | null> {
    if (!url) {
      return null;
    }

    const cacheKey = getCacheKey(url);

    // Check memory cache first
    if (memoryCache.has(cacheKey)) {
      cacheHits++;
      return memoryCache.get(cacheKey) || null;
    }

    // Check IndexedDB
    if (isIndexedDBSupported()) {
      try {
        const cached = await getValueWithExpiry<CachedImage>(STORES.IMAGES, cacheKey);

        if (cached) {
          cacheHits++;
          const objectUrl = URL.createObjectURL(cached.blob);
          memoryCache.set(cacheKey, objectUrl);
          return objectUrl;
        }
      } catch {
        // Fall through
      }
    }

    cacheMisses++;
    return null;
  }

  /**
   * Check if an image is cached
   */
  async function isImageCached(url: string): Promise<boolean> {
    if (!url) {
      return false;
    }

    const cacheKey = getCacheKey(url);

    if (memoryCache.has(cacheKey)) {
      return true;
    }

    if (isIndexedDBSupported()) {
      try {
        const cached = await getValueWithExpiry<CachedImage>(STORES.IMAGES, cacheKey, false);
        return !!cached;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Preload and cache multiple images
   */
  async function preloadImages(urls: string[]): Promise<void> {
    const validUrls = urls.filter((url) => url && !memoryCache.has(getCacheKey(url)));

    await Promise.all(validUrls.map((url) => cacheImage(url).catch(() => null)));
  }

  /**
   * Clear all cached images
   */
  async function clearImageCache(): Promise<void> {
    // Clear memory cache
    memoryCache.forEach((url) => URL.revokeObjectURL(url));
    memoryCache.clear();

    // Clear IndexedDB
    if (isIndexedDBSupported()) {
      try {
        const { clearStore } = await import('@/services/indexedDB');
        await clearStore(STORES.IMAGES);
        console.info('[ImageCache] Cache cleared');
      } catch (err) {
        console.error('[ImageCache] Failed to clear cache:', err);
      }
    }

    // Reset stats
    cacheHits = 0;
    cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  function getCacheStats(): ImageCacheStats {
    const total = cacheHits + cacheMisses;
    return {
      totalCached: memoryCache.size,
      totalSize: 0, // Would need to calculate from IndexedDB
      hitRate: total > 0 ? Math.round((cacheHits / total) * 100) : 0,
    };
  }

  /**
   * Cleanup expired images
   */
  async function cleanupExpired(): Promise<number> {
    if (!isIndexedDBSupported()) {
      return 0;
    }

    try {
      return await cleanExpiredEntries(STORES.IMAGES);
    } catch (err) {
      console.error('[ImageCache] Cleanup failed:', err);
      return 0;
    }
  }

  return {
    // State
    isInitialized,
    isCaching,
    error,

    // Actions
    initialize,
    cacheImage,
    getCachedImage,
    isImageCached,
    preloadImages,
    clearImageCache,
    cleanupExpired,
    getCacheStats,
  };
}

/**
 * Create a singleton instance for global use
 */
let imageCacheInstance: ReturnType<typeof useImageCache> | null = null;

export function getImageCache(): ReturnType<typeof useImageCache> {
  if (!imageCacheInstance) {
    imageCacheInstance = useImageCache();
  }
  return imageCacheInstance;
}
