# Subscription-Based Feature Restrictions

## Executive Summary

This document provides a comprehensive analysis of how to implement subscription-based feature restrictions in MenuQR. It covers feature identification, tier proposals, technical implementation, and best practices.

---

## Table of Contents

1. [Current System Analysis](#1-current-system-analysis)
2. [Feature Classification for Subscription Tiers](#2-feature-classification-for-subscription-tiers)
3. [Proposed Subscription Tiers](#3-proposed-subscription-tiers)
4. [Technical Implementation](#4-technical-implementation)
5. [Database Schema Changes](#5-database-schema-changes)
6. [Handling Expired/Downgraded Subscriptions](#6-handling-expireddowngraded-subscriptions)
7. [Security Best Practices](#7-security-best-practices)
8. [User Experience Guidelines](#8-user-experience-guidelines)
9. [Missing Components & Improvements](#9-missing-components--improvements)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Current System Analysis

### 1.1 Existing Subscription Infrastructure

MenuQR already has foundational subscription models:

**SubscriptionPlan Model** (`src/models/SubscriptionPlan.ts`):
```typescript
interface IPlanLimits {
  dishes: number;      // Menu items limit
  orders: number;      // Monthly orders
  users: number;       // Staff accounts
  smsCredits: number;  // Monthly SMS
  storage: number;     // Storage in MB
  tables: number;      // QR tables
  campaigns: number;   // Marketing campaigns
}
```

**Subscription Model** (`src/models/Subscription.ts`):
- Links restaurant to plan
- Tracks usage (dishes, orders, SMS, storage, campaigns)
- Manages billing cycle and status
- Stripe integration ready

### 1.2 Current Authorization System

The platform uses Role-Based Access Control (RBAC) with 80+ granular permissions:
- Restaurant roles: owner, admin, manager, kitchen, cashier, staff
- Hotel roles: hotel_owner, hotel_manager, reception, room_service, concierge
- Driver role: delivery_driver

**Key Gap**: The current system enforces **role-based permissions** but not **subscription-based feature access**.

### 1.3 All Platform Features Identified

| Category | Features |
|----------|----------|
| **Core** | Menu management, Orders, Tables, QR codes |
| **Customer** | Customer accounts, Order history, Favorites |
| **Engagement** | Reviews & ratings, Loyalty program |
| **Marketing** | SMS campaigns, Email templates |
| **Operations** | Reservations, Scheduled orders, Inventory/stock |
| **Delivery** | Driver management, Real-time tracking, Route optimization, POD |
| **Analytics** | Dashboard, Reports, Export |
| **Security** | 2FA, Session management, Audit logs |
| **Hotel** | Room service, Guest management, Multi-building support |
| **Integration** | Stripe payments, Twilio SMS/Voice, Google Maps, Cloudinary |

---

## 2. Feature Classification for Subscription Tiers

### 2.1 Classification Criteria

Features are classified based on:
1. **Value to Business**: Revenue generation potential
2. **Operational Complexity**: Cost to provide/support
3. **Market Positioning**: Competitive differentiation
4. **Usage Patterns**: Frequency and importance

### 2.2 Feature Tier Matrix

#### Tier 1: Essential (All Plans)
Features every restaurant needs to operate:

| Feature | Justification |
|---------|---------------|
| Menu Management (basic) | Core functionality |
| Order Processing | Core functionality |
| QR Code Generation | Core functionality |
| Basic Dashboard | Visibility into operations |
| Single Staff Account | Minimum viable operation |
| Customer Guest Orders | Revenue generation |
| Basic Settings | Restaurant configuration |

#### Tier 2: Growth Features (Starter+)
Features that help restaurants grow:

| Feature | Justification |
|---------|---------------|
| Multiple Staff Accounts | Team collaboration |
| Basic Analytics | Data-driven decisions |
| Customer Accounts | Build customer base |
| Order History | Customer retention |
| Email Notifications | Communication |
| Category Management | Menu organization |
| Dish Variants/Options | Menu flexibility |

#### Tier 3: Professional Features (Professional+)
Advanced operational features:

| Feature | Justification |
|---------|---------------|
| Reservations System | Table management |
| Reviews & Ratings | Reputation management |
| Inventory/Stock Management | Operational efficiency |
| Scheduled Orders | Revenue optimization |
| Multi-language Menu | Accessibility |
| Allergen/Nutrition Info | Compliance |
| Kitchen Display System | Operations |
| SMS Notifications | Enhanced communication |

#### Tier 4: Premium Features (Business+)
High-value differentiators:

| Feature | Justification |
|---------|---------------|
| Loyalty Program | Customer retention |
| SMS Marketing Campaigns | Growth tool |
| Advanced Analytics | Deep insights |
| Data Export (CSV/PDF) | Business intelligence |
| Multiple Locations | Scale support |
| Priority Support | Service level |
| API Access | Custom integrations |
| Custom Branding | White-label experience |

#### Tier 5: Enterprise Features (Enterprise)
Full platform capabilities:

| Feature | Justification |
|---------|---------------|
| Delivery Management | Full logistics |
| Driver Fleet Management | Scale operations |
| Real-time GPS Tracking | Premium delivery |
| Route Optimization | Efficiency |
| Hotel Module | Hospitality expansion |
| Two-Factor Authentication | Enterprise security |
| Audit Logs | Compliance |
| Custom Integrations | Enterprise needs |
| Dedicated Support | SLA guarantee |
| SLA Guarantee | Enterprise requirement |

---

## 3. Proposed Subscription Tiers

### 3.1 Tier Overview

| Tier | Target | Monthly Price | Annual Price |
|------|--------|---------------|--------------|
| **Free** | Trial/Hobby | 0 | 0 |
| **Starter** | Small restaurants | 29 | 290 (save 17%) |
| **Professional** | Growing restaurants | 79 | 790 (save 17%) |
| **Business** | Multi-location | 149 | 1,490 (save 17%) |
| **Enterprise** | Large operations | Custom | Custom |

### 3.2 Detailed Tier Specifications

#### FREE Tier (14-day trial, then limited)
```
Limits:
- 15 dishes
- 50 orders/month
- 1 staff account
- 5 tables
- 50MB storage
- 0 SMS credits
- 0 campaigns

Features:
- Basic menu management
- Order processing
- QR code generation
- Basic dashboard
- Guest checkout only
- Email support (48h response)

Restrictions:
- "Powered by MenuQR" branding
- No customer accounts
- No reservations
- No reviews
- No analytics export
```

#### STARTER Tier - 29/month
```
Limits:
- 50 dishes
- 500 orders/month
- 3 staff accounts
- 15 tables
- 500MB storage
- 50 SMS credits
- 2 campaigns/month

Features (includes Free +):
- Customer accounts
- Order history
- Basic analytics
- Email notifications
- Category management
- Dish variants & options
- Multi-language menu (2 languages)

Restrictions:
- No reservations
- No loyalty program
- No scheduled orders
- Basic support only
```

#### PROFESSIONAL Tier - 79/month
```
Limits:
- 150 dishes
- 2,000 orders/month
- 10 staff accounts
- 50 tables
- 2GB storage
- 200 SMS credits
- 10 campaigns/month

Features (includes Starter +):
- Reservation system
- Reviews & ratings
- Inventory management
- Scheduled orders
- Kitchen Display System (KDS)
- SMS order notifications
- Allergen/nutrition info
- Advanced dashboard
- Basic analytics export

Restrictions:
- No loyalty program
- No advanced analytics
- Standard support only
```

#### BUSINESS Tier - 149/month
```
Limits:
- 500 dishes
- 10,000 orders/month
- 25 staff accounts
- Unlimited tables
- 10GB storage
- 1,000 SMS credits
- Unlimited campaigns

Features (includes Professional +):
- Loyalty program
- SMS marketing campaigns
- Advanced analytics
- Full data export (CSV, PDF)
- Multi-location support (up to 3)
- API access (read-only)
- Custom branding (remove MenuQR)
- Priority support (24h response)
- Webhook notifications

Restrictions:
- No delivery module
- No hotel module
- Limited API (read-only)
```

#### ENTERPRISE Tier - Custom pricing
```
Limits:
- Unlimited dishes
- Unlimited orders
- Unlimited staff
- Unlimited tables
- 100GB storage
- 10,000 SMS credits
- Unlimited campaigns

Features (includes Business +):
- Delivery management
- Driver fleet management
- Real-time GPS tracking
- Route optimization (Google Maps)
- Proof of delivery (photo, signature)
- Hotel module
- Two-factor authentication
- Audit logs
- Full API access (read/write)
- Custom integrations
- Dedicated account manager
- Phone support
- SLA guarantee (99.9% uptime)
- Training sessions
- Custom development options
```

### 3.3 Feature Access Matrix

| Feature | Free | Starter | Pro | Business | Enterprise |
|---------|:----:|:-------:|:---:|:--------:|:----------:|
| Menu Management | Basic | Full | Full | Full | Full |
| Orders | 50/mo | 500/mo | 2K/mo | 10K/mo | Unlimited |
| QR Codes | 5 | 15 | 50 | Unlimited | Unlimited |
| Staff Accounts | 1 | 3 | 10 | 25 | Unlimited |
| Customer Accounts | - | Yes | Yes | Yes | Yes |
| Reservations | - | - | Yes | Yes | Yes |
| Reviews | - | - | Yes | Yes | Yes |
| Inventory | - | - | Yes | Yes | Yes |
| Scheduled Orders | - | - | Yes | Yes | Yes |
| Loyalty Program | - | - | - | Yes | Yes |
| SMS Campaigns | - | - | - | Yes | Yes |
| Advanced Analytics | - | - | Basic | Full | Full |
| Data Export | - | - | Basic | Full | Full |
| API Access | - | - | - | Read | Full |
| Delivery Module | - | - | - | - | Yes |
| Hotel Module | - | - | - | - | Yes |
| 2FA | - | - | - | - | Yes |
| Audit Logs | - | - | - | - | Yes |
| White Label | - | - | - | Yes | Yes |
| SLA | - | - | - | - | Yes |

---

## 4. Technical Implementation

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vue.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  Feature Flags Provider  │  UI Guards  │  Upgrade Prompts       │
└────────────────────┬────────────────────┬───────────────────────┘
                     │                    │
                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Node.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  Feature Middleware  │  Subscription Service  │  Usage Tracker  │
└────────────────────┬────────────────────┬───────────────────────┘
                     │                    │
                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database (MongoDB)                        │
├─────────────────────────────────────────────────────────────────┤
│  SubscriptionPlan  │  Subscription  │  FeatureUsage             │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Backend Implementation

#### 4.2.1 Feature Flags Definition

Create `src/config/features.ts`:

```typescript
/**
 * Feature Flags Configuration
 * Maps subscription tiers to available features
 */

export const FEATURES = {
  // Core Features
  MENU_MANAGEMENT: 'menu_management',
  ORDERS: 'orders',
  QR_CODES: 'qr_codes',
  BASIC_DASHBOARD: 'basic_dashboard',

  // Growth Features
  CUSTOMER_ACCOUNTS: 'customer_accounts',
  BASIC_ANALYTICS: 'basic_analytics',
  DISH_VARIANTS: 'dish_variants',
  MULTI_LANGUAGE: 'multi_language',

  // Professional Features
  RESERVATIONS: 'reservations',
  REVIEWS: 'reviews',
  INVENTORY: 'inventory',
  SCHEDULED_ORDERS: 'scheduled_orders',
  KDS: 'kds',
  SMS_NOTIFICATIONS: 'sms_notifications',
  ALLERGEN_INFO: 'allergen_info',

  // Business Features
  LOYALTY_PROGRAM: 'loyalty_program',
  SMS_CAMPAIGNS: 'sms_campaigns',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  DATA_EXPORT: 'data_export',
  MULTI_LOCATION: 'multi_location',
  API_READ: 'api_read',
  WHITE_LABEL: 'white_label',
  WEBHOOKS: 'webhooks',

  // Enterprise Features
  DELIVERY_MODULE: 'delivery_module',
  DRIVER_MANAGEMENT: 'driver_management',
  GPS_TRACKING: 'gps_tracking',
  ROUTE_OPTIMIZATION: 'route_optimization',
  PROOF_OF_DELIVERY: 'proof_of_delivery',
  HOTEL_MODULE: 'hotel_module',
  TWO_FACTOR_AUTH: 'two_factor_auth',
  AUDIT_LOGS: 'audit_logs',
  API_WRITE: 'api_write',
  CUSTOM_INTEGRATIONS: 'custom_integrations',
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];

// Feature tiers mapping
export const TIER_FEATURES: Record<string, Feature[]> = {
  free: [
    FEATURES.MENU_MANAGEMENT,
    FEATURES.ORDERS,
    FEATURES.QR_CODES,
    FEATURES.BASIC_DASHBOARD,
  ],

  starter: [
    // Includes free +
    FEATURES.CUSTOMER_ACCOUNTS,
    FEATURES.BASIC_ANALYTICS,
    FEATURES.DISH_VARIANTS,
    FEATURES.MULTI_LANGUAGE,
  ],

  professional: [
    // Includes starter +
    FEATURES.RESERVATIONS,
    FEATURES.REVIEWS,
    FEATURES.INVENTORY,
    FEATURES.SCHEDULED_ORDERS,
    FEATURES.KDS,
    FEATURES.SMS_NOTIFICATIONS,
    FEATURES.ALLERGEN_INFO,
  ],

  business: [
    // Includes professional +
    FEATURES.LOYALTY_PROGRAM,
    FEATURES.SMS_CAMPAIGNS,
    FEATURES.ADVANCED_ANALYTICS,
    FEATURES.DATA_EXPORT,
    FEATURES.MULTI_LOCATION,
    FEATURES.API_READ,
    FEATURES.WHITE_LABEL,
    FEATURES.WEBHOOKS,
  ],

  enterprise: [
    // Includes business +
    FEATURES.DELIVERY_MODULE,
    FEATURES.DRIVER_MANAGEMENT,
    FEATURES.GPS_TRACKING,
    FEATURES.ROUTE_OPTIMIZATION,
    FEATURES.PROOF_OF_DELIVERY,
    FEATURES.HOTEL_MODULE,
    FEATURES.TWO_FACTOR_AUTH,
    FEATURES.AUDIT_LOGS,
    FEATURES.API_WRITE,
    FEATURES.CUSTOM_INTEGRATIONS,
  ],
};

/**
 * Get all features available for a tier (including inherited)
 */
export function getFeaturesForTier(tierSlug: string): Feature[] {
  const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
  const tierIndex = tiers.indexOf(tierSlug);

  if (tierIndex === -1) return TIER_FEATURES.free;

  const features: Feature[] = [];
  for (let i = 0; i <= tierIndex; i++) {
    features.push(...(TIER_FEATURES[tiers[i]] || []));
  }

  return [...new Set(features)]; // Remove duplicates
}
```

#### 4.2.2 Feature Middleware

Create `src/middleware/feature.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Feature, getFeaturesForTier } from '../config/features.js';

/**
 * Middleware to check if a feature is available for the restaurant's subscription
 */
export function requireFeature(feature: Feature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        return res.status(401).json({
          success: false,
          message: 'Restaurant context required',
        });
      }

      // Get subscription with plan
      const subscription = await Subscription.findOne({ restaurantId })
        .populate<{ planId: { slug: string } }>('planId', 'slug');

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found',
          code: 'NO_SUBSCRIPTION',
          upgradeUrl: '/settings/billing',
        });
      }

      // Check subscription status
      if (!subscription.isValid()) {
        return res.status(403).json({
          success: false,
          message: 'Subscription expired or inactive',
          code: 'SUBSCRIPTION_INACTIVE',
          status: subscription.status,
          upgradeUrl: '/settings/billing',
        });
      }

      // Get available features for this tier
      const planSlug = (subscription.planId as { slug: string }).slug;
      const availableFeatures = getFeaturesForTier(planSlug);

      if (!availableFeatures.includes(feature)) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a higher subscription tier`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeature: feature,
          currentPlan: planSlug,
          upgradeUrl: '/settings/billing/upgrade',
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature access',
      });
    }
  };
}

/**
 * Check multiple features (any of them)
 */
export function requireAnyFeature(features: Feature[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        return res.status(401).json({ success: false, message: 'Restaurant context required' });
      }

      const subscription = await Subscription.findOne({ restaurantId })
        .populate<{ planId: { slug: string } }>('planId', 'slug');

      if (!subscription || !subscription.isValid()) {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
        });
      }

      const planSlug = (subscription.planId as { slug: string }).slug;
      const availableFeatures = getFeaturesForTier(planSlug);

      const hasAny = features.some(f => availableFeatures.includes(f));

      if (!hasAny) {
        return res.status(403).json({
          success: false,
          message: 'This feature requires a higher subscription tier',
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeatures: features,
          currentPlan: planSlug,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error checking feature access' });
    }
  };
}

/**
 * Usage limit middleware
 */
export function checkUsageLimit(resource: 'dishes' | 'orders' | 'smsCredits' | 'campaigns') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user?.restaurantId;

      const subscription = await Subscription.findOne({ restaurantId })
        .populate<{ planId: { limits: Record<string, number> } }>('planId', 'limits');

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription',
          code: 'NO_SUBSCRIPTION',
        });
      }

      const plan = subscription.planId as { limits: Record<string, number> };
      const limit = plan.limits[resource];
      const used = subscription.usage[resource as keyof typeof subscription.usage] || 0;

      // -1 means unlimited
      if (limit !== -1 && used >= limit) {
        return res.status(403).json({
          success: false,
          message: `You have reached your ${resource} limit for this billing period`,
          code: 'USAGE_LIMIT_EXCEEDED',
          resource,
          limit,
          used,
          upgradeUrl: '/settings/billing/upgrade',
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error checking usage limit' });
    }
  };
}
```

#### 4.2.3 Subscription Service

Create `src/services/subscriptionService.ts`:

```typescript
import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Feature, getFeaturesForTier } from '../config/features.js';

