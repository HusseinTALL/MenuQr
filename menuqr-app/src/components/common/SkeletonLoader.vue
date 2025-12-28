<script setup lang="ts">
/**
 * SkeletonLoader component
 * Display loading placeholder with shimmer effect
 *
 * Usage:
 * - Simple: <SkeletonLoader class="h-4 w-full" />
 * - With variant: <SkeletonLoader variant="avatar" />
 * - Multiple: <SkeletonLoader variant="text" :count="3" />
 */

const props = defineProps<{
  variant?: 'text' | 'title' | 'avatar' | 'image' | 'card' | 'button';
  width?: string;
  height?: string;
  rounded?: boolean;
  count?: number;
}>();

// Single item rendering - classes passed via attrs are inherited automatically
const isSingleItem = !props.count || props.count === 1;
</script>

<template>
  <!-- Single skeleton - attrs (class) are inherited on this root element -->
  <div
    v-if="isSingleItem"
    class="animate-pulse bg-gray-200"
    :class="{
      'rounded': variant === 'text' || !variant,
      'rounded-lg': variant === 'image' || variant === 'button' || variant === 'card',
      'rounded-full': variant === 'avatar' || rounded,
    }"
    :style="{
      width: width,
      height: height,
    }"
  >
    <!-- Card variant has internal structure -->
    <template v-if="variant === 'card'">
      <div class="bg-white rounded-lg border border-gray-200 p-4 w-full h-full">
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg animate-pulse" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div class="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div class="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Multiple skeletons - wrap in container -->
  <div v-else class="space-y-2">
    <div
      v-for="i in count"
      :key="i"
      class="animate-pulse bg-gray-200"
      :class="{
        'rounded': variant === 'text' || !variant,
        'rounded-lg': variant === 'image' || variant === 'button',
        'rounded-full': variant === 'avatar' || rounded,
        'h-4': variant === 'text' || !variant,
        'h-6': variant === 'title',
        'h-10': variant === 'button',
      }"
      :style="{
        width: width || '100%',
        height: height,
      }"
    />
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
