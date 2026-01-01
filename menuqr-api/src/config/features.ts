/**
 * Feature Flags Configuration
 *
 * Defines all features available in MenuQR and maps them to subscription tiers.
 * Features are organized hierarchically - higher tiers include all lower tier features.
 */

// ============================================
// Feature Definitions
// ============================================

export const FEATURES = {
  // ==========================================
  // Core Features (Free tier)
  // ==========================================
  MENU_MANAGEMENT: 'menu_management',
  ORDERS: 'orders',
  QR_CODES: 'qr_codes',
  BASIC_DASHBOARD: 'basic_dashboard',
  BASIC_SETTINGS: 'basic_settings',

  // ==========================================
  // Growth Features (Starter tier)
  // ==========================================
  CUSTOMER_ACCOUNTS: 'customer_accounts',
  BASIC_ANALYTICS: 'basic_analytics',
  DISH_VARIANTS: 'dish_variants',
  DISH_OPTIONS: 'dish_options',
  MULTI_LANGUAGE: 'multi_language',
  EMAIL_NOTIFICATIONS: 'email_notifications',
  ORDER_HISTORY: 'order_history',

  // ==========================================
  // Professional Features (Professional tier)
  // ==========================================
  RESERVATIONS: 'reservations',
  REVIEWS: 'reviews',
  INVENTORY: 'inventory',
  SCHEDULED_ORDERS: 'scheduled_orders',
  KDS: 'kds',
  SMS_NOTIFICATIONS: 'sms_notifications',
  ALLERGEN_INFO: 'allergen_info',
  NUTRITION_INFO: 'nutrition_info',
  ADVANCED_DASHBOARD: 'advanced_dashboard',
  BASIC_EXPORT: 'basic_export',

  // ==========================================
  // Business Features (Business tier)
  // ==========================================
  LOYALTY_PROGRAM: 'loyalty_program',
  SMS_CAMPAIGNS: 'sms_campaigns',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  DATA_EXPORT: 'data_export',
  MULTI_LOCATION: 'multi_location',
  API_READ: 'api_read',
  WHITE_LABEL: 'white_label',
  WEBHOOKS: 'webhooks',
  PRIORITY_SUPPORT: 'priority_support',
  CUSTOM_BRANDING: 'custom_branding',

  // ==========================================
  // Enterprise Features (Enterprise tier)
  // ==========================================
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
  DEDICATED_SUPPORT: 'dedicated_support',
  SLA_GUARANTEE: 'sla_guarantee',
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];

// ============================================
// Tier Definitions
// ============================================

export const TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
} as const;

export type Tier = typeof TIERS[keyof typeof TIERS];

// Tier hierarchy (for inheritance)
export const TIER_HIERARCHY: Tier[] = [
  TIERS.FREE,
  TIERS.STARTER,
  TIERS.PROFESSIONAL,
  TIERS.BUSINESS,
  TIERS.ENTERPRISE,
];

// ============================================
// Feature to Tier Mapping
// ============================================

/**
 * Maps each feature to the minimum tier required to access it.
 * Features are inherited by higher tiers automatically.
 */