export const subscriptionService = {
  /**
   * Get restaurant's current subscription with plan details
   */
  async getSubscription(restaurantId: mongoose.Types.ObjectId) {
    return Subscription.findOne({ restaurantId }).populate('planId');
  },

  /**
   * Check if restaurant has access to a feature
   */
  async hasFeature(restaurantId: mongoose.Types.ObjectId, feature: Feature): Promise<boolean> {
    const subscription = await this.getSubscription(restaurantId);

    if (!subscription || !subscription.isValid()) {
      return false;
    }

    const plan = subscription.planId as any;
    const features = getFeaturesForTier(plan.slug);

    return features.includes(feature);
  },

  /**
   * Get all available features for restaurant
   */
  async getAvailableFeatures(restaurantId: mongoose.Types.ObjectId): Promise<Feature[]> {
    const subscription = await this.getSubscription(restaurantId);

    if (!subscription || !subscription.isValid()) {
      return getFeaturesForTier('free');
    }

    const plan = subscription.planId as any;
    return getFeaturesForTier(plan.slug);
  },

  /**
   * Increment usage counter
   */
  async incrementUsage(
    restaurantId: mongoose.Types.ObjectId,
    resource: 'dishes' | 'orders' | 'smsCredits' | 'campaigns',
    amount: number = 1
  ) {
    return Subscription.findOneAndUpdate(
      { restaurantId },
      { $inc: { [`usage.${resource}`]: amount } },
      { new: true }
    );
  },

  /**
   * Check if within usage limits
   */
  async checkUsageLimit(
    restaurantId: mongoose.Types.ObjectId,
    resource: 'dishes' | 'orders' | 'smsCredits' | 'campaigns'
  ): Promise<{ allowed: boolean; used: number; limit: number }> {
    const subscription = await this.getSubscription(restaurantId);

    if (!subscription) {
      return { allowed: false, used: 0, limit: 0 };
    }

    const plan = subscription.planId as any;
    const limit = plan.limits[resource];
    const used = subscription.usage[resource] || 0;

    return {
      allowed: limit === -1 || used < limit,
      used,
      limit,
    };
  },

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(restaurantId: mongoose.Types.ObjectId) {
    return Subscription.findOneAndUpdate(
      { restaurantId },
      {
        $set: {
          'usage.orders': 0,
          'usage.smsCredits': 0,
          'usage.campaigns': 0,
          'usage.lastResetAt': new Date(),
        },
      },
      { new: true }
    );
  },

  /**
   * Handle subscription downgrade
   * Returns list of features that will be lost
   */
  async previewDowngrade(
    restaurantId: mongoose.Types.ObjectId,
    newPlanSlug: string
  ): Promise<{ lostFeatures: Feature[]; overLimits: string[] }> {
    const subscription = await this.getSubscription(restaurantId);

    if (!subscription) {
      return { lostFeatures: [], overLimits: [] };
    }

    const currentPlan = subscription.planId as any;
    const currentFeatures = getFeaturesForTier(currentPlan.slug);
    const newFeatures = getFeaturesForTier(newPlanSlug);

    const lostFeatures = currentFeatures.filter(f => !newFeatures.includes(f));

    // Check if current usage exceeds new plan limits
    const newPlan = await SubscriptionPlan.findOne({ slug: newPlanSlug });
    const overLimits: string[] = [];

    if (newPlan) {
      if (subscription.usage.dishes > newPlan.limits.dishes && newPlan.limits.dishes !== -1) {
        overLimits.push(`dishes (${subscription.usage.dishes}/${newPlan.limits.dishes})`);
      }
      // Add checks for other limits...
    }

    return { lostFeatures, overLimits };
  },
};
```

#### 4.2.4 Route Integration Example

Modify routes to use feature middleware:

```typescript
// src/routes/reservationRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireFeature } from '../middleware/feature.js';
import { FEATURES } from '../config/features.js';
import * as reservationController from '../controllers/reservationController.js';

