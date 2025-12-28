/**
 * Redis Configuration for Real-Time Features
 * Used for live GPS tracking, caching, and pub/sub
 */

import { createClient } from 'redis';
import config from './env.js';
import logger from '../utils/logger.js';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<RedisClient | null> {
  if (!config.redisUrl) {
    logger.warn('Redis URL not configured, live tracking features will be disabled');
    return null;
  }

  try {
    redisClient = createClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis connecting...');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('Redis connected and ready');
    });

    redisClient.on('error', (error: Error) => {
      logger.error('Redis error:', error);
    });

    redisClient.on('end', () => {
      isConnected = false;
      logger.info('Redis connection closed');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClient | null {
  return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('Redis connection closed gracefully');
  }
}

// Key prefixes for different data types
export const REDIS_KEYS = {
  DRIVER_LOCATION: 'driver:location:',
  DRIVER_STATUS: 'driver:status:',
  DELIVERY_TRACKING: 'delivery:tracking:',
  ACTIVE_DELIVERIES: 'active:deliveries',
  DRIVER_ACTIVE_DELIVERY: 'driver:active:',
} as const;

// TTL values in seconds
export const REDIS_TTL = {
  DRIVER_LOCATION: 300, // 5 minutes - location expires if no update
  DRIVER_STATUS: 3600, // 1 hour
  DELIVERY_TRACKING: 86400, // 24 hours
} as const;

export default {
  initializeRedis,
  getRedisClient,
  isRedisConnected,
  closeRedis,
  REDIS_KEYS,
  REDIS_TTL,
};
