<script setup lang="ts">
import { Radio } from 'ant-design-vue';

/**
 * BaseRadio - Wrapper around Ant Design Radio
 * Maintains backwards compatibility with existing API
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
  <div class="base-radio">
    <Radio
      :checked="modelValue === value"
      :disabled="disabled"
      :name="name"
      class="base-radio__input"
      @change="handleChange"
    >
      <span v-if="label" class="base-radio__label">
        {{ label }}
      </span>
    </Radio>
  </div>
</template>

<style scoped>
.base-radio {
  display: flex;
  align-items: flex-start;
}

.base-radio__input {
  align-items: flex-start;
}

.base-radio__input :deep(.ant-radio) {
  top: 2px;
}

.base-radio__input :deep(.ant-radio-inner) {
  width: 18px;
  height: 18px;
}

.base-radio__input :deep(.ant-radio-checked .ant-radio-inner) {
  border-color: #14b8a6;
  background-color: #14b8a6;
}

.base-radio__input :deep(.ant-radio-checked .ant-radio-inner::after) {
  background-color: #fff;
}

.base-radio__input :deep(.ant-radio:hover .ant-radio-inner) {
  border-color: #14b8a6;
}

.base-radio__label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  user-select: none;
  cursor: pointer;
}

.base-radio__input :deep(.ant-radio-disabled + span) {
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