const router = Router();

// All reservation routes require the RESERVATIONS feature
router.use(authenticate, requireFeature(FEATURES.RESERVATIONS));

router.get('/', authorize('manager'), reservationController.getReservations);
router.post('/', authorize('manager'), reservationController.createReservation);
// ... other routes

export default router;
```

```typescript
// src/routes/loyaltyRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireFeature } from '../middleware/feature.js';
import { FEATURES } from '../config/features.js';
import * as loyaltyController from '../controllers/loyaltyController.js';

const router = Router();

// Loyalty program requires LOYALTY_PROGRAM feature
router.use(authenticate, requireFeature(FEATURES.LOYALTY_PROGRAM));

router.get('/stats', authorize('manager'), loyaltyController.getStats);
// ... other routes

export default router;
```

### 4.3 Frontend Implementation

#### 4.3.1 Feature Flags Composable

Create `src/composables/useFeatures.ts`:

```typescript
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

interface SubscriptionInfo {
  plan: string;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
  status: string;
}

const subscriptionInfo = ref<SubscriptionInfo | null>(null);
const loading = ref(false);

export function useFeatures() {
  const authStore = useAuthStore();

  const fetchSubscription = async () => {
    if (!authStore.isAuthenticated) return;

    loading.value = true;
    try {
      const { data } = await api.get('/subscription/current');
      subscriptionInfo.value = data.data;
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      loading.value = false;
    }
  };

  const hasFeature = (feature: string): boolean => {
    if (!subscriptionInfo.value) return false;
    return subscriptionInfo.value.features.includes(feature);
  };

  const checkLimit = (resource: string): { allowed: boolean; used: number; limit: number } => {
    if (!subscriptionInfo.value) {
      return { allowed: false, used: 0, limit: 0 };
    }

    const limit = subscriptionInfo.value.limits[resource] || 0;
    const used = subscriptionInfo.value.usage[resource] || 0;

    return {
      allowed: limit === -1 || used < limit,
      used,
      limit,
    };
  };

  const currentPlan = computed(() => subscriptionInfo.value?.plan || 'free');
  const isActive = computed(() =>
    ['active', 'trial'].includes(subscriptionInfo.value?.status || '')
  );

  // Auto-fetch when auth changes
  watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) fetchSubscription();
    else subscriptionInfo.value = null;
  }, { immediate: true });

  return {
    subscriptionInfo,
    loading,
    fetchSubscription,
    hasFeature,
    checkLimit,
    currentPlan,
    isActive,
  };
}
```

#### 4.3.2 Feature Gate Component

Create `src/components/FeatureGate.vue`:

```vue
<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="showUpgrade" class="feature-locked">
    <slot name="locked">
      <div class="upgrade-prompt">
        <LockIcon class="icon" />
        <h4>{{ lockedTitle }}</h4>
        <p>{{ lockedMessage }}</p>
        <router-link
          to="/settings/billing/upgrade"
          class="upgrade-btn"
        >
          Upgrade to {{ requiredPlan }}
        </router-link>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LockIcon } from 'lucide-vue-next';
