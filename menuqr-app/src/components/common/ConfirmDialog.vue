<script setup lang="ts">
import { watch } from 'vue';

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

// Handle escape key
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }
  }
);

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleCancel();
  }
};

const handleConfirm = () => {
  emit('confirm');
  emit('close');
};

const handleCancel = () => {
  emit('cancel');
  emit('close');
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    handleCancel();
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <!-- Dialog -->
        <div
          class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? 'dialog-title' : undefined"
        >
          <!-- Title -->
          <h3
            v-if="title"
            id="dialog-title"
            class="text-lg font-semibold text-gray-900 mb-2"
          >
            {{ title }}
          </h3>

          <!-- Message -->
          <p class="text-gray-600 mb-6">
            {{ message }}
          </p>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>

            <button
              type="button"
              class="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
              :class="{
                'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500':
                  confirmVariant === 'primary',
                'bg-red-600 hover:bg-red-700 focus:ring-red-500':
                  confirmVariant === 'danger',
              }"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease-out;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>
