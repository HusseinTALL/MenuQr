<script setup lang="ts">
/**
 * BaseDropdown component
 * Dropdown menu with trigger and floating content
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    trigger?: 'click' | 'hover';
    placement?: 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';
    closeOnClick?: boolean;
    disabled?: boolean;
  }>(),
  {
    trigger: 'click',
    placement: 'bottom-start',
    closeOnClick: true,
    disabled: false,
  }
);

const emit = defineEmits<{
  open: [];
  close: [];
}>();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const toggle = () => {
  if (props.disabled) {
    return;
  }
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    emit('open');
  } else {
    emit('close');
  }
};

const open = () => {
  if (props.disabled || isOpen.value) {
    return;
  }
  isOpen.value = true;
  emit('open');
};

const close = () => {
  if (!isOpen.value) {
    return;
  }
  isOpen.value = false;
  emit('close');
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    close();
  }
};

const handleMenuClick = () => {
  if (props.closeOnClick) {
    close();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});

const placementClasses = computed(() => {
  switch (props.placement) {
    case 'bottom-end':
      return 'right-0 top-full mt-2';
    case 'bottom':
      return 'left-1/2 -translate-x-1/2 top-full mt-2';
    case 'top-start':
      return 'left-0 bottom-full mb-2';
    case 'top-end':
      return 'right-0 bottom-full mb-2';
    case 'top':
      return 'left-1/2 -translate-x-1/2 bottom-full mb-2';
    default: // bottom-start
      return 'left-0 top-full mt-2';
  }
});

// Expose methods for programmatic control
defineExpose({
  open,
  close,
  toggle,
  isOpen,
});
</script>

<template>
  <div
    ref="dropdownRef"
    class="relative inline-block"
    @mouseenter="trigger === 'hover' && !disabled ? open() : null"
    @mouseleave="trigger === 'hover' ? close() : null"
  >
    <!-- Trigger -->
    <div
      class="cursor-pointer"
      :class="{ 'cursor-not-allowed opacity-50': disabled }"
      @click="trigger === 'click' ? toggle() : null"
    >
      <slot name="trigger" :is-open="isOpen" :toggle="toggle" />
    </div>

    <!-- Menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        :class="placementClasses"
        @click="handleMenuClick"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