import { useFeatures } from '@/composables/useFeatures';

const props = defineProps<{
  feature: string;
  showUpgrade?: boolean;
  requiredPlan?: string;
  lockedTitle?: string;
  lockedMessage?: string;
}>();

const { hasFeature } = useFeatures();

const hasAccess = computed(() => hasFeature(props.feature));
</script>

<style scoped>
.feature-locked {
  padding: 2rem;
  text-align: center;
  background: var(--gray-50);
  border-radius: 12px;
  border: 2px dashed var(--gray-300);
}

.upgrade-prompt {
  max-width: 300px;
  margin: 0 auto;
}

.icon {
  width: 48px;
  height: 48px;
  color: var(--gray-400);
  margin-bottom: 1rem;
}

.upgrade-btn {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
}
</style>
```

#### 4.3.3 Navigation Guard

Create `src/router/guards/featureGuard.ts`:

```typescript
import { NavigationGuard } from 'vue-router';
import { useFeatures } from '@/composables/useFeatures';

// Map routes to required features
const routeFeatures: Record<string, string> = {
  '/admin/reservations': 'reservations',
  '/admin/loyalty': 'loyalty_program',
  '/admin/campaigns': 'sms_campaigns',
  '/admin/delivery': 'delivery_module',
  '/admin/analytics': 'advanced_analytics',
  '/admin/inventory': 'inventory',
  // Add more route-feature mappings
};

