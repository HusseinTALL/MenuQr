<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  CalendarOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { message } from 'ant-design-vue';

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  email?: string;
}

interface Plan {
  _id: string;
  name: string;
  slug: string;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
}

interface SubscriptionUsage {
  dishes: number;
  orders: number;
  smsCredits: number;
  storage: number;
  campaigns: number;
}

interface Subscription {
  _id: string;
  restaurant: Restaurant;
  plan: Plan;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  usage: SubscriptionUsage;
  createdAt: string;
}

interface Stats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  churnRate: number | string;
  monthlyRevenue: number;
}

const loading = ref(true);
const subscriptions = ref<Subscription[]>([]);
const stats = ref<Stats | null>(null);
const plans = ref<Plan[]>([]);
const restaurants = ref<Restaurant[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});
const search = ref('');
const statusFilter = ref('all');
const planFilter = ref<string | null>(null);

// Drawer state
const drawerVisible = ref(false);
const selectedSubscription = ref<Subscription | null>(null);

// Edit modal
const editModalVisible = ref(false);
const editModalLoading = ref(false);
const editForm = ref({
  planId: '',
  status: '',
  billingCycle: '',
});

// Create modal
const createModalVisible = ref(false);
const createModalLoading = ref(false);
const createForm = ref({
  restaurantId: '',
  planId: '',
  billingCycle: 'monthly',
  status: 'trial',
});

// Extend modal
const extendModalVisible = ref(false);
const extendModalLoading = ref(false);
const extendDays = ref(30);

const columns: TableColumnsType = [
  {
    title: 'Restaurant',
    key: 'restaurant',
    fixed: 'left',
    width: 220,
  },
  {
    title: 'Plan',
    key: 'plan',
    width: 120,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: 'Cycle',
    key: 'billingCycle',
    width: 100,
    align: 'center',
  },
  {
    title: 'Fin periode',
    key: 'periodEnd',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 150,
    align: 'center',
  },
];

const statusColors: Record<string, string> = {
  trial: 'blue',
  active: 'green',
  past_due: 'orange',
  cancelled: 'red',
  expired: 'default',
};

const statusLabels: Record<string, string> = {
  trial: 'Essai',
  active: 'Actif',
  past_due: 'En retard',
  cancelled: 'Annule',
  expired: 'Expire',
};

