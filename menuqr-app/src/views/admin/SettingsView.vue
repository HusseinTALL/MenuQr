<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api, { type Restaurant } from '@/services/api';
import { useAdminAuthStore } from '@/stores/adminAuth';

const authStore = useAdminAuthStore();

const menuUrl = computed(() => {
  if (!restaurant.value) return '';
  return `${window.location.origin}/r/${restaurant.value.slug}`;
});

const copyMenuUrl = async () => {
  try {
    await navigator.clipboard.writeText(menuUrl.value);
    successMessage.value = 'URL copiée dans le presse-papiers';
    setTimeout(() => {
      successMessage.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const isLoading = ref(true);
const isSaving = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const restaurant = ref<Restaurant | null>(null);
const activeTab = ref<'general' | 'hours' | 'settings'>('general');

const daysOfWeek = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

const formData = ref({
  name: '',
  description: '',
  phone: '',
  email: '',
  website: '',
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
  },
  openingHours: daysOfWeek.map((day) => ({
    day: day.value,
    open: '11:00',
    close: '22:00',
    isClosed: false,
  })),
  settings: {
    currency: 'EUR',
    timezone: 'Europe/Paris',
    defaultLanguage: 'fr',
    availableLanguages: ['fr', 'en'],
    orderNotifications: true,
    autoAcceptOrders: false,
    tablePrefix: 'Table',
    tableCount: 20,
  },
});

const fetchRestaurant = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await api.getMyRestaurant();
    if (response.success && response.data) {
      restaurant.value = response.data;
      populateForm(response.data);
    }
  } catch (err) {
    // Restaurant might not exist yet - allow creation
    console.log('No restaurant found, allowing creation');
  } finally {
    isLoading.value = false;
  }
};

const populateForm = (data: Restaurant) => {
  formData.value.name = data.name;
  formData.value.description = data.description || '';
  formData.value.phone = data.phone || '';
  formData.value.email = data.email || '';
  formData.value.website = data.website || '';

  if (data.address) {
    formData.value.address = {
      street: data.address.street || '',
      city: data.address.city || '',
      postalCode: data.address.postalCode || '',
      country: data.address.country || 'France',
    };
  }

  if (data.openingHours?.length) {
    formData.value.openingHours = daysOfWeek.map((day) => {
      const existing = data.openingHours?.find((h) => h.day === day.value);
      return existing || {
        day: day.value,
        open: '11:00',
        close: '22:00',
        isClosed: false,
      };
    });
  }

  if (data.settings) {
    formData.value.settings = {
      currency: data.settings.currency || 'EUR',
      timezone: data.settings.timezone || 'Europe/Paris',
      defaultLanguage: data.settings.defaultLanguage || 'fr',
      availableLanguages: data.settings.availableLanguages || ['fr', 'en'],
      orderNotifications: data.settings.orderNotifications ?? true,
      autoAcceptOrders: data.settings.autoAcceptOrders ?? false,
      tablePrefix: data.settings.tablePrefix || 'Table',
      tableCount: data.settings.tableCount || 20,
    };
  }
};

const handleSubmit = async () => {
  isSaving.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const data = {
      name: formData.value.name,
      description: formData.value.description || undefined,
      phone: formData.value.phone || undefined,
      email: formData.value.email || undefined,
      website: formData.value.website || undefined,
      address:
        formData.value.address.street || formData.value.address.city
          ? formData.value.address
          : undefined,
      openingHours: formData.value.openingHours,
      settings: formData.value.settings,
    };

    let response;
    if (restaurant.value) {
      response = await api.updateRestaurant(restaurant.value._id, data);
    } else {
      response = await api.createRestaurant(data);
      if (response.success && response.data) {
        authStore.updateUserRestaurant(response.data._id);
      }
    }

    if (response.success && response.data) {
      restaurant.value = response.data;
      successMessage.value = 'Paramètres enregistrés avec succès';
      setTimeout(() => {
        successMessage.value = null;
      }, 3000);
    }
  } catch (err) {
    error.value = 'Erreur lors de la sauvegarde';
    console.error(err);
  } finally {
    isSaving.value = false;
  }
};

const getDayLabel = (day: string) => {
  return daysOfWeek.find((d) => d.value === day)?.label || day;
};

