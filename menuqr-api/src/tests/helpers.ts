/**
 * Test Helpers - Utility functions for testing
 */

import { User, Restaurant, Customer, Category, Dish, Table, Order } from '../models/index.js';
import { generateTokens } from '../middleware/auth.js';
import { generateCustomerTokens } from '../middleware/customerAuth.js';
import mongoose from 'mongoose';

// Test data constants
export const TEST_PASSWORD = 'TestPass123';
export const TEST_PHONE = '+22670000001';

/**
 * Create a test restaurant with an owner
 */
export async function createTestRestaurant(overrides = {}) {
  const timestamp = Date.now();

  // First create the owner user
  const owner = await User.create({
    email: `owner-${timestamp}@example.com`,
    password: TEST_PASSWORD,
    name: 'Restaurant Owner',
    role: 'owner',
    isActive: true,
  });

  // Create restaurant with the owner
  const restaurant = await Restaurant.create({
    name: 'Test Restaurant',
    slug: `test-restaurant-${timestamp}`,
    description: 'A test restaurant',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      country: 'Test Country',
    },
    phone: '+22670000000',
    email: 'test@restaurant.com',
    settings: {
      currency: 'XOF',
      defaultLanguage: 'fr',
      availableLanguages: ['fr', 'en'],
    },
    isActive: true,
    ownerId: owner._id,
    ...overrides,
  });

  // Link user to restaurant
  owner.restaurantId = restaurant._id;
  await owner.save();

  return restaurant;
}

/**
 * Create a test user (owner/admin)
 */
export async function createTestUser(restaurantId: mongoose.Types.ObjectId, overrides = {}) {
  const timestamp = Date.now();
  const user = await User.create({
    email: `test-${timestamp}@example.com`,
    password: TEST_PASSWORD,
    name: 'Test User',
    role: 'owner',
    restaurantId,
    isActive: true,
    ...overrides,
  });

  // Link restaurant to user
  await Restaurant.findByIdAndUpdate(restaurantId, { ownerId: user._id });

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
}

/**
 * Create a test customer
 */
export async function createTestCustomer(restaurantId: mongoose.Types.ObjectId, overrides = {}) {
  const timestamp = Date.now();
  const customer = await Customer.create({
    phone: `+2267${timestamp.toString().slice(-7)}`,
    restaurantId,
    password: TEST_PASSWORD,
    name: 'Test Customer',
    isPhoneVerified: true,
    isActive: true,
    ...overrides,
  });

  const { accessToken, refreshToken } = generateCustomerTokens(customer);
  customer.refreshToken = refreshToken;
  await customer.save();

  return { customer, accessToken, refreshToken };
}

/**
 * Create test categories
 */
export async function createTestCategories(restaurantId: mongoose.Types.ObjectId, count = 3) {
  const categories = [];
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  for (let i = 0; i < count; i++) {
    const category = await Category.create({
      name: { fr: `Catégorie ${uniqueId}-${i + 1}`, en: `Category ${uniqueId}-${i + 1}` },
      description: { fr: `Description ${i + 1}`, en: `Description ${i + 1}` },
      restaurantId,
      order: i,
      isActive: true,
    });
    categories.push(category);
  }
  return categories;
}

/**
 * Create test dishes
 */
export async function createTestDishes(
  restaurantId: mongoose.Types.ObjectId,
  categoryId: mongoose.Types.ObjectId,
  count = 3
) {
  const dishes: Awaited<ReturnType<typeof Dish.create>>[] = [];
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  for (let i = 0; i < count; i++) {
    const dish = await Dish.create({
      name: { fr: `Plat ${uniqueId}-${i + 1}`, en: `Dish ${uniqueId}-${i + 1}` },
      description: { fr: `Description ${i + 1}`, en: `Description ${i + 1}` },
      price: 1000 + i * 500,
      categoryId,
      restaurantId,
      isAvailable: true,
      isActive: true,
    });
    dishes.push(dish);
  }
  return dishes;
}

/**
 * Create test tables
 */
export async function createTestTables(restaurantId: mongoose.Types.ObjectId, count = 5) {
  const tables = [];
  for (let i = 0; i < count; i++) {
    const table = await Table.create({
      name: `Table ${i + 1}`,
      restaurantId,
      capacity: 6, // Max capacity
      minCapacity: 1, // Min capacity
      location: 'indoor',
      isActive: true,
    });
    tables.push(table);
  }
  return tables;
}

/**
 * Create a test order
 */
export async function createTestOrder(
  restaurantId: mongoose.Types.ObjectId,
  customerId: mongoose.Types.ObjectId,
  dishes: Array<{ _id: mongoose.Types.ObjectId; name: { fr: string }; price: number }>,
  overrides = {}
) {
  const items = dishes.map((dish, index) => ({
    dishId: dish._id,
    name: dish.name.fr,
    price: dish.price,
    quantity: index + 1,
    subtotal: dish.price * (index + 1),
    options: [],
  }));

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const order = await Order.create({
    orderNumber: `TEST-${Date.now()}`,
    restaurantId,
    customerId,
    customerName: 'Test Customer',
    customerPhone: TEST_PHONE,
    items,
    subtotal,
    tax,
    total,
    status: 'pending',
    paymentStatus: 'pending',
    fulfillmentType: 'dine-in',
    tableNumber: '1',
    ...overrides,
  });

  return order;
}

/**
 * Generate a random email
 */
export function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/**
 * Generate a random phone number
 */
export function randomPhone() {
  return `+2267${Math.floor(10000000 + Math.random() * 90000000)}`;
}

/**
 * Wait for a specified duration (useful for async operations)
 */
export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
