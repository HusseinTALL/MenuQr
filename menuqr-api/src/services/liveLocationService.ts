/**
 * Live Location Service
 * Handles real-time GPS tracking for delivery drivers using Redis
 */

import { getRedisClient, isRedisConnected, REDIS_KEYS, REDIS_TTL } from '../config/redis.js';
import * as socketService from './socketService.js';
import logger from '../utils/logger.js';
import Delivery from '../models/Delivery.js';

// Types
export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number; // Direction in degrees (0-360)
  speed?: number; // Speed in km/h
  accuracy?: number; // GPS accuracy in meters
  timestamp: number;
}

export interface DeliveryTrackingInfo {
  deliveryId: string;
  driverId: string;
  status: string;
  currentLocation?: DriverLocation;
  pickupLocation: {
    lat: number;
    lng: number;
  };
  deliveryLocation: {
    lat: number;
    lng: number;
  };
  estimatedArrival?: number; // Unix timestamp
  distanceRemaining?: number; // In meters
}

/**
 * Update driver's live location
 */
export async function updateDriverLocation(location: DriverLocation): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    logger.debug('Redis not available, skipping live location update');
    return false;
  }

  try {
    const key = `${REDIS_KEYS.DRIVER_LOCATION}${location.driverId}`;
    const data = JSON.stringify({
      ...location,
      timestamp: Date.now(),
    });

    await redis.setEx(key, REDIS_TTL.DRIVER_LOCATION, data);

    // Broadcast location to relevant delivery tracking rooms
    await broadcastDriverLocation(location);

    logger.debug('Driver location updated', { driverId: location.driverId });
    return true;
  } catch (error) {
    logger.error('Failed to update driver location:', error);
    return false;
  }
}

/**
 * Get driver's current location
 */
export async function getDriverLocation(driverId: string): Promise<DriverLocation | null> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    return null;
  }

  try {
    const key = `${REDIS_KEYS.DRIVER_LOCATION}${driverId}`;
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as DriverLocation;
  } catch (error) {
    logger.error('Failed to get driver location:', error);
    return null;
  }
}

/**
 * Get multiple drivers' locations
 */
export async function getMultipleDriverLocations(driverIds: string[]): Promise<Map<string, DriverLocation>> {
  const redis = getRedisClient();
  const locations = new Map<string, DriverLocation>();

  if (!redis || !isRedisConnected() || driverIds.length === 0) {
    return locations;
  }

  try {
    const keys = driverIds.map(id => `${REDIS_KEYS.DRIVER_LOCATION}${id}`);
    const results = await redis.mGet(keys);

    results.forEach((data: string | null, index: number) => {
      if (data) {
        const location = JSON.parse(data) as DriverLocation;
        locations.set(driverIds[index], location);
      }
    });

    return locations;
  } catch (error) {
    logger.error('Failed to get multiple driver locations:', error);
    return locations;
  }
}

/**
 * Set driver's active delivery for tracking
 */
export async function setDriverActiveDelivery(driverId: string, deliveryId: string): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    return false;
  }

  try {
    const key = `${REDIS_KEYS.DRIVER_ACTIVE_DELIVERY}${driverId}`;
    await redis.setEx(key, REDIS_TTL.DELIVERY_TRACKING, deliveryId);

    // Also add to active deliveries set
    await redis.sAdd(REDIS_KEYS.ACTIVE_DELIVERIES, deliveryId);

    return true;
  } catch (error) {
    logger.error('Failed to set driver active delivery:', error);
    return false;
  }
}

/**
 * Clear driver's active delivery
 */
export async function clearDriverActiveDelivery(driverId: string, deliveryId: string): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    return false;
  }

  try {
    const key = `${REDIS_KEYS.DRIVER_ACTIVE_DELIVERY}${driverId}`;
    await redis.del(key);

    // Remove from active deliveries set
    await redis.sRem(REDIS_KEYS.ACTIVE_DELIVERIES, deliveryId);

    return true;
  } catch (error) {
    logger.error('Failed to clear driver active delivery:', error);
    return false;
  }
}

/**
 * Get driver's active delivery ID
 */
export async function getDriverActiveDelivery(driverId: string): Promise<string | null> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    return null;
  }

  try {
    const key = `${REDIS_KEYS.DRIVER_ACTIVE_DELIVERY}${driverId}`;
    return await redis.get(key);
  } catch (error) {
    logger.error('Failed to get driver active delivery:', error);
    return null;
  }
}

/**
 * Store delivery tracking info
 */
export async function storeDeliveryTracking(info: DeliveryTrackingInfo): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    return false;
  }

  try {
    const key = `${REDIS_KEYS.DELIVERY_TRACKING}${info.deliveryId}`;
    await redis.setEx(key, REDIS_TTL.DELIVERY_TRACKING, JSON.stringify(info));
    return true;
  } catch (error) {
    logger.error('Failed to store delivery tracking:', error);
    return false;
  }
}

/**
 * Get delivery tracking info
 */
