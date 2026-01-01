import mongoose, { Document, Schema } from 'mongoose';
import { Feature, FEATURES, getFeaturesForTier, Tier } from '../config/features.js';

// ============================================
// Types & Interfaces
// ============================================

export interface IPlanLimits {
  dishes: number;      // -1 for unlimited
  orders: number;      // Monthly orders limit, -1 for unlimited
  users: number;       // Staff users allowed
  smsCredits: number;  // Monthly SMS credits
  storage: number;     // Storage in MB
  tables: number;      // Number of tables
  campaigns: number;   // Monthly campaigns, -1 for unlimited
  locations: number;   // Number of locations, -1 for unlimited
}

export interface IPlanPricing {
  monthly: number;  // Price in cents
  yearly: number;   // Price in cents
  currency: string;
}

/**
 * Feature flags - boolean map of all available features
 */
export interface IPlanFeatures {
  // Core (Free)
  menuManagement: boolean;
  orders: boolean;
  qrCodes: boolean;
  basicDashboard: boolean;
  basicSettings: boolean;

  // Growth (Starter)
  customerAccounts: boolean;
  basicAnalytics: boolean;
  dishVariants: boolean;
  dishOptions: boolean;
  multiLanguage: boolean;
  emailNotifications: boolean;
  orderHistory: boolean;

  // Professional
  reservations: boolean;
  reviews: boolean;
  inventory: boolean;
  scheduledOrders: boolean;
  kds: boolean;
  smsNotifications: boolean;
  allergenInfo: boolean;
  nutritionInfo: boolean;
  advancedDashboard: boolean;
  basicExport: boolean;

  // Business
  loyaltyProgram: boolean;
  smsCampaigns: boolean;
  advancedAnalytics: boolean;
  dataExport: boolean;
  multiLocation: boolean;
  apiRead: boolean;
  whiteLabel: boolean;
  webhooks: boolean;
  prioritySupport: boolean;
  customBranding: boolean;

  // Enterprise
  deliveryModule: boolean;
  driverManagement: boolean;
  gpsTracking: boolean;
  routeOptimization: boolean;
  proofOfDelivery: boolean;
  hotelModule: boolean;
  twoFactorAuth: boolean;
  auditLogs: boolean;
  apiWrite: boolean;
  customIntegrations: boolean;
  dedicatedSupport: boolean;
  slaGuarantee: boolean;
}

export interface ISubscriptionPlan extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  displayFeatures: string[];  // Human-readable feature list for marketing
  enabledFeatures: IPlanFeatures;  // Actual feature flags
  limits: IPlanLimits;
  pricing: IPlanPricing;
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  tier: Tier;  // Reference tier for easy lookup
  createdAt: Date;
  updatedAt: Date;

  // Methods
  hasFeature(feature: Feature): boolean;
  getEnabledFeatures(): Feature[];
}

// ============================================
// Default Feature Sets by Tier
// ============================================

