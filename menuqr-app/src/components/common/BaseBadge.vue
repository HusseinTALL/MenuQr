<script setup lang="ts">
/**
 * BaseBadge component
 * Display small status indicators, labels, or counts
 */
defineProps<{
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  dot?: boolean;
}>();
</script>

<template>
  <span
    class="inline-flex items-center justify-center font-medium transition-colors"
    :class="[
      // Size classes
      {
        'px-2 py-0.5 text-xs': size === 'sm',
        'px-2.5 py-1 text-sm': size === 'md' || !size,
        'px-3 py-1.5 text-base': size === 'lg',
      },
      // Variant classes
      {
        'bg-primary-100 text-primary-800': variant === 'primary' || !variant,
        'bg-green-100 text-green-800': variant === 'success',
        'bg-yellow-100 text-yellow-800': variant === 'warning',
        'bg-red-100 text-red-800': variant === 'danger',
        'bg-blue-100 text-blue-800': variant === 'info',
        'bg-gray-100 text-gray-800': variant === 'gray',
      },
      // Shape classes
      {
        'rounded-full': rounded,
        'rounded-md': !rounded,
        'w-2 h-2 p-0': dot,
      },
    ]"
  >
    <slot v-if="!dot" />
  </span>
</template>
