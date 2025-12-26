<script setup lang="ts">
/**
 * BaseRating component
 * Star rating with interactive and display modes
 */
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    readonly?: boolean;
    showValue?: boolean;
    allowHalf?: boolean;
    color?: string;
    emptyColor?: string;
  }>(),
  {
    modelValue: 0,
    max: 5,
    size: 'md',
    readonly: false,
    showValue: false,
    allowHalf: false,
    color: '#f59e0b', // amber-500
    emptyColor: '#d1d5db', // gray-300
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const hoverValue = ref(0);
const isHovering = ref(false);

const displayValue = computed(() => {
  if (isHovering.value && !props.readonly) {
    return hoverValue.value;
  }
  return props.modelValue;
});

const stars = computed(() => {
  const result = [];
  for (let i = 1; i <= props.max; i++) {
    let fill: 'full' | 'half' | 'empty';

    if (displayValue.value >= i) {
      fill = 'full';
    } else if (props.allowHalf && displayValue.value >= i - 0.5) {
      fill = 'half';
    } else {
      fill = 'empty';
    }

    result.push({ index: i, fill });
  }
  return result;
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-4 h-4';
    case 'lg':
      return 'w-7 h-7';
    case 'xl':
      return 'w-9 h-9';
    default:
      return 'w-5 h-5';
  }
});

const gapClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'gap-0.5';
    case 'lg':
    case 'xl':
      return 'gap-1.5';
    default:
      return 'gap-1';
  }
});

const textSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-xs';
    case 'lg':
      return 'text-lg';
    case 'xl':
      return 'text-xl';
    default:
      return 'text-sm';
  }
});

const handleClick = (index: number, isHalf: boolean = false) => {
  if (props.readonly) {
    return;
  }
  const value = props.allowHalf && isHalf ? index - 0.5 : index;
  emit('update:modelValue', value);
};

const handleMouseMove = (event: MouseEvent, index: number) => {
  if (props.readonly) {
    return;
  }
  isHovering.value = true;

  if (props.allowHalf) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left < rect.width / 2;
    hoverValue.value = isLeftHalf ? index - 0.5 : index;
  } else {
    hoverValue.value = index;
  }
};

const handleMouseLeave = () => {
  isHovering.value = false;
  hoverValue.value = 0;
};
</script>

<template>
  <div class="inline-flex items-center" :class="gapClass">
    <!-- Stars -->
    <div class="inline-flex items-center" :class="gapClass" @mouseleave="handleMouseLeave">
      <button
        v-for="star in stars"
        :key="star.index"
        type="button"
        class="relative focus:outline-none transition-transform"
        :class="[sizeClasses, readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110']"
        :disabled="readonly"
        @click="handleClick(star.index)"
        @mousemove="handleMouseMove($event, star.index)"
      >
        <!-- Empty Star (background) -->
        <svg
          class="absolute inset-0 w-full h-full"
          :style="{ color: emptyColor }"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>

        <!-- Filled Star -->
        <svg
          v-if="star.fill !== 'empty'"
          class="absolute inset-0 w-full h-full"
          :class="{ 'clip-half': star.fill === 'half' }"
          :style="{ color }"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      </button>
    </div>

    <!-- Value Display -->
    <span v-if="showValue" class="font-medium text-gray-700 ml-1" :class="textSizeClass">
      {{ modelValue.toFixed(allowHalf ? 1 : 0) }}
    </span>
  </div>
</template>

<style scoped>
.clip-half {
  clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);
}
</style>