export const FEATURE_TIERS: Record<Feature, Tier> = {
  // Free tier features
  [FEATURES.MENU_MANAGEMENT]: TIERS.FREE,
  [FEATURES.ORDERS]: TIERS.FREE,
  [FEATURES.QR_CODES]: TIERS.FREE,
  [FEATURES.BASIC_DASHBOARD]: TIERS.FREE,
  [FEATURES.BASIC_SETTINGS]: TIERS.FREE,

  // Starter tier features
  [FEATURES.CUSTOMER_ACCOUNTS]: TIERS.STARTER,
  [FEATURES.BASIC_ANALYTICS]: TIERS.STARTER,
  [FEATURES.DISH_VARIANTS]: TIERS.STARTER,
  [FEATURES.DISH_OPTIONS]: TIERS.STARTER,
  [FEATURES.MULTI_LANGUAGE]: TIERS.STARTER,
  [FEATURES.EMAIL_NOTIFICATIONS]: TIERS.STARTER,
  [FEATURES.ORDER_HISTORY]: TIERS.STARTER,

  // Professional tier features
  [FEATURES.RESERVATIONS]: TIERS.PROFESSIONAL,
  [FEATURES.REVIEWS]: TIERS.PROFESSIONAL,
  [FEATURES.INVENTORY]: TIERS.PROFESSIONAL,
  [FEATURES.SCHEDULED_ORDERS]: TIERS.PROFESSIONAL,
  [FEATURES.KDS]: TIERS.PROFESSIONAL,
  [FEATURES.SMS_NOTIFICATIONS]: TIERS.PROFESSIONAL,
  [FEATURES.ALLERGEN_INFO]: TIERS.PROFESSIONAL,
  [FEATURES.NUTRITION_INFO]: TIERS.PROFESSIONAL,
  [FEATURES.ADVANCED_DASHBOARD]: TIERS.PROFESSIONAL,
  [FEATURES.BASIC_EXPORT]: TIERS.PROFESSIONAL,

  // Business tier features
  [FEATURES.LOYALTY_PROGRAM]: TIERS.BUSINESS,
  [FEATURES.SMS_CAMPAIGNS]: TIERS.BUSINESS,
  [FEATURES.ADVANCED_ANALYTICS]: TIERS.BUSINESS,
  [FEATURES.DATA_EXPORT]: TIERS.BUSINESS,
  [FEATURES.MULTI_LOCATION]: TIERS.BUSINESS,
  [FEATURES.API_READ]: TIERS.BUSINESS,
  [FEATURES.WHITE_LABEL]: TIERS.BUSINESS,
  [FEATURES.WEBHOOKS]: TIERS.BUSINESS,
  [FEATURES.PRIORITY_SUPPORT]: TIERS.BUSINESS,
  [FEATURES.CUSTOM_BRANDING]: TIERS.BUSINESS,

  // Enterprise tier features
  [FEATURES.DELIVERY_MODULE]: TIERS.ENTERPRISE,
  [FEATURES.DRIVER_MANAGEMENT]: TIERS.ENTERPRISE,
  [FEATURES.GPS_TRACKING]: TIERS.ENTERPRISE,
  [FEATURES.ROUTE_OPTIMIZATION]: TIERS.ENTERPRISE,
  [FEATURES.PROOF_OF_DELIVERY]: TIERS.ENTERPRISE,
  [FEATURES.HOTEL_MODULE]: TIERS.ENTERPRISE,
  [FEATURES.TWO_FACTOR_AUTH]: TIERS.ENTERPRISE,
  [FEATURES.AUDIT_LOGS]: TIERS.ENTERPRISE,
  [FEATURES.API_WRITE]: TIERS.ENTERPRISE,
  [FEATURES.CUSTOM_INTEGRATIONS]: TIERS.ENTERPRISE,
  [FEATURES.DEDICATED_SUPPORT]: TIERS.ENTERPRISE,
  [FEATURES.SLA_GUARANTEE]: TIERS.ENTERPRISE,
};

// ============================================
// Tier Features Lists (for quick lookup)
// ============================================

/**
 * Features introduced at each tier (not including inherited features)
 */
