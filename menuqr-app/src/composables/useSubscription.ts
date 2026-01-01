/**
 * Subscription Composable
 *
 * Provides convenient access to subscription features, limits, and upgrade flows.
 * Wraps the subscription store with additional helpers for components.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSubscriptionStore, FEATURES, type FeatureKey } from '@/stores/subscriptionStore';
import { useToast } from './useToast';

export { FEATURES, type FeatureKey };

/**
 * Tier hierarchy for comparison
 */
const TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  business: 3,
  enterprise: 4,
};

/**
 * Human-readable tier names
 */
const TIER_NAMES: Record<string, string> = {
  free: 'Gratuit',
  starter: 'Starter',
  professional: 'Professionnel',
  business: 'Business',
  enterprise: 'Enterprise',
};

export function useSubscription() {
  const store = useSubscriptionStore();
  const router = useRouter();
  const toast = useToast();

  // Local state
  const isInitialized = ref(false);

  /**
   * Initialize subscription data on first use
   */
  onMounted(async () => {
    if (!isInitialized.value) {
      await store.fetchSubscription();
      isInitialized.value = true;
    }
  });

  /**
   * Get tier display name
   */
  const tierName = computed(() => TIER_NAMES[store.currentTier] || store.currentTier);

  /**
   * Check if current tier is at or above a specific tier
   */
  function isAtLeastTier(tier: string): boolean {
    const currentLevel = TIER_HIERARCHY[store.currentTier] ?? 0;
    const requiredLevel = TIER_HIERARCHY[tier] ?? 0;
    return currentLevel >= requiredLevel;
  }

  /**
   * Check if user needs to upgrade to access a feature
   */
  function needsUpgrade(feature: FeatureKey): boolean {
    return !store.hasFeature(feature);
  }

  /**
   * Get the upgrade tier required for a feature
   */
  function getUpgradeTier(feature: FeatureKey): string | null {
    if (store.hasFeature(feature)) {
      return null; // No upgrade needed
    }
    return store.getRequiredTierForFeature(feature);
  }

  /**
   * Get human-readable name for upgrade tier
   */
  function getUpgradeTierName(feature: FeatureKey): string | null {
    const tier = getUpgradeTier(feature);
    return tier ? TIER_NAMES[tier] || tier : null;
  }

  /**
   * Navigate to billing/upgrade page
   */
  function navigateToUpgrade(feature?: FeatureKey): void {
    const query: Record<string, string> = {};
    if (feature) {
      query.feature = feature;
      const tier = getUpgradeTier(feature);
      if (tier) {
        query.suggestedTier = tier;
      }
    }
    router.push({ name: 'billing', query });
  }

  /**
   * Show upgrade prompt toast with action
   */
  function showUpgradePrompt(feature: FeatureKey, customMessage?: string): void {
    const tierName = getUpgradeTierName(feature);
    const message = customMessage || `Cette fonctionnalité nécessite un abonnement ${tierName}.`;
    toast.warning(message, 5000);
  }

  /**
   * Guard a feature - returns true if accessible, shows prompt if not
   */
  function guardFeature(feature: FeatureKey, options?: {
    showToast?: boolean;
    navigate?: boolean;
    customMessage?: string;
  }): boolean {
    const { showToast = true, navigate = false, customMessage } = options || {};

    if (store.hasFeature(feature)) {
      return true;
    }

    if (showToast) {
      showUpgradePrompt(feature, customMessage);
    }

    if (navigate) {
      navigateToUpgrade(feature);
    }

    return false;
  }

  type ResourceKey = 'dishes' | 'orders' | 'smsCredits' | 'storage' | 'campaigns' | 'users' | 'tables' | 'locations';

  /**
   * Guard a resource usage - returns true if can use more, shows limit warning if not
   */
  function guardUsage(resource: ResourceKey, options?: {
    showToast?: boolean;
    navigate?: boolean;
  }): boolean {
    const { showToast = true, navigate = false } = options || {};

    if (store.canUseMore(resource)) {
      return true;
    }

    if (showToast) {
      toast.warning(`Vous avez atteint la limite de ${resource}. Passez à un plan supérieur pour continuer.`, 5000);
    }

    if (navigate) {
      navigateToUpgrade();
    }

    return false;
  }

  /**
   * Get usage info for a resource
   */
  function getUsageInfo(resource: ResourceKey) {
    const limits = store.limits;
    const usage = store.usage;
    const limit = limits?.[resource] ?? 0;
    const used = usage?.[resource as keyof typeof usage] ?? 0;
    const remaining = store.getRemainingUsage(resource);
    const percentage = store.getUsagePercentage(resource);
    const isUnlimited = limit === -1;
    const isNearLimit = store.isNearLimit(resource);
    const isAtLimit = store.isAtLimit(resource);

    return {
      limit,
      used,
      remaining,
      percentage,
      isUnlimited,
      isNearLimit,
      isAtLimit,
      displayLimit: isUnlimited ? 'Illimité' : limit.toString(),
    };
  }

  /**
   * Check trial status with days remaining
   */
  const trialStatus = computed(() => {
    if (!store.isInTrial) {
      return null;
    }
    return {
      isInTrial: true,
      daysLeft: store.trialDaysLeft,
      isExpiringSoon: store.trialDaysLeft <= 3,
      message: store.trialDaysLeft === 1
        ? `Il vous reste 1 jour d'essai`
        : `Il vous reste ${store.trialDaysLeft} jours d'essai`,
    };
  });

  /**
   * Check subscription status
   */
  const subscriptionStatus = computed(() => {
    const status = store.status;
    const isValid = store.isValid;

    return {
      status,
      isValid,
      isActive: status === 'active',
      isTrial: status === 'trial',
      isCancelled: status === 'cancelled',
      isExpired: status === 'expired',
      isPastDue: status === 'past_due',
      needsAttention: status === 'past_due' || status === 'cancelled',
    };
  });

  /**
   * Refresh subscription data
   */
  async function refresh(): Promise<void> {
    await store.fetchSubscription(true);
  }

  /**
   * Format price for display
   */
  function formatPrice(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  // Watch for subscription expiry warning
  watch(
    () => store.daysUntilRenewal,
    (days) => {
      if (days !== null && days <= 3 && days > 0) {
        toast.info(`Votre abonnement expire dans ${days} jour${days > 1 ? 's' : ''}.`);
      }
    }
  );

  return {
    // Store state (reactive)
    subscription: computed(() => store.subscription),
    plans: computed(() => store.plans),
    isLoading: computed(() => store.isLoading),
    error: computed(() => store.error),
    currentPlan: computed(() => store.currentPlan),
    currentTier: computed(() => store.currentTier),
    tierName,
    isValid: computed(() => store.isValid),
    isInTrial: computed(() => store.isInTrial),
    features: computed(() => store.features),
    limits: computed(() => store.limits),
    usage: computed(() => store.usage),
    trialDaysLeft: computed(() => store.trialDaysLeft),
    daysUntilRenewal: computed(() => store.daysUntilRenewal),

    // Computed status
    trialStatus,
    subscriptionStatus,

    // Feature checks
    hasFeature: store.hasFeature,
    hasAnyFeature: store.hasAnyFeature,
    hasAllFeatures: store.hasAllFeatures,
    needsUpgrade,
    getUpgradeTier,
    getUpgradeTierName,
    isAtLeastTier,

    // Usage checks
    canUseMore: store.canUseMore,
    getUsagePercentage: store.getUsagePercentage,
    getRemainingUsage: store.getRemainingUsage,
    isNearLimit: store.isNearLimit,
    isAtLimit: store.isAtLimit,
    getUsageInfo,

    // Guards
    guardFeature,
    guardUsage,

    // Actions
    navigateToUpgrade,
    showUpgradePrompt,
    fetchPlans: store.fetchPlans,
    previewUpgrade: store.previewUpgrade,
    previewDowngrade: store.previewDowngrade,
    changePlan: store.changePlan,
    cancelSubscription: store.cancelSubscription,
    reactivateSubscription: store.reactivateSubscription,
    refresh,

    // Utilities
    formatPrice,
    FEATURES,
    TIER_NAMES,
    TIER_HIERARCHY,
  };
}
