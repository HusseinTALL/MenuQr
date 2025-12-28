<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Drawer } from 'ant-design-vue';
import { CloseOutlined } from '@ant-design/icons-vue';

/**
 * BottomSheet - Wrapper around Ant Design Drawer
 * Mobile-friendly bottom sheet that slides up
 */
const props = defineProps<{
  open: boolean;
  title?: string;
  height?: number | string;
  closeOnBackdrop?: boolean;
  showDragHandle?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Drag state
const isDragging = ref(false);
const startY = ref(0);
const currentY = ref(0);

// Compute drawer height
const drawerHeight = computed(() => {
  if (props.height) {
    return typeof props.height === 'number' ? props.height : props.height;
  }
  return 'auto';
});

// Handle close
const handleClose = () => {
  emit('close');
};

// Touch/drag handlers for swipe-to-close
const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  if (!touch) {return;}
  isDragging.value = true;
  startY.value = touch.clientY;
  currentY.value = 0;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) {return;}
  const touch = e.touches[0];
  if (!touch) {return;}

  const delta = touch.clientY - startY.value;
  // Only allow dragging down
  if (delta > 0) {
    currentY.value = delta;
    e.preventDefault();
  }
};

const handleTouchEnd = () => {
  isDragging.value = false;
  // Close if dragged down more than 100px
  if (currentY.value > 100) {
    emit('close');
  }
  currentY.value = 0;
};

// Prevent body scroll when open
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
  <Drawer
    :open="open"
    :title="title"
    placement="bottom"
    :height="drawerHeight"
    :closable="!!title"
    :mask-closable="closeOnBackdrop !== false"
    :destroy-on-close="true"
    class="bottom-sheet"
    @close="handleClose"
  >
    <!-- Custom close icon -->
    <template #closeIcon>
      <CloseOutlined />
    </template>

    <!-- Extra header content (drag handle) -->
    <template #extra>
      <slot name="extra" />
    </template>

    <!-- Drag handle when no title -->
    <div
      v-if="showDragHandle !== false"
      class="bottom-sheet__drag-handle"
      @touchstart.passive="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="bottom-sheet__drag-bar" />
    </div>

    <!-- Content wrapper with drag transform -->
    <div
      class="bottom-sheet__content"
      :style="{
        transform: isDragging ? `translateY(${currentY}px)` : 'translateY(0)',
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
      }"
    >
      <slot />
    </div>

    <!-- Footer slot -->
    <template v-if="$slots.footer" #footer>
      <div class="bottom-sheet__footer">
        <slot name="footer" />
      </div>
    </template>
  </Drawer>
</template>

<style>
/* Global drawer styles (unscoped for Ant Design overrides) */
.bottom-sheet .ant-drawer-content-wrapper {
  border-radius: 20px 20px 0 0 !important;
  overflow: hidden;
}

.bottom-sheet .ant-drawer-content {
  border-radius: 20px 20px 0 0;
}

.bottom-sheet .ant-drawer-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.bottom-sheet .ant-drawer-header-title {
  flex-direction: row-reverse;
}

.bottom-sheet .ant-drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.bottom-sheet .ant-drawer-close {
  padding: 8px;
  margin-right: 0;
  color: #64748b;
}

.bottom-sheet .ant-drawer-close:hover {
  color: #1e293b;
}

.bottom-sheet .ant-drawer-body {
  padding: 0;
  overflow-y: auto;
}

.bottom-sheet .ant-drawer-footer {
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #f1f5f9;
}

/* Animation */
.bottom-sheet .ant-drawer-content-wrapper {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* Backdrop blur */
.bottom-sheet .ant-drawer-mask {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Max height */
.bottom-sheet .ant-drawer-content-wrapper {
  max-height: 90vh !important;
}
</style>

<style scoped>
.bottom-sheet__drag-handle {
  display: flex;
  justify-content: center;
  padding: 12px 0 8px;
  cursor: grab;
  touch-action: none;
}

.bottom-sheet__drag-handle:active {
  cursor: grabbing;
}

.bottom-sheet__drag-bar {
  width: 40px;
  height: 4px;
  background: #d1d5db;
  border-radius: 2px;
  transition: background 0.2s ease;
}

.bottom-sheet__drag-handle:hover .bottom-sheet__drag-bar {
  background: #9ca3af;
}

.bottom-sheet__content {
  padding: 0 16px 16px;
  will-change: transform;
}

.bottom-sheet__footer {
  display: flex;
  gap: 12px;
}

/* When no title, add top padding */
:deep(.ant-drawer-body:first-child) .bottom-sheet__content {
  padding-top: 0;
}
</style>
