import mongoose from 'mongoose';
import { DeliveryDriver, IDeliveryDriver } from '../models/DeliveryDriver.js';
import { Delivery } from '../models/Delivery.js';
import { Order } from '../models/Order.js';
import { Restaurant } from '../models/Restaurant.js';
import * as socketService from './socketService.js';

// Types
interface DriverScore {
  driverId: mongoose.Types.ObjectId;
  driver: IDeliveryDriver;
  score: number;
  distance: number;
  eta: number;
}

interface AssignmentResult {
  success: boolean;
  deliveryId?: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  message: string;
}

interface Location {
  lat: number;
  lng: number;
}

// Scoring weights
const SCORING_WEIGHTS = {
  proximity: 0.4,
  rating: 0.3,
  acceptanceRate: 0.2,
  vehicleMatch: 0.1,
};

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
 * Estimate ETA based on distance (simple calculation)
 */
function estimateETA(distanceKm: number): number {
  const avgSpeedKmh = 25;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Calculate driver score for assignment
 */
function calculateDriverScore(
  driver: IDeliveryDriver,
  distanceKm: number,
  maxDistance: number
): number {
  const proximityScore = 1 - Math.min(distanceKm / maxDistance, 1);
  const ratingScore = (driver.stats?.averageRating || 3) / 5;
  const completionRate = driver.stats?.completionRate || 0.8;

  const vehiclePriority: Record<string, number> = {
    motorcycle: 1,
    scooter: 0.9,
    car: 0.7,
    bicycle: 0.5,
  };
  const vehicleScore = vehiclePriority[driver.vehicleType] || 0.5;

  const score =
    SCORING_WEIGHTS.proximity * proximityScore +
    SCORING_WEIGHTS.rating * ratingScore +
    SCORING_WEIGHTS.acceptanceRate * completionRate +
    SCORING_WEIGHTS.vehicleMatch * vehicleScore;

  return Math.round(score * 100) / 100;
}

/**
 * Find available drivers within radius
 */
export async function findAvailableDrivers(
  restaurantLocation: Location,
  radiusKm: number,
  restaurantId?: mongoose.Types.ObjectId
): Promise<DriverScore[]> {
  const query: Record<string, unknown> = {
    status: 'verified',
    shiftStatus: 'online',
    isAvailable: true,
    currentDeliveryId: { $exists: false },
    'currentLocation.coordinates': { $exists: true },
  };

  if (restaurantId) {
    query.$or = [
      { restaurantIds: restaurantId },
      { restaurantIds: { $size: 0 } },
    ];
  }

  const drivers = await DeliveryDriver.find(query);
  const scoredDrivers: DriverScore[] = [];

  for (const driver of drivers) {
    if (!driver.currentLocation?.coordinates) {continue;}

    const [lng, lat] = driver.currentLocation.coordinates;
    const distance = calculateDistance(
      restaurantLocation.lat,
      restaurantLocation.lng,
      lat,
      lng
    );

    if (distance > radiusKm) {continue;}

    const eta = estimateETA(distance);
    const score = calculateDriverScore(driver, distance, radiusKm);

    scoredDrivers.push({
      driverId: driver._id,
      driver,
      score,
      distance: Math.round(distance * 10) / 10,
      eta,
    });
  }

  scoredDrivers.sort((a, b) => b.score - a.score);
  return scoredDrivers;
}

/**
 * Create a new delivery record for an order
 */
export async function createDeliveryForOrder(orderId: mongoose.Types.ObjectId): Promise<mongoose.Document> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.fulfillmentType !== 'delivery') {
    throw new Error('Order is not for delivery');
  }

  const restaurant = await Restaurant.findById(order.restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Build pickup address from restaurant
  const pickupAddress = {
    street: restaurant.address?.street || '',
    city: restaurant.address?.city || '',
    postalCode: restaurant.address?.postalCode || '',
    country: restaurant.address?.country || 'France',
    coordinates: {
      lat: restaurant.address?.coordinates?.lat || 0,
      lng: restaurant.address?.coordinates?.lng || 0,
    },
  };

  // Get delivery address from order
  const deliveryAddress = order.deliveryAddress ? {
    street: order.deliveryAddress.street || '',
    city: order.deliveryAddress.city || '',
    postalCode: order.deliveryAddress.postalCode || '',
    country: 'France',
    instructions: order.deliveryInstructions,
    coordinates: {
      lat: order.deliveryAddress.coordinates?.lat || 0,
      lng: order.deliveryAddress.coordinates?.lng || 0,
    },
  } : pickupAddress;

  const delivery = new Delivery({
    orderId: order._id,
    restaurantId: order.restaurantId,
    customerId: order.customerId,
    status: 'pending',
    pickupAddress,
    deliveryAddress,
    estimatedDistance: 0,
    estimatedDuration: 0,
    assignmentAttempts: 0,
    isPriority: false,
    statusHistory: [{
      event: 'created',
      timestamp: new Date(),
    }],
    earnings: {
      baseFee: 3,
      distanceBonus: 0,
      waitTimeBonus: 0,
      peakHourBonus: 0,
      tip: 0,
      adjustments: 0,
      total: 3,
      currency: 'EUR',
    },
  });

  await delivery.save();

  // Update order
  await Order.findByIdAndUpdate(orderId, {
    deliveryId: delivery._id,
    deliveryStatus: 'pending',
  });

  return delivery;
}

