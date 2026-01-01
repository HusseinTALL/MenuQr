/**
 * Delivery Test Helpers - Utility functions for delivery testing
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Delivery } from '../../models/Delivery.js';
import { DeliveryDriver } from '../../models/DeliveryDriver.js';
import { Order } from '../../models/Order.js';
import { Restaurant } from '../../models/Restaurant.js';
import { User } from '../../models/index.js';
import config from '../../config/env.js';

export const TEST_PASSWORD = 'TestPass123!';

// Pre-hash password once to avoid repeating in each test
let _hashedPassword: string | null = null;
async function getHashedPassword(): Promise<string> {
  if (!_hashedPassword) {
    const salt = await bcrypt.genSalt(10);
    _hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);
  }
  return _hashedPassword;
}

/**
 * Create a test restaurant with owner
 */
export async function createTestRestaurant(overrides = {}) {
  const timestamp = Date.now();

  const owner = await User.create({
    email: `owner-${timestamp}@test.com`,
    password: TEST_PASSWORD,
    name: 'Test Owner',
    role: 'owner',
    isActive: true,
  });

  const restaurant = await Restaurant.create({
    name: `Test Restaurant ${timestamp}`,
    slug: `test-restaurant-${timestamp}`,
    description: 'A test restaurant',
    address: {
      street: '123 Test Street',
      city: 'Paris',
      postalCode: '75001',
      country: 'FR',
      coordinates: { lat: 48.8566, lng: 2.3522 },
    },
    phone: '+33600000000',
    email: 'test@restaurant.com',
    ownerId: owner._id,
    isActive: true,
    ...overrides,
  });

  owner.restaurantId = restaurant._id;
  await owner.save();

  const accessToken = jwt.sign(
    { userId: owner._id.toString(), email: owner.email, role: owner.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  return { restaurant, owner, accessToken };
}

/**
 * Create a test delivery driver
 */
export async function createTestDriver(restaurantIds: mongoose.Types.ObjectId[], overrides = {}) {
  const timestamp = Date.now();
  const passwordHash = await getHashedPassword();

  const driver = await DeliveryDriver.create({
    email: `driver-${timestamp}@test.com`,
    passwordHash,
    firstName: 'Test',
    lastName: 'Driver',
    phone: `+3360000${timestamp.toString().slice(-4)}`,
    vehicleType: 'scooter',
    vehiclePlate: `TEST-${timestamp.toString().slice(-4)}`,
    status: 'verified',
    shiftStatus: 'online',
    isAvailable: true,
    restaurantIds,
    currentLocation: {
      type: 'Point',
      coordinates: [2.3522, 48.8566], // Paris
    },
    documents: {
      idCard: { url: 'test.jpg', status: 'approved' },
      driverLicense: { url: 'test.jpg', status: 'approved' },
      vehicleRegistration: { url: 'test.jpg', status: 'approved' },
      insurance: { url: 'test.jpg', status: 'approved' },
    },
    stats: {
      totalDeliveries: 0,
      completedDeliveries: 0,
      cancelledDeliveries: 0,
      averageRating: 0,
      totalRatings: 0,
      totalEarnings: 0,
      completionRate: 0,
    },
    currentBalance: 0,
    lifetimeEarnings: 0,
    ...overrides,
  });

  const accessToken = jwt.sign(
    { driverId: driver._id.toString(), email: driver.email, role: 'delivery_driver' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  return { driver, accessToken };
}

/**
 * Create a test order for delivery
 */
export async function createTestDeliveryOrder(
  restaurantId: mongoose.Types.ObjectId,
  overrides = {}
) {
  const timestamp = Date.now();

  const order = await Order.create({
    orderNumber: `ORD-${timestamp}`,
    restaurantId,
    customerName: 'Test Customer',
    customerPhone: '+33612345678',
    items: [
      {
        dishId: new mongoose.Types.ObjectId(),
        name: 'Test Dish',
        price: 1500,
        quantity: 2,
        subtotal: 3000,
        options: [],
      },
    ],
    subtotal: 3000,
    tax: 300,
    deliveryFee: 500,
    total: 3800,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    fulfillmentType: 'delivery',
    deliveryAddress: {
      street: '456 Customer Street',
      city: 'Paris',
      postalCode: '75002',
      country: 'FR',
      coordinates: { lat: 48.8606, lng: 2.3376 },
    },
    deliveryInstructions: 'Ring doorbell twice',
    ...overrides,
  });

  return order;
}

/**
 * Create a test delivery
 */
export async function createTestDelivery(
  orderId: mongoose.Types.ObjectId,
  restaurantId: mongoose.Types.ObjectId,
  overrides = {}
) {
  const timestamp = Date.now();
  const delivery = await Delivery.create({
    orderId,
    restaurantId,
    deliveryNumber: `DLV-TEST-${timestamp}`,
    pickupAddress: {
      street: '123 Test Street',
      city: 'Paris',
      postalCode: '75001',
      country: 'FR',
      coordinates: { lat: 48.8566, lng: 2.3522 },
    },
    deliveryAddress: {
      street: '456 Customer Street',
      city: 'Paris',
      postalCode: '75002',
      country: 'FR',
      coordinates: { lat: 48.8606, lng: 2.3376 },
    },
    status: 'pending',
    estimatedDistance: 2.5,
    estimatedDuration: 15,
    statusHistory: [{
      event: 'created',
      timestamp: new Date(),
      note: 'Delivery created',
    }],
    ...overrides,
  });

  return delivery;
}

/**
 * Create a complete delivery scenario (restaurant, driver, order, delivery)
 */
export async function createDeliveryScenario() {
  const { restaurant, owner, accessToken: ownerToken } = await createTestRestaurant();
  const { driver, accessToken: driverToken } = await createTestDriver([restaurant._id]);
  const order = await createTestDeliveryOrder(restaurant._id);
  const delivery = await createTestDelivery(order._id, restaurant._id);

  // Link order to delivery
  order.deliveryId = delivery._id;
  await order.save();

  return {
    restaurant,
    owner,
    ownerToken,
    driver,
    driverToken,
    order,
    delivery,
  };
}

/**
 * Create superadmin user for testing
 */
export async function createSuperAdmin() {
  const timestamp = Date.now();

  const superadmin = await User.create({
    email: `superadmin-${timestamp}@test.com`,
    password: TEST_PASSWORD,
    name: 'Super Admin',
    role: 'superadmin',
    isActive: true,
  });

  const accessToken = jwt.sign(
    { userId: superadmin._id.toString(), email: superadmin.email, role: superadmin.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  return { superadmin, accessToken };
}