const DEFAULT_FEATURES: Record<string, Partial<IPlanFeatures>> = {
  free: {
    menuManagement: true,
    orders: true,
    qrCodes: true,
    basicDashboard: true,
    basicSettings: true,
  },

  starter: {
    // Includes free +
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

  professional: {
    // Includes starter +
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

  business: {
    // Includes professional +
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

  enterprise: {
    // All features
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
  },
};

/**
 * Map feature flag keys to FEATURES constants
 */
const FEATURE_KEY_MAP: Record<keyof IPlanFeatures, Feature> = {
  menuManagement: FEATURES.MENU_MANAGEMENT,
  orders: FEATURES.ORDERS,
  qrCodes: FEATURES.QR_CODES,
  basicDashboard: FEATURES.BASIC_DASHBOARD,
  basicSettings: FEATURES.BASIC_SETTINGS,
  customerAccounts: FEATURES.CUSTOMER_ACCOUNTS,
  basicAnalytics: FEATURES.BASIC_ANALYTICS,
  dishVariants: FEATURES.DISH_VARIANTS,
  dishOptions: FEATURES.DISH_OPTIONS,
  multiLanguage: FEATURES.MULTI_LANGUAGE,
  emailNotifications: FEATURES.EMAIL_NOTIFICATIONS,
  orderHistory: FEATURES.ORDER_HISTORY,
  reservations: FEATURES.RESERVATIONS,
  reviews: FEATURES.REVIEWS,
  inventory: FEATURES.INVENTORY,
  scheduledOrders: FEATURES.SCHEDULED_ORDERS,
  kds: FEATURES.KDS,
  smsNotifications: FEATURES.SMS_NOTIFICATIONS,
  allergenInfo: FEATURES.ALLERGEN_INFO,
  nutritionInfo: FEATURES.NUTRITION_INFO,
  advancedDashboard: FEATURES.ADVANCED_DASHBOARD,
  basicExport: FEATURES.BASIC_EXPORT,
  loyaltyProgram: FEATURES.LOYALTY_PROGRAM,
  smsCampaigns: FEATURES.SMS_CAMPAIGNS,
  advancedAnalytics: FEATURES.ADVANCED_ANALYTICS,
  dataExport: FEATURES.DATA_EXPORT,
  multiLocation: FEATURES.MULTI_LOCATION,
  apiRead: FEATURES.API_READ,
  whiteLabel: FEATURES.WHITE_LABEL,
  webhooks: FEATURES.WEBHOOKS,
  prioritySupport: FEATURES.PRIORITY_SUPPORT,
  customBranding: FEATURES.CUSTOM_BRANDING,
  deliveryModule: FEATURES.DELIVERY_MODULE,
  driverManagement: FEATURES.DRIVER_MANAGEMENT,
  gpsTracking: FEATURES.GPS_TRACKING,
  routeOptimization: FEATURES.ROUTE_OPTIMIZATION,
  proofOfDelivery: FEATURES.PROOF_OF_DELIVERY,
  hotelModule: FEATURES.HOTEL_MODULE,
  twoFactorAuth: FEATURES.TWO_FACTOR_AUTH,
  auditLogs: FEATURES.AUDIT_LOGS,
  apiWrite: FEATURES.API_WRITE,
  customIntegrations: FEATURES.CUSTOM_INTEGRATIONS,
  dedicatedSupport: FEATURES.DEDICATED_SUPPORT,
  slaGuarantee: FEATURES.SLA_GUARANTEE,
};

// Reverse map: Feature constant to schema key
const FEATURE_REVERSE_MAP: Record<Feature, keyof IPlanFeatures> = Object.entries(FEATURE_KEY_MAP)
  .reduce((acc, [key, value]) => {
    acc[value] = key as keyof IPlanFeatures;
    return acc;
  }, {} as Record<Feature, keyof IPlanFeatures>);

// ============================================
// Schema Definition
// ============================================

const planFeaturesSchema = new Schema<IPlanFeatures>(
  {
    // Core (Free)
    menuManagement: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    qrCodes: { type: Boolean, default: true },
    basicDashboard: { type: Boolean, default: true },
    basicSettings: { type: Boolean, default: true },

    // Growth (Starter)
    customerAccounts: { type: Boolean, default: false },
    basicAnalytics: { type: Boolean, default: false },
    dishVariants: { type: Boolean, default: false },
    dishOptions: { type: Boolean, default: false },
    multiLanguage: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: false },
    orderHistory: { type: Boolean, default: false },

    // Professional
    reservations: { type: Boolean, default: false },
    reviews: { type: Boolean, default: false },
    inventory: { type: Boolean, default: false },
    scheduledOrders: { type: Boolean, default: false },
    kds: { type: Boolean, default: false },
    smsNotifications: { type: Boolean, default: false },
    allergenInfo: { type: Boolean, default: false },
    nutritionInfo: { type: Boolean, default: false },
    advancedDashboard: { type: Boolean, default: false },
    basicExport: { type: Boolean, default: false },

    // Business
    loyaltyProgram: { type: Boolean, default: false },
    smsCampaigns: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    dataExport: { type: Boolean, default: false },
    multiLocation: { type: Boolean, default: false },
    apiRead: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    webhooks: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },

    // Enterprise
    deliveryModule: { type: Boolean, default: false },
    driverManagement: { type: Boolean, default: false },
    gpsTracking: { type: Boolean, default: false },
    routeOptimization: { type: Boolean, default: false },
    proofOfDelivery: { type: Boolean, default: false },
    hotelModule: { type: Boolean, default: false },
    twoFactorAuth: { type: Boolean, default: false },
    auditLogs: { type: Boolean, default: false },
    apiWrite: { type: Boolean, default: false },
    customIntegrations: { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
    slaGuarantee: { type: Boolean, default: false },
  },
  { _id: false }
);

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    tier: {
      type: String,
      enum: ['free', 'starter', 'professional', 'business', 'enterprise'],
      required: true,
      default: 'free',
    },
    displayFeatures: {
      type: [String],
      default: [],
    },
    enabledFeatures: {
      type: planFeaturesSchema,
      default: () => ({ ...DEFAULT_FEATURES.free }),
    },
    limits: {
      dishes: { type: Number, default: 50 },
      orders: { type: Number, default: 500 },
      users: { type: Number, default: 2 },
      smsCredits: { type: Number, default: 100 },
      storage: { type: Number, default: 500 }, // MB
      tables: { type: Number, default: 10 },
      campaigns: { type: Number, default: 5 },
      locations: { type: Number, default: 1 },
    },
    pricing: {
      monthly: { type: Number, required: true, min: 0 },
      yearly: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'EUR' },
    },
    trialDays: {
      type: Number,
      default: 14,
      min: 0,
      max: 90,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Pre-save Hook
// ============================================

subscriptionPlanSchema.pre('save', function () {
  // Generate slug from name if not set
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Set default features based on tier if creating new plan
  if (this.isNew && this.tier && !this.isModified('enabledFeatures')) {
    const tierDefaults = DEFAULT_FEATURES[this.tier];
    if (tierDefaults) {
      this.enabledFeatures = { ...this.enabledFeatures, ...tierDefaults } as IPlanFeatures;
    }
  }
});

// ============================================
// Instance Methods
// ============================================

/**
 * Check if this plan has a specific feature enabled
 */
subscriptionPlanSchema.methods.hasFeature = function (feature: Feature): boolean {
  const key = FEATURE_REVERSE_MAP[feature];
  if (!key) {
    return false;
  }
  return this.enabledFeatures?.[key] === true;
};

/**
 * Get list of all enabled features for this plan
 */
subscriptionPlanSchema.methods.getEnabledFeatures = function (): Feature[] {
  const enabled: Feature[] = [];

  if (!this.enabledFeatures) {
    return enabled;
  }

  for (const [key, value] of Object.entries(this.enabledFeatures.toObject ? this.enabledFeatures.toObject() : this.enabledFeatures)) {
    if (value === true && FEATURE_KEY_MAP[key as keyof IPlanFeatures]) {
      enabled.push(FEATURE_KEY_MAP[key as keyof IPlanFeatures]);
    }
  }

  return enabled;
};

// ============================================
// Static Methods
// ============================================

/**
 * Get features for a tier using the config
 */
subscriptionPlanSchema.statics.getFeaturesForTier = function (tier: Tier): Feature[] {
  return getFeaturesForTier(tier);
};

/**
 * Get default features object for a tier
 */
subscriptionPlanSchema.statics.getDefaultFeaturesForTier = function (tier: string): Partial<IPlanFeatures> {
  return DEFAULT_FEATURES[tier] || DEFAULT_FEATURES.free;
};

// ============================================
// Indexes
// ============================================

subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ sortOrder: 1 });
subscriptionPlanSchema.index({ tier: 1 });

// ============================================
// Export
// ============================================

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
export { DEFAULT_FEATURES, FEATURE_KEY_MAP, FEATURE_REVERSE_MAP };
export default SubscriptionPlan;