const fetchSubscriptions = async () => {
  loading.value = true;
  try {
    const response = await api.get<{
      subscriptions: Subscription[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>('/superadmin/subscriptions', {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      planId: planFilter.value || undefined,
      search: search.value || undefined,
    });

    if (response.success && response.data) {
      subscriptions.value = response.data.subscriptions;
      pagination.value.total = response.data.pagination.total;
    }
  } catch {
    console.error('Failed to fetch subscriptions:');
    message.error('Erreur lors du chargement des abonnements');
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const response = await api.get<Stats>('/superadmin/subscriptions/stats');
    if (response.success && response.data) {
      stats.value = response.data;
    }
  } catch {
    console.error('Failed to fetch stats:');
  }
};

const fetchPlans = async () => {
  try {
    const response = await api.get<{ plans: Plan[] }>('/superadmin/subscription-plans', { active: true });
    if (response.success && response.data) {
      plans.value = response.data.plans;
    }
  } catch {
    console.error('Failed to fetch plans:');
  }
};

const fetchRestaurants = async () => {
  try {
    const response = await api.get<{ restaurants: Restaurant[] }>('/superadmin/restaurants', { limit: 100 });
    if (response.success && response.data) {
      restaurants.value = response.data.restaurants;
    }
  } catch {
    console.error('Failed to fetch restaurants:');
  }
};

const handleTableChange = (pag: { current: number; pageSize: number }) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchSubscriptions();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchSubscriptions();
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

const formatCurrency = (amount: number, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const getDaysRemaining = (date: string) => {
  const end = new Date(date);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

// Drawer functions
const openDrawer = (subscription: Subscription) => {
  selectedSubscription.value = subscription;
  drawerVisible.value = true;
};

const closeDrawer = () => {
  drawerVisible.value = false;
  selectedSubscription.value = null;
};

// Edit modal functions
const openEditModal = (subscription: Subscription) => {
  selectedSubscription.value = subscription;
  editForm.value = {
    planId: subscription.plan._id,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
  };
  editModalVisible.value = true;
};

const handleEditSubmit = async () => {
  if (!selectedSubscription.value) {return;}

  editModalLoading.value = true;
  try {
    const response = await api.put(`/superadmin/subscriptions/${selectedSubscription.value._id}`, {
      planId: editForm.value.planId,
      status: editForm.value.status,
      billingCycle: editForm.value.billingCycle,
    });

    if (response.success) {
      message.success('Abonnement modifie avec succes');
      editModalVisible.value = false;
      fetchSubscriptions();
      fetchStats();
    } else {
      message.error(response.message || 'Une erreur est survenue');
    }
  } catch {
    console.error('Failed to update subscription:');
    message.error('Erreur lors de la modification');
  } finally {
    editModalLoading.value = false;
  }
};

// Create modal functions
const openCreateModal = () => {
  createForm.value = {
    restaurantId: '',
    planId: plans.value[0]?._id || '',
    billingCycle: 'monthly',
    status: 'trial',
  };
  createModalVisible.value = true;
};

const handleCreateSubmit = async () => {
  if (!createForm.value.restaurantId || !createForm.value.planId) {
    message.error('Veuillez selectionner un restaurant et un plan');
    return;
  }

  createModalLoading.value = true;
  try {
    const response = await api.post('/superadmin/subscriptions', createForm.value);

    if (response.success) {
      message.success('Abonnement cree avec succes');
      createModalVisible.value = false;
      fetchSubscriptions();
      fetchStats();
    } else {
      message.error(response.message || 'Une erreur est survenue');
    }
  } catch {
    console.error('Failed to create subscription:');
    message.error('Erreur lors de la creation');
  } finally {
    createModalLoading.value = false;
  }
};

// Extend subscription
const openExtendModal = (subscription: Subscription) => {
  selectedSubscription.value = subscription;
  extendDays.value = 30;
  extendModalVisible.value = true;
};

const handleExtendSubmit = async () => {
  if (!selectedSubscription.value) {return;}

  extendModalLoading.value = true;
  try {
    const response = await api.post(`/superadmin/subscriptions/${selectedSubscription.value._id}/extend`, {
      days: extendDays.value,
    });

    if (response.success) {
      message.success(`Abonnement prolonge de ${extendDays.value} jours`);
      extendModalVisible.value = false;
      fetchSubscriptions();
    } else {
      message.error(response.message || 'Une erreur est survenue');
    }
  } catch {
    console.error('Failed to extend subscription:');
    message.error('Erreur lors de la prolongation');
  } finally {
    extendModalLoading.value = false;
  }
};

onMounted(() => {
  fetchSubscriptions();
  fetchStats();
  fetchPlans();
  fetchRestaurants();
});
</script>

<template>
  <div class="subscriptions-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Abonnements</h1>
        <p class="page-subtitle">Gerez les abonnements des restaurants</p>
      </div>
      <a-space>
        <a-button @click="fetchSubscriptions">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Nouvel abonnement
        </a-button>
      </a-space>
    </div>

    <!-- Stats Cards -->
    <a-row :gutter="[16, 16]" class="stats-row" v-if="stats">
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic title="Total" :value="stats.totalSubscriptions" />
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card active">
          <a-statistic title="Actifs" :value="stats.activeSubscriptions" value-class="text-green" />
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card trial">
          <a-statistic title="En essai" :value="stats.trialSubscriptions" value-class="text-blue" />
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card revenue">
          <a-statistic
            title="Revenus mensuels"
            :value="stats.monthlyRevenue"
            :precision="2"
            suffix="EUR"
            value-class="text-purple"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="filters-card mb-4">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="8">
          <a-input-search
            v-model:value="search"
            placeholder="Rechercher un restaurant..."
            allow-clear
            @search="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input-search>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select v-model:value="statusFilter" style="width: 100%" @change="handleSearch">
            <a-select-option value="all">Tous les statuts</a-select-option>
            <a-select-option value="active">Actif</a-select-option>
            <a-select-option value="trial">Essai</a-select-option>
            <a-select-option value="past_due">En retard</a-select-option>
            <a-select-option value="cancelled">Annule</a-select-option>
            <a-select-option value="expired">Expire</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="planFilter"
            style="width: 100%"
            placeholder="Tous les plans"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option v-for="plan in plans" :key="plan._id" :value="plan._id">
              {{ plan.name }}
            </a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="subscriptions"
        :loading="loading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} abonnements`,
        }"
        :scroll="{ x: 900 }"
        row-key="_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'restaurant'">
            <div class="restaurant-cell" @click="openDrawer(record)" style="cursor: pointer;">
              <span class="restaurant-name">{{ record.restaurant.name }}</span>
              <span class="restaurant-email">{{ record.restaurant.email || record.restaurant.slug }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'plan'">
            <a-tag color="purple">{{ record.plan.name }}</a-tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status]">
              {{ statusLabels[record.status] }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'billingCycle'">
            <span>{{ record.billingCycle === 'monthly' ? 'Mensuel' : 'Annuel' }}</span>
          </template>

          <template v-else-if="column.key === 'periodEnd'">
            <div>
              <div>{{ formatDate(record.currentPeriodEnd) }}</div>
              <small :class="getDaysRemaining(record.currentPeriodEnd) < 7 ? 'text-orange' : 'text-gray'">
                {{ getDaysRemaining(record.currentPeriodEnd) }}j restants
              </small>
            </div>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Voir details">
                <a-button type="text" size="small" @click="openDrawer(record)">
                  <template #icon><EyeOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Modifier">
                <a-button type="text" size="small" @click="openEditModal(record)">
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Prolonger">
                <a-button type="text" size="small" @click="openExtendModal(record)">
                  <template #icon><CalendarOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Details de l'abonnement"
      placement="right"
      :width="480"
      @close="closeDrawer"
    >
      <template v-if="selectedSubscription">
        <div class="drawer-content">
          <div class="subscription-header">
            <h2>{{ selectedSubscription.restaurant.name }}</h2>
            <a-tag :color="statusColors[selectedSubscription.status]" class="status-tag">
              {{ statusLabels[selectedSubscription.status] }}
            </a-tag>
          </div>

          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="Plan">
              <a-tag color="purple">{{ selectedSubscription.plan.name }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Cycle de facturation">
              {{ selectedSubscription.billingCycle === 'monthly' ? 'Mensuel' : 'Annuel' }}
            </a-descriptions-item>
            <a-descriptions-item label="Tarif">
              {{
                formatCurrency(
                  selectedSubscription.billingCycle === 'monthly'
                    ? selectedSubscription.plan.pricing.monthly
                    : selectedSubscription.plan.pricing.yearly
                )
              }}
            </a-descriptions-item>
            <a-descriptions-item label="Debut periode">
              {{ formatDate(selectedSubscription.currentPeriodStart) }}
            </a-descriptions-item>
            <a-descriptions-item label="Fin periode">
              {{ formatDate(selectedSubscription.currentPeriodEnd) }}
              <a-tag v-if="getDaysRemaining(selectedSubscription.currentPeriodEnd) < 7" color="orange" class="ml-2">
                {{ getDaysRemaining(selectedSubscription.currentPeriodEnd) }}j restants
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedSubscription.trialEndsAt" label="Fin essai">
              {{ formatDate(selectedSubscription.trialEndsAt) }}
            </a-descriptions-item>
          </a-descriptions>

          <a-divider>Utilisation</a-divider>

          <div class="usage-grid">
            <div class="usage-item">
              <span class="usage-value">{{ selectedSubscription.usage.dishes }}</span>
              <span class="usage-label">Plats</span>
            </div>
            <div class="usage-item">
              <span class="usage-value">{{ selectedSubscription.usage.orders }}</span>
              <span class="usage-label">Commandes</span>
            </div>
            <div class="usage-item">
              <span class="usage-value">{{ selectedSubscription.usage.smsCredits }}</span>
              <span class="usage-label">SMS</span>
            </div>
            <div class="usage-item">
              <span class="usage-value">{{ selectedSubscription.usage.campaigns }}</span>
              <span class="usage-label">Campagnes</span>
            </div>
          </div>

          <a-divider />

          <div class="drawer-actions">
            <a-button block @click="openEditModal(selectedSubscription)">
              <template #icon><EditOutlined /></template>
              Modifier l'abonnement
            </a-button>
            <a-button block @click="openExtendModal(selectedSubscription)">
              <template #icon><CalendarOutlined /></template>
              Prolonger la periode
            </a-button>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- Edit Modal -->
    <a-modal
      v-model:open="editModalVisible"
      title="Modifier l'abonnement"
      :confirm-loading="editModalLoading"
      ok-text="Enregistrer"
      cancel-text="Annuler"
      @ok="handleEditSubmit"
    >
      <a-form layout="vertical" class="edit-form">
        <a-form-item label="Plan">
          <a-select v-model:value="editForm.planId">
            <a-select-option v-for="plan in plans" :key="plan._id" :value="plan._id">
              {{ plan.name }} - {{ formatCurrency(plan.pricing.monthly) }}/mois
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Statut">
          <a-select v-model:value="editForm.status">
            <a-select-option value="trial">Essai</a-select-option>
            <a-select-option value="active">Actif</a-select-option>
            <a-select-option value="past_due">En retard</a-select-option>
            <a-select-option value="cancelled">Annule</a-select-option>
            <a-select-option value="expired">Expire</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Cycle de facturation">
          <a-radio-group v-model:value="editForm.billingCycle">
            <a-radio-button value="monthly">Mensuel</a-radio-button>
            <a-radio-button value="yearly">Annuel</a-radio-button>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Create Modal -->
    <a-modal
      v-model:open="createModalVisible"
      title="Nouvel abonnement"
      :confirm-loading="createModalLoading"
      ok-text="Creer"
      cancel-text="Annuler"
      @ok="handleCreateSubmit"
    >
      <a-form layout="vertical" class="create-form">
        <a-form-item label="Restaurant" required>
          <a-select
            v-model:value="createForm.restaurantId"
            placeholder="Selectionner un restaurant"
            show-search
            :filter-option="(input: string, option: { label?: string }) =>
              option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false"
          >
            <a-select-option
              v-for="restaurant in restaurants"
              :key="restaurant._id"
              :value="restaurant._id"
              :label="restaurant.name"
            >
              {{ restaurant.name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Plan" required>
          <a-select v-model:value="createForm.planId">
            <a-select-option v-for="plan in plans" :key="plan._id" :value="plan._id">
              {{ plan.name }} - {{ formatCurrency(plan.pricing.monthly) }}/mois
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Cycle de facturation">
          <a-radio-group v-model:value="createForm.billingCycle">
            <a-radio-button value="monthly">Mensuel</a-radio-button>
            <a-radio-button value="yearly">Annuel</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="Statut initial">
          <a-select v-model:value="createForm.status">
            <a-select-option value="trial">Essai</a-select-option>
            <a-select-option value="active">Actif</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Extend Modal -->
    <a-modal
      v-model:open="extendModalVisible"
      title="Prolonger l'abonnement"
      :confirm-loading="extendModalLoading"
      ok-text="Prolonger"
      cancel-text="Annuler"
      @ok="handleExtendSubmit"
    >
      <template v-if="selectedSubscription">
        <a-alert
          type="info"
          show-icon
          class="mb-4"
        >
          <template #message>
            Prolonger l'abonnement de: <strong>{{ selectedSubscription.restaurant.name }}</strong>
          </template>
        </a-alert>

        <a-form layout="vertical">
          <a-form-item label="Nombre de jours a ajouter">
            <a-input-number v-model:value="extendDays" :min="1" :max="365" style="width: 100%" />
          </a-form-item>

          <a-form-item label="Nouvelle date de fin">
            <strong>{{ formatDate(
              new Date(new Date(selectedSubscription.currentPeriodEnd).getTime() + extendDays * 24 * 60 * 60 * 1000).toISOString()
            ) }}</strong>
          </a-form-item>
        </a-form>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.subscriptions-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
}

.filters-card {
  border-radius: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.restaurant-cell {
  display: flex;
  flex-direction: column;
}

.restaurant-cell:hover .restaurant-name {
  color: #1890ff;
}

.restaurant-name {
  font-weight: 600;
  color: #1e293b;
  transition: color 0.2s;
}

.restaurant-email {
  font-size: 12px;
  color: #64748b;
}

.text-green {
  color: #10b981 !important;
}

.text-blue {
  color: #3b82f6 !important;
}

.text-purple {
  color: #8b5cf6 !important;
}

.text-orange {
  color: #f97316;
}

.text-gray {
  color: #9ca3af;
}

.ml-2 {
  margin-left: 8px;
}

/* Drawer styles */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subscription-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subscription-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.status-tag {
  font-size: 12px;
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.usage-item {
  text-align: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.usage-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.usage-label {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-form,
.create-form {
  margin-top: 16px;
}
</style>
