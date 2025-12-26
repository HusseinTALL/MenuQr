<script setup lang="ts">
/**
 * BaseStepper component
 * Multi-step progress indicator
 */
import { computed } from 'vue';

interface Step {
  id: string | number;
  label: string;
  description?: string;
  icon?: string;
}

const props = withDefaults(
  defineProps<{
    steps: Step[];
    currentStep: string | number;
    variant?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
    clickable?: boolean;
  }>(),
  {
    variant: 'horizontal',
    size: 'md',
    clickable: false,
  }
);

const emit = defineEmits<{
  'update:currentStep': [value: string | number];
  stepClick: [step: Step];
}>();

const currentIndex = computed(() => {
  return props.steps.findIndex((s) => s.id === props.currentStep);
});

const getStepState = (index: number) => {
  if (index < currentIndex.value) {
    return 'completed';
  }
  if (index === currentIndex.value) {
    return 'current';
  }
  return 'upcoming';
};

const handleStepClick = (step: Step, index: number) => {
  if (!props.clickable) {
    return;
  }
  // Only allow clicking on completed steps or current step
  if (index <= currentIndex.value) {
    emit('update:currentStep', step.id);
    emit('stepClick', step);
  }
};

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        circle: 'w-6 h-6 text-xs',
        text: 'text-xs',
        description: 'text-[10px]',
        line: props.variant === 'horizontal' ? 'h-0.5' : 'w-0.5',
        gap: 'gap-1',
      };
    case 'lg':
      return {
        circle: 'w-12 h-12 text-lg',
        text: 'text-base',
        description: 'text-sm',
        line: props.variant === 'horizontal' ? 'h-1' : 'w-1',
        gap: 'gap-3',
      };
    default:
      return {
        circle: 'w-8 h-8 text-sm',
        text: 'text-sm',
        description: 'text-xs',
        line: props.variant === 'horizontal' ? 'h-0.5' : 'w-0.5',
        gap: 'gap-2',
      };
  }
});
</script>

<template>
  <div
    class="stepper"
    :class="[variant === 'vertical' ? 'flex-col' : 'flex-row items-start', 'flex']"
  >
    <template v-for="(step, index) in steps" :key="step.id">
      <!-- Step Item -->
      <div
        class="flex"
        :class="[
          variant === 'vertical' ? 'flex-row items-start' : 'flex-col items-center',
          clickable && index <= currentIndex ? 'cursor-pointer' : '',
          variant === 'horizontal' ? 'flex-1' : '',
        ]"
        @click="handleStepClick(step, index)"
      >
        <div
          class="flex"
          :class="[
            variant === 'vertical' ? 'flex-col items-center' : 'flex-row items-center w-full',
          ]"
        >
          <!-- Circle -->
          <div
            class="flex-shrink-0 rounded-full flex items-center justify-center font-medium transition-all duration-300"
            :class="[
              sizeClasses.circle,
              getStepState(index) === 'completed'
                ? 'bg-primary-600 text-white'
                : getStepState(index) === 'current'
                  ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                  : 'bg-gray-200 text-gray-500',
            ]"
          >
            <!-- Completed Check -->
            <svg
              v-if="getStepState(index) === 'completed'"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <!-- Icon or Number -->
            <template v-else>
              <span v-if="step.icon" class="text-lg">{{ step.icon }}</span>
              <span v-else>{{ index + 1 }}</span>
            </template>
          </div>

          <!-- Connector Line (horizontal) -->
          <div
            v-if="variant === 'horizontal' && index < steps.length - 1"
            class="flex-1 mx-2"
            :class="[
              sizeClasses.line,
              'transition-colors duration-300',
              getStepState(index) === 'completed' ? 'bg-primary-600' : 'bg-gray-200',
            ]"
          />
        </div>

        <!-- Text Content -->
        <div
          class="mt-2"
          :class="[variant === 'vertical' ? 'ml-3 pb-8' : 'text-center', sizeClasses.gap]"
        >
          <p
            class="font-medium transition-colors duration-300"
            :class="[
              sizeClasses.text,
              getStepState(index) === 'upcoming' ? 'text-gray-500' : 'text-gray-900',
            ]"
          >
            {{ step.label }}
          </p>
          <p v-if="step.description" class="text-gray-500 mt-0.5" :class="sizeClasses.description">
            {{ step.description }}
          </p>
        </div>

        <!-- Connector Line (vertical) -->
        <div
          v-if="variant === 'vertical' && index < steps.length - 1"
          class="absolute left-4 top-8 bottom-0 -translate-x-1/2"
          :class="[
            sizeClasses.line,
            'transition-colors duration-300',
            getStepState(index) === 'completed' ? 'bg-primary-600' : 'bg-gray-200',
          ]"
        />
      </div>
    </template>
  </div>
</template>
