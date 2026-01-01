<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  ShoppingCartOutlined,
  RiseOutlined,
  FireOutlined,
  TeamOutlined,
  TableOutlined,
  ReloadOutlined,
  RightOutlined,
  BankOutlined,
} from '@ant-design/icons-vue';
import api, { type HotelDashboardStats, type HotelOrderAdmin } from '@/services/api';
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
import { Line, Bar, Doughnut } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const router = useRouter();

// ============ STATE ============
const isLoading = ref(true);
const error = ref<string | null>(null);
const hotelId = ref<string | null>(null);
const stats = ref<HotelDashboardStats | null>(null);
const isRefreshing = ref(false);
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Chart data refs
const revenueChartData = shallowRef<any>(null);
const ordersChartData = shallowRef<any>(null);
const occupancyChartData = shallowRef<any>(null);

// ============ CHART CONFIG ============
const colors = {
  primary: '#6366f1',
  primaryLight: 'rgba(99, 102, 241, 0.15)',
  primaryGradient: 'rgba(99, 102, 241, 0.05)',
  secondary: '#8b5cf6',
  secondaryLight: 'rgba(139, 92, 246, 0.15)',
  success: '#10b981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 750,
    easing: 'easeInOutQuart' as const,
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      titleFont: { size: 13, weight: 'bold' as const },
      bodyColor: '#e2e8f0',
      bodyFont: { size: 12 },
      cornerRadius: 10,
      padding: { top: 12, bottom: 12, left: 16, right: 16 },
      boxPadding: 6,
      usePointStyle: true,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#64748b', font: { size: 11 }, padding: 8 },
    },
    y: {
      grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
      border: { display: false },
      ticks: { color: '#64748b', font: { size: 11 }, padding: 12 },
      beginAtZero: true,
    },
  },
  elements: {
    line: { tension: 0.4, borderWidth: 3 },
    point: { radius: 0, hoverRadius: 6, hoverBorderWidth: 3, backgroundColor: '#fff' },
    bar: { borderRadius: 6, borderSkipped: false },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 800,
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        boxWidth: 14,
        boxHeight: 14,
        padding: 20,
        font: { size: 12 },
        usePointStyle: true,
        pointStyle: 'circle',
        color: '#475569',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: '#e2e8f0',
      cornerRadius: 10,
      padding: 14,
    },
  },
};

// ============ COMPUTED ============
const pendingOrdersCount = computed(() => stats.value?.pendingOrders || 0);

const _occupancyPercentage = computed(() => {
  if (!stats.value) {return 0;}
  return Math.round(stats.value.occupancyRate);
});

const statCards = computed(() => {
  if (!stats.value) {return [];}
  return [
    {
      title: "Chiffre d'affaires",
      value: formatPrice(stats.value.todayRevenue),
      icon: RiseOutlined,
      color: 'indigo',
      subtitle: `Moy. ${formatPrice(stats.value.averageOrderValue)}/commande`,
    },
    {
      title: 'Commandes',
      value: stats.value.todayOrders,
      icon: ShoppingCartOutlined,
      color: 'purple',
      subtitle: `${stats.value.pendingOrders} en attente`,
      badge: stats.value.pendingOrders > 0 ? stats.value.pendingOrders : undefined,
    },
    {
      title: 'Occupation',
      value: `${stats.value.occupancyRate}%`,
      icon: TableOutlined,
      color: 'emerald',
      subtitle: `${stats.value.occupiedRooms}/${stats.value.totalRooms} chambres`,
    },
    {
      title: 'Clients actifs',
      value: stats.value.activeGuests,
      icon: TeamOutlined,
      color: 'amber',
      subtitle: 'Clients en sejour',
    },
  ];
});

// ============ HELPERS ============
function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmee',
    preparing: 'En preparation',
    ready: 'Prete',
    delivering: 'En livraison',
    delivered: 'Livree',
    cancelled: 'Annulee',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'orange',
    confirmed: 'blue',
    preparing: 'purple',
    ready: 'cyan',
    delivering: 'geekblue',
    delivered: 'green',
    cancelled: 'red',
  };
  return colors[status] || 'default';
}

