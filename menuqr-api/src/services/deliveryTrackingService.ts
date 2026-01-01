import mongoose from 'mongoose';
import { Delivery } from '../models/Delivery.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { Order } from '../models/Order.js';
import * as socketService from './socketService.js';

// Types
interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: Date;
}

// ETAUpdate interface reserved for future real-time update features
// interface ETAUpdate { ... }

interface TrackingData {
  deliveryId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  driverName: string;
  driverPhoto?: string;
  driverPhone: string;
  vehicleType: string;
  rating: number;
  currentLocation: Location;
  pickupLocation: Location;
  deliveryLocation: Location;
  status: string;
  estimatedArrival: Date;
  distanceRemaining: number;
  isPickedUp: boolean;
}

// In-memory cache for real-time locations (would be Redis in production)
const locationCache = new Map<string, Location & { updatedAt: Date }>();

// Constants
const LOCATION_HISTORY_INTERVAL_MS = 30000; // Save to DB every 30 seconds
const ARRIVAL_THRESHOLD_METERS = 100; // Consider arrived within 100m

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate ETA based on distance
 * Uses different speeds based on delivery stage
 */
function estimateETA(distanceKm: number, vehicleType: string, inTraffic = true): number {
  // Base speeds in km/h
  const speeds: Record<string, number> = {
    bicycle: 15,
    scooter: 25,
    motorcycle: 35,
    car: 30,
  };

  let speed = speeds[vehicleType] || 25;

  // Reduce speed in traffic
  if (inTraffic) {
    speed *= 0.7;
  }

  const minutes = (distanceKm / speed) * 60;
  return Math.ceil(minutes);
}

/**
 * Update driver's current location
 */
export async function updateDriverLocation(
  driverId: mongoose.Types.ObjectId,
  location: Location
): Promise<void> {
  const now = new Date();

  // Update cache
  locationCache.set(driverId.toString(), {
    ...location,
    updatedAt: now,
  });

  // Update driver in database
  await DeliveryDriver.findByIdAndUpdate(driverId, {
    currentLocation: {
      type: 'Point',
      coordinates: [location.lng, location.lat],
      updatedAt: now,
    },
  });

  // Find active delivery for this driver
  const delivery = await Delivery.findOne({
    driverId,
    status: { $in: ['accepted', 'picked_up', 'in_transit'] },
  });

  if (delivery) {
    // Add to location history (throttled)
    const lastHistory = delivery.locationHistory?.[delivery.locationHistory.length - 1];
    const shouldSaveHistory =
      !lastHistory ||
      now.getTime() - new Date(lastHistory.timestamp).getTime() >= LOCATION_HISTORY_INTERVAL_MS;

    if (shouldSaveHistory) {
      await Delivery.findByIdAndUpdate(delivery._id, {
        $push: {
          locationHistory: {
            lat: location.lat,
            lng: location.lng,
            timestamp: now,
            accuracy: location.accuracy || 10,
          },
        },
      });
    }

    // Calculate ETA and broadcast to customer
    await broadcastLocationUpdate(delivery._id, driverId, location);
  }
}

/**
 * Broadcast location update to customer
 */
