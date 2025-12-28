<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { DeliveryAddress } from '@/types/scheduledOrder';

interface Props {
  modelValue: DeliveryAddress | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: DeliveryAddress | null];
}>();

// Form fields
const street = ref(props.modelValue?.street || '');
const city = ref(props.modelValue?.city || '');
const postalCode = ref(props.modelValue?.postalCode || '');
const apartment = ref(props.modelValue?.apartment || '');
const instructions = ref(props.modelValue?.instructions || '');

// Geolocation
const isLocating = ref(false);
const locationError = ref<string | null>(null);
const hasCoordinates = ref(!!props.modelValue?.coordinates);

// Sync with modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      street.value = newValue.street || '';
      city.value = newValue.city || '';
      postalCode.value = newValue.postalCode || '';
      apartment.value = newValue.apartment || '';
      instructions.value = newValue.instructions || '';
      hasCoordinates.value = !!newValue.coordinates;
    }
  }
);

// Validation
const isValid = computed(() => {
  return street.value.trim().length > 0 && city.value.trim().length > 0;
});

// Build address object
const buildAddress = (coordinates?: { latitude: number; longitude: number }): DeliveryAddress => ({
  street: street.value.trim(),
  city: city.value.trim(),
  postalCode: postalCode.value.trim() || undefined,
  apartment: apartment.value.trim() || undefined,
  instructions: instructions.value.trim() || undefined,
  coordinates,
});

// Emit changes
const emitUpdate = () => {
  if (isValid.value) {
    emit('update:modelValue', buildAddress(props.modelValue?.coordinates));
  } else {
    emit('update:modelValue', null);
  }
};

// Watch for changes
watch([street, city, postalCode, apartment, instructions], emitUpdate);

// Get current location
const getCurrentLocation = async () => {
  if (!navigator.geolocation) {
    locationError.value = 'La géolocalisation n\'est pas supportée par votre navigateur';
    return;
  }

  isLocating.value = true;
  locationError.value = null;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

    const coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    hasCoordinates.value = true;
    emit('update:modelValue', buildAddress(coordinates));
  } catch (_error) {
    const err = _error as GeolocationPositionError;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        locationError.value = 'Accès à la localisation refusé';
        break;
      case err.POSITION_UNAVAILABLE:
        locationError.value = 'Position non disponible';
        break;
      case err.TIMEOUT:
        locationError.value = 'Délai de localisation dépassé';
        break;
      default:
        locationError.value = 'Erreur de localisation';
    }
  } finally {
    isLocating.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900">Adresse de livraison</h3>

    <!-- Street -->
    <div>
      <label for="street" class="mb-1 block text-sm font-medium text-gray-700">
        Adresse <span class="text-red-500">*</span>
      </label>
      <input
        id="street"
        v-model="street"
        type="text"
        required
        :disabled="loading"
        class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
        placeholder="123 Rue Example"
      />
    </div>

    <!-- Apartment -->
    <div>
      <label for="apartment" class="mb-1 block text-sm font-medium text-gray-700">
        Appartement / Étage (optionnel)
      </label>
      <input
        id="apartment"
        v-model="apartment"
        type="text"
        :disabled="loading"
        class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
        placeholder="Apt 4B, 2ème étage"
      />
    </div>

    <!-- City & Postal Code -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="city" class="mb-1 block text-sm font-medium text-gray-700">
          Ville <span class="text-red-500">*</span>
        </label>
        <input
          id="city"
          v-model="city"
          type="text"
          required
          :disabled="loading"
          class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          placeholder="Paris"
        />
      </div>
      <div>
        <label for="postalCode" class="mb-1 block text-sm font-medium text-gray-700">
          Code postal
        </label>
        <input
          id="postalCode"
          v-model="postalCode"
          type="text"
          :disabled="loading"
          class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          placeholder="75001"
        />
      </div>
    </div>

    <!-- Delivery Instructions -->
    <div>
      <label for="instructions" class="mb-1 block text-sm font-medium text-gray-700">
        Instructions de livraison (optionnel)
      </label>
      <textarea
        id="instructions"
        v-model="instructions"
        rows="2"
        :disabled="loading"
        class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
        placeholder="Sonnez à l'interphone, code porte: 1234..."
      />
    </div>

    <!-- Geolocation Button -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        :disabled="isLocating || loading"
        class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        @click="getCurrentLocation"
      >
        <svg
          v-if="!isLocating"
          class="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
        <svg
          v-else
          class="h-5 w-5 animate-spin text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {{ isLocating ? 'Localisation...' : 'Utiliser ma position' }}
      </button>

      <!-- Location status -->
      <span v-if="hasCoordinates" class="text-sm text-green-600">
        Position enregistrée
      </span>
    </div>

    <!-- Location Error -->
    <p v-if="locationError" class="text-sm text-red-600">
      {{ locationError }}
    </p>

    <!-- Validation hint -->
    <p v-if="!isValid && (street || city)" class="text-sm text-amber-600">
      Veuillez renseigner l'adresse et la ville
    </p>
  </div>
</template>
