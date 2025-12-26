<script setup lang="ts">
import { computed } from 'vue';

/**
 * BaseSelect component
 * Reusable select dropdown with label and error state
 */
const props = defineProps<{
  modelValue: string | number;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const hasError = computed(() => !!props.error);

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <!-- Select -->
    <select
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :class="[
        'w-full px-4 py-2.5 rounded-lg border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
        'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
        {
          'border-gray-300': !hasError,
          'border-red-500 focus:ring-red-500': hasError,
        },
      ]"
      @change="handleChange"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>

    <!-- Error message -->
    <p v-if="error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>
