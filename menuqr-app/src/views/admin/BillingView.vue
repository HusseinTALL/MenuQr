<script setup lang="ts">
/**
 * BillingView - Refined Luxury Edition
 *
 * A premium subscription management experience with editorial design,
 * sophisticated animations, and a refined dark aesthetic.
 */
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  CreditCardOutlined,
  CrownOutlined,
  HistoryOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  StarOutlined,
  FireOutlined,
  GiftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue';
import { useSubscription, FEATURES } from '@/composables/useSubscription';
import { UsageDisplay, PricingPlans, UpgradePrompt } from '@/components/subscription';
import PendingChangesBanner from '@/components/subscription/PendingChangesBanner.vue';
import GracePeriodBanner from '@/components/subscription/GracePeriodBanner.vue';
import DowngradeWarningModal from '@/components/subscription/DowngradeWarningModal.vue';

const route = useRoute();
const router = useRouter();

const {
  subscription,
  currentPlan,
  currentTier,
  tierName,
  isValid,
  isInTrial,
  trialDaysLeft,
  daysUntilRenewal,
  subscriptionStatus,
  trialStatus,
  isLoading,
  error,
  refresh,
  cancelSubscription,
  reactivateSubscription,
  formatPrice,
} = useSubscription();

const activeTab = ref('overview');
const showCancelModal = ref(false);
const cancelReason = ref('');
const isCancelling = ref(false);
const isReactivating = ref(false);
const animationsReady = ref(false);
const heroVisible = ref(false);
const cardsVisible = ref(false);

// Downgrade modal state
const showDowngradeModal = ref(false);
const downgradeTargetPlan = ref('');
const downgradeReason = ref('');
const pendingChangesBannerRef = ref<InstanceType<typeof PendingChangesBanner> | null>(null);

// Trial countdown timer
const trialCountdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 });
let countdownInterval: ReturnType<typeof setInterval> | null = null;

// Billing history mock data
const billingHistory = ref([
  { id: '1', date: new Date(2025, 11, 1), amount: 4900, status: 'paid', invoiceNumber: 'INV-2025-001' },
  { id: '2', date: new Date(2025, 10, 1), amount: 4900, status: 'paid', invoiceNumber: 'INV-2025-002' },
  { id: '3', date: new Date(2025, 9, 1), amount: 4900, status: 'paid', invoiceNumber: 'INV-2025-003' },
]);

// Check for suggested feature/tier from URL params
const suggestedFeature = computed(() => route.query.feature as string | undefined);
const suggestedTier = computed(() => route.query.suggestedTier as string | undefined);

// Tier-specific theming - refined luxury palette
const tierTheme = computed(() => {
  const themes: Record<string, {
    gradient: string;
    accent: string;
    glow: string;
    icon: typeof CrownOutlined;
    label: string;
    badgeGradient: string;
  }> = {
    enterprise: {
      gradient: 'linear-gradient(135deg, #D4AF37 0%, #F4E4BA 50%, #D4AF37 100%)',
      accent: '#D4AF37',
      glow: '0 0 60px rgba(212, 175, 55, 0.3)',
      icon: CrownOutlined,
      label: 'ENTERPRISE',
      badgeGradient: 'linear-gradient(135deg, #D4AF37, #F4E4BA)',
    },
    business: {
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #8B5CF6 100%)',
      accent: '#8B5CF6',
      glow: '0 0 60px rgba(139, 92, 246, 0.3)',
      icon: ThunderboltOutlined,
      label: 'BUSINESS',
      badgeGradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
    },
    professional: {
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #3B82F6 100%)',
      accent: '#3B82F6',
      glow: '0 0 60px rgba(59, 130, 246, 0.3)',
      icon: FireOutlined,
      label: 'PROFESSIONAL',
      badgeGradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
    },
    starter: {
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #10B981 100%)',
      accent: '#10B981',
      glow: '0 0 60px rgba(16, 185, 129, 0.3)',
      icon: RocketOutlined,
      label: 'STARTER',
      badgeGradient: 'linear-gradient(135deg, #10B981, #34D399)',
    },
    free: {
      gradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 50%, #6B7280 100%)',
      accent: '#6B7280',
      glow: '0 0 60px rgba(107, 114, 128, 0.2)',
      icon: GiftOutlined,
      label: 'FREE',
      badgeGradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)',
    },
  };
  return themes[currentTier.value || 'free'] || themes.free;
});

const defaultStatusConfig = {
  color: '#EF4444',
  bgColor: 'rgba(239, 68, 68, 0.1)',
  icon: CloseCircleOutlined,
  label: 'Expiré',
  pulse: false
};

