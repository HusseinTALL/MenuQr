<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { api } from '@/services/api';
import type { LoyaltyStats, CustomerWithLoyalty, LoyaltyTier } from '@/types/loyalty';
import { TIER_CONFIG } from '@/types/loyalty';
import { message } from 'ant-design-vue';
import { useSubscription, FEATURES } from '@/composables/useSubscription';
import { FeatureGate } from '@/components/subscription';

const { hasFeature } = useSubscription();
import type { TableColumnsType } from 'ant-design-vue';
import {
  SearchOutlined,
  ReloadOutlined,
  TrophyOutlined,
  TeamOutlined,
  StarOutlined,
  GiftOutlined,
  SettingOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';

const loading = ref(true);
const isRefreshing = ref(false);
const error = ref<string | null>(null);
const stats = ref<LoyaltyStats | null>(null);
const customers = ref<CustomerWithLoyalty[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const search = ref('');
const selectedTier = ref<string>('');
const sortBy = ref('totalPoints');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Modal states
const showAdjustModal = ref(false);
const showBonusModal = ref(false);
const selectedCustomer = ref<CustomerWithLoyalty | null>(null);
const adjustPoints = ref(0);
const adjustReason = ref('');
const bonusPoints = ref(100);
const bonusDescription = ref('');
const actionLoading = ref(false);

const tierOptions = [
  { value: '', label: 'Tous les paliers' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'argent', label: 'Argent' },
  { value: 'or', label: 'Or' },
  { value: 'platine', label: 'Platine' },
];

const tierVisuals: Record<string, { gradient: string; icon: string; benefits: string[] }> = {
  bronze: {
    gradient: 'from-amber-600 to-amber-800',
    icon: '🥉',
    benefits: ['1 point / 100 FCFA', 'Offres exclusives'],
  },
  argent: {
    gradient: 'from-slate-400 to-slate-600',
    icon: '🥈',
    benefits: ['1.5x points', '-5% sur commandes', 'Acces prioritaire'],
  },
  or: {
    gradient: 'from-yellow-400 to-amber-500',
    icon: '🥇',
    benefits: ['2x points', '-10% sur commandes', 'Livraison gratuite'],
  },
  platine: {
    gradient: 'from-purple-400 via-pink-400 to-purple-600',
    icon: '💎',
    benefits: ['3x points', '-15% sur commandes', 'VIP events', 'Cadeaux exclusifs'],
  },
};

const totalActivePoints = computed(() => {
  if (!stats.value) {return 0;}
  return stats.value.totalPointsIssued + stats.value.totalBonusPoints -
         stats.value.totalPointsRedeemed - stats.value.totalPointsExpired;
});

const tierDistributionPercentages = computed(() => {
  if (!stats.value || stats.value.totalActiveMembers === 0) {return {};}
  const result: Record<string, number> = {};
  for (const tier of Object.keys(TIER_CONFIG)) {
    result[tier] = (stats.value.tierDistribution[tier as LoyaltyTier] / stats.value.totalActiveMembers) * 100;
  }
  return result;
});

// Table columns
const columns = computed<TableColumnsType>(() => [
  {
    title: 'Client',
    key: 'client',
    customRender: ({ record }: { record: CustomerWithLoyalty }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', {
          class: `flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(record.name)}`,
        }, getInitials(record.name)),
        h('div', null, [
          h('div', { class: 'font-medium text-gray-900' }, record.name || 'Client'),
          h('div', { class: 'text-sm text-gray-500' }, record.phone),
        ]),
      ]);
    },
  },
  {
    title: 'Points',
    key: 'points',
    sorter: true,
    sortOrder: sortBy.value === 'totalPoints' ? (sortOrder.value === 'desc' ? 'descend' : 'ascend') : null,
    customRender: ({ record }: { record: CustomerWithLoyalty }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(StarOutlined, { class: 'text-amber-500' }),
        h('span', { class: 'font-semibold text-gray-900 tabular-nums' },
          formatNumber(record.loyalty?.totalPoints || 0)),
      ]);
    },
  },
  {
    title: 'Palier',
    key: 'tier',
    customRender: ({ record }: { record: CustomerWithLoyalty }) => {
      const tier = record.loyalty?.currentTier || 'bronze';
      return h('span', {
        class: 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white',
        style: { backgroundColor: getTierColor(tier) },
      }, [tierVisuals[tier]?.icon, ' ', getTierName(tier)]);
    },
  },
  {
    title: 'Derniere commande',
    key: 'lastOrder',
    sorter: true,
    sortOrder: sortBy.value === 'lastOrderAt' ? (sortOrder.value === 'desc' ? 'descend' : 'ascend') : null,
    customRender: ({ record }: { record: CustomerWithLoyalty }) => {
      return h('span', { class: 'text-gray-600' }, formatDate(record.lastOrderAt));
    },
  },
  {
    title: 'Total depense',
    key: 'totalSpent',
    customRender: ({ record }: { record: CustomerWithLoyalty }) => {
      return h('span', { class: 'font-medium text-gray-900 tabular-nums' },
        `${formatNumber(record.totalSpent)} FCFA`);
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    align: 'right',
    customRender: ({ record }: { record: CustomerWithLoyalty }) => {
      return h('div', { class: 'flex items-center justify-end gap-1' }, [
        h('a-tooltip', { title: 'Ajuster les points' }, {
          default: () => h('a-button', {
            type: 'text',
            onClick: () => openAdjustModal(record),
          }, { icon: () => h(SettingOutlined) }),
        }),
        h('a-tooltip', { title: 'Ajouter des points bonus' }, {
          default: () => h('a-button', {
            type: 'text',
            onClick: () => openBonusModal(record),
          }, { icon: () => h(GiftOutlined, { class: 'text-amber-500' }) }),
        }),
      ]);
    },
  },
]);

