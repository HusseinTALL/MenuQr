<script setup lang="ts">
/**
 * PricingPlans Component - Premium Redesign
 *
 * Bold, vibrant pricing cards with wider layouts and stronger colors.
 */
import { computed, onMounted, ref } from 'vue';
import { useSubscription } from '@/composables/useSubscription';
import type { SubscriptionPlan } from '@/services/api';
import {
  GiftOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  CrownOutlined,
  CheckOutlined,
  StarFilled,
} from '@ant-design/icons-vue';

const props = withDefaults(
  defineProps<{
    showTiers?: string[];
    recommendedTier?: string;
    showFeatures?: boolean;
    compact?: boolean;
  }>(),
  {
    showFeatures: true,
    compact: false,
  }
);

const emit = defineEmits<{
  (e: 'select-plan', plan: SubscriptionPlan): void;
  (e: 'upgrade', plan: SubscriptionPlan): void;
  (e: 'downgrade', plan: SubscriptionPlan): void;
}>();

const {
  plans,
  currentTier,
  isLoading,
  fetchPlans,
  formatPrice,
  TIER_HIERARCHY,
} = useSubscription();

const billingPeriod = ref<'monthly' | 'yearly'>('monthly');
const selectedPlan = ref<string | null>(null);
const isChangingPlan = ref(false);

onMounted(async () => {
  await fetchPlans();
});

const displayPlans = computed(() => {
  let filtered = plans.value;
  if (props.showTiers && props.showTiers.length > 0) {
    filtered = filtered.filter(p => props.showTiers!.includes(p.tier));
  }
  return filtered.sort((a, b) => {
    const aLevel = TIER_HIERARCHY[a.tier] ?? 0;
    const bLevel = TIER_HIERARCHY[b.tier] ?? 0;
    return aLevel - bLevel;
  });
});

function isCurrentPlan(plan: SubscriptionPlan): boolean {
  return plan.tier === currentTier.value;
}

function isUpgrade(plan: SubscriptionPlan): boolean {
  const currentLevel = TIER_HIERARCHY[currentTier.value] ?? 0;
  const planLevel = TIER_HIERARCHY[plan.tier] ?? 0;
  return planLevel > currentLevel;
}

function _isDowngrade(plan: SubscriptionPlan): boolean {
  const currentLevel = TIER_HIERARCHY[currentTier.value] ?? 0;
  const planLevel = TIER_HIERARCHY[plan.tier] ?? 0;
  return planLevel < currentLevel;
}

function getPrice(plan: SubscriptionPlan): number {
  return billingPeriod.value === 'monthly'
    ? plan.pricing.monthly
    : Math.round(plan.pricing.yearly / 12);
}

function getAnnualPrice(plan: SubscriptionPlan): string {
  return formatPrice(plan.pricing.yearly);
}

function _getSavings(plan: SubscriptionPlan): number {
  return plan.pricing.yearlySavings;
}

async function handleSelectPlan(plan: SubscriptionPlan) {
  if (isCurrentPlan(plan)) {return;}

  selectedPlan.value = plan.id;
  emit('select-plan', plan);

  if (isUpgrade(plan)) {
    emit('upgrade', plan);
  } else {
    emit('downgrade', plan);
  }
}