export const featureGuard: NavigationGuard = (to, from, next) => {
  const { hasFeature, isActive } = useFeatures();

  // Check if subscription is active
  if (!isActive.value && !to.path.startsWith('/settings/billing')) {
    return next('/settings/billing?reason=expired');
  }

  // Check route-specific features
  const requiredFeature = routeFeatures[to.path];

  if (requiredFeature && !hasFeature(requiredFeature)) {
    return next({
      path: '/settings/billing/upgrade',
      query: {
        feature: requiredFeature,
        returnTo: to.fullPath,
      },
    });
  }

  next();
};
```

#### 4.3.4 Sidebar with Feature Indicators

```vue
<template>
  <nav class="sidebar">
    <router-link to="/admin/orders" class="nav-item">
      <ShoppingBagIcon />
      <span>Orders</span>
    </router-link>

    <router-link
      to="/admin/reservations"
      class="nav-item"
      :class="{ 'feature-locked': !hasFeature('reservations') }"
    >
      <CalendarIcon />
      <span>Reservations</span>
      <LockIcon v-if="!hasFeature('reservations')" class="lock-icon" />
      <span v-if="!hasFeature('reservations')" class="badge">Pro</span>
    </router-link>

    <router-link
      to="/admin/loyalty"
      class="nav-item"
      :class="{ 'feature-locked': !hasFeature('loyalty_program') }"
    >
      <HeartIcon />
      <span>Loyalty</span>
      <LockIcon v-if="!hasFeature('loyalty_program')" class="lock-icon" />
      <span v-if="!hasFeature('loyalty_program')" class="badge">Business</span>
    </router-link>

    <!-- More items... -->
  </nav>
</template>
```

---

## 5. Database Schema Changes

### 5.1 Updated SubscriptionPlan Schema

```typescript
// src/models/SubscriptionPlan.ts

export interface IPlanFeatures {
  // Core
  menuManagement: boolean;
  orders: boolean;
  qrCodes: boolean;

  // Growth
  customerAccounts: boolean;
  basicAnalytics: boolean;
  dishVariants: boolean;
  multiLanguage: boolean;

  // Professional
  reservations: boolean;
  reviews: boolean;
  inventory: boolean;
  scheduledOrders: boolean;
  kds: boolean;
  smsNotifications: boolean;

  // Business
  loyaltyProgram: boolean;
  smsCampaigns: boolean;
  advancedAnalytics: boolean;
  dataExport: boolean;
  multiLocation: boolean;
  apiRead: boolean;
  whiteLabel: boolean;
  webhooks: boolean;

  // Enterprise
  deliveryModule: boolean;
  driverManagement: boolean;
  gpsTracking: boolean;
  hotelModule: boolean;
  twoFactorAuth: boolean;
  auditLogs: boolean;
  apiWrite: boolean;
}

// Add to schema
const subscriptionPlanSchema = new Schema<ISubscriptionPlan>({
  // ... existing fields ...

  features: {
    menuManagement: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    qrCodes: { type: Boolean, default: true },
    customerAccounts: { type: Boolean, default: false },
    basicAnalytics: { type: Boolean, default: false },
    dishVariants: { type: Boolean, default: false },
    multiLanguage: { type: Boolean, default: false },
    reservations: { type: Boolean, default: false },
    reviews: { type: Boolean, default: false },
    inventory: { type: Boolean, default: false },
    scheduledOrders: { type: Boolean, default: false },
    kds: { type: Boolean, default: false },
    smsNotifications: { type: Boolean, default: false },
    loyaltyProgram: { type: Boolean, default: false },
    smsCampaigns: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    dataExport: { type: Boolean, default: false },
    multiLocation: { type: Boolean, default: false },
    apiRead: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    webhooks: { type: Boolean, default: false },
    deliveryModule: { type: Boolean, default: false },
    driverManagement: { type: Boolean, default: false },
    gpsTracking: { type: Boolean, default: false },
    hotelModule: { type: Boolean, default: false },
    twoFactorAuth: { type: Boolean, default: false },
    auditLogs: { type: Boolean, default: false },
    apiWrite: { type: Boolean, default: false },
  },

  // Optional feature overrides for custom plans
  customFeatures: {
    type: Map,
    of: Boolean,
    default: new Map(),
  },
});
```

### 5.2 Migration Script

```typescript
// src/scripts/migrations/002_add_plan_features.ts

import mongoose from 'mongoose';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';

const planFeatureConfigs = {
  free: {
    menuManagement: true,
    orders: true,
    qrCodes: true,
    customerAccounts: false,
    basicAnalytics: false,
    // ... all false except basics
  },
  starter: {
    menuManagement: true,
    orders: true,
    qrCodes: true,
    customerAccounts: true,
    basicAnalytics: true,
    dishVariants: true,
    multiLanguage: true,
    // ... rest false
  },
  professional: {
    // ... starter features + professional
    reservations: true,
    reviews: true,
    inventory: true,
    scheduledOrders: true,
    kds: true,
    smsNotifications: true,
  },
  business: {
    // ... professional + business
    loyaltyProgram: true,
    smsCampaigns: true,
    advancedAnalytics: true,
    dataExport: true,
    multiLocation: true,
    apiRead: true,
    whiteLabel: true,
    webhooks: true,
  },
  enterprise: {
    // All features true
    deliveryModule: true,
    driverManagement: true,
    gpsTracking: true,
    hotelModule: true,
    twoFactorAuth: true,
    auditLogs: true,
    apiWrite: true,
  },
};

async function migrate() {
  for (const [slug, features] of Object.entries(planFeatureConfigs)) {
    await SubscriptionPlan.updateOne(
      { slug },
      { $set: { features } },
      { upsert: false }
    );
    console.log(`Updated features for plan: ${slug}`);
  }
}

migrate()
  .then(() => console.log('Migration complete'))
  .catch(console.error)
  .finally(() => mongoose.disconnect());
```

---

## 6. Handling Expired/Downgraded Subscriptions

### 6.1 Expiration Handling Strategy

```typescript
// src/services/subscriptionExpirationService.ts

