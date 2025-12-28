<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import { useCartStore } from '@/stores/cartStore';
import api from '@/services/api';
import type {
  AvailableDate,
  TimeSlot,
  LocationPreference,
  CreateReservationData,
} from '@/types';
import { LOCATION_LABELS } from '@/types';
import DatePicker from '@/components/reservation/DatePicker.vue';
import TimeSlotPicker from '@/components/reservation/TimeSlotPicker.vue';

const router = useRouter();
const _route = useRoute();
const restaurantStore = useRestaurantStore();
const customerAuth = useCustomerAuthStore();
const cartStore = useCartStore();

// Get restaurant ID from store
const restaurantId = computed(() => restaurantStore.selectedRestaurant?.id);

// Redirect if no restaurant selected
onMounted(() => {
  if (!restaurantId.value) {
    router.push('/');
  }
});

// Steps
const currentStep = ref(1);
const totalSteps = 5;

// Form data
const selectedDate = ref<string | null>(null);
const selectedTime = ref<string | null>(null);
const partySize = ref(2);
const locationPreference = ref<LocationPreference>('no_preference');
const specialRequests = ref('');
const customerName = ref('');
const customerPhone = ref('');
const customerEmail = ref('');
const includePreOrder = ref(false);

// API data
const availableDates = ref<AvailableDate[]>([]);
const timeSlots = ref<TimeSlot[]>([]);
const settings = ref({
  maxPartySize: 10,
  maxAdvanceDays: 30,
  minAdvanceHours: 2,
  allowPreOrder: true,
});

// Loading states
const loadingDates = ref(true);
const loadingSlots = ref(false);
const submitting = ref(false);

// Success state
const reservationSuccess = ref(false);
const createdReservation = ref<{
  reservationNumber: string;
  date: string;
  time: string;
} | null>(null);

// Error
const error = ref('');

// Party size options
const partySizeOptions = computed(() => {
  const options = [];
  for (let i = 1; i <= settings.value.maxPartySize; i++) {
    options.push(i);
  }
  return options;
});

// Location options
const locationOptions: { value: LocationPreference; label: string }[] = [
  { value: 'no_preference', label: LOCATION_LABELS.no_preference },
  { value: 'indoor', label: LOCATION_LABELS.indoor },
  { value: 'outdoor', label: LOCATION_LABELS.outdoor },
  { value: 'terrace', label: LOCATION_LABELS.terrace },
];

// Pre-fill customer info if logged in
onMounted(async () => {
  if (customerAuth.customer) {
    customerName.value = customerAuth.customer.name || '';
    customerPhone.value = customerAuth.customer.phone || '';
    customerEmail.value = customerAuth.customer.email || '';
  }

  await loadAvailableDates();
});

// Load available dates
async function loadAvailableDates() {
  if (!restaurantId.value) {
    error.value = 'Veuillez sélectionner un restaurant';
    loadingDates.value = false;
    return;
  }

  try {
    loadingDates.value = true;
    error.value = '';
    const response = await api.getAvailableDates(restaurantId.value, partySize.value);
    if (response.data) {
      availableDates.value = response.data.dates;
      settings.value = response.data.settings;
    }
  } catch (err) {
    console.error('Failed to load available dates:', err);
    error.value = 'Impossible de charger les disponibilités';
  } finally {
    loadingDates.value = false;
  }
}

// Load time slots when date changes
watch(selectedDate, async (newDate) => {
  if (!newDate) {
    timeSlots.value = [];
    return;
  }

  if (!restaurantId.value) {
    error.value = 'Veuillez sélectionner un restaurant';
    timeSlots.value = [];
    return;
  }

  try {
    loadingSlots.value = true;
    error.value = '';
    selectedTime.value = null;
    const response = await api.getAvailableSlots(restaurantId.value, newDate, partySize.value);
    if (response.data) {
      timeSlots.value = response.data;
    }
  } catch (err) {
    console.error('Failed to load time slots:', err);
    error.value = 'Impossible de charger les créneaux';
  } finally {
    loadingSlots.value = false;
  }
});

// Reload dates when party size changes
watch(partySize, () => {
  selectedDate.value = null;
  selectedTime.value = null;
  loadAvailableDates();
});

// Navigation
function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

