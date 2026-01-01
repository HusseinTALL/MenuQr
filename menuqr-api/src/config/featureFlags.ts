/**
 * Feature Flags Configuration
 *
 * Controls the availability of features across the application.
 * Flags can be overridden via environment variables.
 */

export interface FeatureFlags {
  // Hotel Module Features
  HOTEL_MODULE_ENABLED: boolean;
  HOTEL_GUEST_AUTH: boolean;
  HOTEL_ROOM_SERVICE: boolean;
  HOTEL_KDS: boolean;
  HOTEL_REPORTS: boolean;
  HOTEL_STAFF_MANAGEMENT: boolean;

  // Hotel Advanced Features
  HOTEL_SCHEDULED_ORDERS: boolean;
  HOTEL_MINIBAR: boolean;
  HOTEL_PMS_INTEGRATION: boolean;
  HOTEL_VOICE_ORDERING: boolean;

  // General Features
  STRIPE_CONNECT: boolean;
  TWILIO_VOICE: boolean;
  REALTIME_TRACKING: boolean;
}

/**
 * Default feature flag values
 * Override these with environment variables prefixed with FF_
 * Example: FF_HOTEL_MODULE_ENABLED=true
 */
const defaultFlags: FeatureFlags = {
  // Hotel Module - Core Features
  HOTEL_MODULE_ENABLED: true, // Master switch for hotel module
  HOTEL_GUEST_AUTH: true, // Guest PIN/code authentication
  HOTEL_ROOM_SERVICE: true, // Room service ordering
  HOTEL_KDS: true, // Kitchen display system for hotels
  HOTEL_REPORTS: true, // Hotel analytics and reports
  HOTEL_STAFF_MANAGEMENT: true, // Hotel staff management

  // Hotel Module - Advanced Features
  HOTEL_SCHEDULED_ORDERS: true, // Schedule orders for later
  HOTEL_MINIBAR: false, // Minibar integration (future)
  HOTEL_PMS_INTEGRATION: false, // PMS system integration (future)
  HOTEL_VOICE_ORDERING: false, // Voice-based ordering (future)

  // General Features
  STRIPE_CONNECT: true, // Stripe Connect for payments
  TWILIO_VOICE: false, // Twilio voice calls
  REALTIME_TRACKING: true, // Real-time order tracking
};

/**
 * Parse boolean from environment variable
 */
function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {return defaultValue;}
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Load feature flags from environment variables
 */
function loadFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = { ...defaultFlags };

  // Override from environment variables
  for (const key of Object.keys(defaultFlags) as Array<keyof FeatureFlags>) {
    const envKey = `FF_${key}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      flags[key] = parseEnvBoolean(envValue, defaultFlags[key]);
    }
  }

  return flags;
}

// Export feature flags instance
export const featureFlags: FeatureFlags = loadFeatureFlags();

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

/**
 * Middleware to check feature flag
 * Returns 404 if feature is disabled (feature doesn't exist from user perspective)
 */
export function requireFeature(flag: keyof FeatureFlags) {
  return (_req: any, res: any, next: any) => {
    if (!isFeatureEnabled(flag)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: 'This feature is not available',
        },
      });
    }
    next();
  };
}

/**
 * Get all feature flags (for admin/debug purposes)
 */
export function getAllFeatureFlags(): FeatureFlags {
  return { ...featureFlags };
}

/**
 * Check if hotel module is fully enabled
 */
export function isHotelModuleEnabled(): boolean {
  return featureFlags.HOTEL_MODULE_ENABLED;
}

/**
 * Log feature flags on startup (for debugging)
 */
export function logFeatureFlags(): void {
  console.log('Feature Flags:');
  for (const [key, value] of Object.entries(featureFlags)) {
    const status = value ? '✓' : '✗';
    console.log(`  ${status} ${key}: ${value}`);
  }
}

export default featureFlags;