export const expirationService = {
  /**
   * Scheduled job to handle expired subscriptions
   * Run daily via cron
   */
  async processExpiredSubscriptions() {
    const expiredSubs = await Subscription.find({
      status: 'active',
      currentPeriodEnd: { $lt: new Date() },
    }).populate('restaurantId planId');

    for (const sub of expiredSubs) {
      // Grace period: 3 days after expiration
      const gracePeriodEnd = new Date(sub.currentPeriodEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

      if (new Date() > gracePeriodEnd) {
        // Past grace period - downgrade to free
        await this.downgradeToFree(sub);
      } else {
        // Within grace period - mark as past_due
        sub.status = 'past_due';
        await sub.save();

        // Send warning email
        await emailService.sendSubscriptionWarning(sub);
      }
    }
  },

  /**
   * Downgrade subscription to free tier
   */
  async downgradeToFree(subscription: ISubscription) {
    const freePlan = await SubscriptionPlan.findOne({ slug: 'free' });

    if (!freePlan) {
      throw new Error('Free plan not found');
    }

    // Notify about lost features
    const lostFeatures = await subscriptionService.previewDowngrade(
      subscription.restaurantId,
      'free'
    );

    // Update subscription
    subscription.planId = freePlan._id;
    subscription.status = 'expired';
    await subscription.save();

    // Handle over-limit resources
    await this.handleOverLimitResources(subscription.restaurantId, freePlan);

    // Send notification
    await emailService.sendDowngradeNotification(subscription, lostFeatures);

    // Log audit event
    await auditService.log({
      action: 'subscription_expired',
      restaurantId: subscription.restaurantId,
      details: { previousPlan: subscription.planId, lostFeatures },
    });
  },

  /**
   * Handle resources that exceed new plan limits
   */
  async handleOverLimitResources(
    restaurantId: mongoose.Types.ObjectId,
    plan: ISubscriptionPlan
  ) {
    // Option 1: Archive excess dishes (don't delete)
    const dishCount = await Dish.countDocuments({ restaurantId, isActive: true });

    if (dishCount > plan.limits.dishes) {
      const excess = dishCount - plan.limits.dishes;

      // Archive oldest dishes
      const dishesToArchive = await Dish.find({ restaurantId, isActive: true })
        .sort({ createdAt: 1 })
        .limit(excess);

      await Dish.updateMany(
        { _id: { $in: dishesToArchive.map(d => d._id) } },
        { $set: { isActive: false, archivedReason: 'plan_downgrade' } }
      );
    }

    // Similar handling for tables, staff, etc.
  },
};
```

### 6.2 Downgrade Confirmation Flow

```typescript
// Frontend: DowngradeConfirmation.vue
<template>
  <Modal v-model="show">
    <h2>Confirm Plan Change</h2>

    <div v-if="lostFeatures.length" class="warning">
      <AlertTriangleIcon />
      <h4>You will lose access to:</h4>
      <ul>
        <li v-for="feature in lostFeatures" :key="feature">
          {{ featureLabels[feature] }}
        </li>
      </ul>
    </div>

    <div v-if="overLimits.length" class="warning">
      <AlertTriangleIcon />
      <h4>These items exceed the new plan limits:</h4>
      <ul>
        <li v-for="item in overLimits" :key="item">
          {{ item }}
        </li>
      </ul>
      <p class="note">
        Excess items will be archived but not deleted.
        You can restore them by upgrading again.
      </p>
    </div>

    <div class="actions">
      <button @click="cancel" class="btn-secondary">Cancel</button>
      <button @click="confirm" class="btn-danger">
        Confirm Downgrade
      </button>
    </div>
  </Modal>
</template>
```

### 6.3 Grace Period Notifications

```typescript
// Email templates for subscription lifecycle

const templates = {
  // 7 days before expiration
  expirationReminder7Days: {
    subject: 'Your MenuQR subscription expires in 7 days',
    template: 'subscription-reminder-7d',
  },

  // 1 day before expiration
  expirationReminder1Day: {
    subject: 'Your MenuQR subscription expires tomorrow',
    template: 'subscription-reminder-1d',
  },

  // Subscription expired (grace period)
  subscriptionExpired: {
    subject: 'Your MenuQR subscription has expired',
    template: 'subscription-expired-grace',
  },

  // Grace period ending
  gracePeriodEnding: {
    subject: 'Last chance to renew your MenuQR subscription',
    template: 'subscription-grace-ending',
  },

  // Downgraded to free
  downgradedToFree: {
    subject: 'Your MenuQR account has been downgraded',
    template: 'subscription-downgraded',
  },
};
```

---

## 7. Security Best Practices

### 7.1 Backend Security

```typescript
// 1. Always validate on backend - never trust frontend
export function requireFeature(feature: Feature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Full server-side validation
    const subscription = await Subscription.findOne({
      restaurantId: req.user.restaurantId,
    }).populate('planId');

    // Validate subscription exists and is active
    if (!subscription?.isValid()) {
      return res.status(403).json({ /* ... */ });
    }

    // Validate feature access
    // ...
  };
}

// 2. Rate limit subscription checks to prevent abuse
const subscriptionCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max 100 checks per minute
  keyGenerator: (req) => req.user?.restaurantId?.toString() || req.ip,
});

// 3. Cache subscription data
const subscriptionCache = new Map<string, { data: any; expiresAt: Date }>();

async function getCachedSubscription(restaurantId: string) {
  const cached = subscriptionCache.get(restaurantId);

  if (cached && cached.expiresAt > new Date()) {
    return cached.data;
  }

  const subscription = await Subscription.findOne({ restaurantId }).populate('planId');

  subscriptionCache.set(restaurantId, {
    data: subscription,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min cache
  });

  return subscription;
}

// 4. Audit all subscription changes
async function changeSubscription(restaurantId: string, newPlanId: string, userId: string) {
  const oldSub = await Subscription.findOne({ restaurantId });

  // Make change
  const newSub = await Subscription.findOneAndUpdate(
    { restaurantId },
    { planId: newPlanId },
    { new: true }
  );

  // Audit log
  await AuditLog.create({
    action: 'subscription_changed',
    userId,
    restaurantId,
    details: {
      oldPlan: oldSub?.planId,
      newPlan: newPlanId,
      timestamp: new Date(),
    },
  });

  // Invalidate cache
  subscriptionCache.delete(restaurantId);

  return newSub;
}
```

### 7.2 Frontend Security

```typescript
// 1. Use feature checks as UX enhancement, not security
// The actual security is on the backend

