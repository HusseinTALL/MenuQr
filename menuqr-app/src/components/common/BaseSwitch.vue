<script setup lang="ts">
/**
 * BaseSwitch component
 * Toggle switch with optional label and description
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    size: 'md',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const toggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue);
  }
};

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        track: 'w-8 h-4',
        thumb: 'w-3 h-3',
        translate: 'translate-x-4',
      };
    case 'lg':
      return {
        track: 'w-14 h-7',
        thumb: 'w-6 h-6',
        translate: 'translate-x-7',
      };
    default:
      return {
        track: 'w-11 h-6',
        thumb: 'w-5 h-5',
        translate: 'translate-x-5',
      };
  }
});
</script>

<template>
  <div class="flex items-center gap-3" :class="{ 'opacity-50 cursor-not-allowed': disabled }">
    <!-- Switch -->
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      :class="[
        sizeClasses.track,
        modelValue ? 'bg-primary-600' : 'bg-gray-200',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      ]"
      @click="toggle"
    >
      <span
        class="pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
        :class="[sizeClasses.thumb, modelValue ? sizeClasses.translate : 'translate-x-0']"
      />
    </button>

    <!-- Label & Description -->
    <div v-if="label || description" class="flex flex-col">
      <span
        v-if="label"
        class="text-sm font-medium text-gray-900 cursor-pointer select-none"
        @click="toggle"
      >
        {{ label }}
      </span>
      <span v-if="description" class="text-xs text-gray-500">
        {{ description }}
      </span>
    </div>
  </div>
</template>
