<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  variant?: 'spinner' | 'dots' | 'pulse';
  label?: string;
}>();
</script>

<template>
  <!-- Spinner variant (default) -->
  <div
    v-if="!variant || variant === 'spinner'"
    class="inline-flex items-center justify-center"
    :class="{
      'w-4 h-4': size === 'sm',
      'w-8 h-8': size === 'md' || !size,
      'w-12 h-12': size === 'lg',
    }"
    role="status"
    :aria-label="label || 'Chargement...'"
  >
    <svg
      class="animate-spin"
      :class="{
        'text-primary-500': color === 'primary' || !color,
        'text-white': color === 'white',
        'text-gray-400': color === 'gray',
      }"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <span class="sr-only">{{ label || 'Chargement...' }}</span>
  </div>

  <!-- Dots variant -->
  <div
    v-else-if="variant === 'dots'"
    class="loading-dots"
    :class="{
      'text-primary-500': color === 'primary' || !color,
      'text-white': color === 'white',
      'text-gray-400': color === 'gray',
    }"
    role="status"
    :aria-label="label || 'Chargement...'"
  >
    <span></span>
    <span></span>
    <span></span>
    <span class="sr-only">{{ label || 'Chargement...' }}</span>
  </div>

  <!-- Pulse ring variant -->
  <div
    v-else-if="variant === 'pulse'"
    class="loading-pulse-ring"
    :class="[
      {
        'w-6 h-6': size === 'sm',
        'w-10 h-10': size === 'md' || !size,
        'w-14 h-14': size === 'lg',
      },
      {
        'text-primary-500': color === 'primary' || !color,
        'text-white': color === 'white',
        'text-gray-400': color === 'gray',
      },
    ]"
    role="status"
    :aria-label="label || 'Chargement...'"
  >
    <span class="sr-only">{{ label || 'Chargement...' }}</span>
  </div>
</template>