async function broadcastLocationUpdate(
  deliveryId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  currentLocation: Location
): Promise<void> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {return;}

  const driver = await DeliveryDriver.findById(driverId);
  if (!driver) {return;}

  const order = await Order.findById(delivery.orderId);
  if (!order?.customerId) {return;}

  // Determine destination based on status
  let destinationLat: number;
  let destinationLng: number;

  if (delivery.status === 'accepted') {
    // Heading to restaurant
    destinationLat = delivery.pickupAddress?.coordinates?.lat || 0;
    destinationLng = delivery.pickupAddress?.coordinates?.lng || 0;
  } else {
    // Heading to customer
    destinationLat = delivery.deliveryAddress?.coordinates?.lat || 0;
    destinationLng = delivery.deliveryAddress?.coordinates?.lng || 0;
  }

  // Calculate distance and ETA
  const distanceKm = calculateDistance(
    currentLocation.lat,
    currentLocation.lng,
    destinationLat,
    destinationLng
  );
  const etaMinutes = estimateETA(distanceKm, driver.vehicleType);

  // Check if driver has arrived
  const distanceMeters = distanceKm * 1000;
  if (distanceMeters <= ARRIVAL_THRESHOLD_METERS) {
    // Auto-update status if near destination
    if (delivery.status === 'accepted') {
      // Arrived at restaurant
      await Delivery.findByIdAndUpdate(deliveryId, {
        arrivedAtRestaurantAt: new Date(),
      });
    } else if (delivery.status === 'in_transit') {
      // Arrived at customer
      await Delivery.findByIdAndUpdate(deliveryId, {
        status: 'arrived',
        arrivedAtCustomerAt: new Date(),
      });
    }
  }

  // Broadcast to customer
  if (order.customerId) {
    socketService.emitUserNotification(order.customerId.toString(), {
      type: 'tracking:location',
      title: 'Location Update',
      message: 'Driver location updated',
      data: {
        deliveryId: delivery._id,
        driverLocation: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        },
        destination: {
          lat: destinationLat,
          lng: destinationLng,
        },
        distanceKm: Math.round(distanceKm * 10) / 10,
        etaMinutes,
        estimatedArrival: new Date(Date.now() + etaMinutes * 60000),
        status: delivery.status,
        driverInfo: {
          name: `${driver.firstName} ${driver.lastName}`,
          photo: driver.profilePhoto,
          vehicleType: driver.vehicleType,
          rating: driver.stats?.averageRating || 0,
        },
      },
    });
  }
}

/**
 * Get current tracking data for a delivery
 */
export async function getTrackingData(
  deliveryId: mongoose.Types.ObjectId
): Promise<TrackingData | null> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery || !delivery.driverId) {return null;}

  const driver = await DeliveryDriver.findById(delivery.driverId);
  if (!driver) {return null;}

  // Get current location from cache or database
  let currentLocation: Location;
  const cachedLocation = locationCache.get(delivery.driverId.toString());

  if (cachedLocation && Date.now() - cachedLocation.updatedAt.getTime() < 60000) {
    currentLocation = {
      lat: cachedLocation.lat,
      lng: cachedLocation.lng,
    };
  } else if (driver.currentLocation?.coordinates) {
    const [lng, lat] = driver.currentLocation.coordinates;
    currentLocation = { lat, lng };
  } else {
    return null;
  }

  // Get destination based on status
  const isPickedUp = ['picked_up', 'in_transit', 'arrived'].includes(delivery.status);
  const destination = isPickedUp
    ? delivery.deliveryAddress
    : delivery.pickupAddress;

  if (!destination?.coordinates) {return null;}

  const destLat = destination.coordinates.lat;
  const destLng = destination.coordinates.lng;
  const distanceKm = calculateDistance(
    currentLocation.lat,
    currentLocation.lng,
    destLat,
    destLng
  );
  const etaMinutes = estimateETA(distanceKm, driver.vehicleType);

  return {
    deliveryId: delivery._id,
    driverId: driver._id,
    driverName: `${driver.firstName} ${driver.lastName}`,
    driverPhoto: driver.profilePhoto,
    driverPhone: driver.phone,
    vehicleType: driver.vehicleType,
    rating: driver.stats?.averageRating || 0,
    currentLocation,
    pickupLocation: {
      lat: delivery.pickupAddress?.coordinates?.lat || 0,
      lng: delivery.pickupAddress?.coordinates?.lng || 0,
    },
    deliveryLocation: {
      lat: delivery.deliveryAddress?.coordinates?.lat || 0,
      lng: delivery.deliveryAddress?.coordinates?.lng || 0,
    },
    status: delivery.status,
    estimatedArrival: new Date(Date.now() + etaMinutes * 60000),
    distanceRemaining: Math.round(distanceKm * 10) / 10,
    isPickedUp,
  };
}

/**
 * Get location history for a delivery
 */
export async function getLocationHistory(
  deliveryId: mongoose.Types.ObjectId
): Promise<Array<{ lat: number; lng: number; timestamp: Date }>> {
  const delivery = await Delivery.findById(deliveryId).select('locationHistory');
  if (!delivery) {return [];}

  return (delivery.locationHistory || []).map((loc) => ({
    lat: loc.lat,
    lng: loc.lng,
    timestamp: loc.timestamp,
  }));
}

/**
 * Calculate estimated delivery time for an order
 */