// Good: Hide UI but expect backend enforcement
<template>
  <button
    v-if="hasFeature('loyalty_program')"
    @click="openLoyalty"
  >
    Loyalty Program
  </button>
</template>

// 2. Handle API 403 responses gracefully
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403) {
      const code = error.response.data?.code;

      if (code === 'FEATURE_NOT_AVAILABLE') {
        // Show upgrade modal
        showUpgradeModal(error.response.data.requiredFeature);
      } else if (code === 'SUBSCRIPTION_INACTIVE') {
        // Redirect to billing
        router.push('/settings/billing?reason=inactive');
      } else if (code === 'USAGE_LIMIT_EXCEEDED') {
        // Show limit exceeded notification
        showLimitExceededNotification(error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

// 3. Periodically refresh subscription data
const { fetchSubscription } = useFeatures();

// Refresh every 5 minutes
setInterval(() => {
  fetchSubscription();
}, 5 * 60 * 1000);

// Also refresh on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    fetchSubscription();
  }
});
```

### 7.3 Anti-Circumvention Measures

```typescript
// 1. Validate usage increments server-side
async function createDish(restaurantId: string, dishData: any) {
  // Check limit BEFORE creating
  const { allowed, used, limit } = await subscriptionService.checkUsageLimit(
    restaurantId,
    'dishes'
  );

  if (!allowed) {
    throw new AppError(403, 'Dish limit reached', 'USAGE_LIMIT_EXCEEDED');
  }

  // Create dish
  const dish = await Dish.create({ ...dishData, restaurantId });

  // Increment usage AFTER success
  await subscriptionService.incrementUsage(restaurantId, 'dishes', 1);

  return dish;
}

// 2. Periodic usage reconciliation
async function reconcileUsage(restaurantId: string) {
  const actualCounts = {
    dishes: await Dish.countDocuments({ restaurantId, isActive: true }),
    // ... other resources
  };

  await Subscription.updateOne(
    { restaurantId },
    { $set: { 'usage.dishes': actualCounts.dishes } }
  );
}

// 3. Feature-specific data validation
// Ensure feature data can't be created without feature access
const dishSchema = new Schema({
  // ...
  allergenInfo: {
    type: Object,
    validate: {
      validator: async function(this: any) {
        if (!this.allergenInfo) return true;

        // Verify restaurant has allergen_info feature
        const hasFeature = await subscriptionService.hasFeature(
          this.restaurantId,
          FEATURES.ALLERGEN_INFO
        );
        return hasFeature;
      },
      message: 'Allergen info requires Professional plan or higher',
    },
  },
});
```

---

## 8. User Experience Guidelines

### 8.1 Feature Discovery

```vue
<!-- Feature teaser for locked features -->
<template>
  <div class="feature-teaser" v-if="!hasFeature('loyalty_program')">
    <div class="teaser-content">
      <GiftIcon class="icon" />
      <h3>Loyalty Program</h3>
      <p>Reward your regulars and increase repeat visits by up to 35%</p>
      <ul class="benefits">
        <li>Points for every order</li>
        <li>Tier-based rewards</li>
        <li>Automated campaigns</li>
      </ul>
      <button @click="showUpgradeModal('loyalty_program')" class="btn-primary">
        Upgrade to Business
      </button>
    </div>
    <div class="teaser-preview">
      <img src="/previews/loyalty-dashboard.png" alt="Loyalty Dashboard Preview" />
      <span class="preview-label">Preview</span>
    </div>
  </div>
</template>
```

### 8.2 Upgrade Prompts

```typescript
// Strategic upgrade prompts based on usage patterns

const upgradePrompts = {
  // Approaching limit
  approachingLimit: {
    threshold: 0.8, // 80% of limit
    message: "You're using {used} of {limit} {resource}. Upgrade for unlimited access.",
    cta: "Upgrade Now",
  },

  // Trying locked feature
  lockedFeature: {
    message: "{feature} is available on {plan} and above.",
    cta: "See Plans",
  },

  // Power user behavior
  powerUser: {
    triggers: ['daily_login', 'high_order_volume', 'team_invites'],
    message: "You're a power user! Unlock advanced features to grow faster.",
    cta: "Explore Pro Features",
  },

  // Competitor comparison
  competitorComparison: {
    message: "Get features like {competitor} for a fraction of the cost.",
    cta: "Compare Plans",
  },
};
```

### 8.3 Graceful Degradation

```vue
<!-- Show read-only view for downgraded features -->
<template>
  <div class="loyalty-section">
    <div v-if="hasFeature('loyalty_program')">
      <!-- Full loyalty management UI -->
      <LoyaltyDashboard />
    </div>
    <div v-else-if="hadFeatureBefore('loyalty_program')">
      <!-- Read-only view of existing data -->
      <div class="degraded-view">
        <div class="alert warning">
          <AlertIcon />
          <p>
            Your plan no longer includes Loyalty Program.
            <router-link to="/settings/billing/upgrade">Upgrade</router-link>
            to manage your loyalty program.
          </p>
        </div>

        <!-- Show stats but disable actions -->
        <LoyaltyStatsReadOnly :stats="loyaltyStats" />

        <p class="note">
          Customer points are preserved. Upgrade anytime to resume.
        </p>
      </div>
    </div>
    <div v-else>
      <!-- Feature teaser for new users -->
      <LoyaltyTeaser />
    </div>
  </div>
</template>
```

### 8.4 Trial Experience

```typescript
// Trial-specific UX enhancements

const trialConfig = {
  // Show trial banner with days remaining
  showTrialBanner: true,

  // Unlock all features during trial
  unlockAllFeatures: true,

  // Show feature usage hints
  showFeatureHints: true,

  // Prompt to upgrade at milestones
  milestonePrompts: [
    { day: 7, message: "Day 7 of your trial! Ready to go Pro?" },
    { day: 12, message: "Only 2 days left in your trial" },
    { day: 14, message: "Last day! Don't lose your setup" },
  ],

  // Highlight features they've used
  usedFeatureSummary: true,
};

// Trial countdown component
<template>
  <div class="trial-banner" v-if="isInTrial">
    <ClockIcon />
    <span>{{ daysRemaining }} days left in your trial</span>
    <button @click="upgrade" class="btn-sm btn-primary">
      Upgrade Now
    </button>
  </div>
