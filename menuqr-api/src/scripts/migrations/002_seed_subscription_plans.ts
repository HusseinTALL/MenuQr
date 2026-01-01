/**
 * Migration: Seed Subscription Plans
 *
 * Creates the default subscription plans with proper feature flags and limits.
 * Run with: npx tsx src/scripts/migrations/002_seed_subscription_plans.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SubscriptionPlan, DEFAULT_FEATURES, IPlanFeatures } from '../../models/SubscriptionPlan.js';
import {
  TIERS,
  Tier,
  DEFAULT_PLAN_LIMITS,
  DEFAULT_PLAN_PRICING,
} from '../../config/features.js';

dotenv.config();

// ============================================
// Plan Definitions
// ============================================

interface PlanDefinition {
  name: string;
  slug: string;
  tier: Tier;
  description: string;
  displayFeatures: string[];
  trialDays: number;
  isPopular: boolean;
  sortOrder: number;
}

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    name: 'Free',
    slug: 'free',
    tier: TIERS.FREE,
    description: 'Perfect for trying out MenuQR with basic features.',
    displayFeatures: [
      'Up to 15 menu items',
      'Up to 50 orders/month',
      '5 QR code tables',
      'Basic dashboard',
      'Email support',
    ],
    trialDays: 0,
    isPopular: false,
    sortOrder: 0,
  },
  {
    name: 'Starter',
    slug: 'starter',
    tier: TIERS.STARTER,
    description: 'Great for small restaurants getting started with digital menus.',
    displayFeatures: [
      'Up to 50 menu items',
      'Up to 500 orders/month',
      '15 QR code tables',
      'Customer accounts',
      'Multi-language menu (2 languages)',
      'Dish variants & options',
      'Basic analytics',
      'Email notifications',
    ],
    trialDays: 14,
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: 'Professional',
    slug: 'professional',
    tier: TIERS.PROFESSIONAL,
    description: 'For growing restaurants that need advanced operational features.',
    displayFeatures: [
      'Up to 150 menu items',
      'Up to 2,000 orders/month',
      '50 QR code tables',
      'Reservation system',
      'Customer reviews & ratings',
      'Inventory management',
      'Scheduled orders',
      'Kitchen Display System (KDS)',
      'SMS order notifications',
      'Allergen & nutrition info',
      '200 SMS credits/month',
    ],
    trialDays: 14,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'Business',
    slug: 'business',
    tier: TIERS.BUSINESS,
    description: 'Full-featured solution for established restaurants.',
    displayFeatures: [
      'Up to 500 menu items',
      'Up to 10,000 orders/month',
      'Unlimited tables',
      'Loyalty program',
      'SMS marketing campaigns',
      'Advanced analytics',
      'Full data export (CSV, PDF)',
      'Multi-location support (up to 3)',
      'API access (read)',
      'Custom branding (white label)',
      'Webhooks',
      '1,000 SMS credits/month',
      'Priority support',
    ],
    trialDays: 14,
    isPopular: false,
    sortOrder: 3,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    tier: TIERS.ENTERPRISE,
    description: 'Complete platform for large operations with delivery and hotel services.',
    displayFeatures: [
      'Unlimited everything',
      'Delivery management',
      'Driver fleet management',
      'Real-time GPS tracking',
      'Route optimization',
      'Proof of delivery',
      'Hotel room service module',
      'Two-factor authentication',
      'Audit logs',
      'Full API access (read/write)',
      'Custom integrations',
      '10,000 SMS credits/month',
      'Dedicated support',
      'SLA guarantee (99.9% uptime)',
    ],
    trialDays: 30,
    isPopular: false,
    sortOrder: 4,
  },
];

// ============================================
// Migration Functions
// ============================================

async function seedPlans(): Promise<void> {
  console.log('Starting subscription plans migration...\n');

  for (const planDef of PLAN_DEFINITIONS) {
    const limits = DEFAULT_PLAN_LIMITS[planDef.tier];
    const pricing = DEFAULT_PLAN_PRICING[planDef.tier];
    const features = DEFAULT_FEATURES[planDef.tier] as IPlanFeatures;

    // Check if plan exists
    const existingPlan = await SubscriptionPlan.findOne({ slug: planDef.slug });

    if (existingPlan) {
      // Update existing plan
      console.log(`Updating existing plan: ${planDef.name}`);

      await SubscriptionPlan.updateOne(
        { slug: planDef.slug },
        {
          $set: {
            name: planDef.name,
            tier: planDef.tier,
            description: planDef.description,
            displayFeatures: planDef.displayFeatures,
            enabledFeatures: features,
            limits: {
              dishes: limits.dishes,
              orders: limits.orders,
              users: limits.users,
              smsCredits: limits.smsCredits,
              storage: limits.storage,
              tables: limits.tables,
              campaigns: limits.campaigns,
              locations: limits.locations,
            },
            pricing: {
              monthly: pricing.monthly,
              yearly: pricing.yearly,
              currency: pricing.currency,
            },
            trialDays: planDef.trialDays,
            isPopular: planDef.isPopular,
            sortOrder: planDef.sortOrder,
            isActive: true,
          },
        }
      );

      console.log(`  ✓ Updated ${planDef.name} plan\n`);
    } else {
      // Create new plan
      console.log(`Creating new plan: ${planDef.name}`);

      await SubscriptionPlan.create({
        name: planDef.name,
        slug: planDef.slug,
        tier: planDef.tier,
        description: planDef.description,
        displayFeatures: planDef.displayFeatures,
        enabledFeatures: features,
        limits: {
          dishes: limits.dishes,
          orders: limits.orders,
          users: limits.users,
          smsCredits: limits.smsCredits,
          storage: limits.storage,
          tables: limits.tables,
          campaigns: limits.campaigns,
          locations: limits.locations,
        },
        pricing: {
          monthly: pricing.monthly,
          yearly: pricing.yearly,
          currency: pricing.currency,
        },
        trialDays: planDef.trialDays,
        isPopular: planDef.isPopular,
        sortOrder: planDef.sortOrder,
        isActive: true,
      });

      console.log(`  ✓ Created ${planDef.name} plan\n`);
    }
  }
}

async function displayPlans(): Promise<void> {
  console.log('\n========================================');
  console.log('Current Subscription Plans:');
  console.log('========================================\n');

  const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });

  for (const plan of plans) {
    console.log(`${plan.name} (${plan.tier})`);
    console.log(`  Slug: ${plan.slug}`);
    console.log(`  Price: €${plan.pricing.monthly / 100}/mo or €${plan.pricing.yearly / 100}/yr`);
    console.log(`  Limits:`);
    console.log(`    - Dishes: ${plan.limits.dishes === -1 ? 'Unlimited' : plan.limits.dishes}`);
    console.log(`    - Orders: ${plan.limits.orders === -1 ? 'Unlimited' : plan.limits.orders}/mo`);
    console.log(`    - Users: ${plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}`);
    console.log(`    - Tables: ${plan.limits.tables === -1 ? 'Unlimited' : plan.limits.tables}`);
    console.log(`    - SMS: ${plan.limits.smsCredits}/mo`);
    console.log(`  Trial: ${plan.trialDays} days`);
    console.log(`  Popular: ${plan.isPopular ? 'Yes' : 'No'}`);
    console.log('');
  }
}

async function migrateExistingSubscriptions(): Promise<void> {
  console.log('\n========================================');
  console.log('Migrating Existing Subscriptions:');
  console.log('========================================\n');

  // Import Subscription model
  const { Subscription } = await import('../../models/Subscription.js');

  // Get subscriptions that might have old plan references
  const subscriptions = await Subscription.find({}).populate('planId');

  let migrated = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    if (!sub.planId) {
      // Assign free plan to subscriptions without a plan
      const freePlan = await SubscriptionPlan.findOne({ slug: 'free' });
      if (freePlan) {
        await Subscription.updateOne(
          { _id: sub._id },
          { $set: { planId: freePlan._id } }
        );
        console.log(`  Assigned free plan to subscription ${sub._id}`);
        migrated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n  Migrated: ${migrated}`);
  console.log(`  Skipped: ${skipped}`);
}

// ============================================
// Main Execution
// ============================================

async function main(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/menuqr';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected!\n');

  try {
    // Seed plans
    await seedPlans();

    // Display current plans
    await displayPlans();

    // Migrate existing subscriptions
    await migrateExistingSubscriptions();

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
main().catch(console.error);

export { seedPlans, displayPlans, migrateExistingSubscriptions };
