/**
 * IndexedDB Service for offline data storage
 * Provides a simple API for storing and retrieving data offline
 * with cache expiration and quota management
 */

const DB_NAME = 'menuqr-db';
const DB_VERSION = 2; // Bumped for new stores

// Store names
export const STORES = {
  MENU: 'menu',
  METADATA: 'metadata',
  IMAGES: 'images',
  CACHE_STATS: 'cache_stats',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// Cache expiration defaults (in milliseconds)
export const CACHE_TTL = {
  MENU: 24 * 60 * 60 * 1000, // 24 hours
  IMAGES: 7 * 24 * 60 * 60 * 1000, // 7 days
  METADATA: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

let db: IDBDatabase | null = null;

/**
 * Cache entry wrapper with metadata
 */
export interface CacheEntry<T> {
  id: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  size?: number;
  accessCount?: number;
  lastAccessed?: number;
}

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) {
    return db;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.info('[IndexedDB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      console.info(`[IndexedDB] Upgrading from version ${oldVersion} to ${DB_VERSION}`);

      // Create menu store
      if (!database.objectStoreNames.contains(STORES.MENU)) {
        database.createObjectStore(STORES.MENU, { keyPath: 'id' });
        console.info('[IndexedDB] Created menu store');
      }

      // Create metadata store for sync info
      if (!database.objectStoreNames.contains(STORES.METADATA)) {
        database.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        console.info('[IndexedDB] Created metadata store');
      }

      // New in v2: Images store with indexes
      if (!database.objectStoreNames.contains(STORES.IMAGES)) {
        const imagesStore = database.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
        imagesStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        imagesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        console.info('[IndexedDB] Created images store with indexes');
      }

      // New in v2: Cache stats store
      if (!database.objectStoreNames.contains(STORES.CACHE_STATS)) {
        database.createObjectStore(STORES.CACHE_STATS, { keyPath: 'key' });
        console.info('[IndexedDB] Created cache_stats store');
      }
    };
  });
}

/**
 * Get a value from a store
 */
