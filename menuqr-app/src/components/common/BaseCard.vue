<script setup lang="ts">
/**
 * BaseCard component
 * Reusable card container with optional header, body, and footer sections
 */
defineProps<{
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}>();
</script>

<template>
  <div
    class="bg-white rounded-lg border border-gray-200 transition-shadow"
    :class="[
      {
        'p-0': padding === 'none',
        'p-3': padding === 'sm',
        'p-4': padding === 'md' || !padding,
        'p-6': padding === 'lg',
      },
      {
        'shadow-none': shadow === 'none',
        'shadow-sm': shadow === 'sm' || !shadow,
        'shadow-md': shadow === 'md',
        'shadow-lg': shadow === 'lg',
      },
      {
        'hover:shadow-lg cursor-pointer': hover,
      },
    ]"
  >
    <slot />
  </div>
</template>
