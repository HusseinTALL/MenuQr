<template>
  <Transition name="banner-slide">
    <div
      v-if="pendingChange"
      class="pending-banner"
      :class="bannerTypeClass"
    >
      <!-- Gradient Accent Line -->
      <div class="banner-accent" :style="{ background: accentGradient }" />

      <!-- Banner Content -->
      <div class="banner-body">
        <!-- Icon Section -->
        <div class="banner-icon-wrapper" :style="{ background: iconBg }">
          <component :is="bannerIcon" class="banner-icon" :style="{ color: iconColor }" />
        </div>

        <!-- Text Content -->
        <div class="banner-content">
          <div class="banner-header">
            <span class="banner-tag" :style="{ background: tagBg, color: tagColor }">
              {{ bannerTag }}
            </span>
            <h4 class="banner-title">{{ bannerTitle }}</h4>
          </div>

          <p class="banner-description">{{ bannerDescription }}</p>

          <!-- Effective Date -->
          <div class="banner-meta">
            <CalendarOutlined class="meta-icon" />
            <span class="meta-label">Date effective:</span>
            <span class="meta-value">{{ formattedEffectiveDate }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="banner-actions">
          <template v-if="pendingChange.type === 'upgrade'">
            <button class="btn-view" @click="$emit('view-details')">
              <span>Voir les détails</span>
              <ArrowRightOutlined />
            </button>
          </template>

          <template v-else-if="pendingChange.type === 'downgrade'">
            <button
              class="btn-cancel"
              :disabled="cancelling"
              @click="cancelChange"
            >
              <CloseOutlined v-if="!cancelling" />
              <LoadingOutlined v-else class="spin" />
              <span>{{ cancelling ? 'Annulation...' : 'Annuler' }}</span>
            </button>
          </template>

          <template v-else-if="pendingChange.type === 'cancellation'">
            <button class="btn-reactivate" @click="$emit('reactivate')">
              <CheckOutlined />
              <span>Conserver</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Progress indicator for time remaining -->
      <div v-if="timeProgress > 0" class="banner-progress">
        <div
          class="progress-fill"
          :style="{ width: `${timeProgress}%`, background: accentGradient }"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import {
  CalendarOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  CheckOutlined,
  LoadingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  StopOutlined,
  RocketOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';

interface PendingChange {
  type: 'upgrade' | 'downgrade' | 'cancellation';
  effectiveDate: string;
  requestedAt: string;
  reason?: string;
  newPlan?: {
    name: string;
    slug: string;
    tier: string;
  };
}

const emit = defineEmits<{
  (e: 'cancelled'): void;
  (e: 'loaded', data: PendingChange | null): void;
  (e: 'view-details'): void;
  (e: 'reactivate'): void;
}>();

const pendingChange = ref<PendingChange | null>(null);
const loading = ref(true);
const cancelling = ref(false);

// Theme configuration by type
const themeConfig = computed(() => {
  const configs = {
    upgrade: {
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10B981',
      tagBg: 'rgba(16, 185, 129, 0.1)',
      tagColor: '#059669',
      tag: 'MISE À NIVEAU',
    },
    downgrade: {
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#F59E0B',
      tagBg: 'rgba(245, 158, 11, 0.1)',
      tagColor: '#D97706',
      tag: 'CHANGEMENT',
    },
    cancellation: {
      gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#EF4444',
      tagBg: 'rgba(239, 68, 68, 0.1)',
      tagColor: '#DC2626',
      tag: 'ANNULATION',
    },
  };
  return configs[pendingChange.value?.type || 'downgrade'];
});

const accentGradient = computed(() => themeConfig.value.gradient);
const iconBg = computed(() => themeConfig.value.iconBg);
const iconColor = computed(() => themeConfig.value.iconColor);
const tagBg = computed(() => themeConfig.value.tagBg);
const tagColor = computed(() => themeConfig.value.tagColor);
const bannerTag = computed(() => themeConfig.value.tag);

const bannerTypeClass = computed(() => {
  return `banner-${pendingChange.value?.type || 'downgrade'}`;
});

const bannerIcon = computed(() => {
  switch (pendingChange.value?.type) {
    case 'upgrade':
      return RocketOutlined;
    case 'downgrade':
      return ArrowDownOutlined;
    case 'cancellation':
      return StopOutlined;
    default:
      return ExclamationCircleOutlined;
  }
});

const bannerTitle = computed(() => {
  if (!pendingChange.value) return '';
  const planName = pendingChange.value.newPlan?.name || 'un nouveau forfait';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return `Passage à ${planName} programmé`;
    case 'downgrade':
      return `Changement vers ${planName} programmé`;
    case 'cancellation':
      return 'Annulation de l\'abonnement programmée';
    default:
      return 'Changement programmé';
  }
});

const bannerDescription = computed(() => {
  if (!pendingChange.value) return '';
  switch (pendingChange.value.type) {
    case 'upgrade':
      return 'Votre mise à niveau sera effective à la date indiquée. Vous bénéficierez immédiatement des nouvelles fonctionnalités.';
    case 'downgrade':
      return 'Votre forfait sera modifié à la fin de la période de facturation actuelle. Certaines fonctionnalités seront désactivées.';
    case 'cancellation':
      return 'Votre abonnement prendra fin à la date indiquée. Vous perdrez l\'accès aux fonctionnalités premium.';
    default:
      return '';
  }
});

const formattedEffectiveDate = computed(() => {
  if (!pendingChange.value?.effectiveDate) return 'Non définie';
  const date = new Date(pendingChange.value.effectiveDate);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

// Calculate time progress (percentage of time elapsed until effective date)
const timeProgress = computed(() => {
  if (!pendingChange.value?.effectiveDate || !pendingChange.value?.requestedAt) return 0;

  const start = new Date(pendingChange.value.requestedAt).getTime();
  const end = new Date(pendingChange.value.effectiveDate).getTime();
  const now = Date.now();

  if (now >= end) return 100;
  if (now <= start) return 0;

  return Math.round(((now - start) / (end - start)) * 100);
});

async function loadPendingChanges() {
  loading.value = true;
  try {
    const response = await api.getPendingChanges();
    if (response.data?.hasPendingChanges && response.data.pendingChange) {
      pendingChange.value = response.data.pendingChange;
    } else {
      pendingChange.value = null;
    }
    emit('loaded', pendingChange.value);
  } catch (error) {
    console.error('Failed to load pending changes:', error);
    pendingChange.value = null;
  } finally {
    loading.value = false;
  }
}

async function cancelChange() {
  if (!pendingChange.value || pendingChange.value.type !== 'downgrade') return;

  cancelling.value = true;
  try {
    await api.cancelScheduledDowngrade();
    pendingChange.value = null;
    emit('cancelled');
  } catch (error) {
    console.error('Failed to cancel downgrade:', error);
  } finally {
    cancelling.value = false;
  }
}

onMounted(() => {
  loadPendingChanges();
});

defineExpose({ refresh: loadPendingChanges });
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   PENDING BANNER - Premium Editorial Design
   ═══════════════════════════════════════════════════════════════ */

.pending-banner {
  position: relative;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -2px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pending-banner:hover {
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

/* Accent Line */
.banner-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

/* Banner Body */
.banner-body {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.5rem;
  padding-top: calc(1.5rem + 4px);
}

/* Icon */
.banner-icon-wrapper {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.pending-banner:hover .banner-icon-wrapper {
  transform: scale(1.05);
}

.banner-icon {
  font-size: 1.5rem;
}

/* Content */
.banner-content {
  flex: 1;
  min-width: 0;
}

.banner-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.banner-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 100px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.banner-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #18181B;
  line-height: 1.3;
}

.banner-description {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: #52525B;
  line-height: 1.6;
}

/* Meta */
.banner-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: #F4F4F5;
  border-radius: 8px;
  font-size: 0.85rem;
}

.meta-icon {
  color: #71717A;
  font-size: 0.9rem;
}

.meta-label {
  color: #71717A;
}

.meta-value {
  color: #18181B;
  font-weight: 600;
}

/* Actions */
.banner-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Button Styles */
.btn-view,
.btn-cancel,
.btn-reactivate {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view {
  background: #18181B;
  color: white;
}

.btn-view:hover {
  background: #27272A;
  transform: translateX(2px);
}

.btn-cancel {
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
}

.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-reactivate {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  color: white;
}

.btn-reactivate:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Loading spinner */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Progress Bar */
.banner-progress {
  height: 3px;
  background: #F4F4F5;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease-out;
}

/* ═══════════════════════════════════════════════════════════════
   TYPE-SPECIFIC STYLING
   ═══════════════════════════════════════════════════════════════ */

.banner-upgrade {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(52, 211, 153, 0.03) 100%);
}

.banner-downgrade {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(251, 191, 36, 0.03) 100%);
}

.banner-cancellation {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(248, 113, 113, 0.03) 100%);
}

/* ═══════════════════════════════════════════════════════════════
   TRANSITION ANIMATIONS
   ═══════════════════════════════════════════════════════════════ */

.banner-slide-enter-active {
  animation: slideDown 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.banner-slide-leave-active {
  animation: slideUp 0.4s cubic-bezier(0.55, 0, 1, 0.45);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 200px;
  }
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateY(0);
    max-height: 200px;
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
    max-height: 0;
  }
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE DESIGN
   ═══════════════════════════════════════════════════════════════ */

@media (max-width: 768px) {
  .banner-body {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1.25rem;
    padding-top: calc(1.25rem + 4px);
  }

  .banner-icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .banner-icon {
    font-size: 1.25rem;
  }

  .banner-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .banner-title {
    font-size: 1rem;
  }

  .banner-description {
    font-size: 0.85rem;
  }

  .banner-actions {
    margin-top: 0.5rem;
    width: 100%;
  }

  .btn-view,
  .btn-cancel,
  .btn-reactivate {
    flex: 1;
    justify-content: center;
  }
}
</style>
