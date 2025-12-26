<script setup lang="ts">
import { computed } from 'vue';
import type { FulfillmentType } from '@/types/scheduledOrder';
import { FULFILLMENT_TYPE_LABELS, FULFILLMENT_TYPE_ICONS } from '@/types/scheduledOrder';

interface Props {
  modelValue: FulfillmentType;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pickupEnabled: true,
  deliveryEnabled: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: FulfillmentType];
}>();

interface FulfillmentOption {
  value: FulfillmentType;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
}

const options = computed<FulfillmentOption[]>(() => [
  {
    value: 'pickup',
    label: FULFILLMENT_TYPE_LABELS.pickup,
    icon: FULFILLMENT_TYPE_ICONS.pickup,
    description: 'Venez récupérer votre commande au restaurant',
    enabled: props.pickupEnabled,
  },
  {
    value: 'delivery',
    label: FULFILLMENT_TYPE_LABELS.delivery,
    icon: FULFILLMENT_TYPE_ICONS.delivery,
    description: 'Nous livrons à votre adresse',
    enabled: props.deliveryEnabled,
  },
]);

const availableOptions = computed(() => options.value.filter((opt) => opt.enabled));

const selectOption = (value: FulfillmentType) => {
  emit('update:modelValue', value);
};
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-lg font-semibold text-gray-900">Comment souhaitez-vous recevoir votre commande ?</h3>

    <div class="grid gap-3" :class="availableOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'">
      <button
        v-for="option in availableOptions"
        :key="option.value"
        type="button"
        class="group relative flex flex-col items-center rounded-2xl border-2 p-4 text-center transition-all"
        :class="[
          modelValue === option.value
            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
        ]"
        @click="selectOption(option.value)"
      >
        <!-- Icon -->
        <div
          class="mb-3 flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-transform group-hover:scale-110"
          :class="modelValue === option.value ? 'bg-teal-100' : 'bg-gray-100'"
        >
          {{ option.icon }}
        </div>

        <!-- Label -->
        <span
          class="text-base font-semibold"
          :class="modelValue === option.value ? 'text-teal-700' : 'text-gray-900'"
        >
          {{ option.label }}
        </span>

        <!-- Description -->
        <span class="mt-1 text-xs text-gray-500">
          {{ option.description }}
        </span>

        <!-- Checkmark -->
        <div
          v-if="modelValue === option.value"
          class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </button>
    </div>

    <!-- No options available -->
    <div
      v-if="availableOptions.length === 0"
      class="rounded-xl bg-amber-50 p-4 text-center text-amber-700"
    >
      <p>Les commandes planifiées ne sont pas disponibles actuellement.</p>
    </div>
  </div>
</template>
