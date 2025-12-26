<script setup lang="ts">
/**
 * SkeletonLoader component
 * Display loading placeholder with shimmer effect
 */
defineProps<{
  variant?: 'text' | 'title' | 'avatar' | 'image' | 'card' | 'button';
  width?: string;
  height?: string;
  rounded?: boolean;
  count?: number;
}>();
</script>

<template>
  <div v-for="i in count || 1" :key="i" class="animate-pulse">
    <!-- Text skeleton -->
    <div
      v-if="variant === 'text' || !variant"
      class="h-4 bg-gray-200 rounded"
      :style="{ width: width || '100%', height: height || '1rem' }"
      :class="{ 'rounded-full': rounded }"
    />

    <!-- Title skeleton -->
    <div
      v-else-if="variant === 'title'"
      class="h-6 bg-gray-200 rounded"
      :style="{ width: width || '60%', height: height || '1.5rem' }"
    />

    <!-- Avatar skeleton -->
    <div
      v-else-if="variant === 'avatar'"
      class="bg-gray-200 rounded-full"
      :style="{ width: width || '3rem', height: height || '3rem' }"
    />

    <!-- Image skeleton -->
    <div
      v-else-if="variant === 'image'"
      class="bg-gray-200"
      :style="{ width: width || '100%', height: height || '12rem' }"
      :class="{ 'rounded-lg': !rounded, 'rounded-full': rounded }"
    />

    <!-- Button skeleton -->
    <div
      v-else-if="variant === 'button'"
      class="h-10 bg-gray-200 rounded-lg"
      :style="{ width: width || '8rem' }"
    />

    <!-- Card skeleton -->
    <div v-else-if="variant === 'card'" class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="flex gap-4">
        <div class="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-3/4" />
          <div class="h-3 bg-gray-200 rounded w-1/2" />
          <div class="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
