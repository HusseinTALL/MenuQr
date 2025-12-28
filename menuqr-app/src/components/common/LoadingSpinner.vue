<script setup lang="ts">
import { computed } from 'vue';
import { Spin } from 'ant-design-vue';
import { LoadingOutlined } from '@ant-design/icons-vue';

/**
 * LoadingSpinner - Wrapper around Ant Design Spin
 * Maintains backwards compatibility with existing API
 */
const props = defineProps<{
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  variant?: 'spinner' | 'dots' | 'pulse';
  label?: string;
  tip?: string;
}>();

// Map size to Ant Design size
const antSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'small';
    case 'lg':
      return 'large';
    default:
      return 'default';
  }
});

// Custom indicator size
const indicatorSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 16;
    case 'lg':
      return 32;
    default:
      return 24;
  }
});

// Color class for custom styling
const colorClass = computed(() => {
  switch (props.color) {
    case 'white':
      return 'loading-spinner--white';
    case 'gray':
      return 'loading-spinner--gray';
    default:
      return 'loading-spinner--primary';
  }
});
</script>

<template>
  <!-- Spinner variant (default) - uses Ant Design Spin -->
  <div
    v-if="!variant || variant === 'spinner'"
    class="loading-spinner"
    :class="colorClass"
    role="status"
    :aria-label="label || 'Chargement...'"
  >
    <Spin :size="antSize" :tip="tip">
      <template #indicator>
        <LoadingOutlined :style="{ fontSize: `${indicatorSize}px` }" spin />
      </template>
    </Spin>
    <span class="sr-only">{{ label || 'Chargement...' }}</span>
  </div>

  <!-- Dots variant -->
  <div
    v-else-if="variant === 'dots'"
    class="loading-dots"
    :class="colorClass"
    role="status"
    :aria-label="label || 'Chargement...'"
  >
    <span></span>
    <span></span>
    <span></span>
    <span class="sr-only">{{ label || 'Chargement...' }}</span>
  </div>

  <!-- Pulse ring variant -->
  <div
    v-else-if="variant === 'pulse'"
    class="loading-pulse"
    :class="[
      colorClass,
      {
        'loading-pulse--sm': size === 'sm',
        'loading-pulse--md': size === 'md' || !size,
        'loading-pulse--lg': size === 'lg',
      },
    ]"
    role="status"
    :aria-label="label || 'Chargement...'"
  >
    <span class="sr-only">{{ label || 'Chargement...' }}</span>
  </div>
</template>

<style scoped>
/* Base spinner styles */
.loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Color variants */
.loading-spinner--primary :deep(.ant-spin-dot-item),
.loading-spinner--primary :deep(.anticon) {
  color: #14b8a6;
}

.loading-spinner--white :deep(.ant-spin-dot-item),
.loading-spinner--white :deep(.anticon) {
  color: #ffffff;
}

.loading-spinner--gray :deep(.ant-spin-dot-item),
.loading-spinner--gray :deep(.anticon) {
  color: #9ca3af;
}

/* Dots variant */
.loading-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.loading-dots span:not(.sr-only) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: dots-bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0s;
}

.loading-dots--primary {
  color: #14b8a6;
}

.loading-dots--white {
  color: #ffffff;
}

.loading-dots--gray {
  color: #9ca3af;
}

@keyframes dots-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Pulse variant */
.loading-pulse {
  position: relative;
  border-radius: 50%;
}

.loading-pulse::before,
.loading-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid currentColor;
  animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

.loading-pulse::after {
  animation-delay: 0.5s;
}

.loading-pulse--sm {
  width: 24px;
  height: 24px;
}

.loading-pulse--md {
  width: 40px;
  height: 40px;
}

.loading-pulse--lg {
  width: 56px;
  height: 56px;
}

.loading-pulse--primary {
  color: #14b8a6;
}

.loading-pulse--white {
  color: #ffffff;
}

.loading-pulse--gray {
  color: #9ca3af;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
