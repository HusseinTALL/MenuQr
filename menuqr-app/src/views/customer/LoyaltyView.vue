<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/services/api';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import type { CustomerLoyaltyInfo, LoyaltyTransaction } from '@/types/loyalty';
import { TIER_CONFIG } from '@/types/loyalty';

const router = useRouter();
const customerAuth = useCustomerAuthStore();

const loading = ref(true);
const error = ref<string | null>(null);
const loyaltyInfo = ref<CustomerLoyaltyInfo | null>(null);
const transactions = ref<LoyaltyTransaction[]>([]);
const transactionPage = ref(1);
const transactionTotal = ref(0);
const redeemLoading = ref(false);
const redeemError = ref<string | null>(null);
const redeemSuccess = ref<string | null>(null);
const showRedeemModal = ref(false);
const redeemAmount = ref(1000);

// Check if user is authenticated
if (!customerAuth.isAuthenticated) {
  router.push('/menu');
}

const tierConfig = computed(() => {
  if (!loyaltyInfo.value) {return TIER_CONFIG.bronze;}
  return TIER_CONFIG[loyaltyInfo.value.currentTier] || TIER_CONFIG.bronze;
});

const progressPercent = computed(() => {
  if (!loyaltyInfo.value?.nextTier) {return 100;}
  const current = loyaltyInfo.value.totalPoints;
  const currentMin = TIER_CONFIG[loyaltyInfo.value.currentTier].minPoints;
  const nextMin = loyaltyInfo.value.nextTier.pointsNeeded + current;
  const progress = ((current - currentMin) / (nextMin - currentMin)) * 100;
  return Math.min(100, Math.max(0, progress));
});

const canRedeem = computed(() => {
  return (loyaltyInfo.value?.availablePoints || 0) >= 1000;
});

const redeemValue = computed(() => {
  return Math.floor(redeemAmount.value / 2);
});

const maxRedeemable = computed(() => {
  const available = loyaltyInfo.value?.availablePoints || 0;
  return Math.floor(available / 1000) * 1000;
});