// Validation per step
const canProceedStep1 = computed(() => selectedDate.value !== null);
const canProceedStep2 = computed(() => selectedTime.value !== null);
const _canProceedStep3 = computed(() => true); // Location is optional
const canProceedStep4 = computed(() => {
  if (!customerAuth.isAuthenticated) {
    return customerName.value.trim() !== '' && customerPhone.value.trim() !== '';
  }
  return true;
});

const canSubmit = computed(() => {
  return (
    selectedDate.value &&
    selectedTime.value &&
    (customerAuth.isAuthenticated || (customerName.value && customerPhone.value))
  );
});

// Formatted date for display
const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) {return '';}
  const date = new Date(selectedDate.value);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
});

// Pre-order from cart
const cartItems = computed(() => cartStore.items);
const cartTotal = computed(() => cartStore.subtotal);

// Submit reservation
async function submitReservation() {
  if (!canSubmit.value || !restaurantId.value) {return;}

  try {
    submitting.value = true;
    error.value = '';

    const data: CreateReservationData = {
      reservationDate: selectedDate.value!,
      timeSlot: selectedTime.value!,
      partySize: partySize.value,
      locationPreference: locationPreference.value,
      specialRequests: specialRequests.value || undefined,
      customerName: customerAuth.isAuthenticated
        ? customerAuth.customer?.name || customerName.value
        : customerName.value,
      customerPhone: customerAuth.isAuthenticated
        ? customerAuth.customer?.phone || customerPhone.value
        : customerPhone.value,
      customerEmail: customerEmail.value || undefined,
    };

    // Add pre-order if enabled
    if (includePreOrder.value && cartItems.value.length > 0) {
      data.preOrder = {
        items: cartItems.value.map((item) => ({
          dishId: item.dishId,
          quantity: item.quantity,
          options: item.selectedOptions?.map((opt) => ({
            name: opt.optionName,
            choice: opt.choices?.[0]?.name?.fr || '',
            price: opt.priceModifier || 0,
          })),
          notes: item.notes,
        })),
        notes: undefined,
      };
    }

    const response = await api.createCustomerReservation(restaurantId.value!, data);

    // Success!
    reservationSuccess.value = true;
    createdReservation.value = {
      reservationNumber: response.data?.reservationNumber || '',
      date: formattedSelectedDate.value,
      time: selectedTime.value!,
    };

    // Clear cart if pre-order was included
    if (includePreOrder.value) {
      cartStore.clearCart();
    }
  } catch (err: unknown) {
    console.error('Failed to create reservation:', err);
    // Extract error message from various possible API response formats
    const apiError = err as {
      response?: {
        data?: {
          error?: string;
          message?: string;
          errors?: Array<{ msg: string }>;
        }
      };
      message?: string;
    };

    // Try different error formats
    if (apiError.response?.data?.error) {
      error.value = apiError.response.data.error;
    } else if (apiError.response?.data?.message) {
      error.value = apiError.response.data.message;
    } else if (apiError.response?.data?.errors?.length) {
      error.value = apiError.response.data.errors.map(e => e.msg).join(', ');
    } else if (apiError.message) {
      error.value = apiError.message;
    } else {
      error.value = 'Impossible de créer la réservation. Veuillez réessayer.';
    }
  } finally {
    submitting.value = false;
  }
}

// Go back to menu
function goToMenu() {
  router.push('/menu');
}