// ============ DATA LOADING ============
async function loadDashboard() {
  try {
    // First get the hotel
    const hotelRes = await api.getMyHotel();
    if (!hotelRes.success || !hotelRes.data) {
      error.value = 'Impossible de charger les donnees de l\'hotel';
      return;
    }
    hotelId.value = hotelRes.data.id;

    // Then get dashboard stats
    const statsRes = await api.getHotelDashboardStats(hotelId.value!);
    if (statsRes.success && statsRes.data) {
      stats.value = statsRes.data;
      buildCharts();
    }
  } catch (e) {
    console.error('Dashboard error:', e);
    error.value = 'Erreur lors du chargement du tableau de bord';
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

function buildCharts() {
  if (!stats.value) {return;}

  // Revenue chart
  const revenueData = stats.value.revenueByDay || [];
  revenueChartData.value = {
    labels: revenueData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }),
    datasets: [
      {
        label: 'Revenus',
        data: revenueData.map(d => d.revenue),
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
        fill: true,
      },
    ],
  };

  // Orders chart
  ordersChartData.value = {
    labels: revenueData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }),
    datasets: [
      {
        label: 'Commandes',
        data: revenueData.map(d => d.orders),
        backgroundColor: colors.secondary,
        borderRadius: 6,
      },
    ],
  };

  // Occupancy chart (status distribution)
  const statusCounts = stats.value.ordersByStatus || {};
  occupancyChartData.value = {
    labels: Object.keys(statusCounts).map(s => getStatusLabel(s)),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: [
          colors.warning,
          colors.primary,
          colors.secondary,
          '#06b6d4',
          colors.success,
          colors.danger,
        ],
        borderWidth: 0,
      },
    ],
  };
}

async function refresh() {
  isRefreshing.value = true;
  await loadDashboard();
  message.success('Tableau de bord actualise');
}

function navigateToOrders() {
  router.push('/hotel-admin/orders');
}

function navigateToRooms() {
  router.push('/hotel-admin/rooms');
}

function navigateToGuests() {
  router.push('/hotel-admin/guests');
}

function viewOrder(order: HotelOrderAdmin) {
  router.push(`/hotel-admin/orders?id=${order.id}`);
}

