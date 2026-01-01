<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import {
  ShopOutlined,
  TeamOutlined,
  FileTextOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  RightOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const router = useRouter();

interface DashboardStats {
  overview: {
    totalRestaurants: number;
    activeRestaurants: number;
    inactiveRestaurants: number;
    totalUsers: number;
    totalCustomers: number;
    totalOrders: number;
  };
  thisMonth: {
    orders: number;
    revenue: number;
    newRestaurants: number;
    newCustomers: number;
  };
  growth: {
    orders: number;
    revenue: number;
  };
}

interface RecentActivity {
  recentRestaurants: Array<{
    _id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
  }>;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    status: string;
    total: number;
    restaurantId: { name: string; slug: string };
    createdAt: string;
  }>;
  recentUsers: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

interface ChartData {
  ordersByDay: Array<{ date: string; orders: number; revenue: number }>;
  orderStatusDistribution: Array<{ _id: string; count: number }>;
  topRestaurants: Array<{ _id: string; name: string; orders: number; revenue: number }>;
  subscriptionDistribution: Array<{ _id: string; count: number }>;
  restaurantGrowth: Array<{ date: string; count: number; cumulative: number }>;
}

const loading = ref(true);
const stats = ref<DashboardStats | null>(null);
const activity = ref<RecentActivity | null>(null);
const chartData = ref<ChartData | null>(null);
const selectedPeriod = ref(30);

const fetchData = async () => {
  loading.value = true;
  try {
    const [statsRes, activityRes, chartsRes] = await Promise.all([
      api.get<DashboardStats>('/superadmin/dashboard/stats'),
      api.get<RecentActivity>('/superadmin/dashboard/activity'),
      api.get<ChartData>('/superadmin/dashboard/charts', { days: selectedPeriod.value }),
    ]);

    if (statsRes.success && statsRes.data) {
      stats.value = statsRes.data;
    }
    if (activityRes.success && activityRes.data) {
      activity.value = activityRes.data;
    }
    if (chartsRes.success && chartsRes.data) {
      chartData.value = chartsRes.data;
    }
  } catch (_error) {
    console.error('Failed to fetch dashboard data:');
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatShortDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'orange',
    preparing: 'blue',
    ready: 'cyan',
    completed: 'green',
    paid: 'green',
    cancelled: 'red',
  };
  return colors[status] || 'default';
};

// Chart configurations
const ordersChartData = computed(() => {
  if (!chartData.value) {return null;}

  const labels = chartData.value.ordersByDay.map((d) => formatShortDate(d.date));
  const ordersData = chartData.value.ordersByDay.map((d) => d.orders);

  return {
    labels,
    datasets: [
      {
        label: 'Commandes',
        data: ordersData,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
      },
    ],
  };
});

const revenueChartData = computed(() => {
  if (!chartData.value) {return null;}

  const labels = chartData.value.ordersByDay.map((d) => formatShortDate(d.date));
  const revenueData = chartData.value.ordersByDay.map((d) => d.revenue);

  return {
    labels,
    datasets: [
      {
        label: 'Revenus (FCFA)',
        data: revenueData,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
      },
    ],
  };
});

const topRestaurantsChartData = computed(() => {
  if (!chartData.value || chartData.value.topRestaurants.length === 0) {return null;}

  const labels = chartData.value.topRestaurants.map((r) => r.name);
  const data = chartData.value.topRestaurants.map((r) => r.orders);

  return {
    labels,
    datasets: [
      {
        label: 'Commandes',
        data,
        backgroundColor: [
          '#8b5cf6',
          '#a78bfa',
          '#c4b5fd',
          '#ddd6fe',
          '#ede9fe',
          '#3b82f6',
          '#60a5fa',
          '#93c5fd',
          '#bfdbfe',
          '#dbeafe',
        ],
        borderRadius: 8,
      },
    ],
  };
});

const orderStatusChartData = computed(() => {
  if (!chartData.value || chartData.value.orderStatusDistribution.length === 0) {return null;}

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    preparing: 'En preparation',
    ready: 'Pret',
    completed: 'Termine',
    paid: 'Paye',
    cancelled: 'Annule',
  };

  const statusColors: Record<string, string> = {
    pending: '#f97316',
    preparing: '#3b82f6',
    ready: '#06b6d4',
    completed: '#22c55e',
    paid: '#10b981',
    cancelled: '#ef4444',
  };

  const labels = chartData.value.orderStatusDistribution.map(
    (s) => statusLabels[s._id] || s._id
  );
  const data = chartData.value.orderStatusDistribution.map((s) => s.count);
  const colors = chartData.value.orderStatusDistribution.map(
    (s) => statusColors[s._id] || '#94a3b8'
  );

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };
});

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#f8fafc',
      padding: 12,
      borderRadius: 8,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        maxTicksLimit: 10,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#f1f5f9',
      },
    },
  },
};

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#f8fafc',
      padding: 12,
      borderRadius: 8,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: {
        color: '#f1f5f9',
      },
    },
    y: {
      grid: {
        display: false,
      },
    },
  },
};

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#f8fafc',
      padding: 12,
      borderRadius: 8,
    },
  },
  cutout: '60%',
};

