/**
 * Subscription Store
 *
 * Manages subscription state, feature access, and usage tracking.
 * Works with the subscription API endpoints.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type {
  SubscriptionInfo,
  SubscriptionPlan,
  SubscriptionFeature,
  UsageCheckResult,
  UpgradePreview,
  DowngradePreview,
} from '@/services/api';

// Feature keys matching backend FEATURES constant
export const FEATURES = {
  MENU_MANAGEMENT: 'menu_management',
  RESERVATIONS: 'reservations',
  LOYALTY_PROGRAM: 'loyalty_program',
  REVIEWS: 'reviews',
  SCHEDULED_ORDERS: 'scheduled_orders',
  TABLE_MANAGEMENT: 'table_management',
  QR_CODES: 'qr_codes',
  BASIC_ANALYTICS: 'basic_analytics',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  SMS_CAMPAIGNS: 'sms_campaigns',
  EMAIL_CAMPAIGNS: 'email_campaigns',
  PUSH_NOTIFICATIONS: 'push_notifications',
  CUSTOMER_DATABASE: 'customer_database',
  INVENTORY: 'inventory',
  MULTI_LOCATION: 'multi_location',
  API_ACCESS: 'api_access',
  CUSTOM_DOMAIN: 'custom_domain',
  CUSTOM_BRANDING: 'custom_branding',
  WHITE_LABEL: 'white_label',
  PRIORITY_SUPPORT: 'priority_support',
  DEDICATED_SUPPORT: 'dedicated_support',
  DELIVERY_MODULE: 'delivery_module',
  DRIVER_MANAGEMENT: 'driver_management',
  REAL_TIME_TRACKING: 'real_time_tracking',
  HOTEL_MODULE: 'hotel_module',
  ROOM_SERVICE: 'room_service',
  GUEST_MANAGEMENT: 'guest_management',
  TWO_FACTOR_AUTH: 'two_factor_auth',
  AUDIT_LOGS: 'audit_logs',
  SSO_INTEGRATION: 'sso_integration',
  DATA_EXPORT: 'data_export',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

export const useSubscriptionStore = defineStore('subscription', () => {
  // State
  const subscription = ref<SubscriptionInfo | null>(null);
  const plans = ref<SubscriptionPlan[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetched = ref<Date | null>(null);

  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Computed
  const isAuthenticated = computed(() => !!subscription.value);
  const currentPlan = computed(() => subscription.value?.plan);
  const currentTier = computed(() => subscription.value?.plan.tier ?? 'free');
  const isValid = computed(() => subscription.value?.isValid ?? false);
  const isInTrial = computed(() => subscription.value?.isInTrial ?? false);
  const status = computed(() => subscription.value?.status ?? 'expired');
  const features = computed(() => subscription.value?.features ?? []);
  const featureKeys = computed(() => features.value.map(f => f.key));
  const limits = computed(() => subscription.value?.limits);
  const usage = computed(() => subscription.value?.usage);

  const trialDaysLeft = computed(() => {
    if (!subscription.value?.isInTrial || !subscription.value?.trialEndsAt) {
      return 0;
    }
    const trialEnd = new Date(subscription.value.trialEndsAt);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  });

  const daysUntilRenewal = computed(() => {
    if (!subscription.value?.currentPeriodEnd) {
      return null;
    }
    const periodEnd = new Date(subscription.value.currentPeriodEnd);
    const now = new Date();
    const diffTime = periodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  });

  // Check if cache is still valid
  function isCacheValid(): boolean {
    if (!lastFetched.value) {return false;}
    const now = new Date();
    return (now.getTime() - lastFetched.value.getTime()) < CACHE_DURATION;
  }

  // Actions
  async function fetchSubscription(force = false): Promise<void> {
    // Skip if cache is valid and not forcing
    if (!force && isCacheValid() && subscription.value) {
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.getCurrentSubscription();
      if (response.success && response.data) {
        subscription.value = response.data;
        lastFetched.value = new Date();
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      error.value = err instanceof Error ? err.message : 'Failed to load subscription';
      // Clear subscription on error (might be 404 for no subscription)
      subscription.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPlans(): Promise<void> {
    if (plans.value.length > 0) {
      return; // Plans don't change often, cache indefinitely
    }

    try {
      const response = await api.getSubscriptionPlans();
      if (response.success && response.data?.plans) {
        plans.value = response.data.plans;
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  function hasFeature(feature: FeatureKey): boolean {
    if (!subscription.value?.isValid) {
      return false;
    }
    return featureKeys.value.includes(feature);
  }

  /**
   * Check if user has access to any of the specified features
   */
  function hasAnyFeature(featureList: FeatureKey[]): boolean {
    if (!subscription.value?.isValid) {
      return false;
    }
    return featureList.some(f => featureKeys.value.includes(f));
  }

  /**
   * Check if user has access to all specified features
   */
  function hasAllFeatures(featureList: FeatureKey[]): boolean {
    if (!subscription.value?.isValid) {
      return false;
    }
    return featureList.every(f => featureKeys.value.includes(f));
  }

  /**
   * Get usage percentage for a resource
   */
  function getUsagePercentage(resource: keyof SubscriptionInfo['limits']): number {
    if (!limits.value || !usage.value) {
      return 0;
    }
    const limit = limits.value[resource];
    if (limit === -1) {
      return 0; // Unlimited
    }
    const used = (usage.value as Record<string, number>)[resource] || 0;
    return Math.round((used / limit) * 100);
  }

  /**
   * Check if user can use more of a resource
   */
  function canUseMore(resource: keyof SubscriptionInfo['limits']): boolean {
    if (!limits.value || !usage.value) {
      return false;
    }
    const limit = limits.value[resource];
    if (limit === -1) {
      return true; // Unlimited
    }
    const used = (usage.value as Record<string, number>)[resource] || 0;
    return used < limit;
  }

  /**
   * Get remaining usage for a resource
   */
  function getRemainingUsage(resource: keyof SubscriptionInfo['limits']): number | null {
    if (!limits.value || !usage.value) {
      return null;
    }
    const limit = limits.value[resource];
    if (limit === -1) {
      return null; // Unlimited
    }
    const used = (usage.value as Record<string, number>)[resource] || 0;
    return Math.max(0, limit - used);
  }

  /**
   * Check if usage is near limit (>80%)
   */
  function isNearLimit(resource: keyof SubscriptionInfo['limits']): boolean {
    return getUsagePercentage(resource) >= 80;
  }

  /**
   * Check if usage is at limit
   */
  function isAtLimit(resource: keyof SubscriptionInfo['limits']): boolean {
    return getUsagePercentage(resource) >= 100;
  }

  /**
   * Get the required tier for a feature
   */
  function getRequiredTierForFeature(feature: FeatureKey): string | null {
    // This mapping matches the backend FEATURE_TIERS
    const featureTiers: Record<string, string> = {
      [FEATURES.MENU_MANAGEMENT]: 'free',
      [FEATURES.RESERVATIONS]: 'starter',
      [FEATURES.LOYALTY_PROGRAM]: 'starter',
      [FEATURES.REVIEWS]: 'free',
      [FEATURES.SCHEDULED_ORDERS]: 'starter',
      [FEATURES.TABLE_MANAGEMENT]: 'starter',
      [FEATURES.QR_CODES]: 'free',
      [FEATURES.BASIC_ANALYTICS]: 'starter',
      [FEATURES.ADVANCED_ANALYTICS]: 'professional',
      [FEATURES.SMS_CAMPAIGNS]: 'professional',
      [FEATURES.EMAIL_CAMPAIGNS]: 'starter',
      [FEATURES.CUSTOMER_DATABASE]: 'starter',
      [FEATURES.INVENTORY]: 'professional',
      [FEATURES.MULTI_LOCATION]: 'business',
      [FEATURES.API_ACCESS]: 'business',
      [FEATURES.CUSTOM_DOMAIN]: 'professional',
      [FEATURES.CUSTOM_BRANDING]: 'professional',
      [FEATURES.WHITE_LABEL]: 'enterprise',
      [FEATURES.PRIORITY_SUPPORT]: 'professional',
      [FEATURES.DEDICATED_SUPPORT]: 'enterprise',
      [FEATURES.DELIVERY_MODULE]: 'professional',
      [FEATURES.DRIVER_MANAGEMENT]: 'professional',
      [FEATURES.REAL_TIME_TRACKING]: 'professional',
      [FEATURES.HOTEL_MODULE]: 'business',
      [FEATURES.ROOM_SERVICE]: 'business',
      [FEATURES.GUEST_MANAGEMENT]: 'business',
      [FEATURES.TWO_FACTOR_AUTH]: 'starter',
      [FEATURES.AUDIT_LOGS]: 'business',
      [FEATURES.SSO_INTEGRATION]: 'enterprise',
      [FEATURES.DATA_EXPORT]: 'professional',
    };
    return featureTiers[feature] || null;
  }

  /**
   * Preview an upgrade
   */
  async function previewUpgrade(planSlug: string): Promise<UpgradePreview | null> {
    try {
      const response = await api.previewSubscriptionUpgrade(planSlug);
      return response.success ? response.data ?? null : null;
    } catch (err) {
      console.error('Failed to preview upgrade:', err);
      return null;
    }
  }

  /**
   * Preview a downgrade
   */
  async function previewDowngrade(planSlug: string): Promise<DowngradePreview | null> {
    try {
      const response = await api.previewSubscriptionDowngrade(planSlug);
      return response.success ? response.data ?? null : null;
    } catch (err) {
      console.error('Failed to preview downgrade:', err);
      return null;
    }
  }

  /**
   * Change plan
   */
  async function changePlan(planId: string, immediate = false): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.changeSubscriptionPlan(planId, immediate);
      if (response.success) {
        // Refresh subscription data
        await fetchSubscription(true);
        return true;
      }
      error.value = response.message || 'Failed to change plan';
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to change plan';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Cancel subscription
   */
  async function cancelSubscription(reason?: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.cancelSubscription(reason);
      if (response.success) {
        await fetchSubscription(true);
        return true;
      }
      error.value = response.message || 'Failed to cancel subscription';
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cancel subscription';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Reactivate subscription
   */
  async function reactivateSubscription(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.reactivateSubscription();
      if (response.success) {
        await fetchSubscription(true);
        return true;
      }
      error.value = response.message || 'Failed to reactivate subscription';
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reactivate subscription';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clear subscription data (on logout)
   */
  function clearSubscription(): void {
    subscription.value = null;
    lastFetched.value = null;
    error.value = null;
  }

  /**
   * Invalidate cache (force refetch on next access)
   */
  function invalidateCache(): void {
    lastFetched.value = null;
  }

  return {
    // State
    subscription,
    plans,
    isLoading,
    error,

    // Computed
    isAuthenticated,
    currentPlan,
    currentTier,
    isValid,
    isInTrial,
    status,
    features,
    featureKeys,
    limits,
    usage,
    trialDaysLeft,
    daysUntilRenewal,

    // Actions
    fetchSubscription,
    fetchPlans,
    hasFeature,
    hasAnyFeature,
    hasAllFeatures,
    getUsagePercentage,
    canUseMore,
    getRemainingUsage,
    isNearLimit,
    isAtLimit,
    getRequiredTierForFeature,
    previewUpgrade,
    previewDowngrade,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    clearSubscription,
    invalidateCache,
  };
});
