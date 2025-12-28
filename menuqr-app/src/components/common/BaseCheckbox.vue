<script setup lang="ts">
import { Checkbox } from 'ant-design-vue';

/**
 * BaseCheckbox - Wrapper around Ant Design Checkbox
 * Maintains backwards compatibility with existing API
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

const handleChange = (e: { target: { checked: boolean } }) => {
  emit('update:modelValue', e.target.checked);
};
</script>

<template>
  <div class="base-checkbox" :class="{ 'base-checkbox--error': error }">
    <Checkbox
      :checked="modelValue"
      :disabled="disabled"
      class="base-checkbox__input"
      @change="handleChange"
    >
      <span v-if="label" class="base-checkbox__label">
        {{ label }}
      </span>
    </Checkbox>

    <!-- Error message -->
    <p v-if="error" class="base-checkbox__error">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.base-checkbox {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.base-checkbox__input {
  align-items: flex-start;
}

.base-checkbox__input :deep(.ant-checkbox) {
  top: 2px;
}

.base-checkbox__input :deep(.ant-checkbox-inner) {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

.base-checkbox__input :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background-color: #14b8a6;
  border-color: #14b8a6;
}

.base-checkbox__input :deep(.ant-checkbox:hover .ant-checkbox-inner) {
  border-color: #14b8a6;
}

.base-checkbox__label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  user-select: none;
}

.base-checkbox--error :deep(.ant-checkbox-inner) {
  border-color: #ef4444;
}

.base-checkbox__error {
  margin-left: 26px;
  font-size: 13px;
  color: #ef4444;
}
</style>
