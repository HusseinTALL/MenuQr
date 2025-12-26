<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';
import BaseButton from './BaseButton.vue';

/**
 * ErrorState component
 * Display when an error occurs with retry option
 */
defineProps<{
  title?: string;
  message?: string;
  showRetry?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <!-- Error Icon -->
    <div class="w-20 h-20 mb-6 text-red-500">
      <BaseIcon name="error" size="xl" class="w-full h-full" />
    </div>

    <!-- Title -->
    <h3 class="text-lg font-semibold text-gray-900 mb-2">
      {{ title || 'Une erreur est survenue' }}
    </h3>

    <!-- Message -->
    <p class="text-gray-600 max-w-md mb-6">
      {{ message || 'Impossible de charger les données. Veuillez réessayer.' }}
    </p>

    <!-- Retry button -->
    <BaseButton v-if="showRetry !== false" variant="primary" @click="emit('retry')">
      Réessayer
    </BaseButton>

    <!-- Slot for custom content -->
    <slot />
  </div>
</template>