const statusConfig = computed(() => {
  const status = subscriptionStatus.value.status;
  const configs: Record<string, {
    color: string;
    bgColor: string;
    icon: typeof CheckCircleOutlined;
    label: string;
    pulse: boolean;
  }> = {
    active: {
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      icon: CheckCircleOutlined,
      label: 'Actif',
      pulse: true
    },
    trial: {
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      icon: RocketOutlined,
      label: 'Essai',
      pulse: true
    },
    cancelled: {
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      icon: ExclamationCircleOutlined,
      label: 'Annulé',
      pulse: false
    },
    expired: {
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      icon: CloseCircleOutlined,
      label: 'Expiré',
      pulse: false
    },
    past_due: {
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      icon: ExclamationCircleOutlined,
      label: 'Paiement en retard',
      pulse: true
    },
  };
  return configs[status] ?? defaultStatusConfig;
});

// Navigation tabs
const tabs = [
  { key: 'overview', label: 'Aperçu', icon: CreditCardOutlined },
  { key: 'usage', label: 'Utilisation', icon: BarChartOutlined },
  { key: 'history', label: 'Factures', icon: FileTextOutlined },
  { key: 'plans', label: 'Plans', icon: CrownOutlined },
];

// Calculate trial countdown
function updateTrialCountdown() {
  if (!trialStatus.value?.isInTrial || !trialStatus.value?.trialEndDate) {return;}

  const now = new Date().getTime();
  const end = new Date(trialStatus.value.trialEndDate).getTime();
  const diff = end - now;

  if (diff <= 0) {
    trialCountdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    if (countdownInterval) {clearInterval(countdownInterval);}
    return;
  }

  trialCountdown.value = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

onMounted(() => {
  if (suggestedFeature.value || suggestedTier.value) {
    activeTab.value = 'plans';
  }

  // Start countdown timer for trial
  if (trialStatus.value?.isInTrial) {
    updateTrialCountdown();
    countdownInterval = setInterval(updateTrialCountdown, 1000);
  }

  // Staggered entrance animations
  nextTick(() => {
    setTimeout(() => {
      animationsReady.value = true;
    }, 50);
    setTimeout(() => {
      heroVisible.value = true;
    }, 100);
    setTimeout(() => {
      cardsVisible.value = true;
    }, 300);
  });
});

onUnmounted(() => {
  if (countdownInterval) {clearInterval(countdownInterval);}
});

watch(() => route.query, (newQuery) => {
  if (newQuery.feature || newQuery.suggestedTier) {
    activeTab.value = 'plans';
  }
});

async function handleCancelSubscription() {
  if (!cancelReason.value.trim()) {
    message.warning('Veuillez indiquer une raison d\'annulation');
    return;
  }

  isCancelling.value = true;
  try {
    const success = await cancelSubscription(cancelReason.value);
    if (success) {
      message.success('Abonnement annulé. Vous conservez l\'accès jusqu\'à la fin de la période.');
      showCancelModal.value = false;
      cancelReason.value = '';
    } else {
      message.error(error.value || 'Erreur lors de l\'annulation');
    }
  } finally {
    isCancelling.value = false;
  }
}

async function handleReactivate() {
  isReactivating.value = true;
  try {
    const success = await reactivateSubscription();
    if (success) {
      message.success('Abonnement réactivé avec succès');
    } else {
      message.error(error.value || 'Erreur lors de la réactivation');
    }
  } finally {
    isReactivating.value = false;
  }
}

function handlePlanUpgrade() {
  message.info('Redirection vers le paiement...');
}

function handlePlanDowngrade(plan: { slug: string }) {
  downgradeTargetPlan.value = plan.slug;
  showDowngradeModal.value = true;
}

function handleDowngradeConfirmed(data: { scheduled: boolean; effectiveDate: Date }) {
  showDowngradeModal.value = false;
  if (data.scheduled) {
    message.success(`Changement de plan programmé pour le ${data.effectiveDate.toLocaleDateString('fr-FR')}`);
  } else {
    message.success('Changement de plan effectué');
  }
  pendingChangesBannerRef.value?.refresh();
  refresh();
}

function handlePendingChangeCancelled() {
  message.success('Changement de plan annulé');
  refresh();
}

function downloadInvoice(invoice: { invoiceNumber: string }) {
  message.info(`Téléchargement de ${invoice.invoiceNumber}...`);
}

function formatInvoiceDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}
</script>

