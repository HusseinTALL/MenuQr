<script setup lang="ts">
// @ts-nocheck - TODO: Fix feature index type error
/**
 * UpgradePrompt Component
 *
 * Displays a prominent upgrade call-to-action with feature comparison.
 * Can be used as a modal, inline banner, or full-page section.
 */
import { computed, ref } from 'vue';
import { useSubscription, type FeatureKey } from '@/composables/useSubscription';

const props = withDefaults(
  defineProps<{
    /** Target feature that triggered this prompt */
    feature?: FeatureKey;
    /** Suggested tier to upgrade to */
    suggestedTier?: string;
    /** Display variant */
    variant?: 'banner' | 'card' | 'modal' | 'inline';
    /** Show feature comparison */
    showComparison?: boolean;
    /** Custom title */
    title?: string;
    /** Custom description */
    description?: string;
    /** Show dismiss button */
    dismissible?: boolean;
  }>(),
  {
    variant: 'card',
    showComparison: false,
    dismissible: true,
  }
);

const emit = defineEmits<{
  (e: 'upgrade'): void;
  (e: 'dismiss'): void;
  (e: 'view-plans'): void;
}>();

const {
  currentTier,
  tierName,
  getUpgradeTierName,
  navigateToUpgrade,
  TIER_NAMES,
} = useSubscription();

const isDismissed = ref(false);

const targetTierName = computed(() => {
  if (props.suggestedTier) {
    return (TIER_NAMES as Record<string, string>)[props.suggestedTier] || props.suggestedTier;
  }
  if (props.feature) {
    return getUpgradeTierName(props.feature);
  }
  // Default to next tier
  const tierOrder = ['free', 'starter', 'professional', 'business', 'enterprise'] as const;
  const currentIndex = tierOrder.indexOf(currentTier.value as typeof tierOrder[number]);
  const nextTier = tierOrder[Math.min(currentIndex + 1, tierOrder.length - 1)];
  return (TIER_NAMES as Record<string, string>)[nextTier] || nextTier;
});

const displayTitle = computed(() => {
  if (props.title) {
    return props.title;
  }
  return `Passez à ${targetTierName.value}`;
});

const displayDescription = computed(() => {
  if (props.description) {
    return props.description;
  }
  return `Débloquez plus de fonctionnalités et faites passer votre restaurant au niveau supérieur.`;
});

const benefitsList = computed(() => {
  const targetTier = props.suggestedTier || 'professional';
  const benefits: Record<string, string[]> = {
    starter: [
      'Réservations en ligne',
      'Programme de fidélité',
      'Gestion des tables',
      'Analytics de base',
      'Campagnes email',
    ],
    professional: [
      'Analytics avancés',
      'Campagnes SMS',
      'Gestion des stocks',
      'Domaine personnalisé',
      'Module livraison',
      'Support prioritaire',
    ],
    business: [
      'Multi-établissements',
      'Accès API',
      'Module hôtellerie',
      'Journaux d\'audit',
      'Intégrations avancées',
    ],
    enterprise: [
      'White label complet',
      'SSO / SAML',
      'Support dédié 24/7',
      'SLA garanti',
      'Personnalisations sur mesure',
    ],
  };
  return benefits[targetTier] || benefits.professional;
});

function handleUpgrade() {
  emit('upgrade');
  if (props.feature) {
    navigateToUpgrade(props.feature);
  } else {
    navigateToUpgrade();
  }
}

function handleDismiss() {
  isDismissed.value = true;
  emit('dismiss');
}

function handleViewPlans() {
  emit('view-plans');
  navigateToUpgrade();
}
</script>

<template>
  <div
    v-if="!isDismissed"
    class="upgrade-prompt"
    :class="{
      'upgrade-prompt--banner': variant === 'banner',
      'upgrade-prompt--card': variant === 'card',
      'upgrade-prompt--modal': variant === 'modal',
      'upgrade-prompt--inline': variant === 'inline',
    }"
  >
    <!-- Banner variant -->
    <div
      v-if="variant === 'banner'"
      class="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p class="text-sm font-medium">
            {{ displayDescription }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium bg-white text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
            @click="handleUpgrade"
          >
            Mettre à niveau
          </button>
          <button
            v-if="dismissible"
            type="button"
            class="p-1 text-white/80 hover:text-white transition-colors"
            @click="handleDismiss"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Card variant -->
    <div
      v-else-if="variant === 'card'"
      class="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
    >
      <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white">{{ displayTitle }}</h3>
              <p class="text-sm text-primary-100">
                Actuellement: {{ tierName }}
              </p>
            </div>
          </div>
          <button
            v-if="dismissible"
            type="button"
            class="p-1 text-white/80 hover:text-white transition-colors"
            @click="handleDismiss"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div class="p-6">
        <p class="text-gray-600 mb-4">
          {{ displayDescription }}
        </p>

        <ul v-if="showComparison" class="space-y-2 mb-6">
          <li
            v-for="benefit in benefitsList"
            :key="benefit"
            class="flex items-center gap-2 text-sm text-gray-700"
          >
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ benefit }}
          </li>
        </ul>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            @click="handleUpgrade"
          >
            Mettre à niveau maintenant
          </button>
          <button
            type="button"
            class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            @click="handleViewPlans"
          >
            Comparer les plans
          </button>
        </div>
      </div>
    </div>

    <!-- Inline variant -->
    <div
      v-else-if="variant === 'inline'"
      class="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
    >
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <p class="flex-1 text-sm text-amber-800">
        {{ displayDescription }}
      </p>
      <button
        type="button"
        class="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-200 hover:bg-amber-300 rounded-md transition-colors"
        @click="handleUpgrade"
      >
        Upgrade
      </button>
    </div>
  </div>
</template>

<style scoped>
.upgrade-prompt {
  width: 100%;
}

.upgrade-prompt--modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