/**
 * Assign a delivery to a specific driver
 */
export async function assignDeliveryToDriver(
  deliveryId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId
): Promise<AssignmentResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  if (delivery.status !== 'pending') {
    return { success: false, message: 'Delivery is not in pending status' };
  }

  const driver = await DeliveryDriver.findById(driverId);
  if (!driver) {
    return { success: false, message: 'Driver not found' };
  }

  if (!driver.isAvailable || driver.shiftStatus !== 'online') {
    return { success: false, message: 'Driver is not available' };
  }

  // Assign delivery
  delivery.driverId = driverId;
  delivery.status = 'assigned';
  delivery.assignedAt = new Date();
  delivery.assignmentAttempts = (delivery.assignmentAttempts || 0) + 1;
  delivery.statusHistory.push({
    event: 'assigned',
    timestamp: new Date(),
    note: `Assigned to driver ${driver.firstName} ${driver.lastName}`,
  });

  await delivery.save();

  // Update driver
  driver.currentDeliveryId = delivery._id;
  driver.isAvailable = false;
  driver.shiftStatus = 'on_delivery';
  await driver.save();

  // Update order
  await Order.findByIdAndUpdate(delivery.orderId, {
    deliveryStatus: 'assigned',
    driverInfo: {
      id: driver._id,
      name: `${driver.firstName} ${driver.lastName}`,
      photo: driver.profilePhoto,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      rating: driver.stats?.averageRating || 0,
    },
  });

  // Send notification to driver via socket
  socketService.emitUserNotification(driverId.toString(), {
    type: 'delivery_assigned',
    title: 'New Delivery',
    message: 'You have a new delivery assignment',
    data: {
      deliveryId: delivery._id,
      orderId: delivery.orderId,
    },
  });

  return {
    success: true,
    deliveryId: delivery._id,
    driverId,
    message: 'Delivery assigned successfully',
  };
}

/**
 * Auto-assign delivery using smart algorithm
 */
export async function autoAssignDelivery(
  deliveryId: mongoose.Types.ObjectId
): Promise<AssignmentResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  const restaurant = await Restaurant.findById(delivery.restaurantId);
  if (!restaurant?.address?.coordinates) {
    return { success: false, message: 'Restaurant location not found' };
  }

  const { lat, lng } = restaurant.address.coordinates;
  const radiusKm = 10; // Default radius

  const availableDrivers = await findAvailableDrivers(
    { lat, lng },
    radiusKm,
    delivery.restaurantId
  );

  if (availableDrivers.length === 0) {
    return { success: false, message: 'No available drivers found' };
  }

  const topDriver = availableDrivers[0];

  // Calculate estimated distance and duration
  if (delivery.deliveryAddress?.coordinates) {
    const destLat = delivery.deliveryAddress.coordinates.lat;
    const destLng = delivery.deliveryAddress.coordinates.lng;
    const totalDistance = topDriver.distance + calculateDistance(lat, lng, destLat, destLng);

    delivery.estimatedDistance = Math.round(totalDistance * 10) / 10;
    delivery.estimatedDuration = estimateETA(totalDistance);

    // Calculate distance bonus
    if (totalDistance > 3) {
      const extraKm = totalDistance - 3;
      delivery.earnings.distanceBonus = Math.round(extraKm * 0.5 * 100) / 100;
      delivery.earnings.total = delivery.earnings.baseFee + delivery.earnings.distanceBonus;
    }

    await delivery.save();
  }

  return assignDeliveryToDriver(deliveryId, topDriver.driverId);
}

/**
 * Handle driver acceptance of assignment
 */
