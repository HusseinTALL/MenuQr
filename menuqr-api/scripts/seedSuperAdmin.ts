/**
 * Super Admin Panel Test Data Seed
 *
 * Populates the database with extensive test data for testing the super admin panel.
 * Creates 40 restaurants with full data including subscriptions, invoices, and audit logs.
 *
 * Run with: TMPDIR=/tmp npx tsx scripts/seedSuperAdmin.ts
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
import { AuditLog } from '../src/models/AuditLog.js';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan.js';
import { Subscription } from '../src/models/Subscription.js';
import { Invoice } from '../src/models/Invoice.js';
import { Notification } from '../src/models/Notification.js';
import { Announcement } from '../src/models/Announcement.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr';

// ============================================
// Helper Functions
// ============================================

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ============================================
// Data Templates
// ============================================

const RESTAURANT_TEMPLATES = [
  // French Restaurants
  { name: 'Le Petit Bistrot', cuisine: 'French', city: 'Paris', country: 'France' },
  { name: 'Chez Marie', cuisine: 'French', city: 'Lyon', country: 'France' },
  { name: 'La Table d\'Or', cuisine: 'French', city: 'Marseille', country: 'France' },
  { name: 'Le Bon Vivant', cuisine: 'French', city: 'Bordeaux', country: 'France' },
  { name: 'L\'Auberge du Soleil', cuisine: 'French', city: 'Nice', country: 'France' },
  { name: 'Le Coq Gaulois', cuisine: 'French', city: 'Toulouse', country: 'France' },
  { name: 'La Brasserie Parisienne', cuisine: 'French', city: 'Paris', country: 'France' },
  { name: 'Le Jardin Secret', cuisine: 'French', city: 'Strasbourg', country: 'France' },

  // African Restaurants
  { name: 'L\'Etoile d\'Afrique', cuisine: 'African', city: 'Ouagadougou', country: 'Burkina Faso' },
  { name: 'Chez Tanti', cuisine: 'African', city: 'Bobo-Dioulasso', country: 'Burkina Faso' },
  { name: 'Le Baobab', cuisine: 'African', city: 'Dakar', country: 'Senegal' },
  { name: 'Saveurs du Sahel', cuisine: 'African', city: 'Ouagadougou', country: 'Burkina Faso' },
  { name: 'La Teranga', cuisine: 'African', city: 'Abidjan', country: 'Ivory Coast' },
  { name: 'Maquis du Bonheur', cuisine: 'African', city: 'Ouagadougou', country: 'Burkina Faso' },

  // Italian Restaurants
  { name: 'Pizzeria Napoli', cuisine: 'Italian', city: 'Paris', country: 'France' },
  { name: 'Trattoria Bella', cuisine: 'Italian', city: 'Lyon', country: 'France' },
  { name: 'Il Giardino', cuisine: 'Italian', city: 'Nice', country: 'France' },
  { name: 'La Dolce Vita', cuisine: 'Italian', city: 'Marseille', country: 'France' },

  // Asian Restaurants
  { name: 'Sushi Zen', cuisine: 'Japanese', city: 'Paris', country: 'France' },
  { name: 'Dragon d\'Or', cuisine: 'Chinese', city: 'Paris', country: 'France' },
  { name: 'Thai Orchid', cuisine: 'Thai', city: 'Lyon', country: 'France' },
  { name: 'Hanoi Kitchen', cuisine: 'Vietnamese', city: 'Paris', country: 'France' },
  { name: 'Seoul Garden', cuisine: 'Korean', city: 'Paris', country: 'France' },

  // Fast Food / Casual
  { name: 'Burger Factory', cuisine: 'Fast Food', city: 'Paris', country: 'France' },
  { name: 'Pizza Express', cuisine: 'Fast Food', city: 'Lyon', country: 'France' },
  { name: 'Le Kebab Royal', cuisine: 'Fast Food', city: 'Marseille', country: 'France' },
  { name: 'Sandwich & Co', cuisine: 'Fast Food', city: 'Bordeaux', country: 'France' },
  { name: 'Tacos House', cuisine: 'Mexican', city: 'Toulouse', country: 'France' },

  // Cafes & Bakeries
  { name: 'Cafe de Flore', cuisine: 'Cafe', city: 'Paris', country: 'France' },
  { name: 'La Patisserie du Coin', cuisine: 'Bakery', city: 'Lyon', country: 'France' },
  { name: 'Tea Time', cuisine: 'Cafe', city: 'Nice', country: 'France' },

  // More diverse restaurants
  { name: 'Le Marrakech', cuisine: 'Moroccan', city: 'Paris', country: 'France' },
  { name: 'Taste of India', cuisine: 'Indian', city: 'Paris', country: 'France' },
  { name: 'Greek Taverna', cuisine: 'Greek', city: 'Marseille', country: 'France' },
  { name: 'Spanish Corner', cuisine: 'Spanish', city: 'Bordeaux', country: 'France' },
  { name: 'Brazilian Grill', cuisine: 'Brazilian', city: 'Paris', country: 'France' },
  { name: 'Lebanese Palace', cuisine: 'Lebanese', city: 'Lyon', country: 'France' },
  { name: 'Turkish Delight', cuisine: 'Turkish', city: 'Paris', country: 'France' },
  { name: 'Peruvian Flavors', cuisine: 'Peruvian', city: 'Paris', country: 'France' },
  { name: 'Ethiopian House', cuisine: 'Ethiopian', city: 'Paris', country: 'France' },
];

const FIRST_NAMES = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Lucas', 'Emma', 'Louis', 'Chloe', 'Hugo', 'Lea', 'Gabriel', 'Manon', 'Raphael', 'Camille', 'Arthur', 'Sarah', 'Jules', 'Ines', 'Adam', 'Jade', 'Mohamed', 'Fatou', 'Ibrahim', 'Aminata', 'Oumar', 'Aissatou', 'Moussa', 'Mariama'];
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'Ouedraogo', 'Sawadogo', 'Traore', 'Kabore', 'Diallo', 'Compaore', 'Zongo', 'Konate'];

const CATEGORY_TEMPLATES: Record<string, Array<{ name: string; icon: string }>> = {
  French: [
    { name: 'Entrees', icon: '🥗' },
    { name: 'Plats', icon: '🍽️' },
    { name: 'Desserts', icon: '🍰' },
    { name: 'Vins', icon: '🍷' },
    { name: 'Boissons', icon: '🥤' },
  ],
  African: [
    { name: 'Grillades', icon: '🍖' },
    { name: 'Plats Traditionnels', icon: '🍲' },
    { name: 'Accompagnements', icon: '🍚' },
    { name: 'Boissons Locales', icon: '🧃' },
    { name: 'Desserts', icon: '🍨' },
  ],
  Italian: [
    { name: 'Antipasti', icon: '🥗' },
    { name: 'Pizzas', icon: '🍕' },
    { name: 'Pates', icon: '🍝' },
    { name: 'Desserts', icon: '🍰' },
    { name: 'Boissons', icon: '🍷' },
  ],
  Japanese: [
    { name: 'Sushi', icon: '🍣' },
    { name: 'Sashimi', icon: '🐟' },
    { name: 'Ramen', icon: '🍜' },
    { name: 'Desserts', icon: '🍡' },
    { name: 'Boissons', icon: '🍵' },
  ],
  default: [
    { name: 'Entrees', icon: '🥗' },
    { name: 'Plats Principaux', icon: '🍽️' },
    { name: 'Desserts', icon: '🍰' },
    { name: 'Boissons', icon: '🥤' },
  ],
};

const DISH_NAMES: Record<string, string[]> = {
  French: ['Boeuf Bourguignon', 'Coq au Vin', 'Ratatouille', 'Quiche Lorraine', 'Soupe a l\'Oignon', 'Steak Frites', 'Magret de Canard', 'Tarte Tatin', 'Creme Brulee', 'Mousse au Chocolat'],
  African: ['Poulet Braise', 'Garba', 'Riz Gras', 'Sauce Arachide', 'Alloco', 'Brochettes', 'Attiake', 'Poisson Braise', 'Foutou', 'Bissap'],
  Italian: ['Margherita', 'Quattro Formaggi', 'Spaghetti Carbonara', 'Lasagna', 'Tiramisu', 'Risotto', 'Bruschetta', 'Caprese', 'Panna Cotta', 'Gelato'],
  Japanese: ['California Roll', 'Salmon Sashimi', 'Tonkotsu Ramen', 'Gyoza', 'Tempura', 'Miso Soup', 'Edamame', 'Matcha Cake', 'Mochi', 'Sake'],
  default: ['Plat du Jour', 'Salade Mixte', 'Soupe', 'Sandwich', 'Burger', 'Wrap', 'Bowl', 'Smoothie', 'Cafe', 'The'],
};

// ============================================
// Main Seed Function
// ============================================

async function seedSuperAdmin() {
  try {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Super Admin Panel Test Data Seed                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // ========================================
    // STEP 1: Clear existing data
    // ========================================
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({ role: { $ne: 'superadmin' } }), // Keep superadmin
      Restaurant.deleteMany({}),
      Category.deleteMany({}),
      Dish.deleteMany({}),
      Table.deleteMany({}),
      Customer.deleteMany({}),
      Order.deleteMany({}),
      Reservation.deleteMany({}),
      Review.deleteMany({}),
      LoyaltyTransaction.deleteMany({}),
      Campaign.deleteMany({}),
      AuditLog.deleteMany({}),
      Subscription.deleteMany({}),
      Invoice.deleteMany({}),
      SubscriptionPlan.deleteMany({}),
      Notification.deleteMany({}),
      Announcement.deleteMany({}),
    ]);
    console.log('✓ Cleared existing data\n');

    // ========================================
    // STEP 2: Create/Ensure Superadmin
    // ========================================
    console.log('Creating superadmin user...');
    let superadmin = await User.findOne({ email: 'superadmin@menuqr.fr' });
    if (!superadmin) {
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
      superadmin = await User.create({
        email: 'superadmin@menuqr.fr',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'superadmin',
        isActive: true,
      });
    }
    console.log('✓ Superadmin ready\n');

    // ========================================
    // STEP 3: Create Subscription Plans
    // ========================================
    console.log('Creating subscription plans...');

    // Prix en FCFA (1 EUR = ~656 XOF)
    const planData = [
      {
        name: 'Gratuit',
        slug: 'free',
        tier: 'free',
        description: 'Pour demarrer avec les fonctionnalites essentielles',
        pricing: { monthly: 0, yearly: 0, currency: 'XOF' },
        limits: { dishes: 20, orders: 100, users: 1, smsCredits: 0, storage: 100, tables: 5, campaigns: 0, locations: 1 },
        trialDays: 0,
        sortOrder: 1,
      },
      {
        name: 'Starter',
        slug: 'starter',
        tier: 'starter',
        description: 'Pour les petits restaurants qui veulent grandir',
        pricing: { monthly: 9900, yearly: 99000, currency: 'XOF' }, // ~15 EUR
        limits: { dishes: 50, orders: 500, users: 3, smsCredits: 100, storage: 500, tables: 15, campaigns: 5, locations: 1 },
        trialDays: 14,
        sortOrder: 2,
      },
      {
        name: 'Professionnel',
        slug: 'professional',
        tier: 'professional',
        description: 'Pour les restaurants etablis avec plus de besoins',
        pricing: { monthly: 19900, yearly: 199000, currency: 'XOF' }, // ~30 EUR
        limits: { dishes: 200, orders: 2000, users: 10, smsCredits: 500, storage: 2000, tables: 50, campaigns: 20, locations: 1 },
        trialDays: 14,
        isPopular: true,
        sortOrder: 3,
      },
      {
        name: 'Business',
        slug: 'business',
        tier: 'business',
        description: 'Pour les groupes de restaurants et franchises',
        pricing: { monthly: 49900, yearly: 499000, currency: 'XOF' }, // ~75 EUR
        limits: { dishes: -1, orders: -1, users: 50, smsCredits: 2000, storage: 10000, tables: -1, campaigns: -1, locations: 5 },
        trialDays: 14,
        sortOrder: 4,
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        tier: 'enterprise',
        description: 'Solution complete avec toutes les fonctionnalites',
        pricing: { monthly: 99900, yearly: 999000, currency: 'XOF' }, // ~150 EUR
        limits: { dishes: -1, orders: -1, users: -1, smsCredits: -1, storage: -1, tables: -1, campaigns: -1, locations: -1 },
        trialDays: 30,
        sortOrder: 5,
      },
    ];

    const plans: any[] = [];
    for (const p of planData) {
      const plan = await SubscriptionPlan.create(p);
      plans.push(plan);
    }
    console.log(`✓ Created ${plans.length} subscription plans\n`);

    // ========================================
    // STEP 4: Create 40 Restaurants with Owners
    // ========================================
    console.log('Creating restaurants and owners...');

    const restaurants: any[] = [];
    const owners: any[] = [];

    for (let i = 0; i < 40; i++) {
      const template = RESTAURANT_TEMPLATES[i % RESTAURANT_TEMPLATES.length];
      const firstName = randomItem(FIRST_NAMES);
      const lastName = randomItem(LAST_NAMES);
      const ownerEmail = `owner${i + 1}@menuqr.fr`;

      // Create owner
      const owner = await User.create({
        email: ownerEmail,
        password: 'Owner123!',
        name: `${firstName} ${lastName}`,
        role: 'owner',
        isActive: Math.random() > 0.1, // 90% active
      });
      owners.push(owner);

      // Create restaurant
      const isActive = Math.random() > 0.2; // 80% active
      const createdAt = randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date());

      const restaurant = await Restaurant.create({
        name: i === 0 ? template.name : `${template.name} ${i > RESTAURANT_TEMPLATES.length ? Math.ceil(i / RESTAURANT_TEMPLATES.length) : ''}`.trim(),
        slug: generateSlug(`${template.name}-${i + 1}`),
        description: `Restaurant de cuisine ${template.cuisine} situe a ${template.city}`,
        phone: `+33 ${Math.floor(100000000 + Math.random() * 900000000)}`,
        email: `contact@${generateSlug(template.name)}-${i + 1}.fr`,
        address: {
          street: `${Math.floor(1 + Math.random() * 200)} Rue de la Gastronomie`,
          city: template.city,
          postalCode: template.country === 'France' ? `${Math.floor(10000 + Math.random() * 90000)}` : '',
          country: template.country,
        },
        openingHours: [
          { day: 'monday', open: '11:00', close: '22:00', isClosed: Math.random() > 0.8 },
          { day: 'tuesday', open: '11:00', close: '22:00', isClosed: false },
          { day: 'wednesday', open: '11:00', close: '22:00', isClosed: false },
          { day: 'thursday', open: '11:00', close: '22:00', isClosed: false },
          { day: 'friday', open: '11:00', close: '23:00', isClosed: false },
          { day: 'saturday', open: '11:00', close: '23:00', isClosed: false },
          { day: 'sunday', open: '12:00', close: '21:00', isClosed: Math.random() > 0.7 },
        ],
        settings: {
          currency: 'XOF', // Tous les montants en FCFA
          timezone: template.country === 'France' ? 'Europe/Paris' : 'Africa/Ouagadougou',
          defaultLanguage: 'fr',
          availableLanguages: ['fr', 'en'],
          orderNotifications: true,
          autoAcceptOrders: Math.random() > 0.5,
          tablePrefix: 'Table',
          tableCount: 5 + Math.floor(Math.random() * 20),
        },
        ownerId: owner._id,
        isActive,
        createdAt,
        updatedAt: createdAt,
      });

      // Update owner with restaurant ID
      owner.restaurantId = restaurant._id;
      await owner.save();

      restaurants.push({ restaurant, template, owner });
    }
    console.log(`✓ Created ${restaurants.length} restaurants with owners\n`);

    // ========================================
    // STEP 5: Create Staff for Each Restaurant
    // ========================================
    console.log('Creating staff users...');

    let staffCount = 0;
    for (const { restaurant } of restaurants) {
      const numStaff = 2 + Math.floor(Math.random() * 4); // 2-5 staff per restaurant
      for (let j = 0; j < numStaff; j++) {
        const firstName = randomItem(FIRST_NAMES);
        const lastName = randomItem(LAST_NAMES);
        await User.create({
          email: `staff${staffCount + 1}@menuqr.fr`,
          password: 'Staff123!',
          name: `${firstName} ${lastName}`,
          role: randomItem(['admin', 'staff', 'staff']),
          restaurantId: restaurant._id,
          isActive: Math.random() > 0.15,
        });
        staffCount++;
      }
    }
    console.log(`✓ Created ${staffCount} staff users\n`);

    // ========================================
    // STEP 6: Create Categories and Dishes
    // ========================================
    console.log('Creating categories and dishes...');

    let totalDishes = 0;
    for (const { restaurant, template } of restaurants) {
      const categoryTemplates = CATEGORY_TEMPLATES[template.cuisine] || CATEGORY_TEMPLATES.default;
      const dishNames = DISH_NAMES[template.cuisine] || DISH_NAMES.default;

      const categories: any[] = [];
      for (let c = 0; c < categoryTemplates.length; c++) {
        const cat = await Category.create({
          name: { fr: categoryTemplates[c].name, en: categoryTemplates[c].name },
          description: { fr: `Decouvrez nos ${categoryTemplates[c].name.toLowerCase()}`, en: `Discover our ${categoryTemplates[c].name.toLowerCase()}` },
          icon: categoryTemplates[c].icon,
          order: c + 1,
          restaurantId: restaurant._id,
          isActive: true,
        });
        categories.push(cat);
      }

      // Create dishes
      const numDishes = 20 + Math.floor(Math.random() * 40); // 20-60 dishes
      for (let d = 0; d < numDishes; d++) {
        const category = randomItem(categories);
        const dishName = randomItem(dishNames);
        const price = 500 + Math.floor(Math.random() * 5000); // Prix en FCFA (500 - 5500 XOF)

        await Dish.create({
          name: { fr: `${dishName} ${d + 1}`, en: `${dishName} ${d + 1}` },
          description: { fr: `Delicieux ${dishName.toLowerCase()} prepare avec soin`, en: `Delicious ${dishName.toLowerCase()} carefully prepared` },
          price,
          categoryId: category._id,
          restaurantId: restaurant._id,
          isVegetarian: Math.random() > 0.7,
          isSpicy: Math.random() > 0.7,
          spicyLevel: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
          isAvailable: Math.random() > 0.1,
          isPopular: Math.random() > 0.8,
          isNewDish: Math.random() > 0.85,
          preparationTime: 10 + Math.floor(Math.random() * 25),
          order: d + 1,
        });
        totalDishes++;
      }
    }
    console.log(`✓ Created ${totalDishes} dishes\n`);

    // ========================================
    // STEP 7: Create Tables
    // ========================================
    console.log('Creating tables...');

    let totalTables = 0;
    for (const { restaurant } of restaurants) {
      const numTables = 5 + Math.floor(Math.random() * 20);
      for (let t = 0; t < numTables; t++) {
        await Table.create({
          name: `Table ${t + 1}`,
          capacity: 2 + Math.floor(Math.random() * 8),
          minCapacity: 1,
          location: randomItem(['indoor', 'outdoor', 'terrace', 'private']),
          restaurantId: restaurant._id,
          isActive: Math.random() > 0.1,
          order: t + 1,
        });
        totalTables++;
      }
    }
    console.log(`✓ Created ${totalTables} tables\n`);

    // ========================================
    // STEP 8: Create Customers
    // ========================================
    console.log('Creating customers...');

    let totalCustomers = 0;
    const customersByRestaurant: Map<string, any[]> = new Map();

    for (const { restaurant } of restaurants) {
      const numCustomers = 10 + Math.floor(Math.random() * 15);
      const customers: any[] = [];

      for (let c = 0; c < numCustomers; c++) {
        const firstName = randomItem(FIRST_NAMES);
        const lastName = randomItem(LAST_NAMES);
        const tiers = ['bronze', 'bronze', 'bronze', 'argent', 'argent', 'or', 'platine'] as const;

        const customer = await Customer.create({
          phone: `+33 6 ${Math.floor(10000000 + Math.random() * 90000000)}`,
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${totalCustomers}@email.com`,
          password: 'Customer123!',
          restaurantId: restaurant._id,
          isPhoneVerified: true,
          isActive: true,
          totalOrders: Math.floor(Math.random() * 30),
          totalSpent: Math.floor(Math.random() * 50000),
          loyalty: {
            totalPoints: Math.floor(Math.random() * 3000),
            lifetimePoints: Math.floor(Math.random() * 10000),
            currentTier: randomItem(tiers),
            tierUpdatedAt: new Date(),
          },
        });
        customers.push(customer);
        totalCustomers++;
      }
      customersByRestaurant.set(restaurant._id.toString(), customers);
    }
    console.log(`✓ Created ${totalCustomers} customers\n`);

    // ========================================
    // STEP 9: Create Orders
    // ========================================
    console.log('Creating orders...');

    let totalOrders = 0;
    const orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'completed', 'completed', 'completed', 'cancelled'] as const;

    for (const { restaurant } of restaurants) {
      const numOrders = 30 + Math.floor(Math.random() * 70); // 30-100 orders
      const customers = customersByRestaurant.get(restaurant._id.toString()) || [];
      const dishes = await Dish.find({ restaurantId: restaurant._id });

      for (let o = 0; o < numOrders; o++) {
        const customer = randomItem(customers);
        const status = randomItem(orderStatuses);
        const numItems = 1 + Math.floor(Math.random() * 4);
        const selectedDishes = dishes.sort(() => Math.random() - 0.5).slice(0, numItems);

        const items = selectedDishes.map((dish: any) => {
          const qty = 1 + Math.floor(Math.random() * 3);
          return {
            dishId: dish._id,
            name: dish.name?.fr || 'Plat',
            price: dish.price,
            quantity: qty,
            subtotal: dish.price * qty,
          };
        });

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const daysAgo = Math.floor(Math.random() * 90);
        const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        totalOrders++;
        await Order.create({
          orderNumber: `${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(totalOrders).padStart(5, '0')}`,
          restaurantId: restaurant._id,
          customerId: customer?._id,
          tableNumber: status !== 'cancelled' ? `${1 + Math.floor(Math.random() * 10)}` : undefined,
          customerName: customer?.name || 'Client',
          customerPhone: customer?.phone,
          items,
          subtotal,
          tax: 0,
          total: subtotal,
          status,
          paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? 'failed' : 'pending',
          paymentMethod: randomItem(['cash', 'card', 'mobile_money']),
          createdAt: orderDate,
          updatedAt: orderDate,
          ...(status === 'completed' && { completedAt: orderDate }),
          ...(status === 'cancelled' && { cancelledAt: orderDate, cancelReason: 'Annulation client' }),
        });
      }
    }
    console.log(`✓ Created ${totalOrders} orders\n`);

    // ========================================
    // STEP 10: Create Subscriptions
    // ========================================
    console.log('Creating subscriptions...');

    const subscriptionDistribution = [
      { plan: 'free', count: 4 },
      { plan: 'starter', count: 12 },
      { plan: 'professional', count: 14 },
      { plan: 'business', count: 6 },
      { plan: 'enterprise', count: 4 },
    ];

    const subscriptionStatuses = ['active', 'active', 'active', 'active', 'trial', 'trial', 'past_due', 'cancelled', 'expired'] as const;
    let subIndex = 0;

    for (const { plan: planSlug, count } of subscriptionDistribution) {
      const plan = plans.find((p: any) => p.slug === planSlug);
      for (let s = 0; s < count && subIndex < restaurants.length; s++) {
        const { restaurant } = restaurants[subIndex];
        const status = randomItem(subscriptionStatuses);
        const createdAt = randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date());
        const periodStart = new Date(createdAt);
        const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

        await Subscription.create({
          restaurantId: restaurant._id,
          planId: plan._id,
          status,
          billingCycle: Math.random() > 0.3 ? 'monthly' : 'yearly',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          trialEndsAt: status === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : undefined,
          cancelledAt: status === 'cancelled' ? new Date() : undefined,
          usage: {
            dishes: Math.floor(Math.random() * 50),
            orders: Math.floor(Math.random() * 200),
            smsCredits: Math.floor(Math.random() * 50),
            storage: Math.floor(Math.random() * 200),
            campaigns: Math.floor(Math.random() * 5),
            lastResetAt: periodStart,
          },
          createdAt,
        });
        subIndex++;
      }
    }
    console.log(`✓ Created ${subIndex} subscriptions\n`);

    // ========================================
    // STEP 11: Create Invoices
    // ========================================
    console.log('Creating invoices...');

    let totalInvoices = 0;
    const invoiceStatuses = ['paid', 'paid', 'paid', 'paid', 'pending', 'pending', 'failed', 'refunded', 'cancelled'] as const;

    const subscriptions = await Subscription.find().populate('planId');
    for (const sub of subscriptions) {
      const plan = sub.planId as any;
      if (!plan || plan.slug === 'free') continue;

      const numInvoices = 3 + Math.floor(Math.random() * 4); // 3-6 invoices per subscription
      for (let inv = 0; inv < numInvoices; inv++) {
        const status = randomItem(invoiceStatuses);
        const monthsAgo = inv;
        const periodStart = new Date(Date.now() - (monthsAgo + 1) * 30 * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
        const dueDate = new Date(periodStart.getTime() + 15 * 24 * 60 * 60 * 1000);

        const subtotal = plan.pricing?.monthly || 2900;
        const taxRate = 20;
        const taxAmount = Math.round(subtotal * taxRate / 100);
        const total = subtotal + taxAmount;

        totalInvoices++;
        await Invoice.create({
          invoiceNumber: `INV-2024-${String(totalInvoices).padStart(5, '0')}`,
          restaurantId: sub.restaurantId,
          subscriptionId: sub._id,
          planId: plan._id,
          billingCycle: sub.billingCycle,
          periodStart,
          periodEnd,
          items: [{
            description: `Abonnement ${plan.name} - ${sub.billingCycle === 'monthly' ? 'Mensuel' : 'Annuel'}`,
            quantity: 1,
            unitPrice: subtotal,
            amount: subtotal,
          }],
          subtotal,
          taxRate,
          taxAmount,
          total,
          currency: 'XOF',
          status,
          dueDate,
          paidAt: status === 'paid' ? new Date(dueDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000) : undefined,
          paymentMethod: status === 'paid' ? randomItem(['card', 'bank_transfer']) : undefined,
          createdAt: periodStart,
        });
      }
    }
    console.log(`✓ Created ${totalInvoices} invoices\n`);

    // ========================================
    // STEP 12: Create Reviews
    // ========================================
    console.log('Creating reviews...');

    let totalReviews = 0;
    const reviewStatuses = ['approved', 'approved', 'approved', 'approved', 'pending', 'flagged'] as const;
    const reviewComments = [
      { rating: 5, title: 'Excellent!', comment: 'Service impeccable et cuisine delicieuse.' },
      { rating: 5, title: 'Parfait', comment: 'Je recommande vivement!' },
      { rating: 4, title: 'Tres bien', comment: 'Bonne qualite, je reviendrai.' },
      { rating: 4, title: 'Satisfait', comment: 'Plats savoureux et copieux.' },
      { rating: 3, title: 'Correct', comment: 'Pas mal mais peut mieux faire.' },
      { rating: 2, title: 'Decu', comment: 'Service lent et plats tiedes.' },
      { rating: 1, title: 'A eviter', comment: 'Tres mauvaise experience.' },
    ];

    for (const { restaurant, owner } of restaurants) {
      const numReviews = 5 + Math.floor(Math.random() * 10);
      const customers = customersByRestaurant.get(restaurant._id.toString()) || [];
      const dishes = await Dish.find({ restaurantId: restaurant._id });

      for (let r = 0; r < numReviews; r++) {
        const customer = randomItem(customers);
        const dish = randomItem(dishes);
        const status = randomItem(reviewStatuses);
        const reviewData = status === 'flagged' ? reviewComments.slice(-2)[Math.floor(Math.random() * 2)] : randomItem(reviewComments.slice(0, 5));

        await Review.create({
          restaurantId: restaurant._id,
          dishId: dish?._id,
          customerId: customer?._id,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          status,
          isVerifiedPurchase: Math.random() > 0.3,
          helpfulCount: Math.floor(Math.random() * 20),
          createdAt: randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
          ...(status === 'approved' && Math.random() > 0.6 && {
            response: {
              content: 'Merci pour votre avis!',
              respondedAt: new Date(),
              respondedBy: owner._id,
            },
          }),
        });
        totalReviews++;
      }
    }
    console.log(`✓ Created ${totalReviews} reviews\n`);

    // ========================================
    // STEP 13: Create Reservations
    // ========================================
    console.log('Creating reservations...');

    let totalReservations = 0;
    const reservationStatuses = ['pending', 'confirmed', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

    for (const { restaurant } of restaurants) {
      const numReservations = 5 + Math.floor(Math.random() * 10);
      const customers = customersByRestaurant.get(restaurant._id.toString()) || [];
      const tables = await Table.find({ restaurantId: restaurant._id });

      for (let res = 0; res < numReservations; res++) {
        const customer = randomItem(customers);
        const table = randomItem(tables);
        const status = randomItem(reservationStatuses);
        const daysOffset = ['completed', 'no_show'].includes(status) ? -Math.floor(Math.random() * 14) - 1 : Math.floor(Math.random() * 14) + 1;
        const resDate = new Date();
        resDate.setDate(resDate.getDate() + daysOffset);
        resDate.setHours(12 + Math.floor(Math.random() * 8), 0, 0, 0);

        totalReservations++;
        await Reservation.create({
          reservationNumber: `R${String(totalReservations).padStart(6, '0')}`,
          restaurantId: restaurant._id,
          customerId: customer?._id,
          tableId: table?._id,
          reservationDate: resDate,
          timeSlot: `${12 + Math.floor(Math.random() * 8)}:00`,
          partySize: 2 + Math.floor(Math.random() * 6),
          duration: 90,
          status,
          customerName: customer?.name || 'Client',
          customerPhone: customer?.phone,
          customerEmail: customer?.email,
          locationPreference: randomItem(['indoor', 'outdoor', 'terrace', 'no_preference']),
          createdAt: new Date(resDate.getTime() - 3 * 24 * 60 * 60 * 1000),
        });
      }
    }
    console.log(`✓ Created ${totalReservations} reservations\n`);

    // ========================================
    // STEP 14: Create Audit Logs
    // ========================================
    console.log('Creating audit logs...');

    const auditActions = ['login', 'create', 'update', 'delete', 'settings_change', 'status_change'] as const;
    const auditCategories = ['authentication', 'order', 'dish', 'reservation', 'user', 'settings', 'subscription', 'restaurant'] as const;

    let totalLogs = 0;
    const allUsers = await User.find();

    for (let log = 0; log < 1000; log++) {
      const user = randomItem(allUsers) as any;
      const action = randomItem([...auditActions]);
      const category = randomItem([...auditCategories]);

      await AuditLog.create({
        action,
        category,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} operation on ${category}`,
        status: Math.random() > 0.05 ? 'success' : 'failure',
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
      });
      totalLogs++;
    }
    console.log(`✓ Created ${totalLogs} audit logs\n`);

    // ========================================
    // STEP 15: Create Notifications
    // ========================================
    console.log('Creating notifications...');

    const notificationTypes = ['info', 'warning', 'success', 'subscription_expiring', 'payment_success', 'feature_update', 'security_alert'] as const;
    const notificationStatuses = ['pending', 'sent', 'delivered', 'read', 'failed'] as const;
    const notificationPriorities = ['low', 'normal', 'high', 'urgent'] as const;

    const notificationTemplates = [
      { title: 'Bienvenue sur MenuQR!', message: 'Votre compte a été créé avec succès. Découvrez toutes les fonctionnalités disponibles.', type: 'success' },
      { title: 'Abonnement expirant bientôt', message: 'Votre abonnement expire dans 7 jours. Renouvelez-le pour continuer à profiter de nos services.', type: 'subscription_expiring' },
      { title: 'Paiement reçu', message: 'Nous avons bien reçu votre paiement de 19 900 FCFA. Merci pour votre confiance!', type: 'payment_success' },
      { title: 'Nouvelle fonctionnalité disponible', message: 'Le module de livraison est maintenant disponible! Activez-le depuis votre tableau de bord.', type: 'feature_update' },
      { title: 'Maintenance prévue', message: 'Une maintenance est prévue le 15 janvier de 2h à 4h du matin. Le service sera temporairement indisponible.', type: 'info' },
      { title: 'Alerte de sécurité', message: 'Une connexion inhabituelle a été détectée sur votre compte. Si ce n\'était pas vous, changez votre mot de passe.', type: 'security_alert' },
      { title: 'Promotion spéciale', message: 'Profitez de -20% sur l\'abonnement annuel jusqu\'au 31 janvier!', type: 'info' },
      { title: 'Rappel: Complétez votre profil', message: 'Ajoutez les informations manquantes pour optimiser votre expérience.', type: 'warning' },
      { title: 'Nouvelle commande reçue', message: 'Vous avez reçu une nouvelle commande #2024-0125. Consultez-la depuis votre tableau de bord.', type: 'info' },
      { title: 'Mise à jour des CGU', message: 'Nos conditions générales d\'utilisation ont été mises à jour. Consultez les changements.', type: 'info' },
    ];

    let totalNotifications = 0;
    for (let i = 0; i < 100; i++) {
      const template = randomItem(notificationTemplates);
      const user = randomItem(allUsers) as any;
      const status = randomItem([...notificationStatuses]);
      const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());

      await Notification.create({
        recipientType: randomItem(['user', 'restaurant', 'all']),
        recipientId: user.restaurantId || user._id,
        title: template.title,
        message: template.message,
        type: template.type,
        channels: randomItem([['in_app'], ['in_app', 'email'], ['email'], ['in_app', 'email', 'push']]),
        status,
        priority: randomItem([...notificationPriorities]),
        sentAt: ['sent', 'delivered', 'read'].includes(status) ? createdAt : undefined,
        readAt: status === 'read' ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) : undefined,
        createdBy: superadmin._id,
        createdAt,
      });
      totalNotifications++;
    }
    console.log(`✓ Created ${totalNotifications} notifications\n`);

    // ========================================
    // STEP 16: Create Announcements
    // ========================================
    console.log('Creating announcements...');

    const announcementData = [
      {
        title: { fr: 'Bienvenue sur MenuQR 2.0!', en: 'Welcome to MenuQR 2.0!' },
        content: { fr: 'Découvrez notre nouvelle interface entièrement repensée avec de nombreuses améliorations.', en: 'Discover our completely redesigned interface with many improvements.' },
        type: 'feature',
        status: 'active',
      },
      {
        title: { fr: 'Maintenance programmée', en: 'Scheduled Maintenance' },
        content: { fr: 'Une maintenance est prévue le 20 janvier de 2h à 5h du matin (UTC).', en: 'Maintenance is scheduled for January 20th from 2am to 5am (UTC).' },
        type: 'maintenance',
        status: 'active',
      },
      {
        title: { fr: 'Offre spéciale Nouvel An!', en: 'New Year Special Offer!' },
        content: { fr: 'Profitez de -30% sur tous nos abonnements annuels jusqu\'au 31 janvier.', en: 'Get 30% off all annual subscriptions until January 31st.' },
        type: 'promotion',
        status: 'active',
      },
      {
        title: { fr: 'Nouveau module de livraison', en: 'New Delivery Module' },
        content: { fr: 'Le module de livraison est maintenant disponible pour tous les abonnés Business et Enterprise.', en: 'The delivery module is now available for all Business and Enterprise subscribers.' },
        type: 'feature',
        status: 'active',
      },
      {
        title: { fr: 'Mise à jour de sécurité', en: 'Security Update' },
        content: { fr: 'Nous avons renforcé la sécurité de la plateforme. Veuillez mettre à jour votre mot de passe.', en: 'We have enhanced platform security. Please update your password.' },
        type: 'warning',
        status: 'expired',
      },
    ];

    let totalAnnouncements = 0;
    for (const ann of announcementData) {
      const startsAt = randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date());
      await Announcement.create({
        title: ann.title,
        content: ann.content,
        type: ann.type,
        target: 'all',
        status: ann.status,
        priority: Math.floor(Math.random() * 10),
        displayLocation: randomItem([['dashboard'], ['dashboard', 'sidebar'], ['dashboard', 'banner'], ['banner', 'modal']]),
        startsAt,
        endsAt: new Date(startsAt.getTime() + (7 + Math.floor(Math.random() * 23)) * 24 * 60 * 60 * 1000),
        dismissible: Math.random() > 0.3,
        createdBy: superadmin._id,
      });
      totalAnnouncements++;
    }
    console.log(`✓ Created ${totalAnnouncements} announcements\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Seed Completed Successfully!                         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const summary = {
      'Restaurants': await Restaurant.countDocuments(),
      'Users (Total)': await User.countDocuments(),
      'Customers': await Customer.countDocuments(),
      'Categories': await Category.countDocuments(),
      'Dishes': await Dish.countDocuments(),
      'Tables': await Table.countDocuments(),
      'Orders': await Order.countDocuments(),
      'Reservations': await Reservation.countDocuments(),
      'Reviews': await Review.countDocuments(),
      'Subscription Plans': await SubscriptionPlan.countDocuments(),
      'Subscriptions': await Subscription.countDocuments(),
      'Invoices': await Invoice.countDocuments(),
      'Audit Logs': await AuditLog.countDocuments(),
    };

    console.log('Collection Counts:');
    for (const [key, value] of Object.entries(summary)) {
      console.log(`  ${key}: ${value}`);
    }

    console.log('\n========================================');
    console.log('Test Accounts:');
    console.log('========================================');
    console.log('\nSuper Admin:');
    console.log('  Email: superadmin@menuqr.fr');
    console.log('  Password: SuperAdmin123!');
    console.log('  URL: /super-admin/login');
    console.log('\nRestaurant Owners (40 accounts):');
    console.log('  Email: owner1@menuqr.fr to owner40@menuqr.fr');
    console.log('  Password: Owner123!');
    console.log('  URL: /admin/login');
    console.log('\nStaff Users:');
    console.log('  Email: staff1@menuqr.fr to staff120@menuqr.fr');
    console.log('  Password: Staff123!');
    console.log('\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedSuperAdmin();
