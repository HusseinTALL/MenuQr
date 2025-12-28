<script setup lang="ts">
import { watch } from 'vue';
import { Modal, Button } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';

/**
 * ConfirmDialog - Wrapper around Ant Design Modal
 * Maintains backwards compatibility with existing API
 */
interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirmation',
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  confirmVariant: 'primary',
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  close: [];
}>();

// Handle escape key (Ant Modal handles this, but we keep for compat)
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
);

const handleConfirm = () => {
  emit('confirm');
  emit('close');
};

const handleCancel = () => {
  emit('cancel');
  emit('close');
};
</script>

<template>
  <Modal
    :open="open"
    :title="null"
    :footer="null"
    :closable="false"
    :mask-closable="true"
    :centered="true"
    :width="360"
    class="confirm-dialog"
    @cancel="handleCancel"
  >
    <div class="confirm-dialog__content">
      <!-- Icon -->
      <div
        class="confirm-dialog__icon"
        :class="{
          'confirm-dialog__icon--primary': confirmVariant === 'primary',
          'confirm-dialog__icon--danger': confirmVariant === 'danger',
        }"
      >
        <ExclamationCircleOutlined />
      </div>

      <!-- Title -->
      <h3 v-if="title" class="confirm-dialog__title">
        {{ title }}
      </h3>

      <!-- Message -->
      <p class="confirm-dialog__message">
        {{ message }}
      </p>

      <!-- Actions -->
      <div class="confirm-dialog__actions">
        <Button size="large" class="confirm-dialog__btn" @click="handleCancel">
          {{ cancelText }}
        </Button>

        <Button
          :type="confirmVariant === 'danger' ? 'primary' : 'primary'"
          :danger="confirmVariant === 'danger'"
          size="large"
          class="confirm-dialog__btn"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<style>
/* Global modal styles (unscoped for Ant Design overrides) */
.confirm-dialog .ant-modal-content {
  border-radius: 20px;
  padding: 24px;
  overflow: hidden;
}

.confirm-dialog .ant-modal-body {
  padding: 0;
}
</style>

<style scoped>
.confirm-dialog__content {
  text-align: center;
}

.confirm-dialog__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-bottom: 16px;
  font-size: 28px;
}

.confirm-dialog__icon--primary {
  background: #f0fdfa;
  color: #14b8a6;
}

.confirm-dialog__icon--danger {
  background: #fef2f2;
  color: #ef4444;
}

.confirm-dialog__title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.confirm-dialog__message {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 24px;
  line-height: 1.5;
}

.confirm-dialog__actions {
  display: flex;
  gap: 12px;
}

.confirm-dialog__btn {
  flex: 1;
  border-radius: 12px;
  height: 44px;
  font-weight: 500;
}

.confirm-dialog__btn.ant-btn-default {
  border-color: #e2e8f0;
  color: #475569;
}

.confirm-dialog__btn.ant-btn-default:hover {
  border-color: #cbd5e1;
  color: #1e293b;
}

.confirm-dialog__btn.ant-btn-primary:not(.ant-btn-dangerous) {
  background: #14b8a6;
  border-color: #14b8a6;
}

.confirm-dialog__btn.ant-btn-primary:not(.ant-btn-dangerous):hover {
  background: #0d9488;
  border-color: #0d9488;
}
</style>
