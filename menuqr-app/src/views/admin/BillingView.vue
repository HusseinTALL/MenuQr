<script setup lang="ts">
/**
 * BillingView
 *
 * Subscription management page for restaurant owners.
 * Shows current plan, usage, billing history, and upgrade options.
 */
import { ref, computed, onMounted, watch } from 'vue';
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

// Downgrade modal state
const showDowngradeModal = ref(false);
const downgradeTargetPlan = ref('');
const downgradeReason = ref('');
const pendingChangesBannerRef = ref<InstanceType<typeof PendingChangesBanner> | null>(null);

// Check for suggested feature/tier from URL params
const suggestedFeature = computed(() => route.query.feature as string | undefined);
const suggestedTier = computed(() => route.query.suggestedTier as string | undefined);

onMounted(() => {
  if (suggestedFeature.value || suggestedTier.value) {
    activeTab.value = 'plans';
  }
});

watch(() => route.query, (newQuery) => {
  if (newQuery.feature || newQuery.suggestedTier) {
    activeTab.value = 'plans';
  }
});

const defaultStatusConfig = { color: 'text-red-700', bgColor: 'bg-red-100', icon: CloseCircleOutlined, label: 'Expiré' };

const statusConfig = computed(() => {
  const status = subscriptionStatus.value.status;
  const configs: Record<string, { color: string; bgColor: string; icon: typeof CheckCircleOutlined; label: string }> = {
    active: { color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircleOutlined, label: 'Actif' },
    trial: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: RocketOutlined, label: 'Essai' },
    cancelled: { color: 'text-amber-700', bgColor: 'bg-amber-100', icon: ExclamationCircleOutlined, label: 'Annulé' },
    expired: { color: 'text-red-700', bgColor: 'bg-red-100', icon: CloseCircleOutlined, label: 'Expiré' },
    past_due: { color: 'text-red-700', bgColor: 'bg-red-100', icon: ExclamationCircleOutlined, label: 'Paiement en retard' },
  };
  return configs[status] ?? defaultStatusConfig;
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
  // In production, this would redirect to Stripe checkout
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
  // Refresh pending changes banner
  pendingChangesBannerRef.value?.refresh();
  refresh();
}

function handlePendingChangeCancelled() {
  message.success('Changement de plan annulé');
  refresh();
}
</script>