export async function acceptAssignment(
  deliveryId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId
): Promise<AssignmentResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  if (delivery.driverId?.toString() !== driverId.toString()) {
    return { success: false, message: 'Delivery not assigned to this driver' };
  }

  if (delivery.status !== 'assigned') {
    return { success: false, message: 'Delivery is not in assigned status' };
  }

  delivery.status = 'accepted';
  delivery.acceptedAt = new Date();
  delivery.statusHistory.push({
    event: 'accepted',
    timestamp: new Date(),
  });

  await delivery.save();

  await Order.findByIdAndUpdate(delivery.orderId, {
    deliveryStatus: 'accepted',
  });

  // Notify customer
  if (delivery.customerId) {
    socketService.emitUserNotification(delivery.customerId.toString(), {
      type: 'delivery_accepted',
      title: 'Driver Assigned',
      message: 'Your delivery driver is on the way to pick up your order',
      data: { deliveryId: delivery._id },
    });
  }

  return {
    success: true,
    deliveryId: delivery._id,
    driverId,
    message: 'Assignment accepted',
  };
}

/**
 * Handle driver rejection of assignment
 */
export async function rejectAssignment(
  deliveryId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  _reason?: string
): Promise<AssignmentResult> {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    return { success: false, message: 'Delivery not found' };
  }

  if (delivery.driverId?.toString() !== driverId.toString()) {
    return { success: false, message: 'Delivery not assigned to this driver' };
  }

  // Add to rejected drivers list
  if (!delivery.rejectedDriverIds) {
    delivery.rejectedDriverIds = [];
  }
  delivery.rejectedDriverIds.push(driverId);

  // Free up driver
  const driver = await DeliveryDriver.findById(driverId);
  if (driver) {
    driver.currentDeliveryId = undefined;
    driver.isAvailable = true;
    driver.shiftStatus = 'online';
    await driver.save();
  }

  // Reset delivery for reassignment
  delivery.driverId = undefined;
  delivery.status = 'pending';
  delivery.statusHistory.push({
    event: 'rejected',
    timestamp: new Date(),
    note: `Driver rejected assignment`,
  });

  await delivery.save();

  // Try to reassign
  return autoAssignDelivery(deliveryId);
}

/**
 * Get assignment statistics for admin dashboard
 */
export async function getAssignmentStats(
  restaurantId?: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalDeliveries: number;
  avgAssignmentTime: number;
  avgDeliveryTime: number;
  successRate: number;
  topDrivers: Array<{ driverId: mongoose.Types.ObjectId; name: string; deliveries: number }>;
}> {
  const query: Record<string, unknown> = {};

  if (restaurantId) {
    query.restaurantId = restaurantId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = startDate;}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = endDate;}
  }

  const deliveries = await Delivery.find(query);

  const totalDeliveries = deliveries.length;

  // Calculate average assignment time
  const assignmentTimes = deliveries
    .filter((d) => d.assignedAt && d.createdAt)
    .map((d) => d.assignedAt!.getTime() - d.createdAt.getTime());
  const avgAssignmentTime = assignmentTimes.length > 0
    ? Math.round(assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length / 60000)
    : 0;

  // Calculate average delivery time
  const deliveryTimes = deliveries
    .filter((d) => d.actualDeliveryTime && d.acceptedAt)
    .map((d) => d.actualDeliveryTime!.getTime() - d.acceptedAt!.getTime());
  const avgDeliveryTime = deliveryTimes.length > 0
    ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / 60000)
    : 0;

  // Calculate success rate
  const completedDeliveries = deliveries.filter((d) => d.status === 'delivered').length;
  const successRate = totalDeliveries > 0
    ? Math.round((completedDeliveries / totalDeliveries) * 100)
    : 0;

  // Get top drivers
  const driverDeliveries = await Delivery.aggregate([
    { $match: { ...query, status: 'delivered' } },
    { $group: { _id: '$driverId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  const topDrivers = await Promise.all(
    driverDeliveries.map(async (d) => {
      const driver = await DeliveryDriver.findById(d._id);
      return {
        driverId: d._id,
        name: driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown',
        deliveries: d.count,
      };
    })
  );

  return {
    totalDeliveries,
    avgAssignmentTime,
    avgDeliveryTime,
    successRate,
    topDrivers,
  };
}

export default {
  findAvailableDrivers,
  createDeliveryForOrder,
  assignDeliveryToDriver,
  autoAssignDelivery,
  acceptAssignment,
  rejectAssignment,
  getAssignmentStats,
};