<template>
  <div class="billing-view">
    <!-- Ambient background -->
    <div class="ambient-bg">
      <div class="ambient-orb orb-1" />
      <div class="ambient-orb orb-2" />
      <div class="noise-overlay" />
    </div>

    <!-- Main Content -->
    <div class="content-wrapper">
      <!-- Premium Hero Section -->
      <header
          class="hero-section"
          :class="{ 'hero-visible': heroVisible }"
      >
        <div class="hero-content">
          <!-- Tier Badge -->
          <div class="tier-badge-wrapper">
            <div
                class="tier-badge"
                :style="{ background: tierTheme.badgeGradient }"
            >
              <component :is="tierTheme.icon" class="tier-badge-icon" />
              <span class="tier-badge-label">{{ tierTheme.label }}</span>
            </div>
          </div>

          <!-- Plan Name -->
          <h1 class="hero-title">
            <span class="title-main">{{ currentPlan?.name || 'Aucun plan' }}</span>
            <span class="title-accent" :style="{ color: tierTheme.accent }">.</span>
          </h1>

          <!-- Subscription Meta -->
          <div class="hero-meta">
            <div
                class="status-indicator"
                :style="{
                '--status-color': statusConfig.color,
                '--status-bg': statusConfig.bgColor
              }"
            >
              <span
                  class="status-dot"
                  :class="{ 'status-pulse': statusConfig.pulse }"
              />
              <span class="status-label">{{ statusConfig.label }}</span>
            </div>

            <span class="meta-divider">·</span>

            <div class="renewal-info" v-if="daysUntilRenewal !== null">
              <CalendarOutlined class="renewal-icon" />
              <span>Renouvellement dans {{ daysUntilRenewal }} jour{{ daysUntilRenewal > 1 ? 's' : '' }}</span>
            </div>
          </div>

          <!-- Price Display -->
          <div class="price-display">
            <span class="price-currency">€</span>
            <span class="price-amount">{{ currentPlan?.pricing?.monthly ? Math.floor(currentPlan.pricing.monthly / 100).toLocaleString('fr-FR') : '—' }}</span>
            <span class="price-period">/mois</span>
          </div>
        </div>

        <!-- Hero Decoration -->
        <div
            class="hero-glow"
            :style="{ boxShadow: tierTheme.glow }"
        />
      </header>

      <!-- Skeleton Loading -->
      <template v-if="isLoading">
        <div class="skeleton-container">
          <div class="skeleton-hero" />
          <div class="skeleton-tabs">
            <div v-for="i in 4" :key="i" class="skeleton-tab" />
          </div>
          <div class="skeleton-grid">
            <div class="skeleton-card skeleton-card-lg" />
            <div class="skeleton-card" />
            <div class="skeleton-card" />
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Banners -->
        <GracePeriodBanner @update-payment="activeTab = 'plans'" />
        <PendingChangesBanner
            ref="pendingChangesBannerRef"
            @cancelled="handlePendingChangeCancelled"
        />

        <!-- Trial Banner - Editorial Style -->
        <div
            v-if="trialStatus?.isInTrial"
            class="trial-banner"
            :class="{
            'trial-urgent': trialStatus.isExpiringSoon,
            'banner-visible': cardsVisible
          }"
        >
          <div class="trial-content">
            <div class="trial-header">
              <div class="trial-icon-wrapper">
                <RocketOutlined class="trial-icon" />
              </div>
              <div class="trial-text">
                <h3 class="trial-title">{{ trialStatus.message }}</h3>
                <p class="trial-subtitle">Passez à un plan payant pour débloquer tout le potentiel.</p>
              </div>
            </div>

            <!-- Countdown -->
            <div class="countdown-display">
              <div class="countdown-unit">
                <span class="countdown-value">{{ String(trialCountdown.days).padStart(2, '0') }}</span>
                <span class="countdown-label">Jours</span>
              </div>
              <span class="countdown-separator">:</span>
              <div class="countdown-unit">
                <span class="countdown-value">{{ String(trialCountdown.hours).padStart(2, '0') }}</span>
                <span class="countdown-label">Heures</span>
              </div>
              <span class="countdown-separator">:</span>
              <div class="countdown-unit">
                <span class="countdown-value">{{ String(trialCountdown.minutes).padStart(2, '0') }}</span>
                <span class="countdown-label">Min</span>
              </div>
              <span class="countdown-separator countdown-seconds">:</span>
              <div class="countdown-unit countdown-seconds">
                <span class="countdown-value">{{ String(trialCountdown.seconds).padStart(2, '0') }}</span>
                <span class="countdown-label">Sec</span>
              </div>
            </div>

            <button
                type="button"
                class="trial-cta"
                @click="activeTab = 'plans'"
            >
              <span>Choisir un plan</span>
              <ArrowRightOutlined class="cta-arrow" />
            </button>
          </div>

          <!-- Progress -->
          <div class="trial-progress">
            <div
                class="trial-progress-fill"
                :style="{ width: `${((14 - (trialDaysLeft || 0)) / 14) * 100}%` }"
            />
          </div>
        </div>

        <!-- Tab Navigation - Editorial Style -->
        <nav
            class="tab-navigation"
            :class="{ 'tabs-visible': cardsVisible }"
        >
          <div class="tab-track">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="tab-item"
                :class="{ 'tab-active': activeTab === tab.key }"
                @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="tab-icon" />
              <span class="tab-label">{{ tab.label }}</span>
              <span
                  v-if="activeTab === tab.key"
                  class="tab-indicator"
                  :style="{ background: tierTheme.accent }"
              />
            </button>
          </div>
        </nav>

        <!-- Tab Content -->
        <div
            class="tab-content"
            :class="{ 'content-visible': cardsVisible }"
        >
          <!-- Overview Tab -->
          <template v-if="activeTab === 'overview'">
            <div class="overview-grid">
              <!-- Main Plan Card -->
              <article class="plan-card glass-card">
                <div class="card-header">
                  <div class="card-title-group">
                    <div
                        class="plan-icon"
                        :style="{ background: tierTheme.gradient }"
                    >
                      <component :is="tierTheme.icon" />
                    </div>
                    <div>
                      <h2 class="card-title">{{ currentPlan?.name || 'Aucun plan' }}</h2>
                      <p class="card-subtitle">Plan {{ tierName }}</p>
                    </div>
                  </div>
                  <div
                      class="plan-status"
                      :style="{
                      color: statusConfig.color,
                      background: statusConfig.bgColor
                    }"
                  >
                    <component :is="statusConfig.icon" />
                    <span>{{ statusConfig.label }}</span>
                  </div>
                </div>

                <!-- Stats Row -->
                <div class="stats-row">
                  <div class="stat-item">
                    <span class="stat-label">Prochaine facturation</span>
                    <span class="stat-value">
                      <template v-if="daysUntilRenewal !== null">
                        {{ daysUntilRenewal }} jour{{ daysUntilRenewal > 1 ? 's' : '' }}
                      </template>
                      <template v-else>—</template>
                    </span>
                  </div>
                  <div class="stat-divider" />
                  <div class="stat-item">
                    <span class="stat-label">Coût mensuel</span>
                    <span class="stat-value">
                      {{ currentPlan ? formatPrice(currentPlan.pricing?.monthly || 0) : '—' }}
                    </span>
                  </div>
                  <div class="stat-divider" />
                  <div class="stat-item stat-highlight">
                    <span class="stat-label">Économie annuelle</span>
                    <span class="stat-value">
                      {{ currentPlan?.pricing ? formatPrice((currentPlan.pricing.monthly * 12) - currentPlan.pricing.yearly) : '—' }}
                    </span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="card-actions">
                  <button
                      type="button"
                      class="btn-primary"
                      :style="{ '--accent': tierTheme.accent }"
                      @click="activeTab = 'plans'"
                  >
                    <CrownOutlined />
                    <span>Changer de plan</span>
                  </button>
                  <button
                      v-if="subscriptionStatus.isCancelled"
                      type="button"
                      class="btn-success"
                      :disabled="isReactivating"
                      @click="handleReactivate"
                  >
                    {{ isReactivating ? 'Réactivation...' : 'Réactiver' }}
                  </button>
                  <button
                      v-if="subscriptionStatus.isActive && !subscriptionStatus.isCancelled"
                      type="button"
                      class="btn-ghost btn-danger"
                      @click="showCancelModal = true"
                  >
                    Annuler l'abonnement
                  </button>
                </div>
              </article>

              <!-- Usage Card -->
              <article class="usage-card glass-card">
                <div class="card-header">
                  <div class="card-title-group">
                    <div class="section-icon usage-icon">
                      <BarChartOutlined />
                    </div>
                    <h3 class="card-title">Utilisation</h3>
                  </div>
                  <button
                      type="button"
                      class="link-btn"
                      @click="activeTab = 'usage'"
                  >
                    <span>Détails</span>
                    <ArrowRightOutlined />
                  </button>
                </div>
                <div class="usage-content">
                  <UsageDisplay variant="compact" :show-upgrade="false" />
                </div>
              </article>

              <!-- Features Card -->
              <article class="features-card glass-card">
                <div class="card-header">
                  <div class="card-title-group">
                    <div class="section-icon features-icon">
                      <CheckCircleOutlined />
                    </div>
                    <h3 class="card-title">Fonctionnalités incluses</h3>
                  </div>
                </div>
                <div class="features-grid">
                  <div
                      v-for="(feature, index) in currentPlan?.displayFeatures || []"
                      :key="feature"
                      class="feature-item"
                      :style="{ '--delay': `${index * 30}ms` }"
                  >
                    <span
                        class="feature-check"
                        :style="{ background: tierTheme.accent }"
                    >
                      <CheckOutlined />
                    </span>
                    <span class="feature-text">{{ feature }}</span>
                  </div>
                </div>
              </article>
            </div>
          </template>

          <!-- Usage Tab -->
          <template v-else-if="activeTab === 'usage'">
            <article class="usage-detailed glass-card">
              <div class="card-header">
                <div class="card-title-group">
                  <div class="section-icon usage-icon">
                    <BarChartOutlined />
                  </div>
                  <div>
                    <h3 class="card-title">Utilisation détaillée</h3>
                    <p class="card-subtitle">Suivez votre consommation en temps réel</p>
                  </div>
                </div>
              </div>
              <div class="usage-detailed-content">
                <UsageDisplay title="" variant="detailed" />
              </div>
            </article>
          </template>

          <!-- History Tab -->
          <template v-else-if="activeTab === 'history'">
            <article class="history-card glass-card">
              <div class="card-header">
                <div class="card-title-group">
                  <div class="section-icon history-icon">
                    <FileTextOutlined />
                  </div>
                  <div>
                    <h3 class="card-title">Historique des factures</h3>
                    <p class="card-subtitle">Consultez et téléchargez vos factures</p>
                  </div>
                </div>
              </div>

              <div class="invoices-list">
                <div
                    v-for="(invoice, index) in billingHistory"
                    :key="invoice.id"
                    class="invoice-row"
                    :style="{ '--delay': `${index * 50}ms` }"
                >
                  <div class="invoice-icon">
                    <FileTextOutlined />
                  </div>
                  <div class="invoice-details">
                    <span class="invoice-number">{{ invoice.invoiceNumber }}</span>
                    <span class="invoice-date">{{ formatInvoiceDate(invoice.date) }}</span>
                  </div>
                  <div class="invoice-amount">
                    <span class="amount-value">{{ formatPrice(invoice.amount) }}</span>
                    <span
                        class="amount-status"
                        :class="invoice.status === 'paid' ? 'status-paid' : 'status-pending'"
                    >
                      {{ invoice.status === 'paid' ? 'Payée' : 'En attente' }}
                    </span>
                  </div>
                  <button
                      type="button"
                      class="download-btn"
                      @click="downloadInvoice(invoice)"
                  >
                    <DownloadOutlined />
                  </button>
                </div>

                <div v-if="billingHistory.length === 0" class="empty-state">
                  <FileTextOutlined class="empty-icon" />
                  <p>Aucune facture pour le moment</p>
                </div>
              </div>
            </article>
          </template>

          <!-- Plans Tab -->
          <template v-else-if="activeTab === 'plans'">
            <UpgradePrompt
                v-if="suggestedFeature || suggestedTier"
                :feature="suggestedFeature as any"
                :suggested-tier="suggestedTier"
                variant="card"
                :show-comparison="true"
                class="upgrade-prompt"
                @upgrade="handlePlanUpgrade"
            />

            <article class="plans-card glass-card">
              <div class="plans-header">
                <h3 class="plans-title">Choisissez votre plan</h3>
                <p class="plans-subtitle">
                  Tous nos plans incluent un essai gratuit de 14 jours.
                  Passez à un plan supérieur à tout moment.
                </p>
              </div>
              <PricingPlans
                  :recommended-tier="suggestedTier"
                  @upgrade="handlePlanUpgrade"
                  @downgrade="handlePlanDowngrade"
              />
            </article>
          </template>
        </div>
      </template>
    </div>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
            v-if="showCancelModal"
            class="modal-overlay"
            @click.self="showCancelModal = false"
        >
          <div class="modal-backdrop" />
          <div class="modal-container glass-card">
            <div class="modal-header modal-header-danger">
              <div class="modal-icon">
                <ExclamationCircleOutlined />
              </div>
              <div>
                <h3 class="modal-title">Annuler l'abonnement</h3>
                <p class="modal-subtitle">Cette action prendra effet à la fin de votre période actuelle</p>
              </div>
            </div>
            <div class="modal-body">
              <p class="modal-text">
                Êtes-vous sûr de vouloir annuler votre abonnement ? Vous conserverez l'accès
                jusqu'à la fin de la période en cours.
              </p>
              <div class="form-group">
                <label class="form-label">Raison de l'annulation</label>
                <textarea
                    v-model="cancelReason"
                    rows="3"
                    class="form-textarea"
                    placeholder="Dites-nous pourquoi vous partez..."
                />
              </div>
            </div>
            <div class="modal-footer">
              <button
                  type="button"
                  class="btn-ghost"
                  @click="showCancelModal = false"
              >
                Garder mon abonnement
              </button>
              <button
                  type="button"
                  class="btn-danger"
                  :disabled="isCancelling"
                  @click="handleCancelSubscription"
              >
                {{ isCancelling ? 'Annulation...' : 'Confirmer l\'annulation' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Downgrade Modal -->
    <DowngradeWarningModal
        :is-open="showDowngradeModal"
        :plan-slug="downgradeTargetPlan"
        :reason="downgradeReason"
        @close="showDowngradeModal = false"
        @confirmed="handleDowngradeConfirmed"
    />
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   DESIGN SYSTEM - Refined Luxury Editorial
   ═══════════════════════════════════════════════════════════════ */

/* Font Import */
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

/* CSS Variables */
.billing-view {
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Dark palette */
  --bg-primary: #eaeaea;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F4F4F5;
  --bg-elevated: #FFFFFF;

  /* Glass effect */
  --glass-bg: rgba(255, 255, 255, 0.8);
  --glass-border: rgba(0, 0, 0, 0.06);
  --glass-highlight: rgba(0, 0, 0, 0.02);

  /* Text colors */
  --text-primary: #18181B;
  --text-secondary: #52525B;
  --text-tertiary: #71717A;
  --text-muted: #A1A1AA;

  /* Accents */
  --accent-gold: #D4AF37;
  --accent-success: #10B981;
  --accent-warning: #F59E0B;
  --accent-danger: #EF4444;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;

  /* Radius */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ═══════════════════════════════════════════════════════════════
   BASE LAYOUT
   ═══════════════════════════════════════════════════════════════ */

.billing-view {
  position: relative;
  min-height: 100vh;
  background: var(--bg-primary);
  font-family: var(--font-body);
  color: var(--text-primary);
  overflow-x: hidden;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

/* ═══════════════════════════════════════════════════════════════
   AMBIENT BACKGROUND
   ═══════════════════════════════════════════════════════════════ */

.ambient-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%);
  top: -200px;
  right: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
  bottom: -150px;
  left: -150px;
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(20px, 10px) scale(1.02); }
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  mix-blend-mode: overlay;
}

/* ═══════════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════════ */

.hero-section {
  position: relative;
  padding: var(--space-3xl) 0;
  margin-bottom: var(--space-2xl);
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero-section.hero-visible {
  opacity: 1;
  transform: translateY(0);
}

.hero-content {
  position: relative;
  z-index: 1;
}

/* Tier Badge */
.tier-badge-wrapper {
  margin-bottom: var(--space-lg);
}

.tier-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md) var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--bg-primary);
}