export async function getValue<T>(storeName: StoreName, key: string): Promise<T | null> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => {
      console.error(`[IndexedDB] Failed to get ${key} from ${storeName}:`, request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * Set a value in a store
 */
export async function setValue<T extends { id?: string; key?: string }>(
  storeName: StoreName,
  value: T
): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onerror = () => {
      console.error(`[IndexedDB] Failed to set value in ${storeName}:`, request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Get all values from a store
 */
export async function getAllValues<T>(storeName: StoreName): Promise<T[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => {
      console.error(`[IndexedDB] Failed to get all from ${storeName}:`, request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

/**
 * Delete a value from a store
 */
export async function deleteValue(storeName: StoreName, key: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => {
      console.error(`[IndexedDB] Failed to delete ${key} from ${storeName}:`, request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Clear all values from a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => {
      console.error(`[IndexedDB] Failed to clear ${storeName}:`, request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  return 'indexedDB' in window;
}

/**
 * Set a value with expiration
 */
export async function setValueWithExpiry<T>(
  storeName: StoreName,
  key: string,
  data: T,
  ttl: number = CACHE_TTL.MENU
): Promise<void> {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    id: key,
    data,
    timestamp: now,
    expiresAt: now + ttl,
    lastAccessed: now,
    accessCount: 1,
  };

  await setValue(storeName, entry);
}

/**
 * Get a value, checking for expiration
 * Returns null if expired (and optionally deletes the entry)
 */
export async function getValueWithExpiry<T>(
  storeName: StoreName,
  key: string,
  deleteIfExpired = true
): Promise<T | null> {
  const entry = await getValue<CacheEntry<T>>(storeName, key);

  if (!entry) {
    return null;
  }

  const now = Date.now();

  // Check if expired
  if (entry.expiresAt && entry.expiresAt < now) {
    console.info(`[IndexedDB] Cache entry expired: ${key}`);
    if (deleteIfExpired) {
      await deleteValue(storeName, key);
    }
    return null;
  }

  // Update access stats
  entry.lastAccessed = now;
  entry.accessCount = (entry.accessCount || 0) + 1;

  // Update in background (don't await)
  setValue(storeName, entry).catch(() => {});

  return entry.data;
}

/**
 * Clean expired entries from a store
 */
export async function cleanExpiredEntries(storeName: StoreName): Promise<number> {
  const database = await initDB();
  const now = Date.now();
  let deletedCount = 0;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Try to use index if available (for images store)
    let request: IDBRequest;
    if (store.indexNames.contains('expiresAt')) {
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      request = index.openCursor(range);
    } else {
      request = store.openCursor();
    }

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const entry = cursor.value as CacheEntry<unknown>;

        // Check if this entry is expired
        if (entry.expiresAt && entry.expiresAt < now) {
          cursor.delete();
          deletedCount++;
        }

        cursor.continue();
      }
    };

    transaction.oncomplete = () => {
      if (deletedCount > 0) {
        console.info(`[IndexedDB] Cleaned ${deletedCount} expired entries from ${storeName}`);
      }
      resolve(deletedCount);
    };

    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Clean least recently used entries when storage is full
 * @param storeName Store to clean
 * @param maxEntries Maximum entries to keep
 */
export async function cleanLRUEntries(storeName: StoreName, maxEntries: number): Promise<number> {
  const database = await initDB();
  let deletedCount = 0;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const countRequest = store.count();

    countRequest.onsuccess = async () => {
      const count = countRequest.result;

      if (count <= maxEntries) {
        resolve(0);
        return;
      }

      const toDelete = count - maxEntries;

      // Get entries sorted by lastAccessed
      let request: IDBRequest;
      if (store.indexNames.contains('lastAccessed')) {
        const index = store.index('lastAccessed');
        request = index.openCursor();
      } else {
        request = store.openCursor();
      }

      let deleted = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && deleted < toDelete) {
          cursor.delete();
          deleted++;
          deletedCount++;
          cursor.continue();
        }
      };
    };

    transaction.oncomplete = () => {
      if (deletedCount > 0) {
        console.info(`[IndexedDB] Cleaned ${deletedCount} LRU entries from ${storeName}`);
      }
      resolve(deletedCount);
    };

    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get store statistics
 */
export async function getStoreStats(storeName: StoreName): Promise<{
  count: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  expiredCount: number;
}> {
  const database = await initDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const countRequest = store.count();
    const getAllRequest = store.getAll();

    const result = {
      count: 0,
      oldestEntry: undefined as Date | undefined,
      newestEntry: undefined as Date | undefined,
      expiredCount: 0,
    };

    countRequest.onsuccess = () => {
      result.count = countRequest.result;
    };

    getAllRequest.onsuccess = () => {
      const entries = getAllRequest.result as CacheEntry<unknown>[];

      if (entries.length > 0) {
        const timestamps = entries.filter((e) => e.timestamp).map((e) => e.timestamp);

        if (timestamps.length > 0) {
          result.oldestEntry = new Date(Math.min(...timestamps));
          result.newestEntry = new Date(Math.max(...timestamps));
        }

        result.expiredCount = entries.filter((e) => e.expiresAt && e.expiresAt < now).length;
      }
    };

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Estimate IndexedDB storage usage
 */
export async function estimateStorageUsage(): Promise<number> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return 0;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  } catch {
    return 0;
  }
}

/**
 * Clean all expired entries from all stores
 */
export async function cleanAllExpiredEntries(): Promise<number> {
  let totalCleaned = 0;

  for (const storeName of Object.values(STORES)) {
    try {
      const cleaned = await cleanExpiredEntries(storeName);
      totalCleaned += cleaned;
    } catch (err) {
      console.error(`[IndexedDB] Failed to clean ${storeName}:`, err);
    }
  }

  return totalCleaned;
}