// Tier-specific styling with VIBRANT colors
const tierConfig: Record<string, {
  icon: typeof GiftOutlined;
  gradient: string;
  solidBg: string;
  lightBg: string;
  textColor: string;
  borderColor: string;
  buttonBg: string;
  buttonHover: string;
  checkColor: string;
  glowColor: string;
}> = {
  free: {
    icon: GiftOutlined,
    gradient: 'linear-gradient(135deg, #64748B 0%, #94A3B8 100%)',
    solidBg: '#64748B',
    lightBg: 'rgba(100, 116, 139, 0.08)',
    textColor: '#475569',
    borderColor: '#CBD5E1',
    buttonBg: '#64748B',
    buttonHover: '#475569',
    checkColor: '#64748B',
    glowColor: 'rgba(100, 116, 139, 0.3)',
  },
  starter: {
    icon: ThunderboltOutlined,
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    solidBg: '#10B981',
    lightBg: 'rgba(16, 185, 129, 0.08)',
    textColor: '#059669',
    borderColor: '#6EE7B7',
    buttonBg: '#10B981',
    buttonHover: '#059669',
    checkColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  professional: {
    icon: SafetyCertificateOutlined,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
    solidBg: '#3B82F6',
    lightBg: 'rgba(59, 130, 246, 0.08)',
    textColor: '#2563EB',
    borderColor: '#93C5FD',
    buttonBg: '#3B82F6',
    buttonHover: '#2563EB',
    checkColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
  },
  business: {
    icon: BankOutlined,
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
    solidBg: '#8B5CF6',
    lightBg: 'rgba(139, 92, 246, 0.08)',
    textColor: '#7C3AED',
    borderColor: '#C4B5FD',
    buttonBg: '#8B5CF6',
    buttonHover: '#7C3AED',
    checkColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  enterprise: {
    icon: CrownOutlined,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    solidBg: '#F59E0B',
    lightBg: 'rgba(245, 158, 11, 0.08)',
    textColor: '#D97706',
    borderColor: '#FCD34D',
    buttonBg: '#F59E0B',
    buttonHover: '#D97706',
    checkColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
};

function getConfig(tier: string) {
  return tierConfig[tier] || tierConfig.starter;
}
</script>

<template>
  <div class="pricing-plans">
    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner" />
    </div>

    <template v-else>
      <!-- Billing Toggle -->
      <div class="billing-toggle-wrapper">
        <div class="billing-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: billingPeriod === 'monthly' }"
            @click="billingPeriod = 'monthly'"
          >
            Mensuel
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: billingPeriod === 'yearly' }"
            @click="billingPeriod = 'yearly'"
          >
            Annuel
            <span class="savings-badge">-20%</span>
          </button>
        </div>
      </div>

      <!-- Plans Grid -->
      <div class="plans-grid" :class="{ compact: compact }">
        <article
          v-for="(plan, index) in displayPlans"
          :key="plan.id"
          class="plan-card"
          :class="{
            'plan-current': isCurrentPlan(plan),
            'plan-popular': (plan.isPopular || plan.tier === recommendedTier) && !isCurrentPlan(plan),
          }"
          :style="{
            '--card-gradient': getConfig(plan.tier).gradient,
            '--card-solid': getConfig(plan.tier).solidBg,
            '--card-light-bg': getConfig(plan.tier).lightBg,
            '--card-text': getConfig(plan.tier).textColor,
            '--card-border': getConfig(plan.tier).borderColor,
            '--card-button': getConfig(plan.tier).buttonBg,
            '--card-button-hover': getConfig(plan.tier).buttonHover,
            '--card-check': getConfig(plan.tier).checkColor,
            '--card-glow': getConfig(plan.tier).glowColor,
            '--card-index': index,
          }"
        >
          <!-- Badges -->
          <div v-if="isCurrentPlan(plan)" class="plan-badge badge-current">
            <StarFilled />
            Plan actuel
          </div>
          <div v-else-if="plan.isPopular || plan.tier === recommendedTier" class="plan-badge badge-popular">
            <StarFilled />
            Populaire
          </div>

          <!-- Header -->
          <div class="plan-header">
            <div class="plan-icon-wrapper">
              <component :is="getConfig(plan.tier).icon" class="plan-icon" />
            </div>
            <h3 class="plan-name">{{ plan.name }}</h3>
            <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>
          </div>

          <!-- Pricing -->
          <div class="plan-pricing">
            <div class="price-main">
              <span class="price-amount">{{ getPrice(plan).toLocaleString('fr-FR') }}</span>
              <div class="price-meta">
                <span class="price-currency">XOF</span>
                <span class="price-period">/ mois</span>
              </div>
            </div>
            <p v-if="billingPeriod === 'yearly'" class="price-annual">
              {{ getAnnualPrice(plan) }} / an
            </p>
            <p v-if="plan.trialDays > 0" class="price-trial">
              {{ plan.trialDays }} jours d'essai gratuit
            </p>
          </div>

          <!-- Features -->
          <ul v-if="showFeatures" class="plan-features">
            <li
              v-for="(feature, fIndex) in plan.displayFeatures"
              :key="feature"
              class="feature-item"
              :style="{ '--feature-index': fIndex }"
            >
              <span class="feature-check">
                <CheckOutlined />
              </span>
              <span class="feature-text">{{ feature }}</span>
            </li>
          </ul>

          <!-- CTA -->
          <div class="plan-cta">
            <button
              v-if="isCurrentPlan(plan)"
              type="button"
              disabled
              class="cta-btn cta-current"
            >
              Plan actuel
            </button>
            <button
              v-else-if="isUpgrade(plan)"
              type="button"
              class="cta-btn cta-upgrade"
              :disabled="isChangingPlan"
              @click="handleSelectPlan(plan)"
            >
              <span v-if="isChangingPlan && selectedPlan === plan.id">Mise à niveau...</span>
              <span v-else>Passer à {{ plan.name }}</span>
            </button>
            <button
              v-else
              type="button"
              class="cta-btn cta-downgrade"
              :disabled="isChangingPlan"
              @click="handleSelectPlan(plan)"
            >
              <span v-if="isChangingPlan && selectedPlan === plan.id">Changement...</span>
              <span v-else>Rétrograder</span>
            </button>
          </div>
        </article>
      </div>

      <!-- Enterprise CTA -->
      <div v-if="!compact" class="enterprise-cta">
        <p>
          Besoin d'une solution sur mesure ?
          <a href="mailto:entreprise@menuqr.fr">Contactez notre équipe commerciale</a>
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pricing-plans {
  width: 100%;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Loading */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 4rem 0;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #E5E7EB;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Billing Toggle */
.billing-toggle-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 3rem;
}