.tier-badge-icon {
  font-size: 0.9rem;
}

/* Hero Title */
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 8vw, 5.5rem);
  font-weight: 400;
  line-height: 1;
  margin: 0 0 var(--space-lg) 0;
  letter-spacing: -0.02em;
}

.title-main {
  display: inline;
}

.title-accent {
  display: inline;
  font-style: italic;
  margin-left: -0.1em;
}

/* Hero Meta */
.hero-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background: var(--status-bg);
  border-radius: var(--radius-full);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-color);
}

.status-dot.status-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.status-label {
  color: var(--status-color);
  font-weight: 600;
  font-size: 0.85rem;
}

.meta-divider {
  color: var(--text-muted);
}

.renewal-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.renewal-icon {
  opacity: 0.7;
}

/* Price Display */
.price-display {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.price-currency {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-tertiary);
  align-self: flex-start;
  margin-top: 0.5rem;
}

.price-amount {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 400;
  letter-spacing: -0.02em;
}

.price-period {
  font-size: 1.1rem;
  color: var(--text-tertiary);
}

/* Hero Glow */
.hero-glow {
  position: absolute;
  top: 50%;
  right: -100px;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.6;
}

/* ═══════════════════════════════════════════════════════════════
   GLASS CARD BASE
   ═══════════════════════════════════════════════════════════════ */

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-base);
}

