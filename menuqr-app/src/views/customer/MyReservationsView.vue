<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import api from '@/services/api';
import type { Reservation } from '@/types';
import ReservationCard from '@/components/reservation/ReservationCard.vue';
import PreOrderSummary from '@/components/reservation/PreOrderSummary.vue';

const router = useRouter();
const customerAuth = useCustomerAuthStore();

// Data
const reservations = ref<Reservation[]>([]);
const loading = ref(true);
const error = ref('');

// Filter
const activeFilter = ref<'upcoming' | 'past'>('upcoming');

// Detail modal
const selectedReservation = ref<Reservation | null>(null);
const showDetailModal = ref(false);

// Cancel modal
const showCancelModal = ref(false);
const cancellingId = ref<string | null>(null);
const cancelling = ref(false);

// Filtered reservations
const filteredReservations = computed(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return reservations.value.filter((r) => {
    const reservationDate = new Date(r.reservationDate);
    reservationDate.setHours(0, 0, 0, 0);

    if (activeFilter.value === 'upcoming') {
      return (
        reservationDate >= now &&
        !['completed', 'cancelled', 'no_show'].includes(r.status)
      );
    } else {
      return (
        reservationDate < now ||
        ['completed', 'cancelled', 'no_show'].includes(r.status)
      );
    }
  });
});

const upcomingCount = computed(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return reservations.value.filter((r) => {
    const reservationDate = new Date(r.reservationDate);
    reservationDate.setHours(0, 0, 0, 0);
    return (
      reservationDate >= now &&
      !['completed', 'cancelled', 'no_show'].includes(r.status)
    );
  }).length;
});

const pastCount = computed(() => {
  return reservations.value.length - upcomingCount.value;
});

onMounted(async () => {
  if (!customerAuth.isAuthenticated) {
    router.push('/menu');
    return;
  }
  await loadReservations();
});

async function loadReservations() {
  try {
    loading.value = true;
    error.value = '';
    const response = await api.getMyReservations();
    if (response.success && response.data) {
      reservations.value = response.data.reservations;
    }
  } catch (err) {
    console.error('Failed to load reservations:', err);
    error.value = 'Impossible de charger vos réservations';
  } finally {
    loading.value = false;
  }
}

function openDetail(reservation: Reservation) {
  selectedReservation.value = reservation;
  showDetailModal.value = true;
}

function closeDetail() {
  showDetailModal.value = false;
  selectedReservation.value = null;
}

function openCancelModal(reservation: Reservation) {
  cancellingId.value = reservation._id;
  showCancelModal.value = true;
}

function closeCancelModal() {
  showCancelModal.value = false;
  cancellingId.value = null;
}

