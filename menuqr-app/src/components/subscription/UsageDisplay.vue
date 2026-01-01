<script setup lang="ts">
/**
 * UsageDisplay Component
 *
 * Displays usage statistics for subscription resources with progress bars.
 * Shows warnings when approaching or at limits.
 */
import { computed } from 'vue';
import { useSubscription } from '@/composables/useSubscription';

const props = withDefaults(
  defineProps<{
    /** Specific resource to display (or 'all' for all resources) */
    resource?: 'dishes' | 'orders' | 'smsCredits' | 'storage' | 'campaigns' | 'users' | 'tables' | 'locations' | 'all';
    /** Display variant */
    variant?: 'compact' | 'detailed' | 'mini';
    /** Show upgrade button when near limit */
    showUpgrade?: boolean;
    /** Custom title */
    title?: string;
  }>(),
  {
    resource: 'all',
    variant: 'detailed',
    showUpgrade: true,
  }
);

const {
  limits,
  getUsageInfo,
  navigateToUpgrade,
} = useSubscription();

interface ResourceConfig {
  key: string;
  label: string;
  icon: string;
  unit?: string;
}

const resourceConfigs: ResourceConfig[] = [
  { key: 'dishes', label: 'Plats', icon: 'M3 3h18v18H3V3z' },
  { key: 'orders', label: 'Commandes / mois', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'smsCredits', label: 'Crédits SMS', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { key: 'storage', label: 'Stockage (Mo)', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', unit: 'Mo' },
  { key: 'campaigns', label: 'Campagnes / mois', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { key: 'users', label: 'Utilisateurs', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'tables', label: 'Tables', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { key: 'locations', label: 'Établissements', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
];

const displayResources = computed(() => {
  if (props.resource === 'all') {
    // Filter to only show resources that have limits defined
    return resourceConfigs.filter(config => {
      const limit = limits.value?.[config.key as keyof typeof limits.value];
      return limit !== undefined && limit !== 0;
    });
  }
  return resourceConfigs.filter(config => config.key === props.resource);
});

function getResourceData(resourceKey: string) {
  const info = getUsageInfo(resourceKey as keyof typeof limits.value);
  const config = resourceConfigs.find(c => c.key === resourceKey);

  return {
    ...info,
    label: config?.label || resourceKey,
    icon: config?.icon || '',
    unit: config?.unit,
  };
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) {
    return 'bg-red-500';
  }
  if (percentage >= 80) {
    return 'bg-amber-500';
  }
  if (percentage >= 60) {
    return 'bg-yellow-500';
  }
  return 'bg-green-500';
}

function getStatusColor(percentage: number): string {
  if (percentage >= 100) {
    return 'text-red-600';
  }
  if (percentage >= 80) {
    return 'text-amber-600';
  }
  return 'text-gray-600';
}
</script>

<template>
  <div class="usage-display">
    <!-- Mini variant - single line per resource -->
    <template v-if="variant === 'mini'">
      <div class="flex flex-wrap gap-4">
        <div
          v-for="resource in displayResources"
          :key="resource.key"
          class="flex items-center gap-2"
        >
          <span class="text-xs text-gray-500">{{ resource.label }}:</span>
          <span
            class="text-xs font-medium"
            :class="getStatusColor(getResourceData(resource.key).percentage)"
          >
            {{ getResourceData(resource.key).used }}
            <template v-if="!getResourceData(resource.key).isUnlimited">
              / {{ getResourceData(resource.key).limit }}
            </template>
            <template v-else>
              (illimité)
            </template>
          </span>
        </div>
      </div>
    </template>

    <!-- Compact variant - progress bars only -->
    <template v-else-if="variant === 'compact'">
      <div class="space-y-3">
        <div
          v-for="resource in displayResources"
          :key="resource.key"
          class="space-y-1"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">{{ resource.label }}</span>
            <span
              class="font-medium"
              :class="getStatusColor(getResourceData(resource.key).percentage)"
            >
              {{ getResourceData(resource.key).used }}
              <template v-if="!getResourceData(resource.key).isUnlimited">
                / {{ getResourceData(resource.key).displayLimit }}
              </template>
            </span>
          </div>
          <div
            v-if="!getResourceData(resource.key).isUnlimited"
            class="h-2 bg-gray-200 rounded-full overflow-hidden"
          >
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="getProgressColor(getResourceData(resource.key).percentage)"
              :style="{ width: `${Math.min(getResourceData(resource.key).percentage, 100)}%` }"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Detailed variant - full cards -->
    <template v-else>
      <div class="space-y-4">
        <h3 v-if="title" class="text-lg font-semibold text-gray-900">
          {{ title }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="resource in displayResources"
            :key="resource.key"
            class="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                  <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="resource.icon" />
                  </svg>
                </div>
                <span class="font-medium text-gray-900">{{ resource.label }}</span>
              </div>
              <span
                v-if="getResourceData(resource.key).isAtLimit && showUpgrade"
                class="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full"
              >
                Limite atteinte
              </span>
              <span
                v-else-if="getResourceData(resource.key).isNearLimit && showUpgrade"
                class="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full"
              >
                Presque plein
              </span>
            </div>

            <div class="space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-2xl font-bold text-gray-900">
                  {{ getResourceData(resource.key).used }}
                </span>
                <span class="text-sm text-gray-500">
                  <template v-if="getResourceData(resource.key).isUnlimited">
                    Illimité
                  </template>
                  <template v-else>
                    sur {{ getResourceData(resource.key).displayLimit }}
                  </template>
                </span>
              </div>

              <div
                v-if="!getResourceData(resource.key).isUnlimited"
                class="h-2 bg-gray-200 rounded-full overflow-hidden"
              >
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="getProgressColor(getResourceData(resource.key).percentage)"
                  :style="{ width: `${Math.min(getResourceData(resource.key).percentage, 100)}%` }"
                />
              </div>

              <div
                v-if="!getResourceData(resource.key).isUnlimited"
                class="flex items-center justify-between text-xs text-gray-500"
              >
                <span>{{ getResourceData(resource.key).percentage }}% utilisé</span>
                <span v-if="getResourceData(resource.key).remaining !== null">
                  {{ getResourceData(resource.key).remaining }} restant{{ getResourceData(resource.key).remaining !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <button
              v-if="getResourceData(resource.key).isAtLimit && showUpgrade"
              type="button"
              class="mt-3 w-full px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
              @click="navigateToUpgrade()"
            >
              Augmenter la limite
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.usage-display {
  width: 100%;
}
</style>
