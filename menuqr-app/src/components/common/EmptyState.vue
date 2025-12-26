<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';
import BaseButton from './BaseButton.vue';

/**
 * EmptyState component
 * Display when there's no data or content to show
 */
defineProps<{
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <!-- Icon -->
    <div v-if="icon" class="w-20 h-20 mb-6 text-gray-300">
      <BaseIcon :name="icon" size="xl" class="w-full h-full" />
    </div>

    <!-- Title -->
    <h3 class="text-lg font-semibold text-gray-900 mb-2">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="text-gray-600 max-w-md mb-6">
      {{ description }}
    </p>

    <!-- Action button -->
    <BaseButton v-if="actionLabel" variant="primary" @click="emit('action')">
      {{ actionLabel }}
    </BaseButton>

    <!-- Slot for custom action -->
    <slot name="action" />
  </div>
</template>
