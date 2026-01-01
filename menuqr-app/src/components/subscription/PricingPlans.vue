<script setup lang="ts">
/**
 * PricingPlans Component
 *
 * Displays available subscription plans with pricing and features.
 * Supports monthly/yearly toggle and highlights current/recommended plan.
 */
import { computed, onMounted, ref } from 'vue';
import { useSubscription } from '@/composables/useSubscription';
import type { SubscriptionPlan } from '@/services/api';

const props = withDefaults(
  defineProps<{
    /** Show only specific tiers */
    showTiers?: string[];
    /** Highlight a specific tier as recommended */
    recommendedTier?: string;
    /** Show feature comparison table */
    showFeatures?: boolean;
    /** Compact mode for embedding */
    compact?: boolean;
  }>(),
  {
    showFeatures: true,
    compact: false,
  }
);

const emit = defineEmits<{
  (e: 'select-plan', plan: SubscriptionPlan): void;
  (e: 'upgrade', plan: SubscriptionPlan): void;
  (e: 'downgrade', plan: SubscriptionPlan): void;
}>();

const {
  plans,
  currentTier,
  isLoading,
  fetchPlans,
  changePlan,
  formatPrice,
  TIER_HIERARCHY,
} = useSubscription();

const billingPeriod = ref<'monthly' | 'yearly'>('monthly');
const selectedPlan = ref<string | null>(null);
const isChangingPlan = ref(false);

onMounted(async () => {
  await fetchPlans();
});

const displayPlans = computed(() => {
  let filtered = plans.value;
  if (props.showTiers && props.showTiers.length > 0) {
    filtered = filtered.filter(p => props.showTiers!.includes(p.tier));
  }
  return filtered.sort((a, b) => {
    const aLevel = TIER_HIERARCHY[a.tier] ?? 0;
    const bLevel = TIER_HIERARCHY[b.tier] ?? 0;
    return aLevel - bLevel;
  });
});

function isCurrentPlan(plan: SubscriptionPlan): boolean {
  return plan.tier === currentTier.value;
}

function isUpgrade(plan: SubscriptionPlan): boolean {
  const currentLevel = TIER_HIERARCHY[currentTier.value] ?? 0;
  const planLevel = TIER_HIERARCHY[plan.tier] ?? 0;
  return planLevel > currentLevel;
}

function isDowngrade(plan: SubscriptionPlan): boolean {
  const currentLevel = TIER_HIERARCHY[currentTier.value] ?? 0;
  const planLevel = TIER_HIERARCHY[plan.tier] ?? 0;
  return planLevel < currentLevel;
}

function getPrice(plan: SubscriptionPlan): string {
  const price = billingPeriod.value === 'monthly'
    ? plan.pricing.monthly
    : plan.pricing.yearly / 12;
  return formatPrice(price);
}

function getAnnualPrice(plan: SubscriptionPlan): string {
  return formatPrice(plan.pricing.yearly);
}

function getSavings(plan: SubscriptionPlan): number {
  return plan.pricing.yearlySavings;
}

async function handleSelectPlan(plan: SubscriptionPlan) {
  if (isCurrentPlan(plan)) {
    return;
  }

  selectedPlan.value = plan.id;
  emit('select-plan', plan);

  if (isUpgrade(plan)) {
    emit('upgrade', plan);
  } else {
    emit('downgrade', plan);
  }
}

async function handleConfirmChange(plan: SubscriptionPlan) {
  isChangingPlan.value = true;
  try {
    const success = await changePlan(plan.id, false);
    if (success) {
      selectedPlan.value = null;
    }
  } finally {
    isChangingPlan.value = false;
  }
}

function getTierIcon(tier: string): string {
  const icons: Record<string, string> = {
    free: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    starter: 'M13 10V3L4 14h7v7l9-11h-7z',
    professional: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    business: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    enterprise: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  return icons[tier] ?? icons.starter;
}

const tierColors: Record<string, { bg: string; text: string; border: string; button: string }> = {
  free: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    button: 'bg-gray-600 hover:bg-gray-700',
  },
  starter: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  professional: {
    bg: 'bg-primary-50',
    text: 'text-primary-600',
    border: 'border-primary-200',
    button: 'bg-primary-600 hover:bg-primary-700',
  },
  business: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
  enterprise: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
};
</script>