.glass-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* ═══════════════════════════════════════════════════════════════
   TRIAL BANNER
   ═══════════════════════════════════════════════════════════════ */

.trial-banner {
  position: relative;
  margin-bottom: var(--space-xl);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-xl);
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.trial-banner.banner-visible {
  opacity: 1;
  transform: translateY(0);
}

.trial-banner.trial-urgent {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%);
  border-color: rgba(245, 158, 11, 0.3);
}

.trial-content {
  padding: var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xl);
  flex-wrap: wrap;
}

.trial-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.trial-icon-wrapper {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.trial-icon {
  font-size: 1.5rem;
  color: var(--text-primary);
}

.trial-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 var(--space-xs) 0;
}

.trial-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Countdown */
.countdown-display {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.countdown-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
}

.countdown-value {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 400;
  line-height: 1;
}

.countdown-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  margin-top: var(--space-xs);
}

.countdown-separator {
  font-size: 1.5rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.countdown-seconds {
  display: none;
}

@media (min-width: 768px) {
  .countdown-seconds {
    display: flex;
  }
}

/* Trial CTA */
.trial-cta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  background: var(--text-primary);
  color: var(--bg-primary);
  font-weight: 600;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
}

.trial-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(255, 255, 255, 0.2);
}

.cta-arrow {
  transition: transform var(--transition-fast);
}

