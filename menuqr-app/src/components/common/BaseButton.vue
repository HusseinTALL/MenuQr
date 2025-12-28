<script setup lang="ts">
import { computed } from 'vue';
import { Button } from 'ant-design-vue';
import { LoadingOutlined } from '@ant-design/icons-vue';

/**
 * BaseButton - Wrapper around Ant Design Button
 * Maintains backwards compatibility with existing API
 */
const props = defineProps<{
  variant?: 'primary' | 'secondary' | 'whatsapp' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

// Map variant to Ant Design button type
const antType = computed(() => {
  switch (props.variant) {
    case 'primary':
    case 'whatsapp':
      return 'primary';
    case 'secondary':
      return 'default';
    case 'outline':
      return 'default';
    case 'ghost':
      return 'text';
    case 'danger':
      return 'primary';
    default:
      return 'primary';
  }
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

// Compute button shape for icon-only buttons
const antShape = computed(() => {
  return props.icon ? 'circle' : 'default';
});

// Danger state for Ant
const isDanger = computed(() => props.variant === 'danger');

// Custom classes for variants not native to Ant
const customClass = computed(() => {
  const classes: string[] = ['base-button'];

  if (props.variant === 'whatsapp') {
    classes.push('base-button--whatsapp');
  }
  if (props.variant === 'outline') {
    classes.push('base-button--outline');
  }
  if (props.fullWidth) {
    classes.push('base-button--full-width');
  }
  if (props.icon) {
    classes.push('base-button--icon');
  }

  return classes.join(' ');
});
</script>

<template>
  <Button
    :type="antType"
    :size="antSize"
    :shape="antShape"
    :loading="loading"
    :disabled="disabled"
    :danger="isDanger"
    :html-type="htmlType || 'button'"
    :block="fullWidth"
    :class="customClass"
    @click="emit('click', $event)"
  >
    <template v-if="loading" #icon>
      <LoadingOutlined />
    </template>
    <slot />
  </Button>
</template>

<style scoped>
/* Base button styles */
.base-button {
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.base-button:active:not(:disabled) {
  transform: scale(0.98);
}

/* WhatsApp variant */
.base-button--whatsapp {
  background: #25d366 !important;
  border-color: #25d366 !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

.base-button--whatsapp:hover:not(:disabled) {
  background: #20bd5a !important;
  border-color: #20bd5a !important;
  box-shadow: 0 6px 16px rgba(37, 211, 102, 0.4);
}

/* Outline variant */
.base-button--outline {
  border-width: 2px;
  border-color: #14b8a6;
  color: #0d9488;
  background: transparent;
}

.base-button--outline:hover:not(:disabled) {
  background: #f0fdfa !important;
  border-color: #0d9488 !important;
  color: #0d9488 !important;
}

/* Full width */
.base-button--full-width {
  width: 100%;
}

/* Icon button */
.base-button--icon {
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Size adjustments for better touch targets */
.base-button.ant-btn-sm {
  min-height: 36px;
  padding: 4px 12px;
}

.base-button.ant-btn-middle,
.base-button.ant-btn {
  min-height: 44px;
  padding: 8px 20px;
}

.base-button.ant-btn-lg {
  min-height: 52px;
  padding: 12px 24px;
  font-size: 16px;
}

/* Icon button sizes */
.base-button--icon.ant-btn-sm {
  width: 36px;
  height: 36px;
}

.base-button--icon.ant-btn-middle,
.base-button--icon.ant-btn {
  width: 44px;
  height: 44px;
}

.base-button--icon.ant-btn-lg {
  width: 52px;
  height: 52px;
}
</style>
