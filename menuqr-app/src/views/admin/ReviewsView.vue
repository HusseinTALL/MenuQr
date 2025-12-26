<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Review, AdminReviewStats, ReviewStatus, AdminReviewQueryParams, ReviewPagination } from '@/types/review';
import api from '@/services/api';
import ReviewCard from '@/components/review/ReviewCard.vue';
import StarRating from '@/components/review/StarRating.vue';

// State
const reviews = ref<Review[]>([]);
const stats = ref<AdminReviewStats | null>(null);
const pagination = ref<ReviewPagination | null>(null);
const loading = ref(false);
const statsLoading = ref(false);
const error = ref('');

// Filters
const statusFilter = ref<ReviewStatus | ''>('');
const ratingFilter = ref<number | ''>('');
const sortOption = ref<string>('recent');
const currentPage = ref(1);
const limit = 20;

// Modals
const showRejectModal = ref(false);
const showRespondModal = ref(false);
const selectedReviewId = ref<string | null>(null);
const rejectReason = ref('');
const responseContent = ref('');
const modalLoading = ref(false);

// Tab
const activeTab = ref<'all' | 'pending'>('all');

// Computed
const pendingCount = computed(() => stats.value?.pending || 0);

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvés' },
  { value: 'rejected', label: 'Rejetés' },
  { value: 'flagged', label: 'Signalés' },
];

const ratingOptions = [
  { value: '', label: 'Toutes les notes' },
  { value: 5, label: '5 étoiles' },
  { value: 4, label: '4 étoiles' },
  { value: 3, label: '3 étoiles' },
  { value: 2, label: '2 étoiles' },
  { value: 1, label: '1 étoile' },
];

const sortOptions = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'rating_high', label: 'Meilleures notes' },
  { value: 'rating_low', label: 'Notes les plus basses' },
];

// Methods
const loadStats = async () => {
  statsLoading.value = true;
  try {
    const response = await api.getAdminReviewStats();
    stats.value = response.data || null;
  } catch (err) {
    console.error('Error loading stats:', err);
  } finally {
    statsLoading.value = false;
  }
};

