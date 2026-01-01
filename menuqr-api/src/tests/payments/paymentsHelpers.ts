/**
 * Payment Tests Helpers
 * Utilities for testing Stripe Connect and driver earnings
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { DeliveryDriver } from '../../models/DeliveryDriver.js';
import { Delivery } from '../../models/Delivery.js';
import { DriverPayout } from '../../models/DriverPayout.js';
import { DriverShift } from '../../models/DriverShift.js';
import { Restaurant } from '../../models/Restaurant.js';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';

export const TEST_PASSWORD = 'TestPassword123!';

// Cache hashed password for performance
let _hashedPassword: string | null = null;

async function getHashedPassword(): Promise<string> {
  if (!_hashedPassword) {
    const salt = await bcrypt.genSalt(12);
    _hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);
  }
  return _hashedPassword;
}

/**
 * Create a test restaurant with owner
 */
export async function createTestRestaurant() {
  const timestamp = Date.now();
  const hashedPassword = await getHashedPassword();

  const owner = await User.create({
    email: `owner-${timestamp}@test.com`,
    password: hashedPassword,
    name: 'Test Owner',
    role: 'owner',
    isEmailVerified: true,
  });

  const restaurant = await Restaurant.create({
    name: `Test Restaurant ${timestamp}`,
    slug: `test-restaurant-${timestamp}`,
    ownerId: owner._id,
    address: {
      street: '123 Test Street',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      coordinates: { lat: 48.8566, lng: 2.3522 },
    },
    phone: '+33123456789',
    email: `restaurant-${timestamp}@test.com`,
    isActive: true,
    isApproved: true,
  });

  const ownerToken = jwt.sign(
    { userId: owner._id.toString(), email: owner.email, role: owner.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return { owner, restaurant, ownerToken };
}

/**
 * Create a test driver
 */
export async function createTestDriver(
  restaurantIds: mongoose.Types.ObjectId[],
  options: Partial<{
    status: string;
    stripeAccountId: string;
    stripeOnboardingComplete: boolean;
    currentBalance: number;
    lifetimeEarnings: number;
  }> = {}
) {
  const timestamp = Date.now();
  const hashedPassword = await getHashedPassword();

  const driver = await DeliveryDriver.create({
    email: `driver-${timestamp}@test.com`,
    passwordHash: hashedPassword,
    firstName: 'Test',
    lastName: 'Driver',
    phone: `+336${timestamp.toString().slice(-8)}`,
    vehicleType: 'bicycle',
    status: options.status || 'verified',
    isVerified: options.status !== 'pending',
    isAvailable: true,
    shiftStatus: 'online',
    restaurantIds,
    currentBalance: options.currentBalance || 0,
    lifetimeEarnings: options.lifetimeEarnings || 0,
    stripeAccountId: options.stripeAccountId,
    stripeOnboardingComplete: options.stripeOnboardingComplete || false,
    bankAccount: {
      accountHolder: 'Test Driver',
      iban: 'FR7630006000011234567890189',
      bic: 'BNPAFRPP',
      bankName: 'BNP Paribas',
      isVerified: true,
    },
  });

  const accessToken = jwt.sign(
    { driverId: driver._id.toString(), email: driver.email, role: 'delivery_driver' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return { driver, accessToken };
}

/**
 * Create a completed delivery with earnings
 */
export async function createCompletedDelivery(
  restaurantId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  options: Partial<{
    baseFee: number;
    distanceBonus: number;
    waitTimeBonus: number;
    peakHourBonus: number;
    tip: number;
    deliveryDate: Date;
  }> = {}
) {
  const timestamp = Date.now();

  // Create an order first
  const order = await Order.create({
    restaurantId,
    orderNumber: `ORD-${timestamp}`,
    customerName: 'Test Customer',
    customerPhone: '+33612345678',
    items: [{
      dishId: new mongoose.Types.ObjectId(),
      name: 'Test Dish',
      price: 1500,
      quantity: 1,
      subtotal: 1500,
      options: [],
    }],
    subtotal: 1500,
    tax: 150,
    deliveryFee: 350,
    total: 2000,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    fulfillmentType: 'delivery',
    deliveryAddress: {
      street: '456 Delivery Street',
      city: 'Paris',
      postalCode: '75002',
      country: 'FR',
      coordinates: { lat: 48.8606, lng: 2.3376 },
    },
  });

  const baseFee = options.baseFee ?? 3.50;
  const distanceBonus = options.distanceBonus ?? 1.00;
  const waitTimeBonus = options.waitTimeBonus ?? 0.45;
  const peakHourBonus = options.peakHourBonus ?? 0.90;
  const tip = options.tip ?? 2.00;
  const total = baseFee + distanceBonus + waitTimeBonus + peakHourBonus + tip;

  const deliveryDate = options.deliveryDate || new Date();

  const delivery = await Delivery.create({
    orderId: order._id,
    restaurantId,
    driverId,
    deliveryNumber: `DEL-${timestamp}`,
    status: 'delivered',
    pickupAddress: {
      street: '123 Test Street',
      city: 'Paris',
      postalCode: '75001',
      country: 'FR',
      coordinates: { lat: 48.8566, lng: 2.3522 },
    },
    dropoffAddress: {
      street: '456 Delivery Street',
      city: 'Paris',
      postalCode: '75002',
      country: 'FR',
      coordinates: { lat: 48.8606, lng: 2.3376 },
    },
    deliveryAddress: {
      street: '456 Delivery Street',
      city: 'Paris',
      postalCode: '75002',
      country: 'FR',
      coordinates: { lat: 48.8606, lng: 2.3376 },
    },
    estimatedDistance: 2.5,
    actualDistance: 2.8,
    pickupTime: new Date(deliveryDate.getTime() - 30 * 60000),
    actualDeliveryTime: deliveryDate,
    earnings: {
      baseFee,
      distanceBonus,
      waitTimeBonus,
      peakHourBonus,
      tip,
      total,
    },
  });

  return { delivery, order };
}

/**
 * Create a driver shift
 */
export async function createDriverShift(
  driverId: mongoose.Types.ObjectId,
  options: Partial<{
    startedAt: Date;
    endedAt: Date;
    duration: number;
    deliveriesCompleted: number;
    totalEarnings: number;
  }> = {}
) {
  const startedAt = options.startedAt || new Date(Date.now() - 4 * 60 * 60 * 1000);
  const endedAt = options.endedAt || new Date();
  const duration = options.duration || Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

  const shift = await DriverShift.create({
    driverId,
    shiftNumber: `SHIFT-${Date.now()}`,
    status: 'completed',
    startedAt,
    endedAt,
    duration,
    deliveriesCompleted: options.deliveriesCompleted || 5,
    totalEarnings: options.totalEarnings || 35.00,
    breaks: [],
  });

  return shift;
}

/**
 * Create a driver payout record
 */
export async function createDriverPayout(
  driverId: mongoose.Types.ObjectId,
  options: Partial<{
    type: 'instant' | 'weekly' | 'monthly';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    grossAmount: number;
    netAmount: number;
    deliveryCount: number;
    periodStart: Date;
    periodEnd: Date;
  }> = {}
) {
  const now = new Date();
  const periodStart = options.periodStart || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodEnd = options.periodEnd || now;

  const payout = await DriverPayout.create({
    driverId,
    payoutNumber: `PAY-${Date.now()}`,
    type: options.type || 'weekly',
    status: options.status || 'pending',
    periodStart,
    periodEnd,
    grossAmount: options.grossAmount || 150.00,
    netAmount: options.netAmount || 142.50,
    breakdown: {
      deliveryFees: 100.00,
      distanceBonuses: 20.00,
      waitTimeBonuses: 10.00,
      peakHourBonuses: 15.00,
      tips: 12.50,
      incentiveBonuses: 0,
      referralBonuses: 0,
      adjustments: 0,
      deductions: 7.50,
    },
    deliveryCount: options.deliveryCount || 20,
    currency: 'eur',
    paymentMethod: 'bank_transfer',
  });

  return payout;
}

/**
 * Create a full earnings scenario
 */
export async function createEarningsScenario() {
  const { restaurant, owner, ownerToken } = await createTestRestaurant();
  const { driver, accessToken: driverToken } = await createTestDriver([restaurant._id], {
    currentBalance: 50.00,
    lifetimeEarnings: 1500.00,
  });

  // Create multiple completed deliveries
  const deliveries = [];
  for (let i = 0; i < 5; i++) {
    const { delivery } = await createCompletedDelivery(restaurant._id, driver._id, {
      baseFee: 3.50 + (i * 0.50),
      tip: i * 1.00,
      deliveryDate: new Date(Date.now() - i * 60 * 60 * 1000), // Spread over past hours
    });
    deliveries.push(delivery);
  }

  // Create a shift
  const shift = await createDriverShift(driver._id, {
    deliveriesCompleted: 5,
    totalEarnings: deliveries.reduce((sum, d) => sum + d.earnings.total, 0),
  });

  // Create a pending payout
  const pendingPayout = await createDriverPayout(driver._id, {
    status: 'pending',
    grossAmount: 100.00,
    netAmount: 95.00,
  });

  // Create a completed payout (last week)
  const completedPayout = await createDriverPayout(driver._id, {
    status: 'completed',
    grossAmount: 200.00,
    netAmount: 190.00,
    periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    periodEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });

  return {
    restaurant,
    owner,
    ownerToken,
    driver,
    driverToken,
    deliveries,
    shift,
    pendingPayout,
    completedPayout,
  };
}
