<script setup lang="ts">
import { computed, watch } from 'vue';
import { Modal } from 'ant-design-vue';
import { CloseOutlined } from '@ant-design/icons-vue';

/**
 * BaseModal - Wrapper around Ant Design Modal
 * Maintains backwards compatibility with existing API
 * Mobile-optimized with bottom sheet behavior on small screens
 */
const props = defineProps<{
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  centered?: boolean;
  closable?: boolean;
  keyboard?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Map size to width
const modalWidth = computed(() => {
  switch (props.size) {
    case 'sm':
      return 360;
    case 'md':
      return 480;
    case 'lg':
      return 640;
    case 'full':
      return '95vw';
    default:
      return 480;
  }
});

// Handle modal close
const handleClose = () => {
  emit('close');
};

// Handle backdrop click
const handleCancel = () => {
  if (props.closeOnBackdrop !== false) {
    emit('close');
  }
};

// Prevent body scroll when open (Ant Design handles this, but we ensure consistency)
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
</script>

<template>
  <Modal
    :open="open"
    :title="title"
    :width="modalWidth"
    :centered="centered !== false"
    :closable="closable !== false"
    :keyboard="keyboard !== false"
    :mask-closable="closeOnBackdrop !== false"
    :footer="null"
    :destroy-on-close="true"
    class="base-modal"
    :class="{
      'base-modal--sm': size === 'sm',
      'base-modal--md': size === 'md' || !size,
      'base-modal--lg': size === 'lg',
      'base-modal--full': size === 'full',
    }"
    @cancel="handleCancel"
  >
    <!-- Custom close button -->
    <template #closeIcon>
      <button
        type="button"
        class="base-modal__close"
        aria-label="Fermer"
        @click="handleClose"
      >
        <CloseOutlined />
      </button>
    </template>

    <!-- Custom header if slot provided -->
    <template v-if="$slots.header" #title>
      <slot name="header" />
    </template>

    <!-- Body content -->
    <div class="base-modal__body">
      <slot />
    </div>

    <!-- Footer if slot provided -->
    <div v-if="$slots.footer" class="base-modal__footer">
      <slot name="footer" />
    </div>
  </Modal>
</template>

<style>
/* Global modal styles (unscoped for Ant Design overrides) */
.base-modal .ant-modal-content {
  border-radius: 20px;
  overflow: hidden;
  padding: 0;
}

.base-modal .ant-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  margin: 0;
}

.base-modal .ant-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.base-modal .ant-modal-close {
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
}

.base-modal .ant-modal-body {
  padding: 0;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

/* Mobile styles */
@media (max-width: 575px) {
  .base-modal {
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100vw !important;
  }

  .base-modal .ant-modal {
    top: auto !important;
    bottom: 0;
    margin: 0;
    padding-bottom: 0;
    max-width: 100vw !important;
  }

  .base-modal .ant-modal-content {
    border-radius: 20px 20px 0 0;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .base-modal .ant-modal-header {
    padding: 12px 16px;
    flex-shrink: 0;
  }

  .base-modal .ant-modal-title {
    font-size: 16px;
  }

  .base-modal .ant-modal-body {
    flex: 1;
    overflow-y: auto;
    max-height: none;
  }

  .base-modal .ant-modal-close {
    top: 8px;
    right: 8px;
    width: 36px;
    height: 36px;
  }

  /* Safe area padding for iOS */
  .base-modal .base-modal__footer {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
</style>

<style scoped>
.base-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.base-modal__close:hover {
  color: #1e293b;
}

.base-modal__body {
  padding: 20px;
}

.base-modal__footer {
  padding: 16px 20px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
}

@media (max-width: 575px) {
  .base-modal__body {
    padding: 16px;
  }

  .base-modal__footer {
    padding: 12px 16px;
    position: sticky;
    bottom: 0;
  }
}
</style>
