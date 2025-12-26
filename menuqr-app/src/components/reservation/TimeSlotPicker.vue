<script setup lang="ts">
import { computed } from 'vue';
import type { TimeSlot } from '@/types';

interface Props {
  slots: TimeSlot[];
  modelValue: string | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

// Group slots by period
const groupedSlots = computed(() => {
  const groups: {
    label: string;
    icon: string;
    slots: TimeSlot[];
  }[] = [
    { label: 'Matin', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z', slots: [] },
    { label: 'Midi', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z', slots: [] },
    { label: 'Après-midi', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z', slots: [] },
    { label: 'Soir', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', slots: [] },
  ];

  props.slots.forEach((slot) => {
    const hour = parseInt(slot.time.split(':')[0], 10);
    if (hour >= 6 && hour < 11) {
      groups[0].slots.push(slot);
    } else if (hour >= 11 && hour < 14) {
      groups[1].slots.push(slot);
    } else if (hour >= 14 && hour < 18) {
      groups[2].slots.push(slot);
    } else {
      groups[3].slots.push(slot);
    }
  });

  return groups.filter((g) => g.slots.length > 0);
});

const hasAvailableSlots = computed(() => {
  return props.slots.some((slot) => slot.available);
});

function selectSlot(slot: TimeSlot) {
  if (!slot.available) return;
  emit('update:modelValue', slot.time);
}
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <h3 class="mb-4 text-lg font-semibold text-gray-900">Choisir un créneau</h3>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
    </div>

    <!-- No slots available -->
    <div
      v-else-if="slots.length === 0 || !hasAvailableSlots"
      class="py-8 text-center text-gray-500"
    >
      <svg
        class="mx-auto mb-3 h-12 w-12 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="font-medium">Aucun créneau disponible</p>
      <p class="mt-1 text-sm">Veuillez choisir une autre date</p>
    </div>

    <!-- Time slots by period -->
    <div v-else class="space-y-6">
      <div v-for="group in groupedSlots" :key="group.label" class="space-y-3">
        <div class="flex items-center gap-2 text-sm font-medium text-gray-600">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="group.icon" />
          </svg>
          {{ group.label }}
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="slot in group.slots"
            :key="slot.time"
            type="button"
            :disabled="!slot.available"
            :class="[
              'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
              {
                // Available
                'border-gray-200 bg-white text-gray-700 hover:border-teal-500 hover:bg-teal-50':
                  slot.available && slot.time !== modelValue,
                // Selected
                'border-teal-500 bg-teal-500 text-white shadow-md':
                  slot.time === modelValue,
                // Not available
                'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300':
                  !slot.available,
              },
            ]"
            @click="selectSlot(slot)"
          >
            {{ slot.time }}

            <!-- Tables available indicator -->
            <span
              v-if="slot.available && slot.tablesAvailable > 0"
              class="ml-1 text-xs opacity-60"
            >
              ({{ slot.tablesAvailable }})
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Selected slot summary -->
    <div
      v-if="modelValue"
      class="mt-4 flex items-center justify-center gap-2 rounded-lg bg-teal-50 p-3 text-teal-700"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span class="font-medium">Créneau sélectionné : {{ modelValue }}</span>
    </div>
  </div>
</template>