// ============ LIFECYCLE ============
onMounted(() => {
  loadDashboard();
  // Poll every 30 seconds
  pollInterval = setInterval(loadDashboard, 30000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

<template>
  <div class="hotel-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1>
          <BankOutlined class="header-icon" />
          Tableau de bord
        </h1>
        <p class="header-subtitle">Vue d'ensemble de votre hotel</p>
      </div>
      <div class="header-actions">
        <a-button :loading="isRefreshing" @click="refresh">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
      <p>Chargement du tableau de bord...</p>
    </div>

    <!-- Error State -->
    <a-alert
      v-else-if="error"
      :message="error"
      type="error"
      show-icon
      class="error-alert"
    />

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Stat Cards -->
      <div class="stats-grid">
        <div
          v-for="(card, index) in statCards"
          :key="index"
          :class="['stat-card', `stat-card-${card.color}`]"
        >
          <div class="stat-icon">
            <component :is="card.icon" />
          </div>
          <div class="stat-content">
            <p class="stat-title">{{ card.title }}</p>
            <p class="stat-value">
              {{ card.value }}
              <a-badge
                v-if="card.badge"
                :count="card.badge"
                :number-style="{ backgroundColor: '#ef4444' }"
                class="stat-badge"
              />
            </p>
            <p class="stat-subtitle">{{ card.subtitle }}</p>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <!-- Revenue Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Revenus (7 derniers jours)</h3>
          </div>
          <div class="chart-container">
            <Line
              v-if="revenueChartData"
              :data="revenueChartData"
              :options="chartOptions"
            />
            <div v-else class="chart-empty">
              <p>Aucune donnee disponible</p>
            </div>
          </div>
        </div>

        <!-- Orders Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Commandes (7 derniers jours)</h3>
          </div>
          <div class="chart-container">
            <Bar
              v-if="ordersChartData"
              :data="ordersChartData"
              :options="chartOptions"
            />
            <div v-else class="chart-empty">
              <p>Aucune donnee disponible</p>
            </div>
          </div>
        </div>

        <!-- Status Distribution -->
        <div class="chart-card chart-card-small">
          <div class="chart-header">
            <h3>Statuts des commandes</h3>
          </div>
          <div class="chart-container doughnut-container">
            <Doughnut
              v-if="occupancyChartData"
              :data="occupancyChartData"
              :options="doughnutOptions"
            />
            <div v-else class="chart-empty">
              <p>Aucune donnee</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="bottom-row">
        <!-- Recent Orders -->
        <div class="recent-orders-card">
          <div class="card-header">
            <h3>
              <ShoppingCartOutlined />
              Commandes recentes
            </h3>
            <a-button type="link" @click="navigateToOrders">
              Voir tout <RightOutlined />
            </a-button>
          </div>
          <div class="orders-list">
            <div
              v-for="order in stats?.recentOrders?.slice(0, 5)"
              :key="order.id"
              class="order-item"
              @click="viewOrder(order)"
            >
              <div class="order-info">
                <span class="order-number">#{{ order.orderNumber }}</span>
                <span class="order-room">Chambre {{ order.roomNumber }}</span>
              </div>
              <div class="order-details">
                <span class="order-guest">{{ order.guestName }}</span>
                <span class="order-time">{{ formatTime(order.createdAt) }}</span>
              </div>
              <div class="order-status">
                <a-tag :color="getStatusColor(order.status)">
                  {{ getStatusLabel(order.status) }}
                </a-tag>
                <span class="order-total">{{ formatPrice(order.total) }}</span>
              </div>
            </div>
            <div v-if="!stats?.recentOrders?.length" class="empty-orders">
              <ShoppingCartOutlined />
              <p>Aucune commande recente</p>
            </div>
          </div>
        </div>

        <!-- Popular Dishes -->
        <div class="popular-dishes-card">
          <div class="card-header">
            <h3>
              <FireOutlined />
              Plats populaires
            </h3>
          </div>
          <div class="dishes-list">
            <div
              v-for="(dish, index) in stats?.popularDishes?.slice(0, 5)"
              :key="dish.dishId"
              class="dish-item"
            >
              <span class="dish-rank">{{ index + 1 }}</span>
              <div class="dish-info">
                <span class="dish-name">{{ dish.name.fr }}</span>
                <span class="dish-stats">{{ dish.orderCount }} commandes</span>
              </div>
              <span class="dish-revenue">{{ formatPrice(dish.revenue) }}</span>
            </div>
            <div v-if="!stats?.popularDishes?.length" class="empty-dishes">
              <FireOutlined />
              <p>Aucune donnee disponible</p>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-card">
          <div class="card-header">
            <h3>Actions rapides</h3>
          </div>
          <div class="actions-list">
            <a-button block size="large" @click="navigateToOrders">
              <template #icon><ShoppingCartOutlined /></template>
              Gerer les commandes
              <a-badge v-if="pendingOrdersCount > 0" :count="pendingOrdersCount" class="action-badge" />
            </a-button>
            <a-button block size="large" @click="navigateToRooms">
              <template #icon><TableOutlined /></template>
              Gerer les chambres
            </a-button>
            <a-button block size="large" @click="navigateToGuests">
              <template #icon><TeamOutlined /></template>
              Gerer les clients
            </a-button>
            <a-button block size="large" @click="router.push('/hotel-admin/kds')">
              <template #icon><FireOutlined /></template>
              Affichage cuisine (KDS)
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotel-dashboard {
  padding: 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #6366f1;
}

.header-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #64748b;
}

.loading-container p {
  margin-top: 16px;
}

.error-alert {
  margin-bottom: 24px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-card-indigo .stat-icon {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.stat-card-purple .stat-icon {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.stat-card-emerald .stat-icon {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-card-amber .stat-icon {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-title {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  margin: 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-subtitle {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.stat-badge {
  margin-left: 4px;
}

/* Charts Row */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr 300px;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1400px) {
  .charts-row {
    grid-template-columns: 1fr 1fr;
  }
  .chart-card-small {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
  .chart-card-small {
    grid-column: span 1;
  }
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.chart-container {
  height: 200px;
}

.doughnut-container {
  height: 240px;
}

.chart-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

/* Bottom Row */
.bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr 320px;
  gap: 20px;
}

@media (max-width: 1200px) {
  .bottom-row {
    grid-template-columns: 1fr 1fr;
  }
  .quick-actions-card {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .bottom-row {
    grid-template-columns: 1fr;
  }
  .quick-actions-card {
    grid-column: span 1;
  }
}

.recent-orders-card,
.popular-dishes-card,
.quick-actions-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Orders List */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.order-item:hover {
  background: #f1f5f9;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-number {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.order-room {
  font-size: 12px;
  color: #64748b;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}

.order-guest {
  font-size: 13px;
  color: #475569;
}

.order-time {
  font-size: 11px;
  color: #94a3b8;
}

.order-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.order-total {
  font-weight: 600;
  color: #6366f1;
  font-size: 14px;
}

.empty-orders,
.empty-dishes {
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
}

.empty-orders .anticon,
.empty-dishes .anticon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* Dishes List */
.dishes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dish-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.dish-rank {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.dish-info {
  flex: 1;
  min-width: 0;
}

.dish-name {
  display: block;
  font-weight: 500;
  color: #1e293b;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dish-stats {
  font-size: 11px;
  color: #94a3b8;
}

.dish-revenue {
  font-weight: 600;
  color: #10b981;
  font-size: 13px;
}

/* Quick Actions */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions-list :deep(.ant-btn) {
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  font-weight: 500;
}

.action-badge {
  margin-left: auto;
}
</style>
