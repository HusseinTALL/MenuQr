/**
 * Comprehensive Database Seed Script
 *
 * Populates ALL database collections with extensive test data for testing every functionality.
 *
 * Run with: npx tsx scripts/seedComprehensive.ts
 *
 * This script will:
 * 1. Run existing seeds (hotel, driver, delivery)
 * 2. Add extensive additional data across all collections
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Models
import { User } from '../src/models/User.js';
import { Restaurant } from '../src/models/Restaurant.js';
import { Category } from '../src/models/Category.js';
import { Dish } from '../src/models/Dish.js';
import { Table } from '../src/models/Table.js';
import { Customer } from '../src/models/Customer.js';
import { Order } from '../src/models/Order.js';
import { Reservation } from '../src/models/Reservation.js';
import { Review } from '../src/models/Review.js';
import { LoyaltyTransaction } from '../src/models/LoyaltyTransaction.js';
import { Campaign } from '../src/models/Campaign.js';
import { DeliveryDriver } from '../src/models/DeliveryDriver.js';
import { Delivery } from '../src/models/Delivery.js';
import { DriverShift } from '../src/models/DriverShift.js';
import { DriverPayout } from '../src/models/DriverPayout.js';
import { Hotel } from '../src/models/Hotel.js';
import { Room } from '../src/models/Room.js';
import { HotelGuest } from '../src/models/HotelGuest.js';
import { HotelMenu } from '../src/models/HotelMenu.js';
import { HotelCategory } from '../src/models/HotelCategory.js';
import { HotelDish } from '../src/models/HotelDish.js';
import { HotelOrder } from '../src/models/HotelOrder.js';
import { AuditLog } from '../src/models/AuditLog.js';
import ChatMessage from '../src/models/ChatMessage.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/menuqr';

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to pick random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedComprehensive() {
  try {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     MenuQR Comprehensive Database Seed                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // ========================================
    // 1. DELIVERY DRIVERS (5 total)
    // ========================================
    console.log('Creating delivery drivers...');

    const driverData = [
      { email: 'livreur@menuqr.fr', firstName: 'Jean', lastName: 'Dupont', vehicleType: 'scooter', shiftStatus: 'online', status: 'verified' },
      { email: 'driver2@menuqr.fr', firstName: 'Marie', lastName: 'Martin', vehicleType: 'bicycle', shiftStatus: 'online', status: 'verified' },
      { email: 'driver3@menuqr.fr', firstName: 'Pierre', lastName: 'Bernard', vehicleType: 'car', shiftStatus: 'on_delivery', status: 'verified' },
      { email: 'driver4@menuqr.fr', firstName: 'Sophie', lastName: 'Petit', vehicleType: 'motorcycle', shiftStatus: 'on_break', status: 'verified' },
      { email: 'driver5@menuqr.fr', firstName: 'Lucas', lastName: 'Moreau', vehicleType: 'scooter', shiftStatus: 'offline', status: 'verified' },
    ];

    const drivers: mongoose.Document[] = [];
    for (const d of driverData) {
      const existing = await DeliveryDriver.findOne({ email: d.email });
      if (existing) {
        drivers.push(existing);
        continue;
      }

      const passwordHash = await bcrypt.hash('Driver123!', 12);
      const driver = await DeliveryDriver.create({
        email: d.email,
        passwordHash,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: `+33 6 ${Math.floor(10000000 + Math.random() * 90000000)}`,
        vehicleType: d.vehicleType,
        vehiclePlate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(100 + Math.random() * 900)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        vehicleModel: d.vehicleType === 'scooter' ? 'Honda PCX 125' : d.vehicleType === 'car' ? 'Renault Clio' : 'VTT Electrique',
        vehicleColor: randomItem(['Noir', 'Blanc', 'Gris', 'Bleu', 'Rouge']),
        status: d.status as 'verified',
        shiftStatus: d.shiftStatus as 'online' | 'on_delivery' | 'on_break' | 'offline',
        isAvailable: d.shiftStatus === 'online',
        backgroundCheckStatus: 'passed',
        verifiedAt: new Date(),
        currentLocation: {
          type: 'Point',
          coordinates: [2.3522 + (Math.random() - 0.5) * 0.1, 48.8566 + (Math.random() - 0.5) * 0.1],
          updatedAt: new Date(),
        },
        stats: {
          totalDeliveries: Math.floor(20 + Math.random() * 100),
          completedDeliveries: Math.floor(18 + Math.random() * 95),
          cancelledDeliveries: Math.floor(Math.random() * 5),
          completionRate: 90 + Math.random() * 10,
          averageRating: 4 + Math.random(),
          totalRatings: Math.floor(10 + Math.random() * 50),
          onTimeRate: 85 + Math.random() * 15,
          averageDeliveryTime: 15 + Math.random() * 15,
          totalEarnings: 500 + Math.random() * 1500,
          totalTips: 30 + Math.random() * 100,
        },
        currentBalance: 50 + Math.random() * 200,
        lifetimeEarnings: 600 + Math.random() * 2000,
        address: {
          street: `${Math.floor(1 + Math.random() * 100)} Rue de Paris`,
          city: 'Paris',
          postalCode: `7500${Math.floor(1 + Math.random() * 9)}`,
          country: 'France',
        },
        preferredZones: ['75001', '75002', '75003', '75004'],
        maxDeliveryRadius: 10 + Math.floor(Math.random() * 10),
        languagesSpoken: ['fr', 'en'],
      });
      drivers.push(driver);
    }
    console.log(`✓ Created/found ${drivers.length} delivery drivers\n`);

    // ========================================
    // 2. FIND EXISTING RESTAURANT & DATA
    // ========================================
    console.log('Finding existing restaurant data...');

    const restaurant = await Restaurant.findOne({ slug: 'garbadrome-patte-doie' });
    if (!restaurant) {
      console.log('⚠ Restaurant not found. Please run the main seed first: npx tsx src/scripts/seed.ts');
      await mongoose.disconnect();
      process.exit(1);
    }

    const adminUser = await User.findOne({ email: 'admin@menuqr.fr' });
    const allDishes = await Dish.find({ restaurantId: restaurant._id });
    const allTables = await Table.find({ restaurantId: restaurant._id });
    const allCustomers = await Customer.find({ restaurantId: restaurant._id });

    console.log(`✓ Found restaurant: ${restaurant.name}`);
    console.log(`  - ${allDishes.length} dishes`);
    console.log(`  - ${allTables.length} tables`);
    console.log(`  - ${allCustomers.length} customers\n`);

    // ========================================
    // 3. ADDITIONAL ORDERS (50 more across all statuses)
    // ========================================
    console.log('Creating additional orders...');

    const orderStatuses = [
      { status: 'pending', count: 5 },
      { status: 'confirmed', count: 8 },
      { status: 'preparing', count: 8 },
      { status: 'ready', count: 5 },
      { status: 'served', count: 5 },
      { status: 'completed', count: 15 },
      { status: 'cancelled', count: 4 },
    ];

    let orderCount = await Order.countDocuments();
    const createdOrders: mongoose.Document[] = [];

    for (const { status, count } of orderStatuses) {
      for (let i = 0; i < count; i++) {
        const customer = randomItem(allCustomers);
        const numItems = Math.floor(Math.random() * 3) + 1;
        const selectedDishes = allDishes.sort(() => Math.random() - 0.5).slice(0, numItems);

        const items = selectedDishes.map((dish) => {
          const qty = Math.floor(Math.random() * 2) + 1;
          return {
            dishId: dish._id,
            name: (dish as any).name?.fr || 'Unknown',
            price: (dish as any).price,
            quantity: qty,
            subtotal: (dish as any).price * qty,
          };
        });

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const daysAgo = status === 'completed' ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 3);
        const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        orderCount++;
        const fulfillmentType = Math.random() > 0.3 ? 'dine-in' : 'delivery';

        const order = await Order.create({
          orderNumber: `${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCount).padStart(4, '0')}`,
          restaurantId: restaurant._id,
          customerId: customer._id,
          tableNumber: fulfillmentType === 'dine-in' ? randomItem(allTables)?.name?.replace('Table ', '') : undefined,
          customerName: (customer as any).name,
          customerPhone: (customer as any).phone,
          fulfillmentType,
          items,
          subtotal,
          tax: 0,
          total: subtotal,
          status,
          paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? 'failed' : 'pending',
          paymentMethod: randomItem(['cash', 'card', 'mobile_money']),
          createdAt: orderDate,
          updatedAt: orderDate,
          ...(status === 'confirmed' && { confirmedAt: orderDate }),
          ...(status === 'completed' && { completedAt: orderDate }),
          ...(status === 'cancelled' && { cancelledAt: orderDate, cancelReason: randomItem(['Client absent', 'Plat non disponible', 'Annulation client']) }),
          ...(fulfillmentType === 'delivery' && {
            deliveryAddress: {
              street: `${Math.floor(1 + Math.random() * 100)} Avenue de Paris`,
              city: 'Paris',
              postalCode: `7500${Math.floor(1 + Math.random() * 9)}`,
              country: 'France',
            },
          }),
        });
        createdOrders.push(order);
      }
    }
    console.log(`✓ Created ${createdOrders.length} additional orders\n`);

    // ========================================
    // 4. DELIVERIES (20 across all statuses)
    // ========================================
    console.log('Creating deliveries...');

    const deliveryStatuses = [
      'pending', 'assigned', 'accepted', 'arriving_restaurant', 'at_restaurant',
      'picked_up', 'in_transit', 'arrived', 'delivered', 'delivered', 'delivered',
      'delivered', 'delivered', 'failed', 'cancelled', 'cancelled',
    ] as const;

    const deliveryOrders = createdOrders.filter((o: any) => o.fulfillmentType === 'delivery').slice(0, 20);
    const createdDeliveries: mongoose.Document[] = [];

    for (let i = 0; i < Math.min(deliveryOrders.length, 20); i++) {
      const order = deliveryOrders[i] as any;
      const status = deliveryStatuses[i % deliveryStatuses.length];
      const driver = randomItem(drivers) as any;

      const now = new Date();
      const delivery = await Delivery.create({
        orderId: order._id,
        restaurantId: restaurant._id,
        customerId: order.customerId,
        driverId: ['pending'].includes(status) ? undefined : driver._id,
        deliveryNumber: `DLV-${Date.now().toString().slice(-6)}-${String(i + 1).padStart(4, '0')}`,
        status,
        isPriority: Math.random() > 0.8,
        assignmentAttempts: Math.floor(Math.random() * 3),
        pickupAddress: {
          street: restaurant.address?.street || '10 Rue de Rivoli',
          city: restaurant.address?.city || 'Paris',
          postalCode: restaurant.address?.postalCode || '75001',
          country: 'France',
          coordinates: { lat: 48.8566, lng: 2.3522 },
        },
        deliveryAddress: {
          street: order.deliveryAddress?.street || '25 Avenue des Champs-Elysees',
          city: order.deliveryAddress?.city || 'Paris',
          postalCode: order.deliveryAddress?.postalCode || '75008',
          country: 'France',
          coordinates: { lat: 48.8698 + (Math.random() - 0.5) * 0.05, lng: 2.3076 + (Math.random() - 0.5) * 0.05 },
          instructions: randomItem(['Code porte: 4521', 'Sonner 2 fois', 'Laisser au concierge', '']),
        },
        estimatedDistance: 2 + Math.random() * 8,
        estimatedDuration: 15 + Math.floor(Math.random() * 20),
        estimatedPickupTime: new Date(now.getTime() + 15 * 60 * 1000),
        estimatedDeliveryTime: new Date(now.getTime() + 35 * 60 * 1000),
        earnings: {
          baseFee: 4 + Math.random() * 2,
          distanceBonus: 1 + Math.random() * 2,
          waitTimeBonus: Math.random() * 1,
          peakHourBonus: Math.random() > 0.7 ? 1.5 : 0,
          tip: Math.random() > 0.5 ? 1 + Math.random() * 4 : 0,
          adjustments: 0,
          total: 6 + Math.random() * 5,
          currency: 'EUR',
        },
        deliveryFee: 3 + Math.random() * 2,
        source: randomItem(['auto', 'manual', 'broadcast']),
        isContactless: Math.random() > 0.7,
        statusHistory: [
          { event: 'pending', timestamp: new Date(now.getTime() - 30 * 60 * 1000) },
        ],
        ...(status === 'delivered' && {
          actualPickupTime: new Date(now.getTime() - 20 * 60 * 1000),
          actualDeliveryTime: new Date(now.getTime() - 5 * 60 * 1000),
          actualDuration: 15 + Math.floor(Math.random() * 10),
          customerRating: {
            rating: 3 + Math.floor(Math.random() * 3),
            comment: randomItem(['Tres bien', 'Rapide', 'OK', '']),
            ratedAt: new Date(),
          },
        }),
        ...(status === 'cancelled' && {
          cancelledAt: new Date(),
          cancelledBy: randomItem(['customer', 'driver', 'restaurant']),
          cancellationReason: randomItem(['Client indisponible', 'Restaurant ferme', 'Probleme technique']),
        }),
        ...(status === 'failed' && {
          issues: [{
            type: randomItem(['customer_unavailable', 'wrong_address', 'order_damaged']),
            description: 'Impossible de livrer',
            reportedBy: 'driver',
            reportedAt: new Date(),
          }],
        }),
      });
      createdDeliveries.push(delivery);
    }
    console.log(`✓ Created ${createdDeliveries.length} deliveries\n`);

    // ========================================
    // 5. DRIVER SHIFTS (10 total)
    // ========================================
    console.log('Creating driver shifts...');

    const createdShifts: mongoose.Document[] = [];
    for (let i = 0; i < 10; i++) {
      const driver = randomItem(drivers) as any;
      const isActive = i < 3;
      const startedAt = isActive
        ? new Date(Date.now() - (2 + Math.random() * 4) * 60 * 60 * 1000)
        : randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date(Date.now() - 24 * 60 * 60 * 1000));

      const duration = isActive ? undefined : 4 * 60 + Math.floor(Math.random() * 4 * 60);

      const shift = await DriverShift.create({
        driverId: driver._id,
        restaurantIds: [restaurant._id],
        startedAt,
        endedAt: isActive ? undefined : new Date(startedAt.getTime() + (duration || 0) * 60 * 1000),
        duration,
        isActive,
        endReason: isActive ? undefined : randomItem(['manual', 'auto_timeout']),
        startLocation: { lat: 48.8566, lng: 2.3522, timestamp: startedAt },
        stats: {
          totalDeliveries: Math.floor(Math.random() * 10),
          completedDeliveries: Math.floor(Math.random() * 9),
          cancelledDeliveries: Math.floor(Math.random() * 2),
          totalDistance: 10 + Math.random() * 30,
          totalActiveTime: (duration || 180) - 15,
          totalBreakTime: 15,
          averageDeliveryTime: 20 + Math.random() * 10,
        },
        earnings: {
          deliveryFees: 20 + Math.random() * 40,
          distanceBonuses: 5 + Math.random() * 15,
          waitTimeBonuses: Math.random() * 5,
          peakHourBonuses: Math.random() * 10,
          tips: 5 + Math.random() * 20,
          incentiveBonus: 0,
          total: 35 + Math.random() * 80,
        },
        breaks: isActive ? [] : [
          { startedAt: new Date(startedAt.getTime() + 2 * 60 * 60 * 1000), endedAt: new Date(startedAt.getTime() + 2.25 * 60 * 60 * 1000), duration: 15 },
        ],
      });
      createdShifts.push(shift);
    }
    console.log(`✓ Created ${createdShifts.length} driver shifts\n`);

    // ========================================
    // 6. DRIVER PAYOUTS (5 total)
    // ========================================
    console.log('Creating driver payouts...');

    const createdPayouts: mongoose.Document[] = [];
    const payoutStatuses = ['pending', 'processing', 'completed', 'completed', 'completed'] as const;

    for (let i = 0; i < 5; i++) {
      const driver = randomItem(drivers) as any;
      const status = payoutStatuses[i];
      const periodEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const grossAmount = 50 + Math.random() * 150;

      const payout = await DriverPayout.create({
        driverId: driver._id,
        payoutNumber: `PAY-${Date.now().toString().slice(-6)}-${String(i + 1).padStart(4, '0')}`,
        type: 'weekly',
        status,
        periodStart,
        periodEnd,
        grossAmount,
        breakdown: {
          deliveryFees: grossAmount * 0.6,
          distanceBonuses: grossAmount * 0.15,
          waitTimeBonuses: grossAmount * 0.05,
          peakHourBonuses: grossAmount * 0.05,
          tips: grossAmount * 0.15,
          incentiveBonuses: 0,
          referralBonuses: 0,
          adjustments: 0,
          deductions: 0,
        },
        netAmount: grossAmount,
        currency: 'EUR',
        deliveryCount: Math.floor(10 + Math.random() * 20),
        paymentMethod: 'bank_transfer',
        bankAccount: {
          accountHolder: `${driver.firstName} ${driver.lastName}`,
          iban: `FR76${Math.floor(10000000000000000000 + Math.random() * 90000000000000000000)}`,
          bic: 'BNPAFRPP',
          bankName: 'BNP Paribas',
        },
        ...(status === 'completed' && {
          processedAt: new Date(),
          transactionId: `TRX-${Date.now()}-${i}`,
        }),
      });
      createdPayouts.push(payout);
    }
    console.log(`✓ Created ${createdPayouts.length} driver payouts\n`);

    // ========================================
    // 7. ADDITIONAL HOTEL GUESTS
    // ========================================
    console.log('Creating additional hotel guests...');

    const hotel = await Hotel.findOne({ slug: 'grand-hotel-paris' });
    if (hotel) {
      const rooms = await Room.find({ hotelId: hotel._id, status: 'vacant' }).limit(5);
      const guestData = [
        { name: 'Alice Johnson', email: 'alice.johnson@test.com', roomNumber: '102' },
        { name: 'Bob Smith', email: 'bob.smith@test.com', roomNumber: '103' },
        { name: 'Claire Dupont', email: 'claire.dupont@test.com', roomNumber: '201' },
        { name: 'David Chen', email: 'david.chen@test.com', roomNumber: '202' },
        { name: 'Emma Wilson', email: 'emma.wilson@test.com', roomNumber: '301' },
      ];

      let guestCount = 0;
      for (let i = 0; i < Math.min(rooms.length, guestData.length); i++) {
        const room = rooms[i] as any;
        const gd = guestData[i];

        const existingGuest = await HotelGuest.findOne({ hotelId: hotel._id, roomId: room._id, isActive: true });
        if (existingGuest) continue;

        const guest = await HotelGuest.create({
          hotelId: hotel._id,
          roomId: room._id,
          roomNumber: room.roomNumber,
          name: gd.name,
          email: gd.email,
          phone: `+33 6 ${Math.floor(10000000 + Math.random() * 90000000)}`,
          reservationNumber: `RES-2024-${String(100 + i).padStart(3, '0')}`,
          checkInDate: new Date(),
          checkOutDate: new Date(Date.now() + (2 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000),
          pin: String(1000 + Math.floor(Math.random() * 9000)),
          accessCode: String(100000 + Math.floor(Math.random() * 900000)),
          isVerified: true,
          language: randomItem(['en', 'fr', 'de', 'es']),
          isActive: true,
        });

        await Room.findByIdAndUpdate(room._id, {
          status: 'occupied',
          currentGuestId: guest._id,
          lastCheckIn: new Date(),
        });

        guestCount++;
      }
      console.log(`✓ Created ${guestCount} additional hotel guests\n`);

      // ========================================
      // 8. ADDITIONAL HOTEL ORDERS (20 across all statuses)
      // ========================================
      console.log('Creating additional hotel orders...');

      const hotelGuests = await HotelGuest.find({ hotelId: hotel._id, isActive: true });
      const hotelMenus = await HotelMenu.find({ hotelId: hotel._id });
      const hotelDishes = await HotelDish.find({ hotelId: hotel._id });

      const hotelOrderStatuses = [
        'pending', 'pending', 'confirmed', 'confirmed', 'confirmed',
        'preparing', 'preparing', 'preparing', 'ready', 'ready',
        'picked_up', 'delivering', 'delivered', 'delivered', 'delivered',
        'delivered', 'completed', 'completed', 'completed', 'cancelled',
      ] as const;

      let hotelOrderCount = await HotelOrder.countDocuments();
      const createdHotelOrders: mongoose.Document[] = [];

      for (let i = 0; i < hotelOrderStatuses.length; i++) {
        const guest = randomItem(hotelGuests) as any;
        const status = hotelOrderStatuses[i];
        const menu = randomItem(hotelMenus) as any;
        const numItems = 1 + Math.floor(Math.random() * 3);
        const selectedDishes = hotelDishes.sort(() => Math.random() - 0.5).slice(0, numItems);

        const items = selectedDishes.map((dish: any) => {
          const qty = 1 + Math.floor(Math.random() * 2);
          return {
            dishId: dish._id,
            name: dish.name,
            price: dish.price,
            quantity: qty,
            subtotal: dish.price * qty,
          };
        });

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const serviceCharge = subtotal * 0.1;
        const deliveryFee = 5;
        const tax = (subtotal + serviceCharge) * 0.1;
        const tip = Math.random() > 0.5 ? Math.floor(Math.random() * 10) : 0;

        hotelOrderCount++;
        const hotelOrder = await HotelOrder.create({
          orderNumber: `HO-2024-${String(hotelOrderCount).padStart(4, '0')}`,
          hotelId: hotel._id,
          roomId: guest.roomId,
          roomNumber: guest.roomNumber,
          floor: Math.floor(parseInt(guest.roomNumber) / 100),
          guestId: guest._id,
          guestName: guest.name,
          menuType: menu.type,
          menuId: menu._id,
          items,
          subtotal,
          serviceCharge,
          deliveryFee,
          tax,
          tip,
          total: subtotal + serviceCharge + deliveryFee + tax + tip,
          status,
          paymentMethod: randomItem(['room_charge', 'card', 'cash']),
          paymentStatus: status === 'completed' || status === 'delivered' ? 'paid' : 'pending',
          callBeforeDelivery: Math.random() > 0.5,
          leaveAtDoor: Math.random() > 0.7,
          specialInstructions: randomItem(['', 'Extra napkins please', 'No ice in drinks', 'Allergic to nuts']),
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
          ...(status === 'cancelled' && { cancelledAt: new Date(), cancelReason: 'Guest cancelled' }),
          ...(status === 'completed' && { completedAt: new Date() }),
          ...((status === 'delivered' || status === 'completed') && {
            rating: 3 + Math.floor(Math.random() * 3),
            feedback: randomItem(['', 'Excellent service', 'Good food', 'Fast delivery']),
          }),
        });
        createdHotelOrders.push(hotelOrder);
      }
      console.log(`✓ Created ${createdHotelOrders.length} additional hotel orders\n`);
    } else {
      console.log('⚠ Hotel not found. Run npx tsx scripts/seedHotel.ts first.\n');
    }

    // ========================================
    // 9. ADDITIONAL RESERVATIONS
    // ========================================
    console.log('Creating additional reservations...');

    const reservationData = [
      { status: 'pending', count: 3 },
      { status: 'confirmed', count: 5 },
      { status: 'completed', count: 3 },
      { status: 'cancelled', count: 2 },
      { status: 'no_show', count: 2 },
    ];

    let resCount = await Reservation.countDocuments();
    const createdReservations: mongoose.Document[] = [];

    for (const { status, count } of reservationData) {
      for (let i = 0; i < count; i++) {
        const customer = randomItem(allCustomers) as any;
        const table = randomItem(allTables) as any;
        const daysOffset = ['completed', 'no_show'].includes(status)
          ? -Math.floor(Math.random() * 14) - 1
          : Math.floor(Math.random() * 14) + 1;
        const resDate = new Date();
        resDate.setDate(resDate.getDate() + daysOffset);
        resDate.setHours(12 + Math.floor(Math.random() * 8), 0, 0, 0);

        resCount++;
        const reservation = await Reservation.create({
          reservationNumber: `R${String(resCount).padStart(6, '0')}`,
          restaurantId: restaurant._id,
          customerId: customer._id,
          tableId: table._id,
          reservationDate: resDate,
          timeSlot: `${12 + Math.floor(Math.random() * 8)}:00`,
          partySize: 2 + Math.floor(Math.random() * 4),
          duration: 90,
          status,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          locationPreference: randomItem(['indoor', 'outdoor', 'terrace', 'no_preference']),
          specialRequests: Math.random() > 0.7 ? randomItem(['Anniversaire', 'Chaise haute', 'Coin calme']) : undefined,
          createdAt: new Date(resDate.getTime() - 3 * 24 * 60 * 60 * 1000),
        });
        createdReservations.push(reservation);
      }
    }
    console.log(`✓ Created ${createdReservations.length} additional reservations\n`);

    // ========================================
    // 10. ADDITIONAL REVIEWS
    // ========================================
    console.log('Creating additional reviews...');

    const reviewData = [
      { status: 'approved', count: 10 },
      { status: 'pending', count: 5 },
      { status: 'flagged', count: 3 },
      { status: 'rejected', count: 2 },
    ];

    const reviewComments = [
      { rating: 5, title: 'Excellent!', comment: 'Le meilleur garba de la ville!' },
      { rating: 5, title: 'Parfait', comment: 'Service impeccable et cuisine delicieuse.' },
      { rating: 4, title: 'Tres bien', comment: 'Bonne nourriture, je recommande.' },
      { rating: 4, title: 'Satisfait', comment: 'Plats copieux et savoureux.' },
      { rating: 3, title: 'Correct', comment: 'Pas mal mais peut mieux faire.' },
      { rating: 2, title: 'Decu', comment: 'Service lent, plats tiedes.' },
      { rating: 1, title: 'A eviter', comment: 'Tres mauvaise experience.' },
    ];

    const createdReviews: mongoose.Document[] = [];
    for (const { status, count } of reviewData) {
      for (let i = 0; i < count; i++) {
        const customer = randomItem(allCustomers) as any;
        const dish = randomItem(allDishes) as any;
        const reviewItem = status === 'flagged' || status === 'rejected'
          ? reviewComments.slice(-2)[Math.floor(Math.random() * 2)]
          : randomItem(reviewComments.slice(0, 5));

        const review = await Review.create({
          restaurantId: restaurant._id,
          dishId: dish._id,
          customerId: customer._id,
          rating: reviewItem.rating,
          title: reviewItem.title,
          comment: reviewItem.comment,
          status,
          isVerifiedPurchase: Math.random() > 0.3,
          helpfulCount: Math.floor(Math.random() * 15),
          createdAt: randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date()),
          ...(status === 'approved' && adminUser && Math.random() > 0.5 && {
            response: {
              content: 'Merci pour votre avis! Nous esperons vous revoir bientot.',
              respondedAt: new Date(),
              respondedBy: adminUser._id,
            },
          }),
        });
        createdReviews.push(review);
      }
    }
    console.log(`✓ Created ${createdReviews.length} additional reviews\n`);

    // ========================================
    // 11. AUDIT LOGS
    // ========================================
    console.log('Creating audit logs...');

    if (adminUser) {
      const auditActions = ['create', 'update', 'delete', 'login', 'settings_change', 'status_change'] as const;
      const auditCategories = ['authentication', 'order', 'dish', 'reservation', 'user', 'settings'] as const;

      const createdLogs: mongoose.Document[] = [];
      for (let i = 0; i < 50; i++) {
        const action = randomItem([...auditActions]);
        const category = randomItem([...auditCategories]);

        const log = await AuditLog.create({
          action,
          category,
          userId: adminUser._id,
          userName: (adminUser as any).name,
          userEmail: (adminUser as any).email,
          userRole: (adminUser as any).role,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} operation on ${category}`,
          status: Math.random() > 0.1 ? 'success' : 'failure',
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          createdAt: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        });
        createdLogs.push(log);
      }
      console.log(`✓ Created ${createdLogs.length} audit logs\n`);
    }

    // ========================================
    // 12. CHAT MESSAGES
    // ========================================
    console.log('Creating chat messages...');

    const createdMessages: mongoose.Document[] = [];
    const chatDeliveries = createdDeliveries.slice(0, 5);

    for (const delivery of chatDeliveries) {
      const d = delivery as any;
      if (!d.customerId || !d.orderId) continue;

      const messages = [
        { content: 'Bonjour, je suis en route!', senderType: 'driver' as const, senderName: 'Jean Dupont' },
        { content: 'Super, merci!', senderType: 'customer' as const, senderName: 'Client' },
        { content: 'Je serai la dans 5 minutes', senderType: 'driver' as const, senderName: 'Jean Dupont' },
      ];

      for (const msg of messages) {
        const chatMsg = await ChatMessage.create({
          deliveryId: d._id,
          orderId: d.orderId,
          sender: {
            type: msg.senderType,
            id: msg.senderType === 'driver' ? d.driverId : d.customerId,
            name: msg.senderName,
          },
          recipient: {
            type: msg.senderType === 'driver' ? 'customer' : 'driver',
            id: msg.senderType === 'driver' ? d.customerId : d.driverId,
          },
          content: msg.content,
          messageType: 'text',
          metadata: {
            isRead: true,
            readAt: new Date(),
          },
          isDeleted: false,
          createdAt: randomDate(new Date(Date.now() - 60 * 60 * 1000), new Date()),
        });
        createdMessages.push(chatMsg);
      }
    }
    console.log(`✓ Created ${createdMessages.length} chat messages\n`);

    // ========================================
    // 13. LOYALTY TRANSACTIONS
    // ========================================
    console.log('Creating additional loyalty transactions...');

    const createdTransactions: mongoose.Document[] = [];
    for (const customer of allCustomers.slice(0, 10)) {
      const c = customer as any;
      const numTransactions = 2 + Math.floor(Math.random() * 5);
      let balance = c.loyalty?.totalPoints || 0;

      for (let i = 0; i < numTransactions; i++) {
        const type = Math.random() > 0.25 ? 'earn' : 'redeem';
        const points = type === 'earn'
          ? 10 + Math.floor(Math.random() * 100)
          : Math.min(balance, 10 + Math.floor(Math.random() * 50));

        if (type === 'redeem' && points <= 0) continue;

        balance = type === 'earn' ? balance + points : balance - points;

        const transaction = await LoyaltyTransaction.create({
          customerId: customer._id,
          restaurantId: restaurant._id,
          type,
          points,
          balance,
          description: type === 'earn' ? 'Points gagnes sur commande' : 'Echange de points',
          createdAt: randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        });
        createdTransactions.push(transaction);
      }
    }
    console.log(`✓ Created ${createdTransactions.length} loyalty transactions\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Seed Completed Successfully!                         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const summary = {
      'Delivery Drivers': await DeliveryDriver.countDocuments(),
      'Deliveries': await Delivery.countDocuments(),
      'Driver Shifts': await DriverShift.countDocuments(),
      'Driver Payouts': await DriverPayout.countDocuments(),
      'Orders': await Order.countDocuments(),
      'Hotel Orders': await HotelOrder.countDocuments(),
      'Hotel Guests': await HotelGuest.countDocuments(),
      'Reservations': await Reservation.countDocuments(),
      'Reviews': await Review.countDocuments(),
      'Loyalty Transactions': await LoyaltyTransaction.countDocuments(),
      'Audit Logs': await AuditLog.countDocuments(),
      'Chat Messages': await ChatMessage.countDocuments(),
    };

    console.log('Collection Counts:');
    for (const [key, value] of Object.entries(summary)) {
      console.log(`  ${key}: ${value}`);
    }

    console.log('\n========================================');
    console.log('Test Accounts:');
    console.log('========================================');
    console.log('\nRestaurant Admin:');
    console.log('  Email: admin@menuqr.fr');
    console.log('  Password: Admin123!');
    console.log('\nHotel Owner:');
    console.log('  Email: hotel@menuqr.fr');
    console.log('  Password: Hotel123!');
    console.log('\nDelivery Drivers (Password: Driver123!):');
    for (const d of driverData) {
      console.log(`  - ${d.email} (${d.shiftStatus})`);
    }
    console.log('\nHotel Guests:');
    console.log('  Room 101 - PIN: 1234, Access Code: 123456');
    console.log('  Other rooms - Check database for credentials');
    console.log('\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedComprehensive();
