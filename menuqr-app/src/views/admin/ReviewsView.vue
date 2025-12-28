<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Review, AdminReviewStats, ReviewStatus, AdminReviewQueryParams, ReviewPagination } from '@/types/review';
import api from '@/services/api';
import ReviewCard from '@/components/review/ReviewCard.vue';
import StarRating from '@/components/review/StarRating.vue';
import { message } from 'ant-design-vue';
import {
  StarOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PercentageOutlined,
} from '@ant-design/icons-vue';

// State
const reviews = ref<Review[]>([]);
const stats = ref<AdminReviewStats | null>(null);
const pagination = ref<ReviewPagination | null>(null);
const loading = ref(false);
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
const activeTab = ref<string>('all');

// Computed
const pendingCount = computed(() => stats.value?.pending || 0);

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuves' },
  { value: 'rejected', label: 'Rejetes' },
  { value: 'flagged', label: 'Signales' },
];

const ratingOptions = [
  { value: '', label: 'Toutes les notes' },
  { value: 5, label: '5 etoiles' },
  { value: 4, label: '4 etoiles' },
  { value: 3, label: '3 etoiles' },
  { value: 2, label: '2 etoiles' },
  { value: 1, label: '1 etoile' },
];

const sortOptions = [
  { value: 'recent', label: 'Plus recents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'rating_high', label: 'Meilleures notes' },
  { value: 'rating_low', label: 'Notes les plus basses' },
];

// Methods
const loadStats = async () => {
  try {
    const response = await api.getAdminReviewStats();
    stats.value = response.data || null;
  } catch (err) {
    console.error('Error loading stats:', err);
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
    const review = reviews.value.find(r => r._id === id);
    if (review) {
      review.status = 'approved';
    }
    message.success('Avis approuve');
    await loadStats();
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : 'Erreur lors de l\'approbation');
  }
};

const openRejectModal = (id: string) => {
  selectedReviewId.value = id;
  rejectReason.value = '';
  showRejectModal.value = true;
};