.billing-toggle {
  display: inline-flex;
  padding: 6px;
  background: #F3F4F6;
  border-radius: 16px;
  gap: 4px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  color: #374151;
}

.toggle-btn.active {
  background: white;
  color: #111827;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.savings-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 20px;
}

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.plans-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

/* Plan Card */
.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: white;
  border: 2px solid #E5E7EB;
  border-radius: 24px;
  padding: 32px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: cardIn 0.5s ease-out forwards;
  animation-delay: calc(var(--card-index) * 80ms);
  opacity: 0;
  transform: translateY(20px);
}

@keyframes cardIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.plan-card:hover {
  border-color: var(--card-border);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px var(--card-glow);
}

.plan-card.plan-current {
  border-color: var(--card-solid);
  background: var(--card-light-bg);
}

.plan-card.plan-popular {
  border-color: var(--card-solid);
  box-shadow: 0 8px 30px -8px var(--card-glow);
}

/* Badges */
.plan-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 20px;
  white-space: nowrap;
}

.badge-current {
  background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.badge-popular {
  background: var(--card-gradient);
  color: white;
  box-shadow: 0 4px 12px var(--card-glow);
}

/* Plan Header */
.plan-header {
  text-align: center;
  margin-bottom: 24px;
}

.plan-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: var(--card-gradient);
  border-radius: 20px;
  margin-bottom: 16px;
  box-shadow: 0 8px 20px -4px var(--card-glow);
}

.plan-icon {
  font-size: 28px;
  color: white;
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.plan-description {
  font-size: 0.9rem;
  color: #6B7280;
  margin: 0;
  line-height: 1.5;
}

/* Pricing */
.plan-pricing {
  text-align: center;
  padding: 24px 0;
  border-top: 1px solid #F3F4F6;
  border-bottom: 1px solid #F3F4F6;
  margin-bottom: 24px;
}

.price-main {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
}

.price-amount {
  font-size: 3rem;
  font-weight: 800;
  color: #111827;
  line-height: 1;
  letter-spacing: -0.02em;
}

.price-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 8px;
}

.price-currency {
  font-size: 0.85rem;
  font-weight: 700;
  color: #9CA3AF;
}

.price-period {
  font-size: 0.9rem;
  color: #6B7280;
}

.price-annual {
  font-size: 0.85rem;
  color: #6B7280;
  margin: 8px 0 0 0;
}

.price-trial {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 14px;
  background: var(--card-light-bg);
  color: var(--card-text);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 20px;
}

/* Features */
.plan-features {
  flex: 1;
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  animation: featureIn 0.3s ease-out forwards;
  animation-delay: calc(var(--feature-index) * 50ms + 0.3s);
  opacity: 0;
}

@keyframes featureIn {
  to { opacity: 1; }
}

.feature-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: var(--card-light-bg);
  color: var(--card-check);
  border-radius: 6px;
  flex-shrink: 0;
  font-size: 12px;
}

.feature-text {
  font-size: 0.9rem;
  color: #4B5563;
  line-height: 1.4;
}

/* CTA Buttons */
.plan-cta {
  margin-top: auto;
}

.cta-btn {
  width: 100%;
  padding: 14px 24px;
  font-size: 0.95rem;
  font-weight: 700;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cta-current {
  background: #F3F4F6;
  color: #9CA3AF;
  cursor: not-allowed;
}

.cta-upgrade {
  background: var(--card-gradient);
  color: white;
  box-shadow: 0 4px 14px -2px var(--card-glow);
}

.cta-upgrade:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -4px var(--card-glow);
}

.cta-upgrade:active:not(:disabled) {
  transform: translateY(0);
}

.cta-downgrade {
  background: #F3F4F6;
  color: #6B7280;
}

.cta-downgrade:hover:not(:disabled) {
  background: #E5E7EB;
  color: #374151;
}

.cta-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Enterprise CTA */
.enterprise-cta {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #E5E7EB;
}

.enterprise-cta p {
  font-size: 1rem;
  color: #6B7280;
  margin: 0;
}

.enterprise-cta a {
  color: #3B82F6;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.enterprise-cta a:hover {
  color: #2563EB;
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 1200px) {
  .plans-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
  }

  .plan-card {
    padding: 24px;
  }

  .price-amount {
    font-size: 2.5rem;
  }
}
</style>
