<script setup lang="ts">
import { computed } from 'vue';
import { Select } from 'ant-design-vue';

/**
 * BaseSelect - Wrapper around Ant Design Select
 * Maintains backwards compatibility with existing API
 */
const props = defineProps<{
  modelValue: string | number | undefined;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  allowClear?: boolean;
  showSearch?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

// Validation status
const validationStatus = computed(() => {
  return props.error ? 'error' : '';
});

// Map size to Ant Design size
const antSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'small';
    case 'lg':
      return 'large';
    default:
      return 'middle';
  }
});

// Handle change
const handleChange = (value: unknown) => {
  emit('update:modelValue', value as string | number);
};

// Filter option for search
const filterOption = (input: string, option: unknown): boolean => {
  const opt = option as { label?: string } | undefined;
  return opt?.label?.toLowerCase().includes(input.toLowerCase()) ?? false;
};
</script>

<template>
  <div class="base-select">
    <!-- Label -->
    <label v-if="label" class="base-select__label">
      {{ label }}
      <span v-if="required" class="base-select__required">*</span>
    </label>

    <!-- Select -->
    <Select
      :value="modelValue"
      :options="options"
      :placeholder="placeholder"
      :disabled="disabled"
      :size="antSize"
      :status="validationStatus"
      :allow-clear="allowClear"
      :show-search="showSearch"
      :filter-option="showSearch ? filterOption : undefined"
      class="base-select__field"
      @change="handleChange"
    />

    <!-- Error message -->
    <p v-if="error" class="base-select__error">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.base-select {
  width: 100%;
}

.base-select__label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.base-select__required {
  color: #ef4444;
  margin-left: 2px;
}

.base-select__field {
  width: 100%;
}

.base-select__field :deep(.ant-select-selector) {
  border-radius: 12px !important;
  min-height: 44px !important;
  padding: 4px 12px !important;
}

.base-select__field :deep(.ant-select-selection-item) {
  line-height: 34px;
}

.base-select__field :deep(.ant-select-selection-placeholder) {
  line-height: 34px;
}

/* Size variants */
.base-select__field.ant-select-sm :deep(.ant-select-selector) {
  min-height: 36px !important;
}

.base-select__field.ant-select-lg :deep(.ant-select-selector) {
  min-height: 52px !important;
  font-size: 16px;
}

.base-select__error {
  margin-top: 6px;
  font-size: 13px;
  color: #ef4444;
}

/* Dropdown styling */
:deep(.ant-select-dropdown) {
  border-radius: 12px;
  padding: 4px;
}

:deep(.ant-select-item) {
  border-radius: 8px;
  padding: 8px 12px;
}

:deep(.ant-select-item-option-selected) {
  background-color: #f0fdfa;
  font-weight: 500;
}
</style>