onMounted(fetchRestaurant);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Paramètres du restaurant</h2>
        <p class="mt-1 text-sm text-gray-500">Configurez les informations de votre établissement</p>
      </div>
    </div>

    <!-- Success message -->
    <div
      v-if="successMessage"
      class="rounded-lg bg-green-50 p-4 text-sm text-green-700"
    >
      <div class="flex items-center gap-2">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        {{ successMessage }}
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <svg class="h-8 w-8 animate-spin text-orange-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <!-- Settings form -->
    <div v-else class="rounded-xl bg-white shadow-sm">
      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="flex gap-4 px-6">
          <button
            :class="[
              'relative py-4 text-sm font-medium transition-colors',
              activeTab === 'general'
                ? 'text-orange-600'
                : 'text-gray-500 hover:text-gray-700',
            ]"
            @click="activeTab = 'general'"
          >
            Informations générales
            <span
              v-if="activeTab === 'general'"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-orange-600"
            />
          </button>
          <button
            :class="[
              'relative py-4 text-sm font-medium transition-colors',
              activeTab === 'hours'
                ? 'text-orange-600'
                : 'text-gray-500 hover:text-gray-700',
            ]"
            @click="activeTab = 'hours'"
          >
            Horaires d'ouverture
            <span
              v-if="activeTab === 'hours'"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-orange-600"
            />
          </button>
          <button
            :class="[
              'relative py-4 text-sm font-medium transition-colors',
              activeTab === 'settings'
                ? 'text-orange-600'
                : 'text-gray-500 hover:text-gray-700',
            ]"
            @click="activeTab = 'settings'"
          >
            Configuration
            <span
              v-if="activeTab === 'settings'"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-orange-600"
            />
          </button>
        </nav>
      </div>

      <form @submit.prevent="handleSubmit">
        <!-- General Info Tab -->
        <div v-show="activeTab === 'general'" class="space-y-6 p-6">
          <!-- Restaurant name -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Nom du restaurant *
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Le Bon Goût"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Une brève description de votre restaurant..."
            />
          </div>

          <!-- Contact info -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="+33 1 23 45 67 89"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                v-model="formData.email"
                type="email"
                class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="contact@restaurant.fr"
              />
            </div>
          </div>

          <!-- Website -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Site web
            </label>
            <input
              v-model="formData.website"
              type="url"
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="https://www.restaurant.fr"
            />
          </div>

          <!-- Address -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">Adresse</label>
            <div class="space-y-4">
              <input
                v-model="formData.address.street"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Rue et numéro"
              />
              <div class="grid gap-4 sm:grid-cols-3">
                <input
                  v-model="formData.address.postalCode"
                  type="text"
                  class="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Code postal"
                />
                <input
                  v-model="formData.address.city"
                  type="text"
                  class="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Ville"
                />
                <input
                  v-model="formData.address.country"
                  type="text"
                  class="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Pays"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Opening Hours Tab -->
        <div v-show="activeTab === 'hours'" class="p-6">
          <p class="mb-4 text-sm text-gray-500">
            Définissez les horaires d'ouverture de votre restaurant.
          </p>

          <div class="space-y-4">
            <div
              v-for="hours in formData.openingHours"
              :key="hours.day"
              class="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center"
            >
              <div class="w-24 font-medium text-gray-700">
                {{ getDayLabel(hours.day) }}
              </div>

              <div class="flex flex-1 flex-wrap items-center gap-4">
                <label class="flex items-center gap-2">
                  <input
                    v-model="hours.isClosed"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span class="text-sm text-gray-600">Fermé</span>
                </label>

                <template v-if="!hours.isClosed">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="hours.open"
                      type="time"
                      class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <span class="text-gray-500">à</span>
                    <input
                      v-model="hours.close"
                      type="time"
                      class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-show="activeTab === 'settings'" class="space-y-6 p-6">
          <!-- Language settings -->
          <div>
            <h3 class="mb-4 text-lg font-medium text-gray-900">Langue</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">
                  Langue par défaut
                </label>
                <select
                  v-model="formData.settings.defaultLanguage"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">
                  Langues disponibles
                </label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      :checked="formData.settings.availableLanguages.includes('fr')"
                      disabled
                      class="h-4 w-4 rounded border-gray-300 text-orange-600"
                    />
                    <span class="text-sm text-gray-600">Français</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      :checked="formData.settings.availableLanguages.includes('en')"
                      @change="
                        formData.settings.availableLanguages.includes('en')
                          ? formData.settings.availableLanguages = formData.settings.availableLanguages.filter(l => l !== 'en')
                          : formData.settings.availableLanguages.push('en')
                      "
                      class="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span class="text-sm text-gray-600">English</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Table settings -->
          <div>
            <h3 class="mb-4 text-lg font-medium text-gray-900">Tables</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">
                  Préfixe des tables
                </label>
                <input
                  v-model="formData.settings.tablePrefix"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Table"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">
                  Nombre de tables
                </label>
                <input
                  v-model.number="formData.settings.tableCount"
                  type="number"
                  min="1"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <!-- Order settings -->
          <div>
            <h3 class="mb-4 text-lg font-medium text-gray-900">Commandes</h3>
            <div class="space-y-4">
              <label class="flex items-start gap-3">
                <input
                  v-model="formData.settings.orderNotifications"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <span class="text-sm font-medium text-gray-700">Notifications de commande</span>
                  <p class="text-sm text-gray-500">
                    Recevoir des notifications sonores pour les nouvelles commandes
                  </p>
                </div>
              </label>
              <label class="flex items-start gap-3">
                <input
                  v-model="formData.settings.autoAcceptOrders"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <span class="text-sm font-medium text-gray-700">Acceptation automatique</span>
                  <p class="text-sm text-gray-500">
                    Les commandes sont automatiquement confirmées sans validation manuelle
                  </p>
                </div>
              </label>
            </div>
          </div>

          <!-- QR Code section -->
          <div v-if="restaurant">
            <h3 class="mb-4 text-lg font-medium text-gray-900">QR Code du menu</h3>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p class="mb-2 text-sm text-gray-600">
                URL de votre menu :
              </p>
              <div class="flex items-center gap-2">
                <code class="flex-1 rounded bg-white px-3 py-2 text-sm text-gray-800">
                  {{ menuUrl }}
                </code>
                <button
                  type="button"
                  class="rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  @click="copyMenuUrl"
                >
                  Copier
                </button>
              </div>
              <p class="mt-2 text-xs text-gray-500">
                Générez un QR code à partir de cette URL pour vos tables.
              </p>
            </div>
          </div>
        </div>

        <!-- Submit button -->
        <div class="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            type="submit"
            :disabled="isSaving"
            class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:bg-orange-300"
          >
            <svg
              v-if="isSaving"
              class="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