<template>
  <div class="pricing-plans">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>

    <template v-else>
      <!-- Billing toggle -->
      <div class="flex justify-center mb-8">
        <div class="inline-flex items-center p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
            :class="billingPeriod === 'monthly'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'"
            @click="billingPeriod = 'monthly'"
          >
            Mensuel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            :class="billingPeriod === 'yearly'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'"
            @click="billingPeriod = 'yearly'"
          >
            Annuel
            <span class="px-1.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded">
              -20%
            </span>
          </button>
        </div>
      </div>

      <!-- Plans grid -->
      <div
        class="grid gap-6"
        :class="{
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5': !compact,
          'grid-cols-1 sm:grid-cols-2': compact,
        }"
      >
        <div
          v-for="plan in displayPlans"
          :key="plan.id"
          class="relative flex flex-col bg-white rounded-xl border-2 transition-all duration-200"
          :class="[
            isCurrentPlan(plan)
              ? 'border-primary-500 ring-2 ring-primary-200'
              : 'border-gray-200 hover:border-gray-300',
            (plan.isPopular || plan.tier === recommendedTier) && !isCurrentPlan(plan)
              ? 'border-primary-300 shadow-lg'
              : 'shadow-sm',
          ]"
        >
          <!-- Popular badge -->
          <div
            v-if="(plan.isPopular || plan.tier === recommendedTier) && !isCurrentPlan(plan)"
            class="absolute -top-3 left-1/2 -translate-x-1/2"
          >
            <span class="px-3 py-1 text-xs font-semibold text-white bg-primary-600 rounded-full">
              Populaire
            </span>
          </div>

          <!-- Current plan badge -->
          <div
            v-if="isCurrentPlan(plan)"
            class="absolute -top-3 left-1/2 -translate-x-1/2"
          >
            <span class="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-full">
              Plan actuel
            </span>
          </div>

          <!-- Plan header -->
          <div class="p-6 text-center border-b border-gray-100">
            <div
              class="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              :class="tierColors[plan.tier]?.bg || 'bg-gray-100'"
            >
              <svg
                class="w-6 h-6"
                :class="tierColors[plan.tier]?.text || 'text-gray-600'"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="getTierIcon(plan.tier)"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900">{{ plan.name }}</h3>
            <p v-if="plan.description" class="mt-1 text-sm text-gray-500">
              {{ plan.description }}
            </p>
          </div>

          <!-- Pricing -->
          <div class="p-6 text-center">
            <div class="flex items-baseline justify-center gap-1">
              <span class="text-4xl font-bold text-gray-900">
                {{ getPrice(plan) }}
              </span>
              <span class="text-gray-500">/ mois</span>
            </div>
            <p v-if="billingPeriod === 'yearly'" class="mt-1 text-sm text-gray-500">
              {{ getAnnualPrice(plan) }} facturé annuellement
            </p>
            <p
              v-if="billingPeriod === 'yearly' && getSavings(plan) > 0"
              class="mt-1 text-sm font-medium text-green-600"
            >
              Économisez {{ getSavings(plan) }}%
            </p>
            <p v-if="plan.trialDays > 0" class="mt-2 text-sm text-primary-600">
              {{ plan.trialDays }} jours d'essai gratuit
            </p>
          </div>

          <!-- Features -->
          <div v-if="showFeatures" class="flex-1 p-6 pt-0">
            <ul class="space-y-3">
              <li
                v-for="feature in plan.displayFeatures"
                :key="feature"
                class="flex items-start gap-2"
              >
                <svg
                  class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-sm text-gray-600">{{ feature }}</span>
              </li>
            </ul>
          </div>

          <!-- CTA -->
          <div class="p-6 pt-0 mt-auto">
            <button
              v-if="isCurrentPlan(plan)"
              type="button"
              disabled
              class="w-full px-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg cursor-not-allowed"
            >
              Plan actuel
            </button>
            <button
              v-else-if="isUpgrade(plan)"
              type="button"
              class="w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
              :class="tierColors[plan.tier]?.button || 'bg-primary-600 hover:bg-primary-700'"
              :disabled="isChangingPlan"
              @click="handleSelectPlan(plan)"
            >
              <span v-if="isChangingPlan && selectedPlan === plan.id">
                Mise à niveau...
              </span>
              <span v-else>
                Passer à {{ plan.name }}
              </span>
            </button>
            <button
              v-else
              type="button"
              class="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              :disabled="isChangingPlan"
              @click="handleSelectPlan(plan)"
            >
              <span v-if="isChangingPlan && selectedPlan === plan.id">
                Changement...
              </span>
              <span v-else>
                Rétrograder
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Enterprise CTA -->
      <div v-if="!compact" class="mt-12 text-center">
        <p class="text-gray-600">
          Besoin d'une solution sur mesure ?
          <a href="mailto:entreprise@menuqr.fr" class="text-primary-600 font-medium hover:underline">
            Contactez notre équipe commerciale
          </a>
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pricing-plans {
  width: 100%;
}
</style>
