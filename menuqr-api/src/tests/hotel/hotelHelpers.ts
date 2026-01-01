/**
 * Hotel Test Helpers - Utility functions for hotel module testing
 */

import {
  User,
  Hotel,
  Room,
  HotelGuest,
  HotelMenu,
  HotelCategory,
  HotelDish,
  HotelOrder,
} from '../../models/index.js';
import { generateTokens } from '../../middleware/auth.js';
import mongoose from 'mongoose';

// Test data constants
export const TEST_PASSWORD = 'TestPass123!';

/**
 * Create a test hotel with an owner
 */
export async function createTestHotel(overrides = {}) {
  const timestamp = Date.now();

  // Create the hotel owner user
  const owner = await User.create({
    email: `hotel-owner-${timestamp}@example.com`,
    password: TEST_PASSWORD,
    name: 'Hotel Owner',
    role: 'hotel_owner',
    isActive: true,
  });

  // Create hotel
  const hotel = await Hotel.create({
    name: `Test Hotel ${timestamp}`,
    slug: `test-hotel-${timestamp}`,
    description: { fr: 'Un hôtel de test', en: 'A test hotel' },
    starRating: 4,
    address: {
      street: '123 Test Avenue',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
    },
    phone: '+33100000000',
    email: `hotel-${timestamp}@test.com`,
    settings: {
      currency: 'EUR',
      timezone: 'Europe/Paris',
      defaultLanguage: 'fr',
      availableLanguages: ['fr', 'en'],
      roomService: {
        enabled: true,
        availableHours: { start: '06:00', end: '23:00' },
        minimumOrder: 0,
        deliveryFee: 0,
        serviceChargePercent: 10,
      },
      notifications: {
        orderEmail: true,
        orderSms: false,
        orderPush: true,
        lowStockAlert: true,
      },
      payment: {
        roomCharge: true,
        cardOnDelivery: true,
        onlinePayment: false,
        cashOnDelivery: true,
      },
    },
    isActive: true,
    ownerId: owner._id,
    ...overrides,
  });

  // Link user to hotel
  owner.hotelId = hotel._id;
  await owner.save();

  return { hotel, owner };
}

/**
 * Create a test hotel user with authentication tokens
 */
export async function createTestHotelUser(
  hotelId: mongoose.Types.ObjectId,
  role: string = 'hotel_owner',
  overrides = {}
) {
  const timestamp = Date.now();
  const user = await User.create({
    email: `hotel-staff-${timestamp}@example.com`,
    password: TEST_PASSWORD,
    name: `Hotel ${role}`,
    role,
    hotelId,
    isActive: true,
    ...overrides,
  });

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
}

/**
 * Create test rooms
 */
export async function createTestRooms(hotelId: mongoose.Types.ObjectId, count = 5) {
  const rooms = [];
  for (let i = 0; i < count; i++) {
    const room = await Room.create({
      hotelId,
      roomNumber: `${100 + i}`,
      floor: Math.floor(i / 5) + 1,
      building: 'Main',
      roomType: i === 0 ? 'suite' : 'standard',
      capacity: i === 0 ? 4 : 2,
      description: { fr: `Chambre ${100 + i}`, en: `Room ${100 + i}` },
      amenities: ['wifi', 'tv', 'minibar'],
      status: 'available',
      isRoomServiceEnabled: true,
      pricePerNight: i === 0 ? 300 : 150,
    });
    rooms.push(room);
  }
  return rooms;
}

/**
 * Create a test guest
 */
export async function createTestGuest(
  hotelId: mongoose.Types.ObjectId,
  roomId: mongoose.Types.ObjectId,
  roomNumber: string,
  overrides = {}
) {
  const timestamp = Date.now();
  const checkIn = new Date();
  const checkOut = new Date();
  checkOut.setDate(checkOut.getDate() + 3);

  const guest = await HotelGuest.create({
    hotelId,
    roomId,
    roomNumber,
    floor: 1,
    name: `Test Guest ${timestamp}`,
    email: `guest-${timestamp}@test.com`,
    phone: '+33600000000',
    checkInDate: checkIn,
    checkOutDate: checkOut,
    status: 'checked_in',
    accessCode: `AC${timestamp.toString().slice(-6)}`,
    preferredLanguage: 'fr',
    isActive: true,
    ...overrides,
  });

  return guest;
}

/**
 * Create a test menu with categories and dishes
 */
export async function createTestMenu(hotelId: mongoose.Types.ObjectId, overrides = {}) {
  const timestamp = Date.now();

  // Create menu
  const menu = await HotelMenu.create({
    hotelId,
    name: { fr: `Menu Test ${timestamp}`, en: `Test Menu ${timestamp}` },
    slug: `menu-test-${timestamp}`,
    description: { fr: 'Menu de test', en: 'Test menu' },
    type: 'room_service',
    isActive: true,
    isDefault: true,
    availability: {
      isAlwaysAvailable: true,
      schedule: [],
    },
    order: 0,
    ...overrides,
  });

  return menu;
}

/**
 * Create test categories
 */
export async function createTestHotelCategories(
  hotelId: mongoose.Types.ObjectId,
  menuId: mongoose.Types.ObjectId,
  count = 3
) {
  const categories = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const category = await HotelCategory.create({
      hotelId,
      menuId,
      name: { fr: `Catégorie ${timestamp}-${i + 1}`, en: `Category ${timestamp}-${i + 1}` },
      slug: `category-${timestamp}-${i + 1}`,
      description: { fr: `Description ${i + 1}`, en: `Description ${i + 1}` },
      icon: '🍽️',
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
export async function createTestHotelDishes(
  hotelId: mongoose.Types.ObjectId,
  menuId: mongoose.Types.ObjectId,
  categoryId: mongoose.Types.ObjectId,
  count = 3
) {
  const dishes = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const dish = await HotelDish.create({
      hotelId,
      menuId,
      categoryId,
      name: { fr: `Plat ${timestamp}-${i + 1}`, en: `Dish ${timestamp}-${i + 1}` },
      slug: `dish-${timestamp}-${i + 1}`,
      description: { fr: `Description plat ${i + 1}`, en: `Dish description ${i + 1}` },
      price: 15 + i * 5,
      isAvailable: true,
      isActive: true,
      isPopular: i === 0,
      preparationTime: 15 + i * 5,
      order: i,
    });
    dishes.push(dish);
  }
  return dishes;
}

/**
 * Create a test order
 */
export async function createTestHotelOrder(
  hotelId: mongoose.Types.ObjectId,
  roomId: mongoose.Types.ObjectId,
  roomNumber: string,
  dishes: Array<{ _id: mongoose.Types.ObjectId; name: { fr: string }; price: number }>,
  overrides = {}
) {
  const timestamp = Date.now();
  const items = dishes.map((dish, index) => ({
    dishId: dish._id,
    name: dish.name,
    price: dish.price,
    quantity: index + 1,
    subtotal: dish.price * (index + 1),
  }));

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const serviceCharge = subtotal * 0.1;
  const total = subtotal + serviceCharge;

  const order = await HotelOrder.create({
    orderNumber: `H-${timestamp}`,
    hotelId,
    roomId,
    roomNumber,
    floor: 1,
    guestName: 'Test Guest',
    guestPhone: '+33600000000',
    menuType: 'room_service',
    items,
    subtotal,
    serviceCharge,
    deliveryFee: 0,
    tax: 0,
    tip: 0,
    total,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'room_charge',
    ...overrides,
  });

  return order;
}

/**
 * Generate random email
 */
export function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
