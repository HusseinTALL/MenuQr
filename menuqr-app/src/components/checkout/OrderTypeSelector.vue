<script setup lang="ts">
import type { OrderType } from '@/types/scheduledOrder';

interface Props {
  modelValue: OrderType;
  scheduledOrdersEnabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  scheduledOrdersEnabled: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: OrderType];
}>();

interface OrderTypeOption {
  value: OrderType;
  label: string;
  icon: string;
  description: string;
}

const options: OrderTypeOption[] = [
  {
    value: 'immediate',
    label: 'Maintenant',
    icon: '⚡',
    description: 'Commander pour tout de suite',
  },
  {
    value: 'scheduled',
    label: 'Planifier',
    icon: '📅',
    description: 'Choisir une date et heure',
  },
];

const selectOption = (value: OrderType) => {
  emit('update:modelValue', value);
};
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-lg font-semibold text-gray-900">Quand souhaitez-vous votre commande ?</h3>

    <div class="grid grid-cols-2 gap-3">
      <!-- Immediate Option -->
      <button
        type="button"
        class="group relative flex flex-col items-center rounded-2xl border-2 p-5 text-center transition-all"
        :class="[
          modelValue === 'immediate'
            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
        ]"
        @click="selectOption('immediate')"
      >
        <!-- Icon -->
        <div
          class="mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-4xl transition-transform group-hover:scale-110"
          :class="modelValue === 'immediate' ? 'bg-teal-100' : 'bg-gray-100'"
        >
          {{ options[0].icon }}
        </div>

        <!-- Label -->
        <span
          class="text-lg font-semibold"
          :class="modelValue === 'immediate' ? 'text-teal-700' : 'text-gray-900'"
        >
          {{ options[0].label }}
        </span>

        <!-- Description -->
        <span class="mt-1 text-sm text-gray-500">
          {{ options[0].description }}
        </span>

        <!-- Checkmark -->
        <div
          v-if="modelValue === 'immediate'"
          class="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </button>

      <!-- Scheduled Option -->
      <button
        type="button"
        :disabled="!scheduledOrdersEnabled"
        class="group relative flex flex-col items-center rounded-2xl border-2 p-5 text-center transition-all"
        :class="[
          !scheduledOrdersEnabled
            ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
            : modelValue === 'scheduled'
              ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
        ]"
        @click="scheduledOrdersEnabled && selectOption('scheduled')"
      >
        <!-- Icon -->
        <div
          class="mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-4xl transition-transform"
          :class="[
            !scheduledOrdersEnabled
              ? 'bg-gray-100'
              : modelValue === 'scheduled'
                ? 'bg-teal-100 group-hover:scale-110'
                : 'bg-gray-100 group-hover:scale-110',
          ]"
        >
          {{ options[1].icon }}
        </div>

        <!-- Label -->
        <span
          class="text-lg font-semibold"
          :class="[
            !scheduledOrdersEnabled
              ? 'text-gray-400'
              : modelValue === 'scheduled'
                ? 'text-teal-700'
                : 'text-gray-900',
          ]"
        >
          {{ options[1].label }}
        </span>

        <!-- Description -->
        <span class="mt-1 text-sm" :class="scheduledOrdersEnabled ? 'text-gray-500' : 'text-gray-400'">
          {{ scheduledOrdersEnabled ? options[1].description : 'Non disponible' }}
        </span>

        <!-- Checkmark -->
        <div
          v-if="modelValue === 'scheduled' && scheduledOrdersEnabled"
          class="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>
