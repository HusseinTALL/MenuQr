<script setup lang="ts">
/**
 * BaseCheckbox component
 * Reusable checkbox input with label
 */
defineProps<{
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
};
</script>

<template>
  <div class="flex items-start">
    <div class="flex items-center h-5">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        @change="handleChange"
      />
    </div>
    <div v-if="label || error" class="ml-3 text-sm">
      <label v-if="label" class="font-medium text-gray-700 cursor-pointer select-none">
        {{ label }}
      </label>
      <p v-if="error" class="text-red-600">
        {{ error }}
      </p>
    </div>
  </div>
</template>