async function fetchStats() {
  try {
    const response = await api.getLoyaltyStats();
    if (response.success && response.data) {
      stats.value = response.data;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

async function fetchCustomers() {
  try {
    loading.value = true;
    const response = await api.getLoyaltyCustomers({
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      tier: selectedTier.value || undefined,
      search: search.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    if (response.success && response.data) {
      customers.value = response.data.customers;
      pagination.value.total = response.data.pagination.total;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
}

async function refreshData() {
  isRefreshing.value = true;
  await Promise.all([fetchStats(), fetchCustomers()]);
  isRefreshing.value = false;
}

function handleSearch() {
  pagination.value.current = 1;
  fetchCustomers();
}

function handleTierChange() {
  pagination.value.current = 1;
  fetchCustomers();
}

function handleTableChange(pag: { current?: number; pageSize?: number }, _filters: unknown, sorter: { field?: string; order?: string }) {
  if (pag.current) {pagination.value.current = pag.current;}
  if (pag.pageSize) {pagination.value.pageSize = pag.pageSize;}

  if (sorter.field) {
    sortBy.value = sorter.field === 'points' ? 'totalPoints' : sorter.field === 'lastOrder' ? 'lastOrderAt' : sorter.field;
    sortOrder.value = sorter.order === 'ascend' ? 'asc' : 'desc';
  }
  fetchCustomers();
}

function openAdjustModal(customer: CustomerWithLoyalty) {
  selectedCustomer.value = customer;
  adjustPoints.value = 0;
  adjustReason.value = '';
  showAdjustModal.value = true;
}

function openBonusModal(customer: CustomerWithLoyalty) {
  selectedCustomer.value = customer;
  bonusPoints.value = 100;
  bonusDescription.value = '';
  showBonusModal.value = true;
}

async function handleAdjust() {
  if (!selectedCustomer.value || adjustPoints.value === 0 || !adjustReason.value.trim()) {
    message.error('Veuillez remplir tous les champs');
    return;
  }

  try {
    actionLoading.value = true;
    await api.adjustCustomerPoints(selectedCustomer.value._id, adjustPoints.value, adjustReason.value);
    showAdjustModal.value = false;
    message.success('Points ajustes avec succes');
    fetchCustomers();
    fetchStats();
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : 'Erreur');
  } finally {
    actionLoading.value = false;
  }
}

async function handleBonus() {
  if (!selectedCustomer.value || bonusPoints.value <= 0 || !bonusDescription.value.trim()) {
    message.error('Veuillez remplir tous les champs');
    return;
  }

  try {
    actionLoading.value = true;
    await api.addCustomerBonusPoints(selectedCustomer.value._id, bonusPoints.value, bonusDescription.value);
    showBonusModal.value = false;
    message.success('Points bonus ajoutes');
    fetchCustomers();
    fetchStats();
  } catch (err: unknown) {
    message.error(err instanceof Error ? err.message : 'Erreur');
  } finally {
    actionLoading.value = false;
  }
}

function getTierColor(tier: LoyaltyTier) {
  return TIER_CONFIG[tier]?.color || '#CD7F32';
}

function getTierName(tier: LoyaltyTier) {
  return TIER_CONFIG[tier]?.name || 'Bronze';
}

function formatNumber(num: number) {
  return num.toLocaleString('fr-FR');
}

function formatDate(dateStr?: string) {
  if (!dateStr) {return '-';}
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name?: string) {
  if (!name) {return '?';}
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name?: string) {
  if (!name) {return 'bg-slate-400';}
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500',
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500', 'bg-emerald-500', 'bg-green-500', 'bg-lime-500',
    'bg-yellow-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

onMounted(() => {
  fetchStats();
  fetchCustomers();
});
</script>

<template>
  <FeatureGate :feature="FEATURES.LOYALTY_PROGRAM" :show-upgrade="true">
    <div class="loyalty-view space-y-6">
      <!-- Hero Header -->
      <a-card class="header-card" :bordered="false">
      <div class="header-gradient">
        <!-- Background decorations -->
        <div class="header-decoration"></div>
        <div class="header-orb orb-1"></div>
        <div class="header-orb orb-2"></div>

        <div class="header-content">
          <div class="header-top">
            <div class="header-title-section">
              <div class="header-icon">
                <TrophyOutlined />
              </div>
              <div>
                <h1 class="header-title">Programme Fidelite</h1>
                <p class="header-subtitle">Recompensez vos clients les plus fideles</p>
              </div>
            </div>

            <a-button
              type="text"
              class="refresh-button"
              :loading="isRefreshing"
              @click="refreshData"
            >
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </div>

          <!-- Stats Grid -->
          <div v-if="stats" class="stats-grid">
            <div class="stat-card">
              <div class="stat-header">
                <div class="stat-value">{{ formatNumber(stats.totalActiveMembers) }}</div>
                <div class="stat-icon-wrapper">
                  <TeamOutlined />
                </div>
              </div>
              <div class="stat-label">Membres actifs</div>
            </div>

            <div class="stat-card">
              <div class="stat-header">
                <div class="stat-value">{{ formatNumber(totalActivePoints) }}</div>
                <div class="stat-icon-wrapper gold">
                  <StarOutlined />
                </div>
              </div>
              <div class="stat-label">Points en circulation</div>
            </div>

            <div class="stat-card">
              <div class="stat-header">
                <div class="stat-value emerald">{{ formatNumber(stats.totalPointsIssued) }}</div>
                <div class="stat-icon-wrapper emerald">
                  <PlusOutlined />
                </div>
              </div>
              <div class="stat-label">Points distribues</div>
            </div>

            <div class="stat-card">
              <div class="stat-header">
                <div class="stat-value rose">{{ formatNumber(stats.totalPointsRedeemed) }}</div>
                <div class="stat-icon-wrapper rose">
                  <GiftOutlined />
                </div>
              </div>
              <div class="stat-label">Points echanges</div>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- Tier Cards Section -->
    <div class="tier-section">
      <h2 class="section-title">Paliers et Avantages</h2>
      <a-row :gutter="[16, 16]">
        <a-col v-for="(config, tier) in TIER_CONFIG" :key="tier" :xs="24" :sm="12" :md="12" :lg="6">
          <a-card class="tier-card" :bordered="false">
            <div :class="['tier-accent', tierVisuals[tier]?.gradient]"></div>

            <div class="tier-header">
              <span class="tier-icon">{{ tierVisuals[tier]?.icon }}</span>
              <span
                v-if="stats"
                class="tier-count"
                :style="{ color: config.color }"
              >
                {{ stats.tierDistribution[tier as LoyaltyTier] || 0 }}
              </span>
            </div>

            <h3 class="tier-name" :style="{ color: config.color }">{{ config.name }}</h3>
            <p class="tier-requirement">{{ formatNumber(config.minPoints) }}+ points</p>

            <ul class="tier-benefits">
              <li v-for="(benefit, idx) in tierVisuals[tier]?.benefits" :key="idx">
                <svg class="benefit-check" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ benefit }}
              </li>
            </ul>

            <a-progress
              v-if="stats && stats.totalActiveMembers > 0"
              :percent="tierDistributionPercentages[tier] || 0"
              :show-info="false"
              :stroke-color="config.color"
              size="small"
              class="tier-progress"
            />
            <p class="tier-percentage">{{ (tierDistributionPercentages[tier] || 0).toFixed(1) }}%</p>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- Distribution Bar -->
    <a-card v-if="stats" :bordered="false" class="distribution-card">
      <div class="distribution-header">
        <h3>Repartition des membres</h3>
        <span>{{ formatNumber(stats.totalActiveMembers) }} membres</span>
      </div>

      <div class="distribution-bar">
        <div
          v-for="(config, tier) in TIER_CONFIG"
          :key="tier"
          class="distribution-segment"
          :style="{
            width: `${tierDistributionPercentages[tier] || 25}%`,
            backgroundColor: config.color,
            minWidth: stats.tierDistribution[tier as LoyaltyTier] > 0 ? '3rem' : '0',
          }"
          :title="`${config.name}: ${stats.tierDistribution[tier as LoyaltyTier]} membres`"
        >
          <span v-if="stats.tierDistribution[tier as LoyaltyTier] > 0">
            {{ stats.tierDistribution[tier as LoyaltyTier] }}
          </span>
        </div>
      </div>

      <div class="distribution-legend">
        <div v-for="(config, tier) in TIER_CONFIG" :key="tier" class="legend-item">
          <div class="legend-dot" :style="{ backgroundColor: config.color }"></div>
          <span>{{ config.name }}</span>
        </div>
      </div>
    </a-card>

    <!-- Filters Bar -->
    <a-card :bordered="false" class="filters-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :lg="10">
          <a-input
            v-model:value="search"
            placeholder="Rechercher un client..."
            size="large"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="8" :lg="6">
          <a-select
            v-model:value="selectedTier"
            placeholder="Tous les paliers"
            size="large"
            style="width: 100%"
            @change="handleTierChange"
          >
            <a-select-option v-for="opt in tierOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="4" :lg="4">
          <a-button type="primary" size="large" block @click="handleSearch">
            Rechercher
          </a-button>
        </a-col>
      </a-row>
    </a-card>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Error State -->
    <a-result
      v-else-if="error"
      status="error"
      :title="error"
      sub-title="Impossible de charger les donnees"
    >
      <template #extra>
        <a-button type="primary" @click="fetchCustomers">Reessayer</a-button>
      </template>
    </a-result>

    <!-- Empty State -->
    <a-card v-else-if="customers.length === 0" :bordered="false" class="empty-card">
      <a-empty :description="search || selectedTier ? 'Aucun resultat' : 'Aucun client trouve'">
        <template #image>
          <div class="empty-icon">👥</div>
        </template>
        <p class="empty-description">
          {{ search || selectedTier ? 'Essayez de modifier vos filtres' : 'Les clients apparaitront ici une fois inscrits au programme' }}
        </p>
      </a-empty>
    </a-card>

    <!-- Customers Table -->
    <a-card v-else :bordered="false" class="table-card">
      <a-table
        :columns="columns"
        :data-source="customers"
        :row-key="(r: CustomerWithLoyalty) => r._id"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} clients`,
        }"
        :loading="loading"
        @change="handleTableChange"
      />
    </a-card>

    <!-- Adjust Points Modal -->
    <a-modal
      v-model:open="showAdjustModal"
      title="Ajuster les points"
      :footer="null"
      :width="420"
      @cancel="showAdjustModal = false"
    >
      <div class="modal-content">
        <div class="modal-icon adjust">
          <SettingOutlined />
        </div>
        <p class="modal-customer">{{ selectedCustomer?.name || selectedCustomer?.phone }}</p>

        <a-form layout="vertical" class="modal-form">
          <a-form-item label="Points (+/-)">
            <a-input-number
              v-model:value="adjustPoints"
              placeholder="Ex: 500 ou -200"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item label="Raison">
            <a-input
              v-model:value="adjustReason"
              placeholder="Ex: Correction erreur commande"
            />
          </a-form-item>
        </a-form>

        <div class="modal-actions">
          <a-button size="large" @click="showAdjustModal = false">Annuler</a-button>
          <a-button
            type="primary"
            size="large"
            :loading="actionLoading"
            :disabled="adjustPoints === 0 || !adjustReason.trim()"
            @click="handleAdjust"
          >
            Confirmer
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Bonus Points Modal -->
    <a-modal
      v-model:open="showBonusModal"
      title="Ajouter des points bonus"
      :footer="null"
      :width="420"
      @cancel="showBonusModal = false"
    >
      <div class="modal-content">
        <div class="modal-icon bonus">
          <GiftOutlined />
        </div>
        <p class="modal-customer">{{ selectedCustomer?.name || selectedCustomer?.phone }}</p>

        <a-form layout="vertical" class="modal-form">
          <a-form-item label="Points bonus">
            <a-input-number
              v-model:value="bonusPoints"
              :min="1"
              placeholder="Ex: 500"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item label="Description">
            <a-input
              v-model:value="bonusDescription"
              placeholder="Ex: Bonus fidelite anniversaire"
            />
          </a-form-item>
        </a-form>

        <div class="modal-actions">
          <a-button size="large" @click="showBonusModal = false">Annuler</a-button>
          <a-button
            type="primary"
            size="large"
            :loading="actionLoading"
            :disabled="bonusPoints <= 0 || !bonusDescription.trim()"
            @click="handleBonus"
          >
            Ajouter
          </a-button>
        </div>
      </div>
    </a-modal>
    </div>
  </FeatureGate>
</template>

<style scoped>
.loyalty-view {
  display: flex;
  flex-direction: column;
}

/* Header Card */
.header-card {
  border-radius: 24px;
  overflow: hidden;
}

.header-card :deep(.ant-card-body) {
  padding: 0;
}

.header-gradient {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%);
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
  background: rgba(255, 255, 255, 0.1);
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

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
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

.refresh-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 32px;
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(8px);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-value.emerald {
  color: #6ee7b7;
}

.stat-value.rose {
  color: #fda4af;
}

.stat-icon-wrapper {
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 18px;
}

.stat-icon-wrapper.gold {
  background: rgba(251, 191, 36, 0.2);
  color: #fde68a;
}

.stat-icon-wrapper.emerald {
  background: rgba(52, 211, 153, 0.2);
  color: #6ee7b7;
}

.stat-icon-wrapper.rose {
  background: rgba(251, 113, 133, 0.2);
  color: #fda4af;
}

.stat-label {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.85;
}

/* Tier Section */
.tier-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.tier-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
}

.tier-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.tier-accent.from-amber-600 { background: linear-gradient(to right, #d97706, #92400e); }
.tier-accent.from-slate-400 { background: linear-gradient(to right, #94a3b8, #475569); }
.tier-accent.from-yellow-400 { background: linear-gradient(to right, #facc15, #f59e0b); }
.tier-accent.from-purple-400 { background: linear-gradient(to right, #a78bfa, #ec4899, #a855f7); }

.tier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tier-icon {
  font-size: 28px;
}

.tier-count {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tier-name {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 600;
}

.tier-requirement {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.tier-benefits {
  margin-top: 12px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tier-benefits li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #4b5563;
}

.benefit-check {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: #10b981;
}

.tier-progress {
  margin-top: 16px;
}

.tier-percentage {
  margin-top: 4px;
  text-align: right;
  font-size: 12px;
  color: #9ca3af;
}

/* Distribution Card */
.distribution-card {
  border-radius: 16px;
}

.distribution-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.distribution-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.distribution-header span {
  font-size: 14px;
  color: #6b7280;
}

.distribution-bar {
  display: flex;
  height: 32px;
  border-radius: 12px;
  overflow: hidden;
}

.distribution-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.7s ease-out;
}

.distribution-segment span {
  font-size: 14px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.distribution-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-item span {
  font-size: 14px;
  color: #4b5563;
}

/* Filters Card */
.filters-card {
  border-radius: 16px;
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
  font-size: 64px;
}

.empty-description {
  max-width: 320px;
  margin: 8px auto 0;
  color: #6b7280;
}

/* Table Card */
.table-card {
  border-radius: 16px;
}

.table-card :deep(.ant-table-thead > tr > th) {
  background: #f9fafb;
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

.modal-icon.adjust {
  background: linear-gradient(to bottom right, #f1f5f9, #e2e8f0);
  color: #475569;
}

.modal-icon.bonus {
  background: linear-gradient(to bottom right, #fef3c7, #fde68a);
  color: #d97706;
}

.modal-customer {
  margin-top: 16px;
  font-size: 15px;
  color: #6b7280;
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

  .stats-grid {
    gap: 12px;
  }

  .stat-card {
    padding: 14px;
  }

  .stat-value {
    font-size: 22px;
  }
}
</style>
