<script setup lang="ts">
import { computed } from 'vue';
import type { Reservation } from '@/types';
import { LOCATION_LABELS } from '@/types';
import ReservationStatusBadge from './ReservationStatusBadge.vue';

interface Props {
  reservation: Reservation;
  showActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
});

const emit = defineEmits<{
  cancel: [];
  view: [];
}>();

const formattedDate = computed(() => {
  const date = new Date(props.reservation.reservationDate);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const canCancel = computed(() => {
  const cancelableStatuses = ['pending', 'confirmed'];
  return cancelableStatuses.includes(props.reservation.status);
});

const hasPreOrder = computed(() => {
  return (
    props.reservation.preOrder &&
    props.reservation.preOrder.items &&
    props.reservation.preOrder.items.length > 0
  );
});

const preOrderTotal = computed(() => {
  if (!props.reservation.preOrder) {return 0;}
  return props.reservation.preOrder.subtotal;
});
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
  >
    <!-- Header with status -->
    <div class="flex items-center justify-between bg-gray-50 px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="text-sm font-mono text-gray-500">
          {{ reservation.reservationNumber }}
        </span>
        <ReservationStatusBadge :status="reservation.status" size="sm" />
      </div>

      <div v-if="hasPreOrder" class="flex items-center gap-1 text-sm text-teal-600">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        Pré-commande
      </div>
    </div>

    <!-- Body -->
    <div class="p-4">
      <!-- Date and time -->
      <div class="mb-4 flex items-start gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <p class="font-semibold text-gray-900 capitalize">{{ formattedDate }}</p>
          <p class="text-sm text-gray-500">
            {{ reservation.timeSlot }} - {{ reservation.endTime }}
            <span class="text-gray-400">({{ reservation.duration }} min)</span>
          </p>
        </div>
      </div>

      <!-- Party size and location -->
      <div class="mb-4 flex flex-wrap gap-4">
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {{ reservation.partySize }} personne{{ reservation.partySize > 1 ? 's' : '' }}
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-600">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {{ LOCATION_LABELS[reservation.locationPreference] }}
        </div>
      </div>

      <!-- Special requests -->
      <div v-if="reservation.specialRequests" class="mb-4">
        <p class="text-sm text-gray-500">
          <span class="font-medium">Note :</span> {{ reservation.specialRequests }}
        </p>
      </div>

      <!-- Pre-order summary -->
      <div
        v-if="hasPreOrder"
        class="mb-4 rounded-lg bg-teal-50 p-3"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-teal-800">
            {{ reservation.preOrder!.items.length }} article{{
              reservation.preOrder!.items.length > 1 ? 's' : ''
            }}
            pré-commandé{{ reservation.preOrder!.items.length > 1 ? 's' : '' }}
          </span>
          <span class="font-semibold text-teal-800">
            {{ preOrderTotal.toLocaleString('fr-FR') }} FCFA
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="showActions" class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          @click="emit('view')"
        >
          Voir détails
        </button>

        <button
          v-if="canCancel"
          type="button"
          class="flex-1 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="emit('cancel')"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
</template>
