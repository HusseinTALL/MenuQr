<script setup lang="ts">
import { computed } from 'vue';
import { Alert } from 'ant-design-vue';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons-vue';

/**
 * BaseAlert - Wrapper around Ant Design Alert
 * Maintains backwards compatibility with existing API
 */
const props = defineProps<{
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

// Map variant to Ant Design type
const alertType = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
});

// Get icon component
const iconComponent = computed(() => {
  switch (props.variant) {
    case 'success':
      return CheckCircleOutlined;
    case 'warning':
      return ExclamationCircleOutlined;
    case 'error':
      return CloseCircleOutlined;
    default:
      return InfoCircleOutlined;
  }
});

const handleClose = () => {
  emit('dismiss');
};
</script>

<template>
  <Alert
    :type="alertType"
    :message="title"
    :closable="dismissible"
    :show-icon="true"
    class="base-alert"
    @close="handleClose"
  >
    <template #icon>
      <component :is="iconComponent" />
    </template>

    <template v-if="$slots.default" #description>
      <slot />
    </template>
  </Alert>
</template>

<style scoped>
.base-alert {
  border-radius: 12px;
  padding: 12px 16px;
}

.base-alert :deep(.ant-alert-message) {
  font-weight: 600;
  margin-bottom: 4px;
}

.base-alert :deep(.ant-alert-description) {
  font-size: 14px;
}

.base-alert :deep(.ant-alert-icon) {
  font-size: 20px;
}

.base-alert :deep(.ant-alert-close-icon) {
  font-size: 14px;
}

/* Info variant */
.base-alert.ant-alert-info {
  background-color: #eff6ff;
  border-color: #bfdbfe;
}

.base-alert.ant-alert-info :deep(.ant-alert-icon) {
  color: #2563eb;
}

/* Success variant */
.base-alert.ant-alert-success {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}

.base-alert.ant-alert-success :deep(.ant-alert-icon) {
  color: #16a34a;
}

/* Warning variant */
.base-alert.ant-alert-warning {
  background-color: #fefce8;
  border-color: #fde047;
}

.base-alert.ant-alert-warning :deep(.ant-alert-icon) {
  color: #ca8a04;
}

/* Error variant */
.base-alert.ant-alert-error {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.base-alert.ant-alert-error :deep(.ant-alert-icon) {
  color: #dc2626;
}
</style>
