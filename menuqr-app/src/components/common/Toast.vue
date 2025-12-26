<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseIcon from './BaseIcon.vue';

/**
 * Toast component
 * Temporary notification message
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
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="visible"
      class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border pointer-events-auto max-w-md"
      :class="{
        'bg-blue-50 border-blue-200': variant === 'info' || !variant,
        'bg-green-50 border-green-200': variant === 'success',
        'bg-yellow-50 border-yellow-200': variant === 'warning',
        'bg-red-50 border-red-200': variant === 'error',
      }"
    >
      <!-- Icon -->
      <BaseIcon
        :name="
          variant === 'success'
            ? 'check'
            : variant === 'warning'
              ? 'warning'
              : variant === 'error'
                ? 'error'
                : 'info'
        "
        size="md"
        :class="{
          'text-blue-600': variant === 'info' || !variant,
          'text-green-600': variant === 'success',
          'text-yellow-600': variant === 'warning',
          'text-red-600': variant === 'error',
        }"
      />

      <!-- Message -->
      <p
        class="flex-1 text-sm font-medium"
        :class="{
          'text-blue-900': variant === 'info' || !variant,
          'text-green-900': variant === 'success',
          'text-yellow-900': variant === 'warning',
          'text-red-900': variant === 'error',
        }"
      >
        {{ message }}
      </p>

      <!-- Close button -->
      <button
        v-if="dismissible !== false"
        class="tap-target p-1 rounded transition-colors hover:bg-black hover:bg-opacity-5"
        :class="{
          'text-blue-600': variant === 'info' || !variant,
          'text-green-600': variant === 'success',
          'text-yellow-600': variant === 'warning',
          'text-red-600': variant === 'error',
        }"
        @click="close"
      >
        <BaseIcon name="close" size="sm" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
