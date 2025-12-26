<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';
import type { Table, TableStats, CreateTableData, TableLocation } from '@/types/reservation';
import { TABLE_LOCATION_LABELS } from '@/types/reservation';
import { useQRCode } from '@/composables/useQRCode';
import QRCodeDisplay from '@/components/admin/QRCodeDisplay.vue';
import QRCodeModal from '@/components/admin/QRCodeModal.vue';

const { getMenuUrl, getTableUrl, downloadAllQRCodes } = useQRCode();

const isLoading = ref(true);
const error = ref<string | null>(null);
const tables = ref<Table[]>([]);
const stats = ref<TableStats | null>(null);
const showModal = ref(false);
const showDeleteModal = ref(false);
const isSubmitting = ref(false);
const editingTable = ref<Table | null>(null);
const tableToDelete = ref<Table | null>(null);

// Restaurant info for QR codes
const restaurantSlug = ref<string>('');
const restaurantName = ref<string>('');

// QR Modal state
const showQRModal = ref(false);
const qrModalUrl = ref('');
const qrModalTitle = ref('');
const qrModalSubtitle = ref('');
const isDownloadingAll = ref(false);

const successMessage = ref<string | null>(null);
let successTimeout: ReturnType<typeof setTimeout> | null = null;

const showSuccess = (message: string) => {
  successMessage.value = message;
  if (successTimeout) clearTimeout(successTimeout);
  successTimeout = setTimeout(() => {
    successMessage.value = null;
  }, 3000);
};

const formData = ref<CreateTableData & { isActive?: boolean }>({
  name: '',
  capacity: 4,
  minCapacity: 1,
  location: 'indoor',
  description: '',
});

const locations: { value: TableLocation; label: string }[] = [
  { value: 'indoor', label: 'Intérieur' },
  { value: 'outdoor', label: 'Extérieur' },
  { value: 'terrace', label: 'Terrasse' },
  { value: 'private', label: 'Privé' },
];