async function fetchLoyaltyInfo() {
  try {
    loading.value = true;
    error.value = null;
    const response = await api.customerGetLoyalty();
    if (response.success && response.data) {
      loyaltyInfo.value = response.data;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
}

async function fetchTransactions() {
  try {
    const response = await api.customerGetPointsHistory({ page: transactionPage.value, limit: 10 });
    if (response.success && response.data) {
      transactions.value = response.data.transactions;
      transactionTotal.value = response.data.pagination.total;
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
  }
}

async function handleRedeem() {
  if (redeemAmount.value < 1000) {
    redeemError.value = 'Minimum 1000 points';
    return;
  }

  try {
    redeemLoading.value = true;
    redeemError.value = null;
    redeemSuccess.value = null;

    const response = await api.customerRedeemPoints(redeemAmount.value);
    if (response.success && response.data) {
      redeemSuccess.value = `${redeemAmount.value} points échangés contre ${response.data.creditValue} FCFA`;
      showRedeemModal.value = false;
      // Refresh data
      await fetchLoyaltyInfo();
      await fetchTransactions();
    }
  } catch (err: unknown) {
    redeemError.value = err instanceof Error ? err.message : 'Erreur lors de l\'échange';
  } finally {
    redeemLoading.value = false;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTransactionIcon(type: string) {
  switch (type) {
    case 'earn': return '🎉';
    case 'redeem': return '🎁';
    case 'expire': return '⏰';
    case 'bonus': return '⭐';
    case 'adjust': return '⚙️';
    default: return '📝';
  }
}

function getTransactionClass(type: string) {
  switch (type) {
    case 'earn':
    case 'bonus':
      return 'text-green-600';
    case 'redeem':
    case 'expire':
    case 'adjust':
      return 'text-red-500';
    default:
      return 'text-gray-600';
  }
}

onMounted(() => {
  fetchLoyaltyInfo();
  fetchTransactions();
});
</script>

<template>
  <div class="loyalty-view">
    <!-- Header -->
    <header class="loyalty-header">
      <button @click="router.back()" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <h1>Ma Fidélité</h1>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="fetchLoyaltyInfo" class="retry-btn">Réessayer</button>
    </div>

    <!-- Content -->
    <div v-else-if="loyaltyInfo" class="loyalty-content">
      <!-- Success Message -->
      <div v-if="redeemSuccess" class="success-toast">
        {{ redeemSuccess }}
        <button @click="redeemSuccess = null" class="close-toast">×</button>
      </div>

      <!-- Loyalty Card -->
      <div class="loyalty-card" :style="{ background: `linear-gradient(135deg, ${tierConfig.color}, ${tierConfig.color}88)` }">
        <div class="card-shine"></div>
        <div class="card-content">
          <div class="card-header">
            <span class="tier-badge">{{ tierConfig.name }}</span>
            <span class="discount-badge" v-if="tierConfig.discount > 0">
              -{{ tierConfig.discount }}%
            </span>
          </div>
          <div class="points-display">
            <span class="points-value">{{ loyaltyInfo.totalPoints.toLocaleString() }}</span>
            <span class="points-label">points</span>
          </div>
          <div class="card-footer">
            <span>{{ customerAuth.customer?.name || customerAuth.customer?.phone }}</span>
          </div>
        </div>
      </div>

      <!-- Tier Progress -->
      <div class="tier-progress-section" v-if="loyaltyInfo.nextTier">
        <div class="progress-header">
          <span>Prochain palier: <strong>{{ loyaltyInfo.nextTier.name }}</strong></span>
          <span>{{ loyaltyInfo.nextTier.pointsNeeded.toLocaleString() }} pts restants</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
      </div>
      <div v-else class="tier-max">
        🏆 Vous êtes au niveau maximum !
      </div>

      <!-- Expiring Points Alert -->
      <div v-if="loyaltyInfo.expiringPoints" class="expiring-alert">
        <span class="alert-icon">⏰</span>
        <div class="alert-content">
          <strong>{{ loyaltyInfo.expiringPoints.points.toLocaleString() }} points</strong>
          expirent le {{ formatDate(loyaltyInfo.expiringPoints.expiresAt) }}
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-section">
        <button
          @click="showRedeemModal = true"
          :disabled="!canRedeem"
          class="redeem-btn"
        >
          <span class="btn-icon">🎁</span>
          <span>Échanger mes points</span>
        </button>
        <p class="redeem-hint" v-if="!canRedeem">
          Il vous faut au moins 1000 points pour échanger
        </p>
        <p class="redeem-hint" v-else>
          1000 points = 500 FCFA de crédit
        </p>
      </div>

      <!-- Tier Benefits -->
      <div class="benefits-section">
        <h2>Avantages de votre palier</h2>
        <div class="benefits-grid">
          <div class="benefit-item" :class="{ active: tierConfig.discount > 0 }">
            <span class="benefit-icon">💰</span>
            <span>{{ tierConfig.discount }}% de remise automatique</span>
          </div>
          <div class="benefit-item active">
            <span class="benefit-icon">🎯</span>
            <span>1 FCFA dépensé = 1 point</span>
          </div>
          <div class="benefit-item active">
            <span class="benefit-icon">🎁</span>
            <span>Échange: 1000 pts = 500 FCFA</span>
          </div>
        </div>
      </div>

      <!-- All Tiers -->
      <div class="all-tiers-section">
        <h2>Tous les paliers</h2>
        <div class="tiers-list">
          <div
            v-for="(config, tier) in TIER_CONFIG"
            :key="tier"
            class="tier-item"
            :class="{ current: loyaltyInfo.currentTier === tier }"
          >
            <div class="tier-color" :style="{ backgroundColor: config.color }"></div>
            <div class="tier-info">
              <span class="tier-name">{{ config.name }}</span>
              <span class="tier-points">{{ config.minPoints.toLocaleString() }}+ pts</span>
            </div>
            <span class="tier-discount">-{{ config.discount }}%</span>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="history-section">
        <h2>Historique</h2>
        <div v-if="transactions.length === 0" class="empty-history">
          <p>Aucune transaction pour le moment</p>
        </div>
        <div v-else class="transactions-list">
          <div
            v-for="tx in transactions"
            :key="tx._id"
            class="transaction-item"
          >
            <span class="tx-icon">{{ getTransactionIcon(tx.type) }}</span>
            <div class="tx-details">
              <span class="tx-description">{{ tx.description }}</span>
              <span class="tx-date">{{ formatDate(tx.createdAt) }}</span>
            </div>
            <span class="tx-points" :class="getTransactionClass(tx.type)">
              {{ tx.points > 0 ? '+' : '' }}{{ tx.points.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Redeem Modal -->
    <Teleport to="body">
      <div v-if="showRedeemModal" class="modal-overlay" @click="showRedeemModal = false">
        <div class="modal-content" @click.stop>
          <h3>Échanger vos points</h3>

          <div class="modal-body">
            <p class="modal-info">
              Points disponibles: <strong>{{ loyaltyInfo?.availablePoints.toLocaleString() }}</strong>
            </p>

            <div class="redeem-input-group">
              <label>Nombre de points à échanger</label>
              <div class="points-input">
                <button
                  @click="redeemAmount = Math.max(1000, redeemAmount - 1000)"
                  :disabled="redeemAmount <= 1000"
                >-</button>
                <input
                  type="number"
                  v-model.number="redeemAmount"
                  min="1000"
                  :max="maxRedeemable"
                  step="1000"
                />
                <button
                  @click="redeemAmount = Math.min(maxRedeemable, redeemAmount + 1000)"
                  :disabled="redeemAmount >= maxRedeemable"
                >+</button>
              </div>
            </div>

            <div class="redeem-value">
              <span>Valeur:</span>
              <strong>{{ redeemValue.toLocaleString() }} FCFA</strong>
            </div>

            <p v-if="redeemError" class="redeem-error">{{ redeemError }}</p>
          </div>

          <div class="modal-actions">
            <button @click="showRedeemModal = false" class="cancel-btn">Annuler</button>
            <button @click="handleRedeem" :disabled="redeemLoading" class="confirm-btn">
              {{ redeemLoading ? 'En cours...' : 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.loyalty-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%);
  padding-bottom: 2rem;
}

.loyalty-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  padding: 0.5rem;
  border-radius: 50%;
  background: #f1f5f9;
}

.loyalty-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #14b8a6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  padding: 0.75rem 1.5rem;
  background: #14b8a6;
  color: white;
  border-radius: 0.5rem;
  font-weight: 500;
}

.loyalty-content {
  padding: 1rem;
  max-width: 480px;
  margin: 0 auto;
}

.success-toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.close-toast {
  font-size: 1.5rem;
  line-height: 1;
}

/* Loyalty Card */
.loyalty-card {
  position: relative;
  border-radius: 1rem;
  padding: 1.5rem;
  color: white;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  margin-bottom: 1.5rem;
}

.card-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  pointer-events: none;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tier-badge {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}

.discount-badge {
  font-size: 1.125rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.points-display {
  text-align: center;
  margin-bottom: 1.5rem;
}

.points-value {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  display: block;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.points-label {
  font-size: 0.875rem;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.card-footer {
  font-size: 0.875rem;
  opacity: 0.9;
}

/* Tier Progress */
.tier-progress-section {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #14b8a6, #0d9488);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.tier-max {
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 0.75rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

/* Expiring Alert */
.expiring-alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
}

.alert-icon {
  font-size: 1.5rem;
}

.alert-content {
  font-size: 0.875rem;
  color: #92400e;
}

/* Actions */
.actions-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.redeem-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  color: white;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(20, 184, 166, 0.3);
  transition: all 0.2s;
}

.redeem-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
}

.redeem-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1.25rem;
}

.redeem-hint {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
}

/* Benefits */
.benefits-section,
.all-tiers-section,
.history-section {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.benefits-section h2,
.all-tiers-section h2,
.history-section h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

.benefits-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #94a3b8;
}

.benefit-item.active {
  color: #0f172a;
  background: #f0fdfa;
}

.benefit-icon {
  font-size: 1.25rem;
}

/* Tiers List */
.tiers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tier-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.tier-item.current {
  background: #f0fdfa;
  border: 2px solid #14b8a6;
}

.tier-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tier-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tier-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.tier-points {
  font-size: 0.75rem;
  color: #64748b;
}

.tier-discount {
  font-weight: 600;
  color: #14b8a6;
}

/* Transactions */
.empty-history {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.tx-icon {
  font-size: 1.25rem;
}

.tx-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tx-description {
  font-size: 0.875rem;
  color: #0f172a;
}

.tx-date {
  font-size: 0.75rem;
  color: #94a3b8;
}

.tx-points {
  font-weight: 600;
  font-size: 0.875rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
}

.modal-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.modal-body {
  margin-bottom: 1.5rem;
}

.modal-info {
  margin-bottom: 1rem;
  color: #64748b;
}

.redeem-input-group {
  margin-bottom: 1rem;
}

.redeem-input-group label {
  display: block;
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.points-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.points-input button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f5f9;
  font-size: 1.25rem;
  font-weight: 600;
}

.points-input button:disabled {
  opacity: 0.5;
}

.points-input input {
  flex: 1;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 600;
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
}

.redeem-value {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #f0fdfa;
  border-radius: 0.5rem;
  color: #0d9488;
}

.redeem-error {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
}

.modal-actions button {
  flex: 1;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

.confirm-btn {
  background: #14b8a6;
  color: white;
}

.confirm-btn:disabled {
  opacity: 0.5;
}
</style>