<template>
  <div class="billing-view">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Abonnement & Facturation</h1>
      <p class="mt-1 text-gray-600">
        Gérez votre abonnement, consultez votre utilisation et vos factures.
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>

    <template v-else>
      <!-- Grace period banner -->
      <GracePeriodBanner @update-payment="activeTab = 'plans'" />

      <!-- Pending changes banner -->
      <PendingChangesBanner
        ref="pendingChangesBannerRef"
        @cancelled="handlePendingChangeCancelled"
      />

      <!-- Trial banner -->
      <div
        v-if="trialStatus?.isInTrial"
        class="mb-6 p-4 rounded-lg"
        :class="trialStatus.isExpiringSoon ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'"
      >
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-3">
            <RocketOutlined
              class="text-xl"
              :class="trialStatus.isExpiringSoon ? 'text-amber-600' : 'text-blue-600'"
            />
            <div>
              <p class="font-medium" :class="trialStatus.isExpiringSoon ? 'text-amber-800' : 'text-blue-800'">
                {{ trialStatus.message }}
              </p>
              <p class="text-sm" :class="trialStatus.isExpiringSoon ? 'text-amber-600' : 'text-blue-600'">
                Passez à un plan payant pour continuer à profiter de toutes les fonctionnalités.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            @click="activeTab = 'plans'"
          >
            Choisir un plan
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="flex gap-6">
          <button
            v-for="tab in [
              { key: 'overview', label: 'Aperçu', icon: CreditCardOutlined },
              { key: 'usage', label: 'Utilisation', icon: HistoryOutlined },
              { key: 'plans', label: 'Plans', icon: CrownOutlined },
            ]"
            :key="tab.key"
            type="button"
            class="flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors"
            :class="activeTab === tab.key
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab content -->
      <div class="space-y-6">
        <!-- Overview tab -->
        <template v-if="activeTab === 'overview'">
          <!-- Current plan card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-gray-100">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-3">
                    <CrownOutlined class="text-2xl text-primary-600" />
                    <div>
                      <h2 class="text-xl font-bold text-gray-900">{{ currentPlan?.name || 'Aucun plan' }}</h2>
                      <p class="text-sm text-gray-500">Plan {{ tierName }}</p>
                    </div>
                  </div>
                </div>
                <div
                  class="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5"
                  :class="[statusConfig.bgColor, statusConfig.color]"
                >
                  <component :is="statusConfig.icon" class="text-sm" />
                  {{ statusConfig.label }}
                </div>
              </div>
            </div>

            <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Next billing -->
              <div>
                <p class="text-sm text-gray-500 mb-1">Prochaine facturation</p>
                <p class="text-lg font-semibold text-gray-900">
                  <template v-if="daysUntilRenewal !== null">
                    Dans {{ daysUntilRenewal }} jour{{ daysUntilRenewal > 1 ? 's' : '' }}
                  </template>
                  <template v-else>
                    -
                  </template>
                </p>
              </div>

              <!-- Monthly cost -->
              <div>
                <p class="text-sm text-gray-500 mb-1">Coût mensuel</p>
                <p class="text-lg font-semibold text-gray-900">
                  {{ currentPlan ? formatPrice(currentPlan.pricing?.monthly || 0) : '-' }}
                </p>
              </div>

              <!-- Status -->
              <div>
                <p class="text-sm text-gray-500 mb-1">Statut</p>
                <p class="text-lg font-semibold" :class="isValid ? 'text-green-600' : 'text-red-600'">
                  {{ isValid ? 'Valide' : 'Invalide' }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  @click="activeTab = 'plans'"
                >
                  Changer de plan
                </button>
                <button
                  v-if="subscriptionStatus.isCancelled"
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                  :disabled="isReactivating"
                  @click="handleReactivate"
                >
                  {{ isReactivating ? 'Réactivation...' : 'Réactiver l\'abonnement' }}
                </button>
              </div>
              <button
                v-if="subscriptionStatus.isActive && !subscriptionStatus.isCancelled"
                type="button"
                class="text-sm text-gray-500 hover:text-red-600 transition-colors"
                @click="showCancelModal = true"
              >
                Annuler l'abonnement
              </button>
            </div>
          </div>

          <!-- Quick usage overview -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Utilisation rapide</h3>
              <button
                type="button"
                class="text-sm text-primary-600 hover:text-primary-700 font-medium"
                @click="activeTab = 'usage'"
              >
                Voir tout
              </button>
            </div>
            <UsageDisplay variant="compact" :show-upgrade="false" />
          </div>

          <!-- Features included -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Fonctionnalités incluses</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div
                v-for="feature in currentPlan?.displayFeatures || []"
                :key="feature"
                class="flex items-center gap-2 p-2 bg-green-50 rounded-lg"
              >
                <CheckCircleOutlined class="text-green-600" />
                <span class="text-sm text-green-800">{{ feature }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Usage tab -->
        <template v-else-if="activeTab === 'usage'">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <UsageDisplay title="Utilisation détaillée" variant="detailed" />
          </div>
        </template>

        <!-- Plans tab -->
        <template v-else-if="activeTab === 'plans'">
          <!-- Upgrade prompt if coming from feature gate -->
          <UpgradePrompt
            v-if="suggestedFeature || suggestedTier"
            :feature="suggestedFeature as any"
            :suggested-tier="suggestedTier"
            variant="card"
            :show-comparison="true"
            class="mb-6"
            @upgrade="handlePlanUpgrade"
          />

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-6 text-center">
              Choisissez le plan adapté à vos besoins
            </h3>
            <PricingPlans
              :recommended-tier="suggestedTier"
              @upgrade="handlePlanUpgrade"
              @downgrade="handlePlanDowngrade"
            />
          </div>
        </template>
      </div>
    </template>

    <!-- Cancel subscription modal -->
    <teleport to="body">
      <div
        v-if="showCancelModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="showCancelModal = false"
      >
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div class="p-6 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">Annuler l'abonnement</h3>
          </div>
          <div class="p-6 space-y-4">
            <p class="text-gray-600">
              Êtes-vous sûr de vouloir annuler votre abonnement ? Vous conserverez l'accès jusqu'à la fin de la période en cours.
            </p>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Raison de l'annulation
              </label>
              <textarea
                v-model="cancelReason"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Dites-nous pourquoi vous partez..."
              />
            </div>
          </div>
          <div class="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              @click="showCancelModal = false"
            >
              Garder mon abonnement
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              :disabled="isCancelling"
              @click="handleCancelSubscription"
            >
              {{ isCancelling ? 'Annulation...' : 'Confirmer l\'annulation' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Downgrade warning modal -->
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
.billing-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}
</style>