const locationColors: Record<TableLocation, { bg: string; text: string; light: string }> = {
  indoor: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100' },
  outdoor: { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-100' },
  terrace: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100' },
  private: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100' },
};

const sortedTables = computed(() => {
  return [...tables.value].sort((a, b) => a.order - b.order);
});

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const [tablesRes, statsRes, restaurantRes] = await Promise.all([
      api.getTables(),
      api.getTableStats(),
      api.getMyRestaurant(),
    ]);

    if (tablesRes.success && tablesRes.data) {
      tables.value = tablesRes.data;
    }
    if (statsRes.success && statsRes.data) {
      stats.value = statsRes.data;
    }
    if (restaurantRes.success && restaurantRes.data) {
      restaurantSlug.value = restaurantRes.data.slug;
      restaurantName.value = restaurantRes.data.name;
    }
  } catch (err) {
    error.value = 'Erreur lors du chargement des tables';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

// Computed QR URLs
const menuUrl = computed(() => {
  if (!restaurantSlug.value) return '';
  return getMenuUrl(restaurantSlug.value);
});

// QR Code functions
const openTableQRModal = (table: Table) => {
  if (!restaurantSlug.value) return;
  qrModalUrl.value = getTableUrl(restaurantSlug.value, table.name);
  qrModalTitle.value = table.name;
  qrModalSubtitle.value = TABLE_LOCATION_LABELS[table.location];
  showQRModal.value = true;
};

const openMenuQRModal = () => {
  if (!restaurantSlug.value) return;
  qrModalUrl.value = menuUrl.value;
  qrModalTitle.value = 'Menu du restaurant';
  qrModalSubtitle.value = restaurantName.value;
  showQRModal.value = true;
};

const closeQRModal = () => {
  showQRModal.value = false;
};

const handleDownloadAll = async () => {
  if (!restaurantSlug.value || tables.value.length === 0) return;

  isDownloadingAll.value = true;
  try {
    await downloadAllQRCodes(tables.value, restaurantSlug.value, restaurantName.value);
    showSuccess('QR codes téléchargés avec succès');
  } catch (err) {
    console.error('Download all failed:', err);
    error.value = 'Erreur lors du téléchargement des QR codes';
  } finally {
    isDownloadingAll.value = false;
  }
};

const openCreateModal = () => {
  editingTable.value = null;
  formData.value = {
    name: '',
    capacity: 4,
    minCapacity: 1,
    location: 'indoor',
    description: '',
  };
  showModal.value = true;
};

const openEditModal = (table: Table) => {
  editingTable.value = table;
  formData.value = {
    name: table.name,
    capacity: table.capacity,
    minCapacity: table.minCapacity,
    location: table.location,
    description: table.description || '',
    isActive: table.isActive,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingTable.value = null;
};

const handleSubmit = async () => {
  isSubmitting.value = true;
  error.value = null;

  try {
    if (editingTable.value) {
      const response = await api.updateTable(editingTable.value._id, formData.value);
      if (response.success) {
        await fetchData();
        closeModal();
        showSuccess('Table mise à jour avec succès');
      }
    } else {
      const response = await api.createTable(formData.value);
      if (response.success) {
        await fetchData();
        closeModal();
        showSuccess('Table créée avec succès');
      }
    }
  } catch (err) {
    error.value = 'Erreur lors de la sauvegarde';
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
};

const confirmDelete = (table: Table) => {
  tableToDelete.value = table;
  showDeleteModal.value = true;
};

const deleteTable = async () => {
  if (!tableToDelete.value) return;

  try {
    const response = await api.deleteTable(tableToDelete.value._id);
    if (response.success) {
      await fetchData();
      showDeleteModal.value = false;
      tableToDelete.value = null;
      showSuccess('Table supprimée avec succès');
    }
  } catch (err) {
    error.value = 'Erreur lors de la suppression';
    console.error(err);
  }
};

const toggleActive = async (table: Table) => {
  try {
    const response = await api.toggleTableStatus(table._id);
    if (response.success) {
      table.isActive = !table.isActive;
      showSuccess(table.isActive ? 'Table activée' : 'Table désactivée');
    }
  } catch (err) {
    console.error(err);
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="space-y-6">
    <!-- Success Toast -->
    <Transition name="toast">
      <div
        v-if="successMessage"
        class="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-white shadow-lg"
      >
        <span class="text-lg">✅</span>
        <span class="font-medium">{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Header -->
    <div class="rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 p-6 text-white shadow-lg">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-2xl font-bold">Gestion des tables</h2>
          <p class="mt-1 text-teal-100">Configurez les tables de votre restaurant</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <button
            v-if="tables.length > 0 && restaurantSlug"
            :disabled="isDownloadingAll"
            class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50"
            @click="handleDownloadAll"
          >
            <svg v-if="!isDownloadingAll" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <svg v-else class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Tous les QR
          </button>
          <button
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-teal-600 shadow-md transition-all hover:bg-teal-50"
            @click="openCreateModal"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nouvelle table
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="stats" class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.total }}</p>
          <p class="text-sm text-teal-100">Total</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.active }}</p>
          <p class="text-sm text-teal-100">Actives</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.totalCapacity }}</p>
          <p class="text-sm text-teal-100">Places</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.byLocation?.indoor || 0 }}</p>
          <p class="text-sm text-teal-100">Intérieur</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.byLocation?.terrace || 0 }}</p>
          <p class="text-sm text-teal-100">Terrasse</p>
        </div>
        <div class="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <p class="text-2xl font-bold">{{ stats.byLocation?.outdoor || 0 }}</p>
          <p class="text-sm text-teal-100">Extérieur</p>
        </div>
      </div>
    </div>

    <!-- QR Code du Menu -->
    <div
      v-if="restaurantSlug && !isLoading"
      class="rounded-2xl bg-white p-6 shadow-sm"
    >
      <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <!-- QR Code Preview -->
        <div class="shrink-0">
          <QRCodeDisplay
            :url="menuUrl"
            :size="120"
            :show-actions="false"
          />
        </div>

        <!-- Info & Actions -->
        <div class="flex-1 text-center sm:text-left">
          <h3 class="text-lg font-bold text-gray-900">QR Code du Menu</h3>
          <p class="mt-1 text-sm text-gray-500">
            Ce QR code donne accès au menu général de votre restaurant
          </p>

          <!-- URL Display -->
          <div class="mt-3 rounded-lg bg-gray-100 px-3 py-2">
            <p class="break-all text-sm text-gray-600">{{ menuUrl }}</p>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
              @click="openMenuQRModal"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Agrandir
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-16 w-16 rounded-full border-4 border-teal-200"></div>
        <div class="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
      <p class="mt-4 text-gray-500">Chargement des tables...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-6 text-center">
      <p class="text-red-700">{{ error }}</p>
      <button class="mt-4 font-medium text-red-600 underline" @click="fetchData">Réessayer</button>
    </div>

    <!-- Tables Grid -->
    <div v-else-if="sortedTables.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="table in sortedTables"
        :key="table._id"
        class="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
      >
        <!-- Color bar -->
        <div class="h-2" :class="locationColors[table.location].bg"></div>

        <div class="p-5">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                :class="locationColors[table.location].light"
              >
                🪑
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">{{ table.name }}</h3>
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="[locationColors[table.location].light, locationColors[table.location].text]"
                >
                  {{ TABLE_LOCATION_LABELS[table.location] }}
                </span>
              </div>
            </div>
            <span
              v-if="!table.isActive"
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
            >
              Inactive
            </span>
          </div>

          <p v-if="table.description" class="mt-3 text-sm text-gray-500">{{ table.description }}</p>

          <div class="mt-4 flex items-center gap-4">
            <div class="flex items-center gap-1.5">
              <span class="text-lg">👥</span>
              <span class="font-medium" :class="locationColors[table.location].text">
                {{ table.minCapacity }}-{{ table.capacity }}
              </span>
              <span class="text-gray-500">pers.</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
              :class="table.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="toggleActive(table)"
            >
              {{ table.isActive ? '✓ Active' : '○ Inactive' }}
            </button>

            <div class="flex gap-1">
              <button
                v-if="restaurantSlug"
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-teal-100 hover:text-teal-600"
                @click="openTableQRModal(table)"
                title="QR Code"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
              <button
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="openEditModal(table)"
                title="Modifier"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                @click="confirmDelete(table)"
                title="Supprimer"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="rounded-2xl bg-white p-16 text-center shadow-sm">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100">
        <span class="text-4xl">🪑</span>
      </div>
      <h3 class="text-xl font-semibold text-gray-900">Aucune table</h3>
      <p class="mt-2 text-gray-500">Créez des tables pour gérer les réservations.</p>
      <button
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
        @click="openCreateModal"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Nouvelle table
      </button>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div class="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h3 class="text-xl font-bold text-gray-900">
                  {{ editingTable ? 'Modifier la table' : 'Nouvelle table' }}
                </h3>
              </div>
              <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeModal">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form class="space-y-4 p-6" @submit.prevent="handleSubmit">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">Nom *</label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  placeholder="Table 1"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Capacité min</label>
                  <input
                    v-model.number="formData.minCapacity"
                    type="number"
                    min="1"
                    max="20"
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">Capacité max *</label>
                  <input
                    v-model.number="formData.capacity"
                    type="number"
                    min="1"
                    max="20"
                    required
                    class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">Emplacement</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="loc in locations"
                    :key="loc.value"
                    type="button"
                    class="rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all"
                    :class="formData.location === loc.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 hover:border-gray-300'"
                    @click="formData.location = loc.value"
                  >
                    {{ loc.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  v-model="formData.description"
                  rows="2"
                  class="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  placeholder="Description optionnelle..."
                />
              </div>
            </form>

            <div class="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <button
                type="button"
                class="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="closeModal"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:bg-teal-300"
                @click="handleSubmit"
              >
                <svg v-if="isSubmitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ editingTable ? 'Mettre à jour' : 'Créer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteModal && tableToDelete"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="showDeleteModal = false"
        >
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div class="mb-6 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <span class="text-3xl">🗑️</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Supprimer cette table ?</h3>
              <p class="mt-2 text-gray-500">
                Êtes-vous sûr de vouloir supprimer <strong>{{ tableToDelete.name }}</strong> ?
              </p>
            </div>

            <div class="flex gap-3">
              <button
                class="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="showDeleteModal = false"
              >
                Annuler
              </button>
              <button
                class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
                @click="deleteTable"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- QR Code Modal -->
    <QRCodeModal
      :open="showQRModal"
      :url="qrModalUrl"
      :title="qrModalTitle"
      :subtitle="qrModalSubtitle"
      @close="closeQRModal"
    />
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}
</style>