export async function getDeliveryTracking(deliveryId: string): Promise<DeliveryTrackingInfo | null> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    return null;
  }

  try {
    const key = `${REDIS_KEYS.DELIVERY_TRACKING}${deliveryId}`;
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as DeliveryTrackingInfo;
  } catch (error) {
    logger.error('Failed to get delivery tracking:', error);
    return null;
  }
}

/**
 * Calculate ETA based on current location and destination
 */
export function calculateETA(
  currentLat: number,
  currentLng: number,
  destLat: number,
  destLng: number,
  speedKmh: number = 30 // Default city driving speed
): { etaMinutes: number; distanceMeters: number } {
  // Haversine formula for distance
  const R = 6371000; // Earth's radius in meters
  const dLat = (destLat - currentLat) * Math.PI / 180;
  const dLng = (destLng - currentLng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(currentLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;

  // Calculate ETA (add 20% buffer for traffic/stops)
  const speedMps = (speedKmh * 1000) / 3600;
  const etaSeconds = (distanceMeters / speedMps) * 1.2;
  const etaMinutes = Math.ceil(etaSeconds / 60);

  return { etaMinutes, distanceMeters: Math.round(distanceMeters) };
}

/**
 * Broadcast driver location to tracking subscribers
 */
async function broadcastDriverLocation(location: DriverLocation): Promise<void> {
  try {
    // Find active deliveries for this driver
    const activeDeliveryId = await getDriverActiveDelivery(location.driverId);

    if (!activeDeliveryId) {
      return;
    }

    // Get delivery details to calculate ETA
    const delivery = await Delivery.findById(activeDeliveryId).lean();

    if (!delivery) {
      return;
    }

    // Calculate ETA to destination based on delivery status
    let destination: { lat: number; lng: number } | null = null;

    if (delivery.status === 'assigned' || delivery.status === 'arriving_restaurant' || delivery.status === 'at_restaurant') {
      // Heading to restaurant
      destination = delivery.pickupAddress?.coordinates || null;
    } else if (delivery.status === 'picked_up' || delivery.status === 'in_transit' || delivery.status === 'arrived') {
      // Heading to customer
      destination = delivery.deliveryAddress?.coordinates || null;
    }

    let eta: { etaMinutes: number; distanceMeters: number } | null = null;
    if (destination) {
      eta = calculateETA(
        location.lat,
        location.lng,
        destination.lat,
        destination.lng,
        location.speed || 30
      );
    }

    // Emit to delivery tracking room
    const io = socketService.getIO();
    if (io) {
      io.to(`delivery:${activeDeliveryId}`).emit('driver:location', {
        deliveryId: activeDeliveryId,
        location: {
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
          timestamp: location.timestamp,
        },
        eta: eta ? {
          minutes: eta.etaMinutes,
          distanceMeters: eta.distanceMeters,
          updatedAt: Date.now(),
        } : null,
      });

      // Also emit to order room if linked
      if (delivery.orderId) {
        const orderId = typeof delivery.orderId === 'string' ? delivery.orderId : delivery.orderId.toString();
        io.to(`order:${orderId}`).emit('delivery:location', {
          deliveryId: activeDeliveryId,
          location: {
            lat: location.lat,
            lng: location.lng,
            heading: location.heading,
          },
          eta: eta?.etaMinutes,
        });
      }
    }

    logger.debug('Broadcasted driver location', {
      driverId: location.driverId,
      deliveryId: activeDeliveryId,
      eta: eta?.etaMinutes,
    });
  } catch (error) {
    logger.error('Failed to broadcast driver location:', error);
  }
}

/**
 * Get all active delivery locations for admin view
 */
export async function getAllActiveDeliveryLocations(): Promise<DeliveryTrackingInfo[]> {
  const redis = getRedisClient();

  if (!redis || !isRedisConnected()) {
    return [];
  }

  try {
    // Get all active delivery IDs
    const deliveryIds = await redis.sMembers(REDIS_KEYS.ACTIVE_DELIVERIES);

    if (deliveryIds.length === 0) {
      return [];
    }

    // Get tracking info for each delivery
    const trackingInfos: DeliveryTrackingInfo[] = [];

    for (const deliveryId of deliveryIds) {
      const tracking = await getDeliveryTracking(deliveryId);
      if (tracking) {
        // Enrich with current driver location
        const driverLocation = await getDriverLocation(tracking.driverId);
        if (driverLocation) {
          tracking.currentLocation = driverLocation;
        }
        trackingInfos.push(tracking);
      }
    }

    return trackingInfos;
  } catch (error) {
    logger.error('Failed to get all active delivery locations:', error);
    return [];
  }
}

export default {
  updateDriverLocation,
  getDriverLocation,
  getMultipleDriverLocations,
  setDriverActiveDelivery,
  clearDriverActiveDelivery,
  getDriverActiveDelivery,
  storeDeliveryTracking,
  getDeliveryTracking,
  calculateETA,
  getAllActiveDeliveryLocations,
};
