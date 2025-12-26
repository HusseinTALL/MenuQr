<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import BaseIcon from './BaseIcon.vue';

/**
 * BottomSheet component
 * Modal that slides up from the bottom (mobile-friendly)
 */
const props = defineProps<{
  open: boolean;
  title?: string;
  snapPoints?: number[]; // Percentage heights
  closeOnBackdrop?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const isDragging = ref(false);
const startY = ref(0);
const currentY = ref(0);

// Close on Escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.open) {
    emit('close');
  }
};

// Handle backdrop click
const handleBackdropClick = () => {
  if (props.closeOnBackdrop !== false) {
    emit('close');
  }
};

// Prevent body scroll when open
watch(
  () => props.open,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});

// Touch/drag handlers
const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  if (!touch) {
    return;
  }
  isDragging.value = true;
  startY.value = touch.clientY;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) {
    return;
  }
  const touch = e.touches[0];
  if (!touch) {
    return;
  }
  currentY.value = touch.clientY - startY.value;
  if (currentY.value < 0) {
    currentY.value = 0;
  } // Prevent dragging up
};

const handleTouchEnd = () => {
  isDragging.value = false;
  if (currentY.value > 100) {
    // Close if dragged down more than 100px
    emit('close');
  }
  currentY.value = 0;
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center"
      @click.self="handleBackdropClick"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

      <!-- Sheet -->
      <Transition name="slide-up">
        <div
          v-if="open"
          class="relative w-full max-w-2xl bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col"
          :style="{ transform: `translateY(${currentY}px)` }"
        >
          <!-- Drag handle -->
          <div
            class="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <div class="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <!-- Header -->
          <div v-if="title" class="flex items-center justify-between px-6 py-3 border-b">
            <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
            <button
              class="tap-target p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
              @click="emit('close')"
            >
              <BaseIcon name="close" size="md" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <slot />
          </div>

          <!-- Footer slot -->
          <div v-if="$slots.footer" class="border-t px-6 py-4">
            <slot name="footer" />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