export async function estimateDeliveryTime(
  restaurantLocation: { lat: number; lng: number },
  customerLocation: { lat: number; lng: number },
  prepTimeMinutes = 15
): Promise<{
  estimatedMinutes: number;
  distanceKm: number;
  breakdown: {
    prepTime: number;
    pickupTime: number;
    deliveryTime: number;
  };
}> {
  const distanceKm = calculateDistance(
    restaurantLocation.lat,
    restaurantLocation.lng,
    customerLocation.lat,
    customerLocation.lng
  );

  // Assume driver is nearby (average 2km from restaurant)
  const pickupTime = estimateETA(2, 'scooter');
  const deliveryTime = estimateETA(distanceKm, 'scooter');

  const totalMinutes = prepTimeMinutes + pickupTime + deliveryTime;

  return {
    estimatedMinutes: Math.ceil(totalMinutes),
    distanceKm: Math.round(distanceKm * 10) / 10,
    breakdown: {
      prepTime: prepTimeMinutes,
      pickupTime,
      deliveryTime,
    },
  };
}

/**
 * Get nearby drivers for display on map
 */
export async function getNearbyDrivers(
  location: { lat: number; lng: number },
  radiusKm = 5
): Promise<
  Array<{
    driverId: mongoose.Types.ObjectId;
    location: Location;
    vehicleType: string;
    isAvailable: boolean;
  }>
> {
  const drivers = await DeliveryDriver.find({
    status: 'verified',
    shiftStatus: { $in: ['online', 'on_delivery'] },
    'currentLocation.coordinates': { $exists: true },
  }).select('currentLocation vehicleType isAvailable');

  const nearbyDrivers = [];

  for (const driver of drivers) {
    if (!driver.currentLocation?.coordinates) {continue;}

    const [lng, lat] = driver.currentLocation.coordinates;
    const distance = calculateDistance(location.lat, location.lng, lat, lng);

    if (distance <= radiusKm) {
      nearbyDrivers.push({
        driverId: driver._id,
        location: { lat, lng },
        vehicleType: driver.vehicleType,
        isAvailable: driver.isAvailable,
      });
    }
  }

  return nearbyDrivers;
}

/**
 * Start tracking a delivery (when driver accepts)
 */
export async function startTracking(deliveryId: mongoose.Types.ObjectId): Promise<void> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {return;}

  const order = await Order.findById(delivery.orderId);
  if (!order?.customerId) {return;}

  // Notify customer that tracking is starting
  socketService.emitUserNotification(order.customerId.toString(), {
    type: 'tracking:started',
    title: 'Live Tracking',
    message: 'Live tracking is now available for your order',
    data: {
      deliveryId: delivery._id,
    },
  });
}

/**
 * Stop tracking a delivery (when completed or cancelled)
 */
export async function stopTracking(deliveryId: mongoose.Types.ObjectId): Promise<void> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {return;}

  const order = await Order.findById(delivery.orderId);
  if (!order?.customerId) {return;}

  // Notify customer that tracking has ended
  socketService.emitUserNotification(order.customerId.toString(), {
    type: 'tracking:ended',
    title: 'Tracking Ended',
    message: 'Delivery tracking has ended',
    data: {
      deliveryId: delivery._id,
      status: delivery.status,
    },
  });

  // Clear from cache
  if (delivery.driverId) {
    locationCache.delete(delivery.driverId.toString());
  }
}

/**
 * Get delivery ETA for customer display
 */
export async function getDeliveryETA(
  deliveryId: mongoose.Types.ObjectId
): Promise<{
  estimatedArrival: Date;
  minutesRemaining: number;
  status: string;
} | null> {
  const tracking = await getTrackingData(deliveryId);
  if (!tracking) {return null;}

  const minutesRemaining = Math.round(
    (tracking.estimatedArrival.getTime() - Date.now()) / 60000
  );

  return {
    estimatedArrival: tracking.estimatedArrival,
    minutesRemaining: Math.max(0, minutesRemaining),
    status: tracking.status,
  };
}

export default {
  updateDriverLocation,
  getTrackingData,
  getLocationHistory,
  estimateDeliveryTime,
  getNearbyDrivers,
  startTracking,
  stopTracking,
  getDeliveryETA,
};