.trial-cta:hover .cta-arrow {
  transform: translateX(4px);
}

/* Trial Progress */
.trial-progress {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
}

.trial-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  transition: width 1s ease-out;
}

.trial-urgent .trial-progress-fill {
  background: linear-gradient(90deg, #F59E0B, #EF4444);
}

/* ═══════════════════════════════════════════════════════════════
   TAB NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

.tab-navigation {
  margin-bottom: var(--space-xl);
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: 100ms;
}

.tab-navigation.tabs-visible {
  opacity: 1;
  transform: translateY(0);
}

.tab-track {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-base);
}

.tab-item:hover {
  color: var(--text-secondary);
  background: var(--glass-highlight);
}

.tab-item.tab-active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.tab-icon {
  font-size: 1.1rem;
  transition: transform var(--transition-fast);
}

.tab-item.tab-active .tab-icon {
  transform: scale(1.1);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  border-radius: var(--radius-full);
  animation: indicatorIn 0.3s ease-out;
}

@keyframes indicatorIn {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 20px;
    opacity: 1;
  }
}

/* ═══════════════════════════════════════════════════════════════
   TAB CONTENT
   ═══════════════════════════════════════════════════════════════ */

.tab-content {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: 200ms;
}

.tab-content.content-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW GRID
   ═══════════════════════════════════════════════════════════════ */

.overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

@media (min-width: 1024px) {
  .overview-grid {
    grid-template-columns: 1.5fr 1fr;
    grid-template-rows: auto auto;
  }

  .plan-card {
    grid-row: span 2;
  }
}

/* Card Headers */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-xl);
  border-bottom: 1px solid var(--glass-border);
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.card-subtitle {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin: var(--space-xs) 0 0 0;
}

