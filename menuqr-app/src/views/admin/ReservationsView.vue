<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import api from '@/services/api';
import type { Reservation, ReservationStats, Table, ReservationStatus } from '@/types/reservation';
import { RESERVATION_STATUS_LABELS, LOCATION_LABELS } from '@/types/reservation';

// Type guard to check if tableId is a populated Table object
const isPopulatedTable = (tableId: string | Table | undefined): tableId is Table => {
  return typeof tableId === 'object' && tableId !== null && 'name' in tableId;
};

// Get table name safely
const getTableName = (tableId: string | Table | undefined): string | null => {
  if (isPopulatedTable(tableId)) {
    return tableId.name;
  }
  return null;
};

const isLoading = ref(true);
const error = ref<string | null>(null);
const reservations = ref<Reservation[]>([]);
const tables = ref<Table[]>([]);
const stats = ref<ReservationStats | null>(null);
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const statusFilter = ref<string>('');
const showDetailModal = ref(false);
const selectedReservation = ref<Reservation | null>(null);
const showCancelModal = ref(false);
const cancelReason = ref('');

const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });

const successMessage = ref<string | null>(null);
let successTimeout: ReturnType<typeof setTimeout> | null = null;

const showSuccess = (message: string) => {
  successMessage.value = message;
  if (successTimeout) clearTimeout(successTimeout);
  successTimeout = setTimeout(() => {
    successMessage.value = null;
  }, 3000);
};

const statusColors: Record<string, { bg: string; text: string; ring: string; icon: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-300', icon: '⏳' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300', icon: '✓' },
  arrived: { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-300', icon: '👋' },
  seated: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', icon: '🪑' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-300', icon: '✔' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300', icon: '✕' },
  no_show: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-300', icon: '?' },
};

// Avatar color generation based on name
const getAvatarColor = (name: string) => {
  const colors = [
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-blue-400 to-indigo-500',
    'from-teal-400 to-cyan-500',
    'from-emerald-400 to-green-500',
    'from-amber-400 to-orange-500',
    'from-pink-400 to-rose-500',
    'from-indigo-400 to-blue-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Time slots for timeline
const timeSlots = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

// Group reservations by time slot for timeline
const reservationsByTimeSlot = computed(() => {
  const grouped: Record<string, Reservation[]> = {};
  for (const slot of timeSlots) {
    grouped[slot] = reservations.value?.filter(r => r.timeSlot === slot) || [];
  }
  return grouped;
});

// Active time slots (with reservations)
const activeTimeSlots = computed(() => {
  return timeSlots.filter(slot => reservationsByTimeSlot.value[slot]?.length > 0);
});

// Upcoming arrivals (next 3 pending/confirmed reservations)
const upcomingArrivals = computed(() => {
  if (!reservations.value) return [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  return reservations.value
    .filter(r => ['pending', 'confirmed'].includes(r.status) && r.timeSlot >= currentTime)
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    .slice(0, 3);
});

// Stats calculations
const todayReservations = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value.filter(r => !['cancelled', 'no_show'].includes(r.status)).length;
});

const todayGuests = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value
    .filter(r => !['cancelled', 'no_show'].includes(r.status))
    .reduce((sum, r) => sum + r.partySize, 0);
});

const pendingCount = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value.filter(r => r.status === 'pending').length;
});