export const TIER_NEW_FEATURES: Record<Tier, Feature[]> = {
  [TIERS.FREE]: [
    FEATURES.MENU_MANAGEMENT,
    FEATURES.ORDERS,
    FEATURES.QR_CODES,
    FEATURES.BASIC_DASHBOARD,
    FEATURES.BASIC_SETTINGS,
  ],

  [TIERS.STARTER]: [
    FEATURES.CUSTOMER_ACCOUNTS,
    FEATURES.BASIC_ANALYTICS,
    FEATURES.DISH_VARIANTS,
    FEATURES.DISH_OPTIONS,
    FEATURES.MULTI_LANGUAGE,
    FEATURES.EMAIL_NOTIFICATIONS,
    FEATURES.ORDER_HISTORY,
  ],

  [TIERS.PROFESSIONAL]: [
    FEATURES.RESERVATIONS,
    FEATURES.REVIEWS,
    FEATURES.INVENTORY,
    FEATURES.SCHEDULED_ORDERS,
    FEATURES.KDS,
    FEATURES.SMS_NOTIFICATIONS,
    FEATURES.ALLERGEN_INFO,
    FEATURES.NUTRITION_INFO,
    FEATURES.ADVANCED_DASHBOARD,
    FEATURES.BASIC_EXPORT,
  ],

  [TIERS.BUSINESS]: [
    FEATURES.LOYALTY_PROGRAM,
    FEATURES.SMS_CAMPAIGNS,
    FEATURES.ADVANCED_ANALYTICS,
    FEATURES.DATA_EXPORT,
    FEATURES.MULTI_LOCATION,
    FEATURES.API_READ,
    FEATURES.WHITE_LABEL,
    FEATURES.WEBHOOKS,
    FEATURES.PRIORITY_SUPPORT,
    FEATURES.CUSTOM_BRANDING,
  ],

  [TIERS.ENTERPRISE]: [
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
    FEATURES.DEDICATED_SUPPORT,
    FEATURES.SLA_GUARANTEE,
  ],
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get the index of a tier in the hierarchy (higher = more features)
 */
export function getTierIndex(tier: Tier): number {
  return TIER_HIERARCHY.indexOf(tier);
}

/**
 * Check if tierA is equal to or higher than tierB
 */
export function isTierAtLeast(tierA: Tier, tierB: Tier): boolean {
  return getTierIndex(tierA) >= getTierIndex(tierB);
}

/**
 * Get all features available for a given tier (including inherited)
 */
export function getFeaturesForTier(tierSlug: string): Feature[] {
  const tier = tierSlug as Tier;
  const tierIndex = getTierIndex(tier);

  if (tierIndex === -1) {
    // Unknown tier, return free features only
    return TIER_NEW_FEATURES[TIERS.FREE];
  }

  const features: Feature[] = [];

  // Add features from all tiers up to and including this one
  for (let i = 0; i <= tierIndex; i++) {
    const currentTier = TIER_HIERARCHY[i];
    features.push(...TIER_NEW_FEATURES[currentTier]);
  }

  return [...new Set(features)]; // Remove any duplicates
}

/**
 * Check if a feature is available for a given tier
 */
export function hasFeatureForTier(tierSlug: string, feature: Feature): boolean {
  const tier = tierSlug as Tier;
  const requiredTier = FEATURE_TIERS[feature];

  if (!requiredTier) {
    return false; // Unknown feature
  }

  return isTierAtLeast(tier, requiredTier);
}

/**
 * Get the minimum tier required for a feature
 */
export function getRequiredTierForFeature(feature: Feature): Tier {
  return FEATURE_TIERS[feature];
}

/**
 * Get features that would be lost when downgrading
 */
export function getFeatureDifference(fromTier: Tier, toTier: Tier): Feature[] {
  if (isTierAtLeast(toTier, fromTier)) {
    return []; // Not a downgrade
  }

  const fromFeatures = getFeaturesForTier(fromTier);
  const toFeatures = getFeaturesForTier(toTier);

  return fromFeatures.filter(f => !toFeatures.includes(f));
}

/**
 * Get the next tier upgrade option
 */
export function getNextTier(currentTier: Tier): Tier | null {
  const currentIndex = getTierIndex(currentTier);

  if (currentIndex === -1 || currentIndex >= TIER_HIERARCHY.length - 1) {
    return null;
  }

  return TIER_HIERARCHY[currentIndex + 1];
}

/**
 * Get human-readable feature name
 */
export function getFeatureDisplayName(feature: Feature): string {
  const displayNames: Record<Feature, string> = {
    [FEATURES.MENU_MANAGEMENT]: 'Menu Management',
    [FEATURES.ORDERS]: 'Order Processing',
    [FEATURES.QR_CODES]: 'QR Code Generation',
    [FEATURES.BASIC_DASHBOARD]: 'Basic Dashboard',
    [FEATURES.BASIC_SETTINGS]: 'Basic Settings',
    [FEATURES.CUSTOMER_ACCOUNTS]: 'Customer Accounts',
    [FEATURES.BASIC_ANALYTICS]: 'Basic Analytics',
    [FEATURES.DISH_VARIANTS]: 'Dish Variants',
    [FEATURES.DISH_OPTIONS]: 'Dish Options',
    [FEATURES.MULTI_LANGUAGE]: 'Multi-language Menu',
    [FEATURES.EMAIL_NOTIFICATIONS]: 'Email Notifications',
    [FEATURES.ORDER_HISTORY]: 'Order History',
    [FEATURES.RESERVATIONS]: 'Reservations System',
    [FEATURES.REVIEWS]: 'Reviews & Ratings',
    [FEATURES.INVENTORY]: 'Inventory Management',
    [FEATURES.SCHEDULED_ORDERS]: 'Scheduled Orders',
    [FEATURES.KDS]: 'Kitchen Display System',
    [FEATURES.SMS_NOTIFICATIONS]: 'SMS Notifications',
    [FEATURES.ALLERGEN_INFO]: 'Allergen Information',
    [FEATURES.NUTRITION_INFO]: 'Nutrition Information',
    [FEATURES.ADVANCED_DASHBOARD]: 'Advanced Dashboard',
    [FEATURES.BASIC_EXPORT]: 'Basic Data Export',
    [FEATURES.LOYALTY_PROGRAM]: 'Loyalty Program',
    [FEATURES.SMS_CAMPAIGNS]: 'SMS Marketing Campaigns',
    [FEATURES.ADVANCED_ANALYTICS]: 'Advanced Analytics',
    [FEATURES.DATA_EXPORT]: 'Full Data Export',
    [FEATURES.MULTI_LOCATION]: 'Multi-location Support',
    [FEATURES.API_READ]: 'API Access (Read)',
    [FEATURES.WHITE_LABEL]: 'White Label',
    [FEATURES.WEBHOOKS]: 'Webhooks',
    [FEATURES.PRIORITY_SUPPORT]: 'Priority Support',
    [FEATURES.CUSTOM_BRANDING]: 'Custom Branding',
    [FEATURES.DELIVERY_MODULE]: 'Delivery Management',
    [FEATURES.DRIVER_MANAGEMENT]: 'Driver Fleet Management',
    [FEATURES.GPS_TRACKING]: 'Real-time GPS Tracking',
    [FEATURES.ROUTE_OPTIMIZATION]: 'Route Optimization',
    [FEATURES.PROOF_OF_DELIVERY]: 'Proof of Delivery',
    [FEATURES.HOTEL_MODULE]: 'Hotel Room Service',
    [FEATURES.TWO_FACTOR_AUTH]: 'Two-Factor Authentication',
    [FEATURES.AUDIT_LOGS]: 'Audit Logs',
    [FEATURES.API_WRITE]: 'API Access (Full)',
    [FEATURES.CUSTOM_INTEGRATIONS]: 'Custom Integrations',
    [FEATURES.DEDICATED_SUPPORT]: 'Dedicated Support',
    [FEATURES.SLA_GUARANTEE]: 'SLA Guarantee',
  };

  return displayNames[feature] || feature;
}

/**
 * Get human-readable tier name
 */
export function getTierDisplayName(tier: Tier): string {
  const displayNames: Record<Tier, string> = {
    [TIERS.FREE]: 'Free',
    [TIERS.STARTER]: 'Starter',
    [TIERS.PROFESSIONAL]: 'Professional',
    [TIERS.BUSINESS]: 'Business',
    [TIERS.ENTERPRISE]: 'Enterprise',
  };

  return displayNames[tier] || tier;
}

// ============================================
// Default Plan Limits
// ============================================

export interface PlanLimits {
  dishes: number;      // -1 for unlimited
  orders: number;      // Monthly orders, -1 for unlimited
  users: number;       // Staff accounts
  smsCredits: number;  // Monthly SMS credits
  storage: number;     // Storage in MB
  tables: number;      // QR code tables
  campaigns: number;   // Monthly campaigns, -1 for unlimited
  locations: number;   // Number of locations, -1 for unlimited
}

export const DEFAULT_PLAN_LIMITS: Record<Tier, PlanLimits> = {
  [TIERS.FREE]: {
    dishes: 15,
    orders: 50,
    users: 1,
    smsCredits: 0,
    storage: 50,
    tables: 5,
    campaigns: 0,
    locations: 1,
  },

  [TIERS.STARTER]: {
    dishes: 50,
    orders: 500,
    users: 3,
    smsCredits: 50,
    storage: 500,
    tables: 15,
    campaigns: 2,
    locations: 1,
  },

  [TIERS.PROFESSIONAL]: {
    dishes: 150,
    orders: 2000,
    users: 10,
    smsCredits: 200,
    storage: 2048, // 2GB
    tables: 50,
    campaigns: 10,
    locations: 1,
  },

  [TIERS.BUSINESS]: {
    dishes: 500,
    orders: 10000,
    users: 25,
    smsCredits: 1000,
    storage: 10240, // 10GB
    tables: -1, // Unlimited
    campaigns: -1, // Unlimited
    locations: 3,
  },

  [TIERS.ENTERPRISE]: {
    dishes: -1,      // Unlimited
    orders: -1,      // Unlimited
    users: -1,       // Unlimited
    smsCredits: 10000,
    storage: 102400, // 100GB
    tables: -1,      // Unlimited
    campaigns: -1,   // Unlimited
    locations: -1,   // Unlimited
  },
};

// ============================================
// Default Plan Pricing (in cents/EUR)
// ============================================

export interface PlanPricing {
  monthly: number;  // Monthly price in cents
  yearly: number;   // Yearly price in cents
  currency: string;
}

export const DEFAULT_PLAN_PRICING: Record<Tier, PlanPricing> = {
  [TIERS.FREE]: {
    monthly: 0,
    yearly: 0,
    currency: 'EUR',
  },

  [TIERS.STARTER]: {
    monthly: 2900,  // 29
    yearly: 29000,  // 290 (save ~17%)
    currency: 'EUR',
  },

  [TIERS.PROFESSIONAL]: {
    monthly: 7900,  // 79
    yearly: 79000,  // 790 (save ~17%)
    currency: 'EUR',
  },

  [TIERS.BUSINESS]: {
    monthly: 14900, // 149
    yearly: 149000, // 1490 (save ~17%)
    currency: 'EUR',
  },

  [TIERS.ENTERPRISE]: {
    monthly: 0,     // Custom pricing
    yearly: 0,      // Custom pricing
    currency: 'EUR',
  },
};

export default {
  FEATURES,
  TIERS,
  TIER_HIERARCHY,
  FEATURE_TIERS,
  TIER_NEW_FEATURES,
  DEFAULT_PLAN_LIMITS,
  DEFAULT_PLAN_PRICING,
  getFeaturesForTier,
  hasFeatureForTier,
  getRequiredTierForFeature,
  getFeatureDifference,
  getNextTier,
  getTierIndex,
  isTierAtLeast,
  getFeatureDisplayName,
  getTierDisplayName,
};
