<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue';

defineProps<{
  variant?: 'primary' | 'secondary' | 'whatsapp' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: boolean;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    :class="[
      // Size
      {
        'px-3 py-2 text-sm gap-1.5': size === 'sm',
        'px-5 py-3 text-base gap-2': size === 'md' || !size,
        'px-6 py-4 text-lg gap-2.5': size === 'lg',
      },
      // Icon button
      icon && {
        'w-8 h-8 p-0': size === 'sm',
        'w-10 h-10 p-0': size === 'md' || !size,
        'w-12 h-12 p-0': size === 'lg',
      },
      // Full width
      { 'w-full': fullWidth },
      // Variant
      {
        'bg-primary-500 text-white hover:bg-primary-600 shadow-sm':
          variant === 'primary' || !variant,
        'bg-gray-100 text-gray-700 hover:bg-gray-200': variant === 'secondary',
        'bg-whatsapp text-white hover:bg-green-600 shadow-lg': variant === 'whatsapp',
        'border-2 border-primary-500 text-primary-600 hover:bg-primary-50': variant === 'outline',
        'text-gray-600 hover:text-gray-900 hover:bg-gray-100': variant === 'ghost',
        'bg-red-500 text-white hover:bg-red-600 shadow-sm': variant === 'danger',
      },
    ]"
    @click="emit('click', $event)"
  >
    <LoadingSpinner
      v-if="loading"
      size="sm"
      :color="
        variant === 'secondary' || variant === 'ghost' || variant === 'outline' ? 'gray' : 'white'
      "
    />
    <slot v-else />
  </button>
</template>