const seatedCount = computed(() => {
  if (!reservations.value) return 0;
  return reservations.value.filter(r => r.status === 'seated').length;
});

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const dateFrom = new Date(selectedDate.value);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(selectedDate.value);
    dateTo.setHours(23, 59, 59, 999);

    const [reservationsRes, statsRes, tablesRes] = await Promise.all([
      api.getReservations({
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        status: statusFilter.value ? (statusFilter.value as ReservationStatus) : undefined,
        page: pagination.value.page,
        limit: pagination.value.limit,
      }),
      api.getReservationStats({
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString(),
      }),
      api.getTables(),
    ]);

    if (reservationsRes.success && reservationsRes.data) {
      reservations.value = reservationsRes.data.reservations || [];
      pagination.value = reservationsRes.data.pagination || pagination.value;
    }
    if (statsRes.success && statsRes.data) {
      stats.value = statsRes.data;
    }
    if (tablesRes.success && tablesRes.data) {
      tables.value = tablesRes.data;
    }
  } catch (err) {
    error.value = 'Erreur lors du chargement des réservations';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const formatFullDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const openDetail = (reservation: Reservation) => {
  selectedReservation.value = reservation;
  showDetailModal.value = true;
};

const closeDetail = () => {
  showDetailModal.value = false;
  selectedReservation.value = null;
};

const confirmReservation = async (id: string) => {
  try {
    await api.confirmReservation(id);
    showSuccess('Réservation confirmée');
    await fetchData();
    closeDetail();
  } catch (err) {
    console.error(err);
  }
};

const markArrived = async (id: string) => {
  try {
    await api.markReservationArrived(id);
    showSuccess('Client marqué comme arrivé');
    await fetchData();
    closeDetail();
  } catch (err) {
    console.error(err);
  }
};

const markSeated = async (id: string) => {
  try {
    await api.markReservationSeated(id);
    showSuccess('Client placé');
    await fetchData();
    closeDetail();
  } catch (err) {
    console.error(err);
  }
};

const markCompleted = async (id: string) => {
  try {
    await api.markReservationCompleted(id);
    showSuccess('Réservation terminée');
    await fetchData();
    closeDetail();
  } catch (err) {
    console.error(err);
  }
};

const markNoShow = async (id: string) => {
  try {
    await api.markReservationNoShow(id);
    showSuccess('Marqué comme absent');
    await fetchData();
    closeDetail();
  } catch (err) {
    console.error(err);
  }
};

const openCancelModal = () => {
  cancelReason.value = '';
  showCancelModal.value = true;
};

const cancelReservation = async () => {
  if (!selectedReservation.value) return;
  try {
    await api.cancelReservationAdmin(selectedReservation.value._id, cancelReason.value);
    showSuccess('Réservation annulée');
    showCancelModal.value = false;
    await fetchData();
    closeDetail();
  } catch (err) {
    console.error(err);
  }
};

const navigateDate = (days: number) => {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() + days);
  selectedDate.value = date.toISOString().split('T')[0];
};

const goToToday = () => {
  selectedDate.value = new Date().toISOString().split('T')[0];
};

const isToday = computed(() => {
  return selectedDate.value === new Date().toISOString().split('T')[0];
});

watch([selectedDate, statusFilter], () => {
  pagination.value.page = 1;
  fetchData();
});

onMounted(fetchData);
</script>

