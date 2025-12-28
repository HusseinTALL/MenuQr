<script setup lang="ts">
import { computed } from 'vue';
import { Switch } from 'ant-design-vue';

/**
 * BaseSwitch - Wrapper around Ant Design Switch
 * Maintains backwards compatibility with existing API
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    size: 'md',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Map size to Ant Design size
const antSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'small';
    case 'lg':
      return 'default'; // Ant doesn't have large, we'll use CSS
    default:
      return 'default';
  }
});

const handleChange = (checked: boolean | string | number) => {
  emit('update:modelValue', Boolean(checked));
};

const handleLabelClick = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue);
  }
};
</script>

<template>
  <div
    class="base-switch"
    :class="{
      'base-switch--disabled': disabled,
      'base-switch--sm': size === 'sm',
      'base-switch--lg': size === 'lg',
    }"
  >
    <!-- Switch -->
    <Switch
      :checked="modelValue"
      :disabled="disabled"
      :size="antSize"
      class="base-switch__input"
      @change="handleChange"
    />

    <!-- Label & Description -->
    <div v-if="label || description" class="base-switch__content" @click="handleLabelClick">
      <span v-if="label" class="base-switch__label">
        {{ label }}
      </span>
      <span v-if="description" class="base-switch__description">
        {{ description }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.base-switch {
  display: flex;
  align-items: center;
  gap: 12px;
}

.base-switch--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-switch__input {
  flex-shrink: 0;
}

/* Custom switch colors */
.base-switch__input:deep(.ant-switch-checked) {
  background: #14b8a6;
}

.base-switch__input:deep(.ant-switch:hover:not(.ant-switch-disabled)) {
  background: #d1d5db;
}

.base-switch__input:deep(.ant-switch-checked:hover:not(.ant-switch-disabled)) {
  background: #0d9488;
}

/* Large size override */
.base-switch--lg .base-switch__input {
  min-width: 56px;
  height: 28px;
}

.base-switch--lg .base-switch__input :deep(.ant-switch-handle) {
  width: 24px;
  height: 24px;
  top: 2px;
}

.base-switch--lg .base-switch__input:deep(.ant-switch-checked .ant-switch-handle) {
  inset-inline-start: calc(100% - 26px);
}

.base-switch__content {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.base-switch--disabled .base-switch__content {
  cursor: not-allowed;
}

.base-switch__label {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  user-select: none;
}

.base-switch__description {
  font-size: 12px;
  color: #64748b;
  user-select: none;
}

/* Focus ring */
.base-switch__input:deep(.ant-switch:focus) {
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.2);
}
</style>
