<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Alert } from 'ant-design-vue';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons-vue';

/**
 * Toast - Notification message using Ant Design Alert
 * Maintains backwards compatibility with existing API
 */
const props = defineProps<{
  variant?: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  dismissible?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const visible = ref(true);

onMounted(() => {
  if (props.duration !== 0) {
    setTimeout(() => {
      visible.value = false;
      setTimeout(() => emit('close'), 300);
    }, props.duration || 3000);
  }
});

const close = () => {
  visible.value = false;
  setTimeout(() => emit('close'), 300);
};

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
</script>

<template>
  <Transition name="slide-up">
    <div v-if="visible" class="toast-wrapper">
      <Alert
        :type="alertType"
        :message="message"
        :closable="dismissible !== false"
        :show-icon="true"
        class="toast"
        @close="close"
      >
        <template #icon>
          <component :is="iconComponent" />
        </template>
      </Alert>
    </div>
  </Transition>
</template>

<style scoped>
.toast-wrapper {
  pointer-events: auto;
  max-width: 400px;
  width: 100%;
}

.toast {
  border-radius: 12px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
}

.toast :deep(.ant-alert-message) {
  font-weight: 500;
  font-size: 14px;
}

.toast :deep(.ant-alert-icon) {
  font-size: 18px;
}

.toast :deep(.ant-alert-close-icon) {
  font-size: 12px;
}

/* Info variant */
.toast.ant-alert-info {
  background-color: #eff6ff;
  border-color: #bfdbfe;
}

.toast.ant-alert-info :deep(.ant-alert-icon) {
  color: #2563eb;
}

.toast.ant-alert-info :deep(.ant-alert-message) {
  color: #1e40af;
}

/* Success variant */
.toast.ant-alert-success {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}

.toast.ant-alert-success :deep(.ant-alert-icon) {
  color: #16a34a;
}

.toast.ant-alert-success :deep(.ant-alert-message) {
  color: #166534;
}

/* Warning variant */
.toast.ant-alert-warning {
  background-color: #fefce8;
  border-color: #fde047;
}

.toast.ant-alert-warning :deep(.ant-alert-icon) {
  color: #ca8a04;
}

.toast.ant-alert-warning :deep(.ant-alert-message) {
  color: #854d0e;
}

/* Error variant */
.toast.ant-alert-error {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.toast.ant-alert-error :deep(.ant-alert-icon) {
  color: #dc2626;
}

.toast.ant-alert-error :deep(.ant-alert-message) {
  color: #991b1b;
}

/* Slide animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