async function confirmCancel() {
  if (!cancellingId.value) {return;}

  try {
    cancelling.value = true;
    await api.cancelMyReservation(cancellingId.value);
    await loadReservations();
    closeCancelModal();
    closeDetail();
  } catch (err) {
    console.error('Failed to cancel reservation:', err);
    error.value = 'Impossible d\'annuler la réservation';
  } finally {
    cancelling.value = false;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function goToReserve() {
  router.push('/reserve');
}

function goBack() {
  router.push('/menu');
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-white shadow-sm">
      <div class="flex h-14 items-center justify-between px-4">
        <button
          type="button"
          class="flex items-center gap-1 text-gray-600"
          @click="goBack"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="text-sm">Menu</span>
        </button>

        <h1 class="text-lg font-semibold text-gray-900">Mes réservations</h1>

        <button
          type="button"
          class="rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-medium text-white"
          @click="goToReserve"
        >
          Réserver
        </button>
      </div>
    </header>

    <!-- Filters -->
    <div class="sticky top-14 z-10 bg-white border-b border-gray-100 px-4 py-3">
      <div class="flex gap-2">
        <button
          type="button"
          :class="[
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeFilter === 'upcoming'
              ? 'bg-teal-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
          @click="activeFilter = 'upcoming'"
        >
          À venir ({{ upcomingCount }})
        </button>
        <button
          type="button"
          :class="[
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeFilter === 'past'
              ? 'bg-teal-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
          @click="activeFilter = 'past'"
        >
          Passées ({{ pastCount }})
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
        {{ error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredReservations.length === 0"
        class="text-center py-12"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900">
          {{ activeFilter === 'upcoming' ? 'Aucune réservation à venir' : 'Aucune réservation passée' }}
        </h3>
        <p class="mt-1 text-gray-500">
          {{ activeFilter === 'upcoming' ? 'Réservez une table pour votre prochaine visite' : 'Vos anciennes réservations apparaîtront ici' }}
        </p>
        <button
          v-if="activeFilter === 'upcoming'"
          type="button"
          class="mt-4 rounded-xl bg-teal-500 px-6 py-3 font-semibold text-white"
          @click="goToReserve"
        >
          Réserver une table
        </button>
      </div>

      <!-- Reservations list -->
      <div v-else class="space-y-4">
        <ReservationCard
          v-for="reservation in filteredReservations"
          :key="reservation._id"
          :reservation="reservation"
          @view="openDetail(reservation)"
          @cancel="openCancelModal(reservation)"
        />
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div
        v-if="showDetailModal && selectedReservation"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
        @click.self="closeDetail"
      >
        <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl">
          <!-- Header -->
          <div class="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Détails de la réservation</h2>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              @click="closeDetail"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-4 space-y-4">
            <!-- Reservation number -->
            <div class="text-center">
              <p class="text-sm text-gray-500">Numéro de réservation</p>
              <p class="text-2xl font-mono font-bold text-teal-600">
                {{ selectedReservation.reservationNumber }}
              </p>
            </div>

            <!-- Date & Time -->
            <div class="rounded-xl bg-teal-50 p-4">
              <div class="flex items-center gap-3 mb-2">
                <svg class="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="font-semibold capitalize text-teal-800">
                  {{ formatDate(selectedReservation.reservationDate) }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <svg class="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-teal-700">
                  {{ selectedReservation.timeSlot }} - {{ selectedReservation.endTime }}
                </span>
              </div>
            </div>

            <!-- Party info -->
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-lg border border-gray-200 p-3">
                <p class="text-sm text-gray-500">Personnes</p>
                <p class="text-lg font-semibold text-gray-900">{{ selectedReservation.partySize }}</p>
              </div>
              <div class="rounded-lg border border-gray-200 p-3">
                <p class="text-sm text-gray-500">Emplacement</p>
                <p class="text-lg font-semibold text-gray-900">
                  {{ selectedReservation.locationPreference === 'no_preference' ? 'Aucune' : selectedReservation.locationPreference }}
                </p>
              </div>
            </div>

            <!-- Special requests -->
            <div v-if="selectedReservation.specialRequests" class="rounded-lg border border-gray-200 p-3">
              <p class="text-sm text-gray-500 mb-1">Demandes spéciales</p>
              <p class="text-gray-900">{{ selectedReservation.specialRequests }}</p>
            </div>

            <!-- Pre-order -->
            <PreOrderSummary
              v-if="selectedReservation.preOrder && selectedReservation.preOrder.items.length > 0"
              :pre-order="selectedReservation.preOrder"
            />

            <!-- Cancel button -->
            <button
              v-if="['pending', 'confirmed'].includes(selectedReservation.status)"
              type="button"
              class="w-full rounded-xl border border-red-200 bg-white py-3 font-semibold text-red-600 hover:bg-red-50"
              @click="openCancelModal(selectedReservation)"
            >
              Annuler la réservation
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Cancel Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showCancelModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="closeCancelModal"
      >
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg class="h-7 w-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 class="mb-2 text-lg font-semibold text-gray-900">Annuler la réservation ?</h3>
          <p class="mb-6 text-gray-500">
            Cette action est irréversible. Vous devrez faire une nouvelle réservation si vous changez d'avis.
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700"
              :disabled="cancelling"
              @click="closeCancelModal"
            >
              Non, garder
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white"
              :disabled="cancelling"
              @click="confirmCancel"
            >
              <span v-if="cancelling">Annulation...</span>
              <span v-else>Oui, annuler</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