<template>
  <div class="min-h-screen space-y-6">
    <!-- Success Toast -->
    <Transition name="toast">
      <div
        v-if="successMessage"
        class="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 text-white shadow-xl shadow-emerald-500/25"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span class="font-medium">{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Hero Header with Stats -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-white shadow-2xl shadow-indigo-500/25">
      <!-- SVG Pattern Background -->
      <div class="absolute inset-0 opacity-10">
        <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="reservation-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#reservation-grid)" />
        </svg>
      </div>

      <!-- Floating blur elements -->
      <div class="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
      <div class="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-pink-400/20 blur-3xl"></div>

      <div class="relative">
        <!-- Title row -->
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="mb-2 flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-bold tracking-tight">Réservations</h1>
                <p class="text-purple-100">Gérez les réservations de votre restaurant</p>
              </div>
            </div>
          </div>

          <!-- Refresh button -->
          <button
            class="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/30"
            @click="fetchData"
          >
            <svg class="h-4 w-4" :class="{ 'animate-spin': isLoading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>

        <!-- Stats Grid in Header -->
        <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <!-- Today's reservations -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/20">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p class="text-3xl font-bold">{{ todayReservations }}</p>
                <p class="text-sm text-purple-200">Réservations</p>
              </div>
            </div>
            <div v-if="stats" class="mt-3 flex items-center gap-1 text-xs text-emerald-300">
              <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd" />
              </svg>
              <span>{{ stats.total }} (30j)</span>
            </div>
          </div>

          <!-- Guests -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/20">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <p class="text-3xl font-bold">{{ todayGuests }}</p>
                <p class="text-sm text-purple-200">Couverts</p>
              </div>
            </div>
            <div v-if="stats" class="mt-3 text-xs text-purple-300">
              Moy. {{ stats.avgPartySize?.toFixed(1) || '-' }} pers./résa
            </div>
          </div>

          <!-- Pending -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/20">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/30">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-3xl font-bold">{{ pendingCount }}</p>
                <p class="text-sm text-purple-200">En attente</p>
              </div>
            </div>
            <div v-if="pendingCount > 0" class="mt-3 text-xs text-amber-300">
              À confirmer
            </div>
          </div>

          <!-- Seated -->
          <div class="group rounded-2xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/20">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/30">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p class="text-3xl font-bold">{{ seatedCount }}</p>
                <p class="text-sm text-purple-200">En salle</p>
              </div>
            </div>
            <div v-if="stats" class="mt-3 text-xs text-rose-300">
              {{ stats.noShowRate || 0 }}% no-show
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Date navigation & filters -->
    <div class="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <button
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all hover:bg-indigo-100 hover:text-indigo-600"
          @click="navigateDate(-1)"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="relative">
          <input
            v-model="selectedDate"
            type="date"
            class="h-10 rounded-xl border-0 bg-slate-100 px-4 pr-10 font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all hover:bg-indigo-100 hover:text-indigo-600"
          @click="navigateDate(1)"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          v-if="!isToday"
          class="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          @click="goToToday"
        >
          Aujourd'hui
        </button>

        <span class="ml-2 text-sm font-medium text-slate-600">{{ formatFullDate(selectedDate) }}</span>
      </div>

      <!-- Status filter chips -->
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-xl px-4 py-2 text-sm font-medium transition-all"
          :class="statusFilter === '' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="statusFilter = ''"
        >
          Tous
        </button>
        <button
          class="rounded-xl px-4 py-2 text-sm font-medium transition-all"
          :class="statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
          @click="statusFilter = statusFilter === 'pending' ? '' : 'pending'"
        >
          ⏳ Attente
        </button>
        <button
          class="rounded-xl px-4 py-2 text-sm font-medium transition-all"
          :class="statusFilter === 'confirmed' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
          @click="statusFilter = statusFilter === 'confirmed' ? '' : 'confirmed'"
        >
          ✓ Confirmées
        </button>
        <button
          class="rounded-xl px-4 py-2 text-sm font-medium transition-all"
          :class="statusFilter === 'seated' ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'"
          @click="statusFilter = statusFilter === 'seated' ? '' : 'seated'"
        >
          🪑 Placés
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
        <div class="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
      <p class="mt-4 text-slate-500">Chargement des réservations...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-8 text-center ring-1 ring-red-100">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p class="text-red-700">{{ error }}</p>
      <button class="mt-4 font-medium text-red-600 underline" @click="fetchData">Réessayer</button>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Upcoming Arrivals Section (only if today) -->
      <div v-if="isToday && upcomingArrivals.length > 0" class="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 ring-1 ring-amber-200/50">
        <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-800">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Prochaines arrivées
        </h3>
        <div class="grid gap-3 sm:grid-cols-3">
          <div
            v-for="(arrival, idx) in upcomingArrivals"
            :key="arrival._id"
            class="flex cursor-pointer items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-amber-100 transition-all hover:shadow-md hover:ring-amber-200"
            :style="{ animationDelay: `${idx * 100}ms` }"
            @click="openDetail(arrival)"
          >
            <!-- Avatar -->
            <div
              class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white"
              :class="getAvatarColor(arrival.customerName)"
            >
              {{ getInitials(arrival.customerName) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xl font-bold text-amber-600">{{ arrival.timeSlot }}</span>
                <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {{ arrival.partySize }} pers.
                </span>
              </div>
              <p class="truncate font-medium text-slate-700">{{ arrival.customerName }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline View (only show if there are active slots) -->
      <div v-if="activeTimeSlots.length > 0" class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <svg class="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Timeline des créneaux
        </h3>

        <div class="space-y-3">
          <div
            v-for="slot in activeTimeSlots"
            :key="slot"
            class="flex items-start gap-4"
          >
            <!-- Time label -->
            <div class="flex w-16 flex-shrink-0 items-center justify-center">
              <span class="rounded-lg bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                {{ slot }}
              </span>
            </div>

            <!-- Reservations for this slot -->
            <div class="flex flex-1 flex-wrap gap-2">
              <button
                v-for="res in reservationsByTimeSlot[slot]"
                :key="res._id"
                class="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition-all hover:shadow-md"
                :class="[
                  statusColors[res.status]?.bg,
                  statusColors[res.status]?.text,
                  statusColors[res.status]?.ring,
                ]"
                @click="openDetail(res)"
              >
                <span class="font-bold">{{ res.customerName }}</span>
                <span class="rounded-full bg-white/50 px-2 py-0.5 text-xs">
                  {{ res.partySize }}p
                </span>
                <span class="opacity-60">{{ statusColors[res.status]?.icon }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reservations List -->
      <div v-if="reservations && reservations.length > 0" class="space-y-4">
        <h3 class="text-lg font-semibold text-slate-800">Toutes les réservations</h3>

        <div class="grid gap-4 lg:grid-cols-2">
          <div
            v-for="(res, index) in reservations"
            :key="res._id"
            class="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-indigo-200"
            :style="{ animationDelay: `${index * 50}ms` }"
            @click="openDetail(res)"
          >
            <div class="flex items-stretch">
              <!-- Left color bar based on status -->
              <div
                class="w-1.5 flex-shrink-0"
                :class="{
                  'bg-amber-500': res.status === 'pending',
                  'bg-blue-500': res.status === 'confirmed',
                  'bg-indigo-500': res.status === 'arrived',
                  'bg-emerald-500': res.status === 'seated',
                  'bg-slate-400': res.status === 'completed',
                  'bg-red-500': res.status === 'cancelled' || res.status === 'no_show',
                }"
              ></div>

              <div class="flex flex-1 items-center gap-4 p-5">
                <!-- Avatar -->
                <div
                  class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-lg"
                  :class="getAvatarColor(res.customerName)"
                >
                  {{ getInitials(res.customerName) }}
                </div>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="truncate font-bold text-slate-800 group-hover:text-indigo-600">
                      {{ res.customerName }}
                    </h3>
                    <span
                      class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                      :class="[statusColors[res.status]?.bg, statusColors[res.status]?.text, statusColors[res.status]?.ring]"
                    >
                      <span>{{ statusColors[res.status]?.icon }}</span>
                      {{ RESERVATION_STATUS_LABELS[res.status] }}
                    </span>
                  </div>

                  <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span class="flex items-center gap-1.5 font-medium text-indigo-600">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ res.timeSlot }}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {{ res.partySize }} personnes
                    </span>
                    <span class="flex items-center gap-1.5">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {{ LOCATION_LABELS[res.locationPreference] }}
                    </span>
                    <span v-if="isPopulatedTable(res.tableId)" class="flex items-center gap-1.5">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      {{ getTableName(res.tableId) }}
                    </span>
                  </div>
                </div>

                <!-- Right side info -->
                <div class="hidden flex-shrink-0 text-right sm:block">
                  <p class="text-sm font-mono font-medium text-slate-400">{{ res.reservationNumber }}</p>
                  <div v-if="res.preOrder" class="mt-2 flex items-center gap-1 justify-end text-emerald-600">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span class="text-xs font-medium">Pré-commande</span>
                  </div>
                </div>

                <!-- Arrow -->
                <svg class="h-5 w-5 flex-shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="rounded-2xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-100">
        <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100">
          <svg class="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-slate-800">Aucune réservation</h3>
        <p class="mt-2 text-slate-500">Pas de réservation prévue pour le {{ formatFullDate(selectedDate) }}</p>
      </div>
    </template>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetailModal && selectedReservation"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
          @click.self="closeDetail"
        >
          <div class="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <!-- Header -->
            <div class="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
              <!-- Pattern -->
              <div class="absolute inset-0 opacity-10">
                <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <pattern id="modal-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="1" fill="currentColor" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#modal-pattern)" />
                </svg>
              </div>

              <div class="relative flex items-start justify-between">
                <div class="flex items-center gap-4">
                  <!-- Avatar -->
                  <div
                    class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur-sm"
                  >
                    {{ getInitials(selectedReservation.customerName) }}
                  </div>
                  <div>
                    <p class="text-sm text-purple-200">{{ selectedReservation.reservationNumber }}</p>
                    <h3 class="mt-1 text-2xl font-bold">{{ selectedReservation.customerName }}</h3>
                  </div>
                </div>
                <span
                  class="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm"
                >
                  <span>{{ statusColors[selectedReservation.status]?.icon }}</span>
                  {{ RESERVATION_STATUS_LABELS[selectedReservation.status] }}
                </span>
              </div>

              <div class="relative mt-6 flex flex-wrap gap-4 text-sm">
                <div class="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ formatDate(selectedReservation.reservationDate) }} à {{ selectedReservation.timeSlot }}
                </div>
                <div class="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ selectedReservation.partySize }} personnes
                </div>
                <div class="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {{ LOCATION_LABELS[selectedReservation.locationPreference] }}
                </div>
              </div>
            </div>

            <div class="p-6">
              <!-- Contact -->
              <div class="mb-5">
                <h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Contact
                </h4>
                <div class="rounded-xl bg-slate-50 p-4">
                  <p class="font-medium text-slate-800">{{ selectedReservation.customerPhone }}</p>
                  <p v-if="selectedReservation.customerEmail" class="mt-1 text-sm text-slate-500">
                    {{ selectedReservation.customerEmail }}
                  </p>
                </div>
              </div>

              <!-- Special requests -->
              <div v-if="selectedReservation.specialRequests" class="mb-5">
                <h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Demandes spéciales
                </h4>
                <div class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
                  {{ selectedReservation.specialRequests }}
                </div>
              </div>

              <!-- Pre-order -->
              <div v-if="selectedReservation.preOrder" class="mb-5">
                <h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Pré-commande
                </h4>
                <div class="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                  <div v-for="item in selectedReservation.preOrder.items" :key="item.dishId" class="flex justify-between py-1 text-sm">
                    <span class="text-emerald-800">{{ item.quantity }}x {{ item.name }}</span>
                    <span class="font-medium text-emerald-700">{{ item.totalPrice.toLocaleString() }} XOF</span>
                  </div>
                  <div class="mt-3 border-t border-emerald-200 pt-3 text-sm font-bold text-emerald-800">
                    Total: {{ selectedReservation.preOrder.subtotal.toLocaleString() }} XOF
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-6 flex flex-wrap gap-3">
                <template v-if="selectedReservation.status === 'pending'">
                  <button
                    class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                    @click="confirmReservation(selectedReservation._id)"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Confirmer
                  </button>
                  <button
                    class="rounded-xl bg-red-100 px-4 py-3.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-all hover:bg-red-200"
                    @click="openCancelModal"
                  >
                    Annuler
                  </button>
                </template>

                <template v-else-if="selectedReservation.status === 'confirmed'">
                  <button
                    class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl"
                    @click="markArrived(selectedReservation._id)"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                    Marquer arrivé
                  </button>
                  <button
                    class="rounded-xl bg-rose-100 px-4 py-3.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition-all hover:bg-rose-200"
                    @click="markNoShow(selectedReservation._id)"
                  >
                    Absent
                  </button>
                </template>

                <template v-else-if="selectedReservation.status === 'arrived'">
                  <button
                    class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl"
                    @click="markSeated(selectedReservation._id)"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Placer à table
                  </button>
                </template>

                <template v-else-if="selectedReservation.status === 'seated'">
                  <button
                    class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl"
                    @click="markCompleted(selectedReservation._id)"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Terminer
                  </button>
                </template>

                <button
                  class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                  @click="closeDetail"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCancelModal"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
          @click.self="showCancelModal = false"
        >
          <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div class="mb-6 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
                <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-slate-800">Annuler la réservation ?</h3>
              <p class="mt-2 text-sm text-slate-500">Cette action ne peut pas être annulée</p>
            </div>

            <div class="mb-6">
              <label class="mb-2 block text-sm font-medium text-slate-700">Raison (optionnel)</label>
              <textarea
                v-model="cancelReason"
                rows="2"
                class="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500"
                placeholder="Raison de l'annulation..."
              />
            </div>

            <div class="flex gap-3">
              <button
                class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                @click="showCancelModal = false"
              >
                Retour
              </button>
              <button
                class="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl"
                @click="cancelReservation"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100px) scale(0.9);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}

/* Staggered animation for cards */
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.grid > div {
  animation: fadeSlideIn 0.4s ease-out forwards;
}
</style>