</template>
```

---

## 9. Missing Components & Improvements

### 9.1 Current Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Feature flags in SubscriptionPlan | High | Medium | Add feature booleans to plan schema |
| Feature middleware | High | Low | Create `requireFeature()` middleware |
| Frontend feature provider | High | Medium | Global subscription state management |
| Usage tracking | High | Medium | Accurate resource counting |
| Downgrade handling | Medium | High | Graceful degradation & data preservation |
| Upgrade flow UI | Medium | Medium | Compelling upgrade experience |
| Trial experience | Medium | Low | Trial-specific UX |
| Plan comparison page | Low | Medium | Feature matrix comparison |
| Usage dashboard | Low | Medium | Visual usage vs limits |

### 9.2 Recommended Improvements

1. **Real-time Feature Updates**
   - WebSocket push when subscription changes
   - Immediate UI updates without refresh

2. **Usage Alerts**
   - Email at 80% usage
   - Dashboard warnings at 90%
   - Block at 100% with upgrade prompt

3. **Flexible Custom Plans**
   - Enterprise plan customization
   - Feature add-ons a la carte
   - Volume discounts

4. **Analytics on Upgrades**
   - Track upgrade conversion rates
   - A/B test upgrade prompts
   - Identify upgrade triggers

5. **Self-Service Downgrade**
   - Allow downgrades without support
   - Clear communication of impact
   - 30-day data retention

### 9.3 Technical Debt to Address

1. **Consolidate Permission Systems**
   - Merge role permissions with feature access
   - Single authorization layer

2. **Improve Caching**
   - Redis-based subscription cache
   - Cache invalidation on changes

3. **Add Comprehensive Tests**
   - Unit tests for feature middleware
   - Integration tests for upgrade/downgrade
   - E2E tests for subscription flows

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Add `features` field to SubscriptionPlan schema
- [ ] Create feature flags configuration (`src/config/features.ts`)
- [ ] Implement `requireFeature()` middleware
- [ ] Create `subscriptionService` utility functions
- [ ] Add migration script for existing plans

### Phase 2: Backend Integration (Week 3-4)
- [ ] Apply feature middleware to all protected routes
- [ ] Add usage tracking middleware
- [ ] Implement usage limit checks
- [ ] Create subscription API endpoints
- [ ] Add audit logging for subscription events

### Phase 3: Frontend Foundation (Week 5-6)
- [ ] Create `useFeatures()` composable
- [ ] Build `FeatureGate` component
- [ ] Add router guards for feature routes
- [ ] Update navigation with feature indicators
- [ ] Handle 403 errors gracefully

### Phase 4: Upgrade Experience (Week 7-8)
- [ ] Build plan comparison page
- [ ] Create upgrade modal component
- [ ] Implement Stripe checkout integration
- [ ] Add usage dashboard widget
- [ ] Create trial experience enhancements

### Phase 5: Downgrade Handling (Week 9-10)
- [ ] Implement downgrade preview API
- [ ] Build downgrade confirmation flow
- [ ] Create data archival system
- [ ] Add grace period handling
- [ ] Set up expiration notification emails

### Phase 6: Polish & Launch (Week 11-12)
- [ ] Comprehensive testing
- [ ] Documentation update
- [ ] Staff training materials
- [ ] Soft launch to select customers
- [ ] Monitor and iterate

---

## Appendix A: Feature Flag Reference

```typescript
// Complete feature reference for all tiers

export const FEATURE_REFERENCE = {
  // FREE
  menu_management: { tier: 'free', description: 'Basic menu CRUD' },
  orders: { tier: 'free', description: 'Order processing' },
  qr_codes: { tier: 'free', description: 'QR code generation' },
  basic_dashboard: { tier: 'free', description: 'Overview dashboard' },

  // STARTER
  customer_accounts: { tier: 'starter', description: 'Customer registration' },
  basic_analytics: { tier: 'starter', description: 'Basic stats' },
  dish_variants: { tier: 'starter', description: 'Size/variant options' },
  multi_language: { tier: 'starter', description: '2 language support' },

  // PROFESSIONAL
  reservations: { tier: 'professional', description: 'Table reservations' },
  reviews: { tier: 'professional', description: 'Customer reviews' },
  inventory: { tier: 'professional', description: 'Stock management' },
  scheduled_orders: { tier: 'professional', description: 'Future orders' },
  kds: { tier: 'professional', description: 'Kitchen Display System' },
  sms_notifications: { tier: 'professional', description: 'SMS alerts' },
  allergen_info: { tier: 'professional', description: 'Allergen tracking' },

  // BUSINESS
  loyalty_program: { tier: 'business', description: 'Points & rewards' },
  sms_campaigns: { tier: 'business', description: 'Marketing SMS' },
  advanced_analytics: { tier: 'business', description: 'Deep analytics' },
  data_export: { tier: 'business', description: 'CSV/PDF export' },
  multi_location: { tier: 'business', description: 'Multiple venues' },
  api_read: { tier: 'business', description: 'Read-only API' },
  white_label: { tier: 'business', description: 'Remove branding' },
  webhooks: { tier: 'business', description: 'Event webhooks' },

  // ENTERPRISE
  delivery_module: { tier: 'enterprise', description: 'Delivery management' },
  driver_management: { tier: 'enterprise', description: 'Driver fleet' },
  gps_tracking: { tier: 'enterprise', description: 'Real-time GPS' },
  route_optimization: { tier: 'enterprise', description: 'Route planning' },
  proof_of_delivery: { tier: 'enterprise', description: 'POD capture' },
  hotel_module: { tier: 'enterprise', description: 'Hotel room service' },
  two_factor_auth: { tier: 'enterprise', description: '2FA security' },
  audit_logs: { tier: 'enterprise', description: 'Activity logs' },
  api_write: { tier: 'enterprise', description: 'Full API access' },
  custom_integrations: { tier: 'enterprise', description: 'Custom dev' },
};
```

---

## Appendix B: API Endpoints

```
# Subscription Management

GET    /api/v1/subscription/current     # Get current subscription
GET    /api/v1/subscription/features    # Get available features
GET    /api/v1/subscription/usage       # Get usage stats
GET    /api/v1/subscription/plans       # List all plans
POST   /api/v1/subscription/upgrade     # Upgrade plan
POST   /api/v1/subscription/downgrade   # Downgrade plan
POST   /api/v1/subscription/cancel      # Cancel subscription

# Stripe Integration
POST   /api/v1/stripe/create-checkout   # Create Stripe checkout
POST   /api/v1/stripe/webhook           # Stripe webhook handler
GET    /api/v1/stripe/portal            # Get Stripe billing portal

# Usage
GET    /api/v1/usage/summary            # Usage summary
GET    /api/v1/usage/history            # Usage history
```

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Claude Code*
