<script setup lang="ts">
/**
 * BaseRadio component
 * Reusable radio input with label
 */
const props = defineProps<{
  modelValue: string | number | boolean;
  value: string | number | boolean;
  name: string;
  label?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean];
}>();

const handleChange = () => {
  emit('update:modelValue', props.value);
};
</script>

<template>
  <div class="flex items-start">
    <div class="flex items-center h-5">
      <input
        type="radio"
        :name="name"
        :value="value"
        :checked="modelValue === value"
        :disabled="disabled"
        class="w-4 h-4 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        @change="handleChange"
      />
    </div>
    <div v-if="label" class="ml-3 text-sm">
      <label class="font-medium text-gray-700 cursor-pointer select-none">
        {{ label }}
      </label>
    </div>
  </div>
</template>