const handleReject = async () => {
  if (!selectedReviewId.value || !rejectReason.value.trim()) {return;}

  modalLoading.value = true;
  try {
    await api.rejectReview(selectedReviewId.value, rejectReason.value.trim());
    const review = reviews.value.find(r => r._id === selectedReviewId.value);
    if (review) {
      review.status = 'rejected';
      review.rejectionReason = rejectReason.value.trim();
    }
    showRejectModal.value = false;
    message.success('Avis rejete');
    await loadStats();
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : 'Erreur lors du rejet');
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
  if (!selectedReviewId.value || !responseContent.value.trim()) {return;}

  modalLoading.value = true;
  try {
    const response = await api.respondToReview(selectedReviewId.value, responseContent.value.trim());
    const review = reviews.value.find(r => r._id === selectedReviewId.value);
    if (review && response.data) {
      review.response = response.data.response;
    }
    showRespondModal.value = false;
    message.success('Reponse publiee');
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : 'Erreur lors de la reponse');
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (id: string) => {
  try {
    await api.deleteAdminReview(id);
    reviews.value = reviews.value.filter(r => r._id !== id);
    message.success('Avis supprime');
    await loadStats();
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
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
  <div class="reviews-view space-y-6">
    <!-- Header Card -->
    <a-card class="header-card" :bordered="false">
      <div class="header-gradient">
        <div class="header-decoration"></div>
        <div class="header-orb orb-1"></div>
        <div class="header-orb orb-2"></div>

        <div class="header-content">
          <div class="header-title-section">
            <div class="header-icon">
              <StarOutlined />
            </div>
            <div>
              <h1 class="header-title">Gestion des Avis</h1>
              <p class="header-subtitle">Moderez et repondez aux avis de vos clients</p>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- Stats Cards -->
    <a-row v-if="stats" :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :md="8" :lg="4">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            :value="stats.total"
            title="Total"
          >
            <template #prefix>
              <MessageOutlined class="stat-icon" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :lg="4">
        <a-card :bordered="false" class="stat-card pending">
          <a-statistic
            :value="stats.pending"
            title="En attente"
            value-style="color: #d97706"
          >
            <template #prefix>
              <ClockCircleOutlined class="stat-icon pending" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :lg="4">
        <a-card :bordered="false" class="stat-card success">
          <a-statistic
            :value="stats.approved"
            title="Approuves"
            value-style="color: #059669"
          >
            <template #prefix>
              <CheckCircleOutlined class="stat-icon success" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :lg="4">
        <a-card :bordered="false" class="stat-card danger">
          <a-statistic
            :value="stats.rejected"
            title="Rejetes"
            value-style="color: #dc2626"
          >
            <template #prefix>
              <CloseCircleOutlined class="stat-icon danger" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :lg="4">
        <a-card :bordered="false" class="stat-card">
          <div class="rating-stat">
            <StarRating :model-value="stats.averageRating || 0" readonly size="sm" />
            <span class="rating-value">{{ (stats.averageRating || 0).toFixed(1) }}</span>
          </div>
          <div class="stat-label">Note moyenne</div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :lg="4">
        <a-card :bordered="false" class="stat-card teal">
          <a-statistic
            :value="stats.responseRate"
            title="Taux de reponse"
            suffix="%"
            value-style="color: #0d9488"
          >
            <template #prefix>
              <PercentageOutlined class="stat-icon teal" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Tabs -->
    <a-card :bordered="false" class="tabs-card">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="all" tab="Tous les avis" />
        <a-tab-pane key="pending">
          <template #tab>
            <span>
              En attente
              <a-badge
                v-if="pendingCount > 0"
                :count="pendingCount"
                :overflow-count="9"
                class="tab-badge"
              />
            </span>
          </template>
        </a-tab-pane>
      </a-tabs>

      <!-- Filters (only show for "all" tab) -->
      <div v-if="activeTab === 'all'" class="filters-row">
        <a-select
          v-model:value="statusFilter"
          placeholder="Tous les statuts"
          style="width: 180px"
        >
          <a-select-option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <a-select
          v-model:value="ratingFilter"
          placeholder="Toutes les notes"
          style="width: 180px"
        >
          <a-select-option v-for="opt in ratingOptions" :key="String(opt.value)" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <a-select
          v-model:value="sortOption"
          style="width: 180px"
        >
          <a-select-option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <span v-if="pagination" class="filter-count">
          {{ pagination.total }} avis
        </span>
      </div>
    </a-card>

    <!-- Error -->
    <a-alert
      v-if="error"
      :message="error"
      type="error"
      show-icon
      closable
      @close="error = ''"
    />

    <!-- Loading -->
    <div v-if="loading && reviews.length === 0" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Empty state -->
    <a-card v-else-if="!loading && reviews.length === 0" :bordered="false" class="empty-card">
      <a-empty :description="activeTab === 'pending' ? 'Aucun avis en attente de moderation' : 'Aucun avis pour le moment'">
        <template #image>
          <div class="empty-icon">
            <MessageOutlined />
          </div>
        </template>
      </a-empty>
    </a-card>

    <!-- Reviews list -->
    <div v-else class="reviews-list">
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
        class="load-more"
      >
        <a-button :loading="loading" @click="loadMore">
          Voir plus
        </a-button>
      </div>
    </div>

    <!-- Reject Modal -->
    <a-modal
      v-model:open="showRejectModal"
      title="Rejeter l'avis"
      :footer="null"
      :width="500"
      @cancel="showRejectModal = false"
    >
      <div class="modal-content">
        <div class="modal-icon danger">
          <CloseCircleOutlined />
        </div>

        <a-form layout="vertical" class="modal-form">
          <a-form-item label="Raison du rejet" required>
            <a-textarea
              v-model:value="rejectReason"
              :rows="3"
              :maxlength="200"
              placeholder="Expliquez pourquoi cet avis est rejete..."
              show-count
            />
          </a-form-item>
        </a-form>

        <div class="modal-actions">
          <a-button size="large" @click="showRejectModal = false">
            Annuler
          </a-button>
          <a-button
            type="primary"
            danger
            size="large"
            :loading="modalLoading"
            :disabled="!rejectReason.trim()"
            @click="handleReject"
          >
            Rejeter
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Respond Modal -->
    <a-modal
      v-model:open="showRespondModal"
      title="Repondre a l'avis"
      :footer="null"
      :width="500"
      @cancel="showRespondModal = false"
    >
      <div class="modal-content">
        <div class="modal-icon teal">
          <MessageOutlined />
        </div>

        <a-form layout="vertical" class="modal-form">
          <a-form-item label="Votre reponse" required>
            <a-textarea
              v-model:value="responseContent"
              :rows="4"
              :maxlength="500"
              placeholder="Redigez votre reponse au client..."
              show-count
            />
          </a-form-item>
        </a-form>

        <div class="modal-actions">
          <a-button size="large" @click="showRespondModal = false">
            Annuler
          </a-button>
          <a-button
            type="primary"
            size="large"
            :loading="modalLoading"
            :disabled="!responseContent.trim()"
            @click="handleRespond"
          >
            Publier la reponse
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.reviews-view {
  display: flex;
  flex-direction: column;
}

/* Header Card */
.header-card {
  border-radius: 20px;
  overflow: hidden;
}

.header-card :deep(.ant-card-body) {
  padding: 0;
}

.header-gradient {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f97316 100%);
  padding: 32px;
  position: relative;
  overflow: hidden;
  color: white;
}

.header-decoration {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-image: radial-gradient(circle at 4px 4px, white 1px, transparent 1px);
  background-size: 16px 16px;
}

.header-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
}

.header-orb.orb-1 {
  right: -32px;
  top: -32px;
  width: 128px;
  height: 128px;
  background: rgba(255, 255, 255, 0.15);
}

.header-orb.orb-2 {
  left: -48px;
  bottom: -48px;
  width: 160px;
  height: 160px;
  background: rgba(251, 191, 36, 0.2);
}

.header-content {
  position: relative;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  font-size: 24px;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.header-subtitle {
  margin: 4px 0 0;
  opacity: 0.9;
}

/* Stats Cards */
.stat-card {
  border-radius: 16px;
  text-align: center;
}

.stat-card.pending {
  background: #fffbeb;
}

.stat-card.success {
  background: #ecfdf5;
}

.stat-card.danger {
  background: #fef2f2;
}

.stat-card.teal {
  background: #f0fdfa;
}

.stat-icon {
  font-size: 18px;
  margin-right: 8px;
  color: #6b7280;
}

.stat-icon.pending {
  color: #d97706;
}

.stat-icon.success {
  color: #059669;
}

.stat-icon.danger {
  color: #dc2626;
}

.stat-icon.teal {
  color: #0d9488;
}

.rating-stat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.rating-value {
  font-size: 24px;
  font-weight: 700;
  color: #f59e0b;
}

.stat-label {
  margin-top: 8px;
  font-size: 14px;
  color: #6b7280;
}

/* Tabs Card */
.tabs-card {
  border-radius: 16px;
}

.tabs-card :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.tab-badge {
  margin-left: 8px;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
  margin-top: 16px;
}

.filter-count {
  margin-left: auto;
  font-size: 14px;
  color: #6b7280;
}

/* Loading */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

/* Empty State */
.empty-card {
  border-radius: 16px;
  text-align: center;
  padding: 48px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(to bottom right, #fef3c7, #fde68a);
  font-size: 36px;
  color: #f59e0b;
}

/* Reviews List */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.load-more {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

/* Modal Styles */
.modal-content {
  text-align: center;
}

.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 28px;
}

.modal-icon.danger {
  background: linear-gradient(to bottom right, #fef2f2, #fee2e2);
  color: #dc2626;
}

.modal-icon.teal {
  background: linear-gradient(to bottom right, #f0fdfa, #ccfbf1);
  color: #0d9488;
}

.modal-form {
  margin-top: 24px;
  text-align: left;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.modal-actions .ant-btn {
  flex: 1;
}

/* Responsive */
@media (max-width: 640px) {
  .header-gradient {
    padding: 20px;
  }

  .header-title {
    font-size: 20px;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-row .ant-select {
    width: 100% !important;
  }

  .filter-count {
    margin-left: 0;
    text-align: center;
  }
}
</style>