// Go to my reservations
function goToMyReservations() {
  router.push('/reservations');
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-teal-50 to-white pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-white/90 backdrop-blur-sm shadow-sm">
      <div class="flex h-14 items-center justify-between px-4">
        <button
          type="button"
          class="flex items-center gap-1 text-gray-600"
          @click="currentStep > 1 && !reservationSuccess ? prevStep() : goToMenu()"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="text-sm">{{ currentStep > 1 && !reservationSuccess ? 'Retour' : 'Menu' }}</span>
        </button>

        <h1 class="text-lg font-semibold text-gray-900">Réserver une table</h1>

        <div class="w-16" />
      </div>

      <!-- Progress bar -->
      <div v-if="!reservationSuccess" class="h-1 bg-gray-100">
        <div
          class="h-full bg-teal-500 transition-all duration-300"
          :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
        />
      </div>
    </header>

    <!-- Success State -->
    <div v-if="reservationSuccess" class="p-4">
      <div class="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg class="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 class="mb-2 text-2xl font-bold text-gray-900">Réservation confirmée !</h2>
        <p class="mb-6 text-gray-600">
          Votre réservation a été enregistrée avec succès.
        </p>

        <div class="mb-6 rounded-xl bg-gray-50 p-4">
          <p class="mb-2 text-sm text-gray-500">Numéro de réservation</p>
          <p class="text-2xl font-mono font-bold text-teal-600">
            {{ createdReservation?.reservationNumber }}
          </p>
        </div>

        <div class="mb-6 space-y-2 text-left">
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="capitalize">{{ createdReservation?.date }}</span>
          </div>
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ createdReservation?.time }}</span>
          </div>
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ partySize }} personne{{ partySize > 1 ? 's' : '' }}</span>
          </div>
        </div>

        <p class="mb-6 text-sm text-gray-500">
          Un SMS de confirmation vous sera envoyé.
        </p>

        <div class="space-y-3">
          <button
            type="button"
            class="w-full rounded-xl bg-teal-500 py-3 font-semibold text-white transition-colors hover:bg-teal-600"
            @click="goToMyReservations"
          >
            Voir mes réservations
          </button>
          <button
            type="button"
            class="w-full rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            @click="goToMenu"
          >
            Retour au menu
          </button>
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div v-else class="p-4">
      <!-- Error message -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
        {{ error }}
      </div>

      <!-- Step 1: Choose Date -->
      <div v-if="currentStep === 1" class="space-y-4">
        <div class="text-center">
          <h2 class="text-xl font-bold text-gray-900">Choisissez une date</h2>
          <p class="text-gray-500">Pour {{ partySize }} personne{{ partySize > 1 ? 's' : '' }}</p>
        </div>

        <!-- Party size selector -->
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Nombre de personnes
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="size in partySizeOptions"
              :key="size"
              type="button"
              :class="[
                'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                partySize === size
                  ? 'border-teal-500 bg-teal-500 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-teal-500',
              ]"
              @click="partySize = size"
            >
              {{ size }}
            </button>
          </div>
        </div>

        <!-- Date picker -->
        <DatePicker
          v-model="selectedDate"
          :available-dates="availableDates"
          :loading="loadingDates"
        />

        <!-- Next button -->
        <button
          type="button"
          :disabled="!canProceedStep1"
          class="w-full rounded-xl bg-teal-500 py-4 font-semibold text-white transition-colors hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          @click="nextStep"
        >
          Continuer
        </button>
      </div>

      <!-- Step 2: Choose Time -->
      <div v-else-if="currentStep === 2" class="space-y-4">
        <div class="text-center">
          <h2 class="text-xl font-bold text-gray-900">Choisissez un créneau</h2>
          <p class="capitalize text-gray-500">{{ formattedSelectedDate }}</p>
        </div>

        <TimeSlotPicker
          v-model="selectedTime"
          :slots="timeSlots"
          :loading="loadingSlots"
        />

        <button
          type="button"
          :disabled="!canProceedStep2"
          class="w-full rounded-xl bg-teal-500 py-4 font-semibold text-white transition-colors hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          @click="nextStep"
        >
          Continuer
        </button>
      </div>

      <!-- Step 3: Preferences -->
      <div v-else-if="currentStep === 3" class="space-y-4">
        <div class="text-center">
          <h2 class="text-xl font-bold text-gray-900">Vos préférences</h2>
          <p class="text-gray-500">Optionnel mais utile</p>
        </div>

        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <!-- Location preference -->
          <div class="mb-4">
            <label class="mb-2 block text-sm font-medium text-gray-700">
              Emplacement préféré
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in locationOptions"
                :key="option.value"
                type="button"
                :class="[
                  'rounded-lg border px-4 py-3 text-sm font-medium transition-all',
                  locationPreference === option.value
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-teal-500',
                ]"
                @click="locationPreference = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- Special requests -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">
              Demandes spéciales
            </label>
            <textarea
              v-model="specialRequests"
              rows="3"
              class="w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Anniversaire, chaise bébé, allergies..."
            />
          </div>
        </div>

        <button
          type="button"
          class="w-full rounded-xl bg-teal-500 py-4 font-semibold text-white transition-colors hover:bg-teal-600"
          @click="nextStep"
        >
          Continuer
        </button>
      </div>

      <!-- Step 4: Contact Info -->
      <div v-else-if="currentStep === 4" class="space-y-4">
        <div class="text-center">
          <h2 class="text-xl font-bold text-gray-900">Vos coordonnées</h2>
          <p class="text-gray-500">Pour vous contacter</p>
        </div>

        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <!-- If logged in, show customer info -->
          <div v-if="customerAuth.isAuthenticated" class="space-y-3">
            <div class="rounded-lg bg-teal-50 p-4">
              <p class="text-sm text-teal-700">
                Connecté en tant que <strong>{{ customerAuth.customer?.name }}</strong>
              </p>
              <p class="mt-1 text-sm text-teal-600">
                {{ customerAuth.customer?.phone }}
              </p>
            </div>
          </div>

          <!-- If not logged in, show form -->
          <div v-else class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">
                Nom <span class="text-red-500">*</span>
              </label>
              <input
                v-model="customerName"
                type="text"
                class="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">
                Téléphone <span class="text-red-500">*</span>
              </label>
              <input
                v-model="customerPhone"
                type="tel"
                class="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="+221 77 123 45 67"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">
                Email (optionnel)
              </label>
              <input
                v-model="customerEmail"
                type="email"
                class="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <!-- Pre-order option -->
          <div v-if="settings.allowPreOrder && cartItems.length > 0" class="mt-4 border-t border-gray-100 pt-4">
            <label class="flex cursor-pointer items-start gap-3">
              <input
                v-model="includePreOrder"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
              />
              <div>
                <span class="font-medium text-gray-700">
                  Inclure ma commande en pré-commande
                </span>
                <p class="text-sm text-gray-500">
                  {{ cartItems.length }} article{{ cartItems.length > 1 ? 's' : '' }} -
                  {{ cartTotal.toLocaleString('fr-FR') }} FCFA
                </p>
              </div>
            </label>
          </div>
        </div>

        <button
          type="button"
          :disabled="!canProceedStep4"
          class="w-full rounded-xl bg-teal-500 py-4 font-semibold text-white transition-colors hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          @click="nextStep"
        >
          Continuer
        </button>
      </div>

      <!-- Step 5: Confirmation -->
      <div v-else-if="currentStep === 5" class="space-y-4">
        <div class="text-center">
          <h2 class="text-xl font-bold text-gray-900">Récapitulatif</h2>
          <p class="text-gray-500">Vérifiez votre réservation</p>
        </div>

        <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <!-- Reservation details -->
          <div class="p-4 space-y-4">
            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
                <svg class="h-6 w-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="font-semibold capitalize text-gray-900">{{ formattedSelectedDate }}</p>
                <p class="text-gray-500">à {{ selectedTime }}</p>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
                <svg class="h-6 w-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-900">{{ partySize }} personne{{ partySize > 1 ? 's' : '' }}</p>
                <p class="text-gray-500">{{ LOCATION_LABELS[locationPreference] }}</p>
              </div>
            </div>

            <div v-if="specialRequests" class="flex items-start gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-900">Note</p>
                <p class="text-gray-500">{{ specialRequests }}</p>
              </div>
            </div>
          </div>

          <!-- Contact info -->
          <div class="border-t border-gray-100 bg-gray-50 p-4">
            <p class="text-sm font-medium text-gray-700">Contact</p>
            <p class="text-gray-900">
              {{ customerAuth.isAuthenticated ? customerAuth.customer?.name : customerName }}
            </p>
            <p class="text-gray-500">
              {{ customerAuth.isAuthenticated ? customerAuth.customer?.phone : customerPhone }}
            </p>
          </div>

          <!-- Pre-order summary -->
          <div v-if="includePreOrder && cartItems.length > 0" class="border-t border-gray-100 p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg class="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span class="font-medium text-gray-700">Pré-commande</span>
              </div>
              <span class="font-semibold text-teal-600">
                {{ cartTotal.toLocaleString('fr-FR') }} FCFA
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-500">
              {{ cartItems.length }} article{{ cartItems.length > 1 ? 's' : '' }}
            </p>
          </div>
        </div>

        <!-- Submit button -->
        <button
          type="button"
          :disabled="!canSubmit || submitting"
          class="w-full rounded-xl bg-teal-500 py-4 font-semibold text-white transition-colors hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          @click="submitReservation"
        >
          <span v-if="submitting" class="flex items-center justify-center gap-2">
            <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Confirmation en cours...
          </span>
          <span v-else>Confirmer la réservation</span>
        </button>

        <p class="text-center text-xs text-gray-500">
          En confirmant, vous acceptez nos conditions de réservation.
          Un SMS de confirmation vous sera envoyé.
        </p>
      </div>
    </div>
  </div>
</template>
