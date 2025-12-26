<script setup lang="ts">
import { computed } from 'vue';
import type { ReviewStats, RatingDistribution } from '@/types/review';
import StarRating from './StarRating.vue';

interface Props {
  stats: ReviewStats;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
});

const maxCount = computed(() => {
  const dist = props.stats.ratingDistribution;
  return Math.max(dist[1], dist[2], dist[3], dist[4], dist[5], 1);
});

const getRatingPercentage = (rating: keyof RatingDistribution) => {
  const count = props.stats.ratingDistribution[rating];
  return (count / maxCount.value) * 100;
};

const getRatingCount = (rating: keyof RatingDistribution) => {
  return props.stats.ratingDistribution[rating];
};

const ratingLabels = [5, 4, 3, 2, 1] as const;
</script>

<template>
  <div
    :class="[
      'bg-white rounded-xl border border-gray-200 p-4',
      compact ? '' : 'p-6',
    ]"
  >
    <!-- Compact view -->
    <div v-if="compact" class="flex items-center gap-4">
      <div class="text-center">
        <div class="text-3xl font-bold text-gray-900">
          {{ stats.averageRating.toFixed(1) }}
        </div>
        <StarRating :model-value="stats.averageRating" readonly size="sm" />
        <div class="text-sm text-gray-500 mt-1">
          {{ stats.totalReviews }} avis
        </div>
      </div>
      <div class="flex-1 space-y-1">
        <div
          v-for="rating in ratingLabels"
          :key="rating"
          class="flex items-center gap-2"
        >
          <span class="text-xs text-gray-500 w-3">{{ rating }}</span>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-400 rounded-full transition-all duration-500"
              :style="{ width: `${getRatingPercentage(rating)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Full view -->
    <div v-else>
      <div class="flex items-start gap-8">
        <!-- Average score -->
        <div class="text-center">
          <div class="text-5xl font-bold text-gray-900">
            {{ stats.averageRating.toFixed(1) }}
          </div>
          <StarRating :model-value="stats.averageRating" readonly size="lg" class="justify-center mt-2" />
          <div class="text-sm text-gray-500 mt-2">
            Basé sur {{ stats.totalReviews }} avis
          </div>
        </div>

        <!-- Rating distribution -->
        <div class="flex-1 space-y-2">
          <div
            v-for="rating in ratingLabels"
            :key="rating"
            class="flex items-center gap-3"
          >
            <div class="flex items-center gap-1 w-16">
              <span class="text-sm font-medium text-gray-700">{{ rating }}</span>
              <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            </div>
            <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-amber-400 rounded-full transition-all duration-500"
                :style="{ width: `${getRatingPercentage(rating)}%` }"
              />
            </div>
            <span class="text-sm text-gray-500 w-8 text-right">
              {{ getRatingCount(rating) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Additional stats -->
      <div v-if="stats.responseRate !== undefined" class="mt-6 pt-4 border-t border-gray-100">
        <div class="flex items-center gap-6 text-sm">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span class="text-gray-600">
              Taux de réponse: <span class="font-medium text-gray-900">{{ stats.responseRate }}%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