const loadReviews = async (page = 1) => {
  loading.value = true;
  error.value = '';

  try {
    const params: AdminReviewQueryParams = {
      page,
      limit,
      sort: sortOption.value as AdminReviewQueryParams['sort'],
    };

    if (activeTab.value === 'pending') {
      params.status = 'pending';
    } else if (statusFilter.value) {
      params.status = statusFilter.value;
    }

    if (ratingFilter.value) {
      params.rating = Number(ratingFilter.value);
    }

    const response = await api.getAdminReviews(params);

    if (page === 1) {
      reviews.value = response.data?.reviews || [];
    } else {
      reviews.value = [...reviews.value, ...(response.data?.reviews || [])];
    }

    pagination.value = response.data?.pagination || null;
    currentPage.value = page;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement';
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (id: string) => {
  try {
    await api.approveReview(id);
    // Update local state
    const review = reviews.value.find(r => r._id === id);
    if (review) {
      review.status = 'approved';
    }
    await loadStats();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de l\'approbation';
  }
};

const openRejectModal = (id: string) => {
  selectedReviewId.value = id;
  rejectReason.value = '';
  showRejectModal.value = true;
};

const handleReject = async () => {
  if (!selectedReviewId.value || !rejectReason.value.trim()) return;

  modalLoading.value = true;
  try {
    await api.rejectReview(selectedReviewId.value, rejectReason.value.trim());
    // Update local state
    const review = reviews.value.find(r => r._id === selectedReviewId.value);
    if (review) {
      review.status = 'rejected';
      review.rejectionReason = rejectReason.value.trim();
    }
    showRejectModal.value = false;
    await loadStats();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du rejet';
  } finally {
    modalLoading.value = false;
  }
};

const openRespondModal = (id: string) => {
  selectedReviewId.value = id;
  responseContent.value = '';
  showRespondModal.value = true;
};

const handleRespond = async () => {
  if (!selectedReviewId.value || !responseContent.value.trim()) return;

  modalLoading.value = true;
  try {
    const response = await api.respondToReview(selectedReviewId.value, responseContent.value.trim());
    // Update local state
    const review = reviews.value.find(r => r._id === selectedReviewId.value);
    if (review && response.data) {
      review.response = response.data.response;
    }
    showRespondModal.value = false;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de la réponse';
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (id: string) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

  try {
    await api.deleteAdminReview(id);
    reviews.value = reviews.value.filter(r => r._id !== id);
    await loadStats();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de la suppression';
  }
};

const loadMore = () => {
  if (pagination.value && currentPage.value < pagination.value.pages) {
    loadReviews(currentPage.value + 1);
  }
};

// Watch for filter changes
watch([statusFilter, ratingFilter, sortOption, activeTab], () => {
  loadReviews(1);
});

onMounted(() => {
  loadStats();
  loadReviews();
});
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Gestion des Avis</h1>
      <p class="text-gray-600 mt-1">Modérez et répondez aux avis de vos clients</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="text-2xl font-bold text-gray-900">{{ stats?.total || 0 }}</div>
        <div class="text-sm text-gray-500">Total</div>
      </div>
      <div class="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
        <div class="text-2xl font-bold text-yellow-700">{{ stats?.pending || 0 }}</div>
        <div class="text-sm text-yellow-600">En attente</div>
      </div>
      <div class="bg-green-50 rounded-xl border border-green-200 p-4">
        <div class="text-2xl font-bold text-green-700">{{ stats?.approved || 0 }}</div>
        <div class="text-sm text-green-600">Approuvés</div>
      </div>
      <div class="bg-red-50 rounded-xl border border-red-200 p-4">
        <div class="text-2xl font-bold text-red-700">{{ stats?.rejected || 0 }}</div>
        <div class="text-sm text-red-600">Rejetés</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-2">
          <StarRating :model-value="stats?.averageRating || 0" readonly size="sm" />
        </div>
        <div class="text-sm text-gray-500 mt-1">Note moyenne</div>
      </div>
      <div class="bg-teal-50 rounded-xl border border-teal-200 p-4">
        <div class="text-2xl font-bold text-teal-700">{{ stats?.responseRate || 0 }}%</div>
        <div class="text-sm text-teal-600">Taux de réponse</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4">
      <button
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors',
          activeTab === 'all'
            ? 'bg-teal-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
        @click="activeTab = 'all'"
      >
        Tous les avis
      </button>
      <button
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors relative',
          activeTab === 'pending'
            ? 'bg-teal-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
        @click="activeTab = 'pending'"
      >
        En attente
        <span
          v-if="pendingCount > 0"
          class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
        >
          {{ pendingCount > 9 ? '9+' : pendingCount }}
        </span>
      </button>
    </div>

    <!-- Filters -->
    <div v-if="activeTab === 'all'" class="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg mb-4">
      <select
        v-model="statusFilter"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
      >
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select
        v-model="ratingFilter"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
      >
        <option v-for="opt in ratingOptions" :key="String(opt.value)" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select
        v-model="sortOption"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
      >
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <div v-if="pagination" class="ml-auto text-sm text-gray-500">
        {{ pagination.total }} avis
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading && reviews.length === 0" class="space-y-4">
      <div
        v-for="i in 3"
        :key="i"
        class="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gray-200" />
          <div class="space-y-2">
            <div class="h-4 w-24 bg-gray-200 rounded" />
            <div class="h-3 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        <div class="space-y-2">
          <div class="h-4 w-3/4 bg-gray-200 rounded" />
          <div class="h-4 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && reviews.length === 0"
      class="text-center py-12 bg-white rounded-lg border border-gray-200"
    >
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-1">Aucun avis</h3>
      <p class="text-gray-500">
        {{ activeTab === 'pending' ? 'Aucun avis en attente de modération' : 'Aucun avis pour le moment' }}
      </p>
    </div>

    <!-- Reviews list -->
    <div v-else class="space-y-4">
      <ReviewCard
        v-for="review in reviews"
        :key="review._id"
        :review="review"
        :is-admin="true"
        :show-dish="true"
        @approve="handleApprove"
        @reject="openRejectModal"
        @respond="openRespondModal"
        @delete="handleDelete"
      />

      <!-- Load more -->
      <div
        v-if="pagination && currentPage < pagination.pages"
        class="text-center pt-4"
      >
        <button
          :disabled="loading"
          class="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          @click="loadMore"
        >
          {{ loading ? 'Chargement...' : 'Voir plus' }}
        </button>
      </div>
    </div>

    <!-- Reject Modal -->
    <Teleport to="body">
      <div
        v-if="showRejectModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click="showRejectModal = false"
      >
        <div
          class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
          @click.stop
        >
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Rejeter l'avis</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Raison du rejet <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="rejectReason"
              rows="3"
              maxlength="200"
              placeholder="Expliquez pourquoi cet avis est rejeté..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
            <p class="text-xs text-gray-500 text-right mt-1">
              {{ rejectReason.length }}/200
            </p>
          </div>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-gray-700 hover:text-gray-900"
              @click="showRejectModal = false"
            >
              Annuler
            </button>
            <button
              :disabled="!rejectReason.trim() || modalLoading"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              @click="handleReject"
            >
              {{ modalLoading ? 'Envoi...' : 'Rejeter' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Respond Modal -->
    <Teleport to="body">
      <div
        v-if="showRespondModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click="showRespondModal = false"
      >
        <div
          class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
          @click.stop
        >
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Répondre à l'avis</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Votre réponse <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="responseContent"
              rows="4"
              maxlength="500"
              placeholder="Rédigez votre réponse au client..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
            <p class="text-xs text-gray-500 text-right mt-1">
              {{ responseContent.length }}/500
            </p>
          </div>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-gray-700 hover:text-gray-900"
              @click="showRespondModal = false"
            >
              Annuler
            </button>
            <button
              :disabled="!responseContent.trim() || modalLoading"
              class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              @click="handleRespond"
            >
              {{ modalLoading ? 'Envoi...' : 'Publier la réponse' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