const handlePeriodChange = () => {
  fetchData();
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="superadmin-dashboard">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Vue d'ensemble de la plateforme MenuQR</p>
      </div>
      <a-space>
        <a-select v-model:value="selectedPeriod" @change="handlePeriodChange" style="width: 140px">
          <a-select-option :value="7">7 derniers jours</a-select-option>
          <a-select-option :value="14">14 derniers jours</a-select-option>
          <a-select-option :value="30">30 derniers jours</a-select-option>
          <a-select-option :value="90">90 derniers jours</a-select-option>
        </a-select>
        <a-button @click="fetchData" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
      </a-space>
    </div>

    <!-- Loading State -->
    <a-spin v-if="loading" size="large" class="loading-spinner" />

    <template v-else-if="stats">
      <!-- KPI Cards -->
      <a-row :gutter="[16, 16]" class="mb-6">
        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="kpi-card" hoverable @click="router.push('/super-admin/restaurants')">
            <div class="kpi-content">
              <div class="kpi-icon purple">
                <ShopOutlined />
              </div>
              <div class="kpi-info">
                <span class="kpi-label">Restaurants</span>
                <span class="kpi-value">{{ stats.overview.totalRestaurants }}</span>
                <span class="kpi-detail">
                  {{ stats.overview.activeRestaurants }} actifs
                </span>
              </div>
            </div>
            <div class="kpi-footer">
              <span class="kpi-new">+{{ stats.thisMonth.newRestaurants }} ce mois</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="kpi-card" hoverable @click="router.push('/super-admin/users')">
            <div class="kpi-content">
              <div class="kpi-icon blue">
                <TeamOutlined />
              </div>
              <div class="kpi-info">
                <span class="kpi-label">Utilisateurs</span>
                <span class="kpi-value">{{ stats.overview.totalUsers }}</span>
                <span class="kpi-detail">
                  {{ stats.overview.totalCustomers }} clients
                </span>
              </div>
            </div>
            <div class="kpi-footer">
              <span class="kpi-new">+{{ stats.thisMonth.newCustomers }} clients ce mois</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="kpi-card">
            <div class="kpi-content">
              <div class="kpi-icon green">
                <FileTextOutlined />
              </div>
              <div class="kpi-info">
                <span class="kpi-label">Commandes</span>
                <span class="kpi-value">{{ stats.overview.totalOrders }}</span>
                <span class="kpi-detail">
                  {{ stats.thisMonth.orders }} ce mois
                </span>
              </div>
            </div>
            <div class="kpi-footer">
              <span :class="['kpi-growth', stats.growth.orders >= 0 ? 'positive' : 'negative']">
                <ArrowUpOutlined v-if="stats.growth.orders >= 0" />
                <ArrowDownOutlined v-else />
                {{ Math.abs(stats.growth.orders) }}%
              </span>
              <span class="kpi-growth-label">vs mois dernier</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="kpi-card">
            <div class="kpi-content">
              <div class="kpi-icon orange">
                <DollarOutlined />
              </div>
              <div class="kpi-info">
                <span class="kpi-label">Revenu du mois</span>
                <span class="kpi-value">{{ formatCurrency(stats.thisMonth.revenue) }}</span>
              </div>
            </div>
            <div class="kpi-footer">
              <span :class="['kpi-growth', stats.growth.revenue >= 0 ? 'positive' : 'negative']">
                <ArrowUpOutlined v-if="stats.growth.revenue >= 0" />
                <ArrowDownOutlined v-else />
                {{ Math.abs(stats.growth.revenue) }}%
              </span>
              <span class="kpi-growth-label">vs mois dernier</span>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- Charts Row 1 -->
      <a-row :gutter="[16, 16]" class="mb-6">
        <a-col :xs="24" :lg="12">
          <a-card class="chart-card">
            <template #title>
              <span class="card-title">Evolution des commandes</span>
            </template>
            <div class="chart-container">
              <Line
                v-if="ordersChartData"
                :data="ordersChartData"
                :options="lineChartOptions"
              />
              <a-empty v-else description="Pas de donnees" />
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="12">
          <a-card class="chart-card">
            <template #title>
              <span class="card-title">Evolution des revenus</span>
            </template>
            <div class="chart-container">
              <Line
                v-if="revenueChartData"
                :data="revenueChartData"
                :options="lineChartOptions"
              />
              <a-empty v-else description="Pas de donnees" />
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- Charts Row 2 -->
      <a-row :gutter="[16, 16]" class="mb-6">
        <a-col :xs="24" :lg="16">
          <a-card class="chart-card">
            <template #title>
              <span class="card-title">Top 10 restaurants (ce mois)</span>
            </template>
            <div class="chart-container-large">
              <Bar
                v-if="topRestaurantsChartData"
                :data="topRestaurantsChartData"
                :options="barChartOptions"
              />
              <a-empty v-else description="Pas de donnees" />
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="8">
          <a-card class="chart-card">
            <template #title>
              <span class="card-title">Statut des commandes</span>
            </template>
            <div class="chart-container">
              <Doughnut
                v-if="orderStatusChartData"
                :data="orderStatusChartData"
                :options="doughnutChartOptions"
              />
              <a-empty v-else description="Pas de donnees" />
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- Activity Section -->
      <a-row :gutter="[16, 16]">
        <!-- Recent Restaurants -->
        <a-col :xs="24" :lg="8">
          <a-card class="activity-card">
            <template #title>
              <div class="card-header">
                <span>Restaurants recents</span>
                <a-button type="link" size="small" @click="router.push('/super-admin/restaurants')">
                  Voir tout <RightOutlined />
                </a-button>
              </div>
            </template>

            <div class="activity-list">
              <div
                v-for="restaurant in activity?.recentRestaurants"
                :key="restaurant._id"
                class="activity-item"
              >
                <div class="activity-icon restaurant">
                  <ShopOutlined />
                </div>
                <div class="activity-info">
                  <span class="activity-title">{{ restaurant.name }}</span>
                  <span class="activity-time">{{ formatDate(restaurant.createdAt) }}</span>
                </div>
                <a-tag :color="restaurant.isActive ? 'green' : 'red'">
                  {{ restaurant.isActive ? 'Actif' : 'Inactif' }}
                </a-tag>
              </div>

              <a-empty
                v-if="!activity?.recentRestaurants?.length"
                description="Aucun restaurant recent"
              />
            </div>
          </a-card>
        </a-col>

        <!-- Recent Orders -->
        <a-col :xs="24" :lg="8">
          <a-card class="activity-card">
            <template #title>
              <div class="card-header">
                <span>Commandes recentes</span>
              </div>
            </template>

            <div class="activity-list">
              <div
                v-for="order in activity?.recentOrders?.slice(0, 5)"
                :key="order._id"
                class="activity-item"
              >
                <div class="activity-icon order">
                  <FileTextOutlined />
                </div>
                <div class="activity-info">
                  <span class="activity-title">#{{ order.orderNumber }}</span>
                  <span class="activity-subtitle">{{ order.restaurantId?.name }}</span>
                  <span class="activity-time">{{ formatDate(order.createdAt) }}</span>
                </div>
                <div class="activity-meta">
                  <span class="activity-amount">{{ formatCurrency(order.total || 0) }}</span>
                  <a-tag :color="getStatusColor(order.status)" size="small">
                    {{ order.status }}
                  </a-tag>
                </div>
              </div>

              <a-empty
                v-if="!activity?.recentOrders?.length"
                description="Aucune commande recente"
              />
            </div>
          </a-card>
        </a-col>

        <!-- Recent Users -->
        <a-col :xs="24" :lg="8">
          <a-card class="activity-card">
            <template #title>
              <div class="card-header">
                <span>Utilisateurs recents</span>
                <a-button type="link" size="small" @click="router.push('/super-admin/users')">
                  Voir tout <RightOutlined />
                </a-button>
              </div>
            </template>

            <div class="activity-list">
              <div
                v-for="user in activity?.recentUsers"
                :key="user._id"
                class="activity-item"
              >
                <a-avatar class="activity-avatar" :style="{ backgroundColor: '#8b5cf6' }">
                  {{ user.name?.charAt(0)?.toUpperCase() }}
                </a-avatar>
                <div class="activity-info">
                  <span class="activity-title">{{ user.name }}</span>
                  <span class="activity-subtitle">{{ user.email }}</span>
                  <span class="activity-time">{{ formatDate(user.createdAt) }}</span>
                </div>
                <a-tag>{{ user.role }}</a-tag>
              </div>

              <a-empty
                v-if="!activity?.recentUsers?.length"
                description="Aucun utilisateur recent"
              />
            </div>
          </a-card>
        </a-col>
      </a-row>
    </template>
  </div>
</template>

<style scoped>
.superadmin-dashboard {
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

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.mb-6 {
  margin-bottom: 24px;
}

/* KPI Cards */
.kpi-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
}

.kpi-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.kpi-icon.purple {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
  color: #8b5cf6;
}

.kpi-icon.blue {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1));
  color: #3b82f6;
}

.kpi-icon.green {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
  color: #22c55e;
}

.kpi-icon.orange {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.1));
  color: #f97316;
}

.kpi-info {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.kpi-detail {
  font-size: 12px;
  color: #94a3b8;
}

.kpi-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.kpi-new {
  font-size: 12px;
  color: #8b5cf6;
  font-weight: 500;
}

.kpi-growth {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.kpi-growth.positive {
  color: #22c55e;
}

.kpi-growth.negative {
  color: #ef4444;
}

.kpi-growth-label {
  font-size: 12px;
  color: #94a3b8;
}

/* Chart Cards */
.chart-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.chart-container {
  height: 280px;
  position: relative;
}

.chart-container-large {
  height: 350px;
  position: relative;
}

/* Activity Cards */
.activity-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  transition: background 0.2s;
}

.activity-item:hover {
  background: #f1f5f9;
}

.activity-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.activity-icon.restaurant {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.activity-icon.order {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.activity-avatar {
  flex-shrink: 0;
}

.activity-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.activity-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-subtitle {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-time {
  font-size: 11px;
  color: #94a3b8;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.activity-amount {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}
</style>
