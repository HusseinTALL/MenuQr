<script setup lang="ts">
/**
 * FeatureGate Component
 *
 * Conditionally renders content based on subscription feature access.
 * Shows upgrade prompt or custom fallback when feature is not available.
 */
import { computed } from 'vue';
import { useSubscription, type FeatureKey } from '@/composables/useSubscription';

const props = withDefaults(
  defineProps<{
    /** Single feature to check */
    feature?: FeatureKey;
    /** Multiple features - user needs ANY of these */
    anyOf?: FeatureKey[];
    /** Multiple features - user needs ALL of these */
    allOf?: FeatureKey[];
    /** Show upgrade UI when feature is locked */
    showUpgrade?: boolean;
    /** Blur the content when locked instead of hiding */
    blur?: boolean;
    /** Disable interaction when locked (with blur) */
    disabled?: boolean;
    /** Custom message for upgrade prompt */
    upgradeMessage?: string;
  }>(),
  {
    showUpgrade: true,
    blur: false,
    disabled: true,
  }
);

const emit = defineEmits<{
  (e: 'upgrade-click'): void;
}>();

const {
  hasFeature,
  hasAnyFeature,
  hasAllFeatures,
  getUpgradeTierName,
  navigateToUpgrade,
} = useSubscription();

const hasAccess = computed(() => {
  if (props.feature) {
    return hasFeature(props.feature);
  }
  if (props.anyOf && props.anyOf.length > 0) {
    return hasAnyFeature(props.anyOf);
  }
  if (props.allOf && props.allOf.length > 0) {
    return hasAllFeatures(props.allOf);
  }
  // No feature specified, allow access
  return true;
});

const requiredTierName = computed(() => {
  if (props.feature) {
    return getUpgradeTierName(props.feature);
  }
  const firstAny = props.anyOf?.[0];
  if (firstAny) {
    return getUpgradeTierName(firstAny);
  }
  const firstAll = props.allOf?.[0];
  if (firstAll) {
    return getUpgradeTierName(firstAll);
  }
  return null;
});

const defaultUpgradeMessage = computed(() => {
  if (props.upgradeMessage) {
    return props.upgradeMessage;
  }
  if (requiredTierName.value) {
    return `Cette fonctionnalité nécessite un abonnement ${requiredTierName.value}.`;
  }
  return 'Cette fonctionnalité nécessite un abonnement supérieur.';
});

function handleUpgradeClick() {
  emit('upgrade-click');
  if (props.feature) {
    navigateToUpgrade(props.feature);
  } else if (props.anyOf?.[0]) {
    navigateToUpgrade(props.anyOf[0]);
  } else if (props.allOf?.[0]) {
    navigateToUpgrade(props.allOf[0]);
  } else {
    navigateToUpgrade();
  }
}
</script>

<template>
  <div class="feature-gate">
    <!-- Has access: show content normally -->
    <template v-if="hasAccess">
      <slot />
    </template>

    <!-- No access with blur mode -->
    <template v-else-if="blur">
      <div class="relative">
        <!-- Blurred content -->
        <div
          class="blur-sm select-none"
          :class="{ 'pointer-events-none': disabled }"
        >
          <slot />
        </div>

        <!-- Upgrade overlay -->
        <div
          v-if="showUpgrade"
          class="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-lg"
        >
          <div class="text-center p-4">
            <div class="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-3">
              <svg
                class="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p class="text-sm text-gray-600 mb-3 max-w-xs">
              {{ defaultUpgradeMessage }}
            </p>
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              @click="handleUpgradeClick"
            >
              <svg
                class="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              Mettre à niveau
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- No access: show upgrade prompt or fallback slot -->
    <template v-else>
      <slot name="locked">
        <div
          v-if="showUpgrade"
          class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <div class="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
                <svg
                  class="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-amber-800">
                Fonctionnalité Premium
              </h4>
              <p class="mt-1 text-sm text-amber-700">
                {{ defaultUpgradeMessage }}
              </p>
              <button
                type="button"
                class="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-200 hover:bg-amber-300 rounded-md transition-colors"
                @click="handleUpgradeClick"
              >
                <svg
                  class="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                Voir les plans
              </button>
            </div>
          </div>
        </div>
      </slot>
    </template>
  </div>
</template>

<style scoped>
.feature-gate {
  width: 100%;
}
</style>