/* Plan Icon */
.plan-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--bg-primary);
}

/* Section Icons */
.section-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.usage-icon {
  background: linear-gradient(135deg, #8B5CF6, #A78BFA);
  color: white;
}

.features-icon {
  background: linear-gradient(135deg, #10B981, #34D399);
  color: white;
}

.history-icon {
  background: linear-gradient(135deg, #F59E0B, #FBBF24);
  color: white;
}

/* Plan Status */
.plan-status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
}

/* Stats Row */
.stats-row {
  display: flex;
  align-items: stretch;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--glass-border);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
}

.stat-highlight .stat-value {
  color: var(--accent-success);
}

.stat-divider {
  width: 1px;
  background: var(--glass-border);
  margin: 0 var(--space-lg);
}

/* Card Actions */
.card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  flex-wrap: wrap;
}

/* ═══════════════════════════════════════════════════════════════
   BUTTONS
   ═══════════════════════════════════════════════════════════════ */

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  background: var(--accent, var(--accent-gold));
  color: var(--bg-primary);
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(212, 175, 55, 0.3);
}

.btn-success {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-success);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-success:hover {
  background: rgba(16, 185, 129, 0.25);
}

.btn-ghost {
  padding: var(--space-md) var(--space-lg);
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-ghost:hover {
  background: var(--glass-highlight);
  border-color: rgba(255, 255, 255, 0.15);
}

.btn-ghost.btn-danger {
  color: var(--text-tertiary);
  border-color: transparent;
}

.btn-ghost.btn-danger:hover {
  color: var(--accent-danger);
  background: rgba(239, 68, 68, 0.1);
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  background: var(--accent-danger);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-danger:hover {
  background: #DC2626;
}

.btn-danger:disabled,
.btn-primary:disabled,
.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.link-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.link-btn:hover {
  color: var(--text-primary);
}

.link-btn:hover :deep(svg) {
  transform: translateX(3px);
}

.link-btn :deep(svg) {
  transition: transform var(--transition-fast);
}

/* ═══════════════════════════════════════════════════════════════
   USAGE CARD
   ═══════════════════════════════════════════════════════════════ */

.usage-content {
  padding: var(--space-lg) var(--space-xl);
}

.usage-detailed-content {
  padding: var(--space-xl);
}

/* ═══════════════════════════════════════════════════════════════
   FEATURES GRID
   ═══════════════════════════════════════════════════════════════ */

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--glass-highlight);
  border-radius: var(--radius-md);
  opacity: 0;
  animation: featureIn 0.4s ease forwards;
  animation-delay: var(--delay);
}

