<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue?: number;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  count?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  readonly: false,
  size: 'md',
  showValue: false,
  count: 5,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-4 h-4';
    case 'lg':
      return 'w-8 h-8';
    default:
      return 'w-6 h-6';
  }
});

const textSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm';
    case 'lg':
      return 'text-xl';
    default:
      return 'text-base';
  }
});

const stars = computed(() => {
  const result = [];
  for (let i = 1; i <= props.count; i++) {
    const filled = i <= Math.floor(props.modelValue);
    const halfFilled = !filled && i - 0.5 <= props.modelValue;
    result.push({ index: i, filled, halfFilled });
  }
  return result;
});

const handleClick = (rating: number) => {
  if (!props.readonly) {
    emit('update:modelValue', rating);
  }
};

const handleHover = (_rating: number) => {
  if (!props.readonly) {
    // Could add hover preview here
  }
};
</script>

<template>
  <div class="flex items-center gap-1">
    <div class="flex">
      <button
        v-for="star in stars"
        :key="star.index"
        type="button"
        :disabled="readonly"
        :class="[
          'transition-transform duration-150',
          readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
        ]"
        @click="handleClick(star.index)"
        @mouseenter="handleHover(star.index)"
      >
        <svg
          :class="[sizeClasses]"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Full star -->
          <path
            v-if="star.filled"
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="#F59E0B"
            stroke="#F59E0B"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <!-- Half star -->
          <template v-else-if="star.halfFilled">
            <defs>
              <linearGradient :id="`half-${star.index}`">
                <stop offset="50%" stop-color="#F59E0B" />
                <stop offset="50%" stop-color="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              :fill="`url(#half-${star.index})`"
              stroke="#F59E0B"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </template>
          <!-- Empty star -->
          <path
            v-else
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="none"
            stroke="#D1D5DB"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
    <span
      v-if="showValue && modelValue > 0"
      :class="['font-medium text-gray-700', textSizeClass]"
    >
      {{ modelValue.toFixed(1) }}
    </span>
  </div>
</template>
