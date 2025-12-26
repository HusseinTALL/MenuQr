<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps<{
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Unique ID for aria-labelledby
const modalId = `modal-${Math.random().toString(36).substr(2, 9)}`;
const titleId = `${modalId}-title`;
const descriptionId = `${modalId}-description`;

// Refs for focus management
const modalRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const previousActiveElement = ref<HTMLElement | null>(null);

// Close on Escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.open) {
    emit('close');
  }

  // Focus trap - Tab key handling
  if (e.key === 'Tab' && props.open && modalRef.value) {
    const focusableElements = modalRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// Prevent body scroll when modal is open and manage focus
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.value = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus the close button after modal opens
      await nextTick();
      closeButtonRef.value?.focus();
    } else {
      document.body.style.overflow = '';

      // Restore focus to the previously focused element
      previousActiveElement.value?.focus();
    }
  }
);

const handleBackdropClick = () => {
  if (props.closeOnBackdrop !== false) {
    emit('close');
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        @click.self="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" aria-hidden="true" @click="handleBackdropClick" />

        <!-- Modal Content -->
        <div
          ref="modalRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="!title && ariaLabel ? ariaLabel : undefined"
          :aria-describedby="ariaDescribedby || (title ? descriptionId : undefined)"
          class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          :class="{
            'max-w-sm': size === 'sm',
            'max-w-md': size === 'md' || !size,
            'max-w-lg': size === 'lg',
            'max-w-full sm:max-w-4xl': size === 'full',
          }"
        >
          <!-- Header -->
          <div
            v-if="title || $slots.header"
            class="flex items-center justify-between p-4 border-b border-gray-100"
          >
            <slot name="header">
              <h2 :id="titleId" class="text-lg font-bold text-gray-900">{{ title }}</h2>
            </slot>

            <button
              ref="closeButtonRef"
              type="button"
              class="tap-target flex items-center justify-center text-gray-400 hover:text-gray-600 -mr-2"
              aria-label="Fermer"
              @click="emit('close')"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div :id="descriptionId" class="flex-1 overflow-y-auto p-4">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="p-4 border-t border-gray-100 safe-area-inset-bottom">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop animation */
.modal-enter-active {
  transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-leave-active {
  transition: opacity 200ms cubic-bezier(0.4, 0, 1, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Modal content animation - Desktop (scale + fade) */
.modal-enter-active > div:last-child {
  transition:
    transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-leave-active > div:last-child {
  transition:
    transform 200ms cubic-bezier(0.4, 0, 1, 1),
    opacity 150ms cubic-bezier(0.4, 0, 1, 1);
}

.modal-enter-from > div:last-child {
  opacity: 0;
  transform: translateY(24px) scale(0.95);
}

.modal-leave-to > div:last-child {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

/* Mobile - Bottom sheet slide up animation */
@media (max-width: 640px) {
  .modal-enter-active > div:last-child {
    transition:
      transform 400ms cubic-bezier(0.16, 1, 0.3, 1),
      opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-leave-active > div:last-child {
    transition:
      transform 250ms cubic-bezier(0.4, 0, 1, 1),
      opacity 200ms cubic-bezier(0.4, 0, 1, 1);
  }

  .modal-enter-from > div:last-child {
    opacity: 0;
    transform: translateY(100%);
  }

  .modal-leave-to > div:last-child {
    opacity: 0;
    transform: translateY(60%);
  }
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active > div:last-child,
  .modal-leave-active > div:last-child {
    transition: opacity 0.01ms;
  }

  .modal-enter-from > div:last-child,
  .modal-leave-to > div:last-child {
    transform: none;
  }
}
</style>
