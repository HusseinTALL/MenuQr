/**
 * Seed Subscription Script
 *
 * Creates subscription plans and assigns an enterprise subscription
 * to a specified restaurant for testing/development.
 *
 * Usage: TMPDIR=/tmp npx tsx scripts/seedSubscription.ts [email]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan.js';
import { Subscription } from '../src/models/Subscription.js';
import { User } from '../src/models/User.js';
import { Restaurant } from '../src/models/Restaurant.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr';

// All features enabled for enterprise plan
const ALL_FEATURES = {
  // Core (Free)
  menuManagement: true,
  orders: true,
  qrCodes: true,
  basicDashboard: true,
  basicSettings: true,

  // Growth (Starter)
  customerAccounts: true,
  basicAnalytics: true,
  dishVariants: true,
  dishOptions: true,
  multiLanguage: true,
  emailNotifications: true,
  orderHistory: true,

  // Professional
  reservations: true,
  reviews: true,
  inventory: true,
  scheduledOrders: true,
  kds: true,
  smsNotifications: true,
  allergenInfo: true,
  nutritionInfo: true,
  advancedDashboard: true,
  basicExport: true,

  // Business
  loyaltyProgram: true,
  smsCampaigns: true,
  advancedAnalytics: true,
  dataExport: true,
  multiLocation: true,
  apiRead: true,
  whiteLabel: true,
  webhooks: true,
  prioritySupport: true,
  customBranding: true,

  // Enterprise
  deliveryModule: true,
  driverManagement: true,
  gpsTracking: true,
  routeOptimization: true,
  proofOfDelivery: true,
  hotelModule: true,
  twoFactorAuth: true,
  auditLogs: true,
  apiWrite: true,
  customIntegrations: true,
  dedicatedSupport: true,
  slaGuarantee: true,
};

const SUBSCRIPTION_PLANS = [
  {
    name: 'Gratuit',
    slug: 'free',
    tier: 'free',
    description: 'Pour démarrer avec les fonctionnalités de base',
    displayFeatures: [
      'Gestion du menu',
      'QR codes illimités',
      'Commandes en ligne',
      'Tableau de bord basique',
    ],
    enabledFeatures: {
      menuManagement: true,
      orders: true,
      qrCodes: true,
      basicDashboard: true,
      basicSettings: true,
    },
    limits: {
      dishes: 20,
      orders: 100,
      users: 1,
      smsCredits: 0,
      storage: 100,
      tables: 5,
      campaigns: 0,
      locations: 1,
    },
    pricing: { monthly: 0, yearly: 0, currency: 'EUR' },
    trialDays: 0,
    sortOrder: 0,
  },
  {
    name: 'Starter',
    slug: 'starter',
    tier: 'starter',
    description: 'Pour les petits restaurants qui veulent grandir',
    displayFeatures: [
      'Tout de Gratuit +',
      'Comptes clients',
      'Analyses de base',
      'Multi-langue',
      'Notifications email',
    ],
    enabledFeatures: {
      menuManagement: true,
      orders: true,
      qrCodes: true,
      basicDashboard: true,
      basicSettings: true,
      customerAccounts: true,
      basicAnalytics: true,
      dishVariants: true,
      dishOptions: true,
      multiLanguage: true,
      emailNotifications: true,
      orderHistory: true,
    },
    limits: {
      dishes: 50,
      orders: 500,
      users: 3,
      smsCredits: 50,
      storage: 500,
      tables: 15,
      campaigns: 2,
      locations: 1,
    },
    pricing: { monthly: 2900, yearly: 27900, currency: 'EUR' },
    trialDays: 14,
    sortOrder: 1,
  },
  {
    name: 'Professionnel',
    slug: 'professional',
    tier: 'professional',
    description: 'Pour les restaurants établis',
    displayFeatures: [
      'Tout de Starter +',
      'Réservations en ligne',
      'Gestion des avis',
      'Gestion des stocks',
      'Commandes programmées',
      'Écran cuisine (KDS)',
    ],
    enabledFeatures: {
      menuManagement: true,
      orders: true,
      qrCodes: true,
      basicDashboard: true,
      basicSettings: true,
      customerAccounts: true,
      basicAnalytics: true,
      dishVariants: true,
      dishOptions: true,
      multiLanguage: true,
      emailNotifications: true,
      orderHistory: true,
      reservations: true,
      reviews: true,
      inventory: true,
      scheduledOrders: true,
      kds: true,
      smsNotifications: true,
      allergenInfo: true,
      nutritionInfo: true,
      advancedDashboard: true,
      basicExport: true,
    },
    limits: {
      dishes: 200,
      orders: 2000,
      users: 10,
      smsCredits: 200,
      storage: 2000,
      tables: 50,
      campaigns: 10,
      locations: 1,
    },
    pricing: { monthly: 4900, yearly: 47000, currency: 'EUR' },
    trialDays: 14,
    sortOrder: 2,
    isPopular: true,
  },
  {
    name: 'Business',
    slug: 'business',
    tier: 'business',
    description: 'Pour les chaînes et franchises',
    displayFeatures: [
      'Tout de Professionnel +',
      'Programme de fidélité',
      'Campagnes SMS',
      'Analyses avancées',
      'Multi-établissements',
      'Accès API',
    ],
    enabledFeatures: {
      menuManagement: true,
      orders: true,
      qrCodes: true,
      basicDashboard: true,
      basicSettings: true,
      customerAccounts: true,
      basicAnalytics: true,
      dishVariants: true,
      dishOptions: true,
      multiLanguage: true,
      emailNotifications: true,
      orderHistory: true,
      reservations: true,
      reviews: true,
      inventory: true,
      scheduledOrders: true,
      kds: true,
      smsNotifications: true,
      allergenInfo: true,
      nutritionInfo: true,
      advancedDashboard: true,
      basicExport: true,
      loyaltyProgram: true,
      smsCampaigns: true,
      advancedAnalytics: true,
      dataExport: true,
      multiLocation: true,
      apiRead: true,
      whiteLabel: true,
      webhooks: true,
      prioritySupport: true,
      customBranding: true,
    },
    limits: {
      dishes: -1, // Unlimited
      orders: -1,
      users: 50,
      smsCredits: 1000,
      storage: 10000,
      tables: -1,
      campaigns: -1,
      locations: 5,
    },
    pricing: { monthly: 9900, yearly: 95000, currency: 'EUR' },
    trialDays: 14,
    sortOrder: 3,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    tier: 'enterprise',
    description: 'Solution complète sur mesure',
    displayFeatures: [
      'Tout de Business +',
      'Module livraison',
      'Gestion livreurs',
      'Module hôtellerie',
      'Authentification 2FA',
      'Journaux d\'audit',
      'Support dédié 24/7',
    ],
    enabledFeatures: ALL_FEATURES,
    limits: {
      dishes: -1,
      orders: -1,
      users: -1,
      smsCredits: -1,
      storage: -1,
      tables: -1,
      campaigns: -1,
      locations: -1,
    },
    pricing: { monthly: 19900, yearly: 190000, currency: 'EUR' },
    trialDays: 30,
    sortOrder: 4,
  },
];

async function seedSubscription(userEmail: string) {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!\n');

  try {
    // 1. Create/Update subscription plans
    console.log('=== Creating Subscription Plans ===');
    for (const planData of SUBSCRIPTION_PLANS) {
      const existing = await SubscriptionPlan.findOne({ slug: planData.slug });
      if (existing) {
        await SubscriptionPlan.updateOne({ slug: planData.slug }, { $set: planData });
        console.log(`  Updated: ${planData.name} (${planData.slug})`);
      } else {
        await SubscriptionPlan.create(planData);
        console.log(`  Created: ${planData.name} (${planData.slug})`);
      }
    }

    // 2. Find the user
    console.log(`\n=== Finding user: ${userEmail} ===`);
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`User not found: ${userEmail}`);
      process.exit(1);
    }
    console.log(`  Found user: ${user.name} (${user.role})`);

    if (!user.restaurantId) {
      console.error('User has no restaurant associated');
      process.exit(1);
    }

    // 3. Find the restaurant
    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant) {
      console.error('Restaurant not found');
      process.exit(1);
    }
    console.log(`  Restaurant: ${restaurant.name}`);

    // 4. Get enterprise plan
    const enterprisePlan = await SubscriptionPlan.findOne({ slug: 'enterprise' });
    if (!enterprisePlan) {
      console.error('Enterprise plan not found');
      process.exit(1);
    }

    // 5. Create/Update subscription
    console.log('\n=== Creating Subscription ===');
    const existingSubscription = await Subscription.findOne({ restaurantId: restaurant._id });

    const subscriptionData = {
      restaurantId: restaurant._id,
      planId: enterprisePlan._id,
      status: 'active' as const,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      usage: {
        dishes: 0,
        orders: 0,
        smsCredits: 0,
        storage: 0,
        campaigns: 0,
      },
    };

    if (existingSubscription) {
      await Subscription.updateOne(
        { _id: existingSubscription._id },
        { $set: subscriptionData }
      );
      console.log('  Updated existing subscription to Enterprise plan');
    } else {
      await Subscription.create(subscriptionData);
      console.log('  Created new Enterprise subscription');
    }

    console.log('\n=== SUCCESS ===');
    console.log(`Restaurant "${restaurant.name}" now has Enterprise subscription with ALL features enabled!`);
    console.log('\nEnabled features include:');
    console.log('  - Reservations');
    console.log('  - Loyalty Program');
    console.log('  - SMS Campaigns');
    console.log('  - Delivery Module');
    console.log('  - Hotel Module');
    console.log('  - And all other features...');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'admin@menuqr.fr';
seedSubscription(email);
