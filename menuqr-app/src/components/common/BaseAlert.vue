<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';

/**
 * BaseAlert component
 * Display important messages, errors, warnings, or information
 */
defineProps<{
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();
</script>

<template>
  <div
    class="flex items-start gap-3 p-4 rounded-lg border"
    :class="{
      'bg-blue-50 border-blue-200': variant === 'info' || !variant,
      'bg-green-50 border-green-200': variant === 'success',
      'bg-yellow-50 border-yellow-200': variant === 'warning',
      'bg-red-50 border-red-200': variant === 'error',
    }"
    role="alert"
  >
    <!-- Icon -->
    <div class="flex-shrink-0">
      <BaseIcon
        :name="
          variant === 'success'
            ? 'check'
            : variant === 'warning'
              ? 'warning'
              : variant === 'error'
                ? 'error'
                : 'info'
        "
        size="lg"
        :class="{
          'text-blue-600': variant === 'info' || !variant,
          'text-green-600': variant === 'success',
          'text-yellow-600': variant === 'warning',
          'text-red-600': variant === 'error',
        }"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <h3
        v-if="title"
        class="font-semibold mb-1"
        :class="{
          'text-blue-900': variant === 'info' || !variant,
          'text-green-900': variant === 'success',
          'text-yellow-900': variant === 'warning',
          'text-red-900': variant === 'error',
        }"
      >
        {{ title }}
      </h3>
      <div
        class="text-sm"
        :class="{
          'text-blue-800': variant === 'info' || !variant,
          'text-green-800': variant === 'success',
          'text-yellow-800': variant === 'warning',
          'text-red-800': variant === 'error',
        }"
      >
        <slot />
      </div>
    </div>

    <!-- Dismiss button -->
    <button
      v-if="dismissible"
      class="flex-shrink-0 tap-target p-1 rounded-lg transition-colors hover:bg-black hover:bg-opacity-5"
      :class="{
        'text-blue-600': variant === 'info' || !variant,
        'text-green-600': variant === 'success',
        'text-yellow-600': variant === 'warning',
        'text-red-600': variant === 'error',
      }"
      @click="emit('dismiss')"
    >
      <BaseIcon name="close" size="sm" />
    </button>
  </div>
</template>