@keyframes featureIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-check {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--bg-primary);
  flex-shrink: 0;
}

.feature-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* ═══════════════════════════════════════════════════════════════
   INVOICES LIST
   ═══════════════════════════════════════════════════════════════ */

.invoices-list {
  padding: var(--space-md) 0;
}

.invoice-row {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--glass-border);
  opacity: 0;
  animation: fadeInRow 0.4s ease forwards;
  animation-delay: var(--delay);
  transition: background var(--transition-fast);
}

.invoice-row:hover {
  background: var(--glass-highlight);
}

.invoice-row:last-child {
  border-bottom: none;
}

@keyframes fadeInRow {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.invoice-icon {
  width: 44px;
  height: 44px;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--text-tertiary);
}

.invoice-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.invoice-number {
  font-weight: 600;
}

.invoice-date {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.invoice-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.amount-value {
  font-weight: 600;
}

.amount-status {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.amount-status.status-paid {
  color: var(--accent-success);
}

.amount-status.status-pending {
  color: var(--accent-warning);
}

.download-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.download-btn:hover {
  background: var(--glass-highlight);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.15);
}

.empty-state {
  padding: var(--space-3xl);
  text-align: center;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
  opacity: 0.3;
}

/* ═══════════════════════════════════════════════════════════════
   PLANS SECTION
   ═══════════════════════════════════════════════════════════════ */

.upgrade-prompt {
  margin-bottom: var(--space-xl);
}

.plans-card {
  padding: var(--space-2xl);
}

.plans-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.plans-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 400;
  margin: 0 0 var(--space-md) 0;
}

.plans-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto;
}

/* ═══════════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════════ */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
}

.modal-container {
  position: relative;
  width: 100%;
  max-width: 480px;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-xl);
  border-bottom: 1px solid var(--glass-border);
}

.modal-header-danger .modal-icon {
  width: 48px;
  height: 48px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--accent-danger);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin: var(--space-xs) 0 0 0;
}

.modal-body {
  padding: var(--space-xl);
}

.modal-text {
  color: var(--text-secondary);
  margin: 0 0 var(--space-lg) 0;
  line-height: 1.6;
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: var(--space-sm);
}

.form-textarea {
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color var(--transition-fast);
}

.form-textarea:focus {
  outline: none;
  border-color: var(--accent-danger);
}

.form-textarea::placeholder {
  color: var(--text-muted);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  background: var(--bg-secondary);
  border-top: 1px solid var(--glass-border);
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON LOADING
   ═══════════════════════════════════════════════════════════════ */

.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.skeleton-hero {
  height: 200px;
  background: linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius-xl);
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-tabs {
  display: flex;
  gap: var(--space-sm);
}

.skeleton-tab {
  width: 100px;
  height: 48px;
  background: linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius-md);
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.skeleton-card {
  height: 200px;
  background: linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius-xl);
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-card-lg {
  grid-column: span 2;
  height: 300px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════ */

@media (max-width: 768px) {
  .content-wrapper {
    padding: var(--space-md);
  }

  .hero-section {
    padding: var(--space-xl) 0;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .meta-divider {
    display: none;
  }

  .price-amount {
    font-size: 2.5rem;
  }

  .hero-glow {
    display: none;
  }

  .trial-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .countdown-display {
    width: 100%;
    justify-content: center;
  }

  .trial-cta {
    width: 100%;
    justify-content: center;
  }

  .stats-row {
    flex-direction: column;
    gap: var(--space-md);
  }

  .stat-divider {
    width: 100%;
    height: 1px;
    margin: 0;
  }

  .card-actions {
    flex-direction: column;
  }

  .card-actions .btn-primary,
  .card-actions .btn-success {
    width: 100%;
    justify-content: center;
  }

  .invoice-row {
    flex-wrap: wrap;
  }

  .skeleton-grid {
    grid-template-columns: 1fr;
  }

  .skeleton-card-lg {
    grid-column: span 1;
  }
}
</style>
