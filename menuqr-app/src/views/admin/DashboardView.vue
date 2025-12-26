<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef, h } from 'vue';
import { message } from 'ant-design-vue';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  StarOutlined,
  MessageOutlined,
  MailOutlined,
  ReloadOutlined,
  CopyOutlined,
  PlusOutlined,
  SettingOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FireOutlined,
  TeamOutlined,
  MobileOutlined,
} from '@ant-design/icons-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import api, { type Order, type Restaurant, type Category, type Dish } from '@/services/api';
import type { LoyaltyStats } from '@/types/loyalty';
import type { TableStats, ReservationStats } from '@/types/reservation';
import type { AdminReviewStats } from '@/types/review';
import { formatPrice } from '@/utils/formatters';
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

// ============ TYPES ============
interface OrderStats {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
  };
  statusCounts: Record<string, number>;
}

interface CampaignStats {
  summary: {
    totalCampaigns: number;
    completedCampaigns: number;
    totalMessagesSent: number;
    totalSuccess: number;
    totalFailed: number;
  };
  statusCounts: Record<string, number>;
}

// ============ DAY LABELS ============
const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ============ STATE ============
const isLoading = ref(true);
const error = ref<string | null>(null);
const stats = ref<OrderStats | null>(null);
const previousStats = ref<OrderStats | null>(null);
const recentOrders = ref<Order[]>([]);
const dateRange = ref<'today' | 'week' | 'month'>('week');
const restaurant = ref<Restaurant | null>(null);
const categories = ref<Category[]>([]);
const dishes = ref<Dish[]>([]);
const isRefreshing = ref(false);
const activeSection = ref<string>('overview');
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Stats from APIs
const reservationStats = ref<ReservationStats | null>(null);
const tableStats = ref<TableStats | null>(null);
const loyaltyStats = ref<LoyaltyStats | null>(null);
const reviewStats = ref<AdminReviewStats | null>(null);
const campaignStats = ref<CampaignStats | null>(null);

// Chart data refs
const revenueChartData = shallowRef<any>(null);
const ordersChartData = shallowRef<any>(null);
const orderModesChartData = shallowRef<any>(null);
const reservationsChartData = shallowRef<any>(null);
const loyaltyTierChartData = shallowRef<any>(null);
const pointsFlowChartData = shallowRef<any>(null);
const reviewsChartData = shallowRef<any>(null);
const ratingTrendChartData = shallowRef<any>(null);
const campaignChartData = shallowRef<any>(null);
const deliveryRateChartData = shallowRef<any>(null);

// ============ CHART CONFIG ============
const colors = {
  primary: '#14b8a6',
  primaryLight: 'rgba(20, 184, 166, 0.1)',
  secondary: '#6366f1',
  secondaryLight: 'rgba(99, 102, 241, 0.1)',
  success: '#10b981',
  successLight: 'rgba(16, 185, 129, 0.1)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  danger: '#ef4444',
  dangerLight: 'rgba(239, 68, 68, 0.1)',
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#cbd5e1', cornerRadius: 8, padding: 12 },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
  },
  elements: { line: { tension: 0.4 }, point: { radius: 0, hoverRadius: 5 } },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: { legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, padding: 16, font: { size: 12 } } } },
};

// ============ COMPUTED ============
const greeting = computed(() => {
  const h = new Date().getHours();
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
});

const currentDate = computed(() => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

const periodOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: '7 jours' },
  { value: 'month', label: '30 jours' },
];

const sectionTabs = [
  { key: 'overview', label: 'Vue globale', icon: DashboardOutlined },
  { key: 'orders', label: 'Commandes', icon: ShoppingCartOutlined },
  { key: 'reservations', label: 'Réservations', icon: CalendarOutlined },
  { key: 'loyalty', label: 'Fidélité', icon: StarOutlined },
  { key: 'reviews', label: 'Avis', icon: MessageOutlined },
  { key: 'campaigns', label: 'Campagnes', icon: MailOutlined },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'warning' },
  confirmed: { label: 'Confirmée', color: 'processing' },
  preparing: { label: 'En préparation', color: 'purple' },
  ready: { label: 'Prête', color: 'success' },
  completed: { label: 'Terminée', color: 'default' },
  cancelled: { label: 'Annulée', color: 'error' },
};

const completionRate = computed(() => {
  if (!stats.value?.summary) return 0;
  const { totalOrders, completedOrders } = stats.value.summary;
  return totalOrders === 0 ? 0 : Math.round((completedOrders / totalOrders) * 100);
});

const pendingCount = computed(() => stats.value?.statusCounts?.pending || 0);
const preparingCount = computed(() => (stats.value?.statusCounts?.preparing || 0) + (stats.value?.statusCounts?.confirmed || 0));
const readyCount = computed(() => stats.value?.statusCounts?.ready || 0);

const calcTrend = (cur: number, prev: number) => {
  if (prev === 0) return { val: cur > 0 ? 100 : 0, up: cur >= 0 };
  const change = ((cur - prev) / prev) * 100;
  return { val: Math.abs(Math.round(change)), up: change >= 0 };
};

const revenueTrend = computed(() => calcTrend(stats.value?.summary?.totalRevenue || 0, previousStats.value?.summary?.totalRevenue || 0));
const ordersTrend = computed(() => calcTrend(stats.value?.summary?.totalOrders || 0, previousStats.value?.summary?.totalOrders || 0));

// Reviews computed
const totalReviews = computed(() => reviewStats.value?.total || 0);
const avgRating = computed(() => reviewStats.value?.averageRating?.toFixed(1) || '0.0');
const pendingReviews = computed(() => reviewStats.value?.pending || 0);

// Loyalty computed
const totalLoyalty = computed(() => loyaltyStats.value?.totalActiveMembers || 0);
const tierDistribution = computed(() => ({
  bronze: loyaltyStats.value?.tierDistribution?.bronze || 0,
  silver: loyaltyStats.value?.tierDistribution?.argent || 0,
  gold: loyaltyStats.value?.tierDistribution?.or || 0,
  platinum: loyaltyStats.value?.tierDistribution?.platine || 0,
}));

// Reservations computed
const totalReservations = computed(() => reservationStats.value?.total || 0);
const noShowRate = computed(() => reservationStats.value?.noShowRate || 0);

// Campaigns computed
const campaignSummary = computed(() => campaignStats.value?.summary || {
  totalCampaigns: 0, completedCampaigns: 0, totalMessagesSent: 0, totalSuccess: 0, totalFailed: 0
});
const deliveryRate = computed(() => {
  const { totalSuccess, totalFailed } = campaignSummary.value;
  const total = totalSuccess + totalFailed;
  return total > 0 ? Math.round((totalSuccess / total) * 100) : 0;
});

const topDishes = computed(() => {
  const counts: Record<string, { name: string; count: number; revenue: number }> = {};
  recentOrders.value.forEach(o => o.items.forEach(i => {
    if (!counts[i.dishId]) counts[i.dishId] = { name: i.name, count: 0, revenue: 0 };
    counts[i.dishId].count += i.quantity;
    counts[i.dishId].revenue += i.subtotal;
  }));
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
});

const menuUrl = computed(() => restaurant.value?.slug ? `${window.location.origin}/menu/${restaurant.value.slug}` : '');
const activeDishes = computed(() => dishes.value.filter(d => d.isAvailable).length);

// Recent orders table columns
const orderColumns: ColumnsType = [
  { title: 'N°', dataIndex: 'orderNumber', key: 'orderNumber', width: 100 },
  { title: 'Articles', dataIndex: 'items', key: 'items' },
  { title: 'Total', dataIndex: 'total', key: 'total', width: 120 },
  { title: 'Statut', dataIndex: 'status', key: 'status', width: 120 },
];

// ============ HELPERS ============
const getDateRange = (r: 'today' | 'week' | 'month') => {
  const now = new Date(), from = new Date();
  if (r === 'today') from.setHours(0, 0, 0, 0);
  else if (r === 'week') from.setDate(now.getDate() - 7);
  else from.setMonth(now.getMonth() - 1);
  return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
};

const getPrevRange = (r: 'today' | 'week' | 'month') => {
  const now = new Date(), from = new Date(), to = new Date();
  if (r === 'today') { from.setDate(now.getDate() - 1); from.setHours(0, 0, 0, 0); to.setDate(now.getDate() - 1); to.setHours(23, 59, 59, 999); }
  else if (r === 'week') { from.setDate(now.getDate() - 14); to.setDate(now.getDate() - 7); }
  else { from.setMonth(now.getMonth() - 2); to.setMonth(now.getMonth() - 1); }
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
};

const fmt = (v: number) => formatPrice(v, restaurant.value?.settings?.currency || 'XOF');
const timeSince = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  return m < 1 ? 'À l\'instant' : m < 60 ? `${m}min` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}j`;
};

const copyLink = async () => {
  if (menuUrl.value) {
    await navigator.clipboard.writeText(menuUrl.value);
    message.success('Lien copié !');
  }
};

// ============ CHARTS INIT ============
const initCharts = () => {
  revenueChartData.value = {
    labels: dayLabels,
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, stats.value?.summary?.totalRevenue || 0],
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
      fill: true,
      borderWidth: 2
    }],
  };

  const completed = stats.value?.summary?.completedOrders || 0;
  const cancelled = stats.value?.summary?.cancelledOrders || 0;
  ordersChartData.value = {
    labels: dayLabels,
    datasets: [
      { label: 'Terminées', data: [0, 0, 0, 0, 0, 0, completed], backgroundColor: colors.success, borderRadius: 4 },
      { label: 'Annulées', data: [0, 0, 0, 0, 0, 0, cancelled], backgroundColor: colors.danger, borderRadius: 4 },
    ],
  };

  const ordersByLocation = reservationStats.value?.byLocation || {};
  orderModesChartData.value = {
    labels: ['Sur place', 'À emporter', 'Livraison'],
    datasets: [{
      data: [ordersByLocation['interior'] || 50, ordersByLocation['terrace'] || 30, ordersByLocation['private'] || 20],
      backgroundColor: [colors.primary, colors.secondary, colors.warning],
      borderWidth: 0
    }],
  };

  const resTotal = reservationStats.value?.total || 0;
  reservationsChartData.value = {
    labels: dayLabels,
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, resTotal],
      borderColor: colors.secondary,
      backgroundColor: colors.secondaryLight,
      fill: true,
      borderWidth: 2
    }],
  };

  const tiers = tierDistribution.value;
  loyaltyTierChartData.value = {
    labels: ['Bronze', 'Argent', 'Or', 'Platine'],
    datasets: [{
      data: [tiers.bronze, tiers.silver, tiers.gold, tiers.platinum],
      backgroundColor: ['#b45309', '#64748b', '#eab308', '#8b5cf6'],
      borderWidth: 0
    }],
  };

  const pointsIssued = loyaltyStats.value?.totalPointsIssued || 0;
  const pointsRedeemed = loyaltyStats.value?.totalPointsRedeemed || 0;
  pointsFlowChartData.value = {
    labels: dayLabels,
    datasets: [
      { label: 'Gagnés', data: [0, 0, 0, 0, 0, 0, pointsIssued], borderColor: colors.success, backgroundColor: colors.successLight, fill: true, borderWidth: 2 },
      { label: 'Utilisés', data: [0, 0, 0, 0, 0, 0, pointsRedeemed], borderColor: colors.warning, backgroundColor: colors.warningLight, fill: true, borderWidth: 2 },
    ],
  };

  const totalRev = reviewStats.value?.total || 0;
  const approved = reviewStats.value?.approved || 0;
  const pending = reviewStats.value?.pending || 0;
  const rejected = reviewStats.value?.rejected || 0;
  reviewsChartData.value = {
    labels: ['5★', '4★', '3★', '2★', '1★'],
    datasets: [{
      data: [approved, Math.floor(totalRev * 0.3), Math.floor(totalRev * 0.1), rejected, pending],
      backgroundColor: [colors.success, colors.primary, colors.warning, colors.danger, '#94a3b8'],
      borderRadius: 4
    }],
  };

  const currentRating = reviewStats.value?.averageRating || 0;
  ratingTrendChartData.value = {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [{
      data: [currentRating * 0.95, currentRating * 0.98, currentRating * 0.97, currentRating],
      borderColor: colors.warning,
      backgroundColor: colors.warningLight,
      fill: true,
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: colors.warning
    }],
  };

  const totalSent = campaignSummary.value.totalMessagesSent || 0;
  campaignChartData.value = {
    labels: dayLabels,
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, totalSent],
      backgroundColor: colors.primary,
      borderRadius: 4
    }],
  };

  const success = campaignSummary.value.totalSuccess || 0;
  const failed = campaignSummary.value.totalFailed || 0;
  deliveryRateChartData.value = {
    labels: ['Délivrés', 'Échoués'],
    datasets: [{
      data: [success || 94, failed || 6],
      backgroundColor: [colors.success, colors.danger],
      borderWidth: 0
    }],
  };
};

// ============ FETCH ============
const fetchData = async (loader = true) => {
  if (loader) isRefreshing.value = true;
  error.value = null;
  try {
    const range = getDateRange(dateRange.value), prev = getPrevRange(dateRange.value);

    const [
      orderStatsRes, prevOrderStatsRes, activeOrdersRes,
      restaurantRes, categoriesRes, dishesRes,
      reservationStatsRes, tableStatsRes, loyaltyStatsRes,
      reviewStatsRes, campaignStatsRes
    ] = await Promise.all([
      api.getOrderStats(range),
      api.getOrderStats(prev),
      api.getActiveOrders(),
      api.getMyRestaurant(),
      api.getMyCategories(),
      api.getMyDishes(),
      api.getReservationStats(range),
      api.getTableStats(),
      api.getLoyaltyStats(),
      api.getAdminReviewStats(),
      api.getCampaignStats(),
    ]);

    if (orderStatsRes.success) stats.value = orderStatsRes.data;
    if (prevOrderStatsRes.success) previousStats.value = prevOrderStatsRes.data;
    if (activeOrdersRes.success) recentOrders.value = activeOrdersRes.data.slice(0, 5);
    if (restaurantRes.success) restaurant.value = restaurantRes.data;
    if (categoriesRes.success) categories.value = categoriesRes.data;
    if (dishesRes.success) dishes.value = dishesRes.data;
    if (reservationStatsRes.success) reservationStats.value = reservationStatsRes.data;
    if (tableStatsRes.success) tableStats.value = tableStatsRes.data;
    if (loyaltyStatsRes.success) loyaltyStats.value = loyaltyStatsRes.data;
    if (reviewStatsRes.success) reviewStats.value = reviewStatsRes.data;
    if (campaignStatsRes.success) campaignStats.value = campaignStatsRes.data;

    initCharts();
  } catch { error.value = 'Erreur de chargement'; }
  finally { isLoading.value = false; isRefreshing.value = false; }
};

const handlePeriodChange = (value: string) => {
  dateRange.value = value as 'today' | 'week' | 'month';
  isLoading.value = true;
  fetchData();
};

onMounted(() => { fetchData(); initCharts(); pollInterval = setInterval(() => fetchData(false), 30000); });
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval); });
</script>

<template>
  <div class="dashboard-view space-y-6">
    <!-- Header -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <div class="header-left">
          <p class="date-text">{{ currentDate }}</p>
          <h1 class="greeting">{{ greeting }}, {{ restaurant?.name || 'Restaurant' }}</h1>
        </div>
        <div class="header-right">
          <a-tooltip title="Copier le lien du menu">
            <a-button v-if="restaurant?.slug" @click="copyLink">
              <template #icon><CopyOutlined /></template>
              {{ restaurant?.slug }}
            </a-button>
          </a-tooltip>
          <a-button :loading="isRefreshing" @click="() => fetchData()">
            <template #icon><ReloadOutlined /></template>
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- Filters Row -->
    <a-card :bordered="false">
      <div class="filters-row">
        <a-segmented v-model:value="dateRange" :options="periodOptions" @change="handlePeriodChange" />
        <a-tabs v-model:activeKey="activeSection" type="card" size="small" class="section-tabs">
          <a-tab-pane v-for="tab in sectionTabs" :key="tab.key">
            <template #tab>
              <component :is="tab.icon" class="mr-1" />
              {{ tab.label }}
            </template>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-card>

    <!-- Loading -->
    <a-card v-if="isLoading" :bordered="false" class="text-center py-20">
      <a-spin size="large" tip="Chargement du tableau de bord..." />
    </a-card>

    <!-- Error -->
    <a-result v-else-if="error" status="error" title="Erreur de chargement" :sub-title="error">
      <template #extra>
        <a-button type="primary" @click="() => fetchData()">Réessayer</a-button>
      </template>
    </a-result>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Pending Orders Alert -->
      <a-alert
        v-if="pendingCount > 0"
        type="warning"
        show-icon
        banner
      >
        <template #icon><ClockCircleOutlined /></template>
        <template #message>
          <div class="alert-content">
            <span><strong>{{ pendingCount }} commande{{ pendingCount > 1 ? 's' : '' }}</strong> en attente de traitement</span>
            <router-link to="/admin/orders?status=pending">
              <a-button type="primary" size="small">Voir les commandes</a-button>
            </router-link>
          </div>
        </template>
      </a-alert>

      <!-- ==================== OVERVIEW ==================== -->
      <template v-if="activeSection === 'overview'">
        <!-- KPIs -->
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="stat-card">
              <a-statistic
                title="Chiffre d'affaires"
                :value="stats?.summary?.totalRevenue || 0"
                :formatter="(val) => fmt(Number(val))"
              >
                <template #suffix>
                  <a-tag v-if="revenueTrend.val" :color="revenueTrend.up ? 'success' : 'error'" size="small">
                    <component :is="revenueTrend.up ? RiseOutlined : FallOutlined" />
                    {{ revenueTrend.val }}%
                  </a-tag>
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="stat-card">
              <a-statistic title="Commandes" :value="stats?.summary?.totalOrders || 0">
                <template #suffix>
                  <a-tag v-if="ordersTrend.val" :color="ordersTrend.up ? 'success' : 'error'" size="small">
                    <component :is="ordersTrend.up ? RiseOutlined : FallOutlined" />
                    {{ ordersTrend.val }}%
                  </a-tag>
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="stat-card">
              <a-statistic
                title="Panier moyen"
                :value="stats?.summary?.averageOrderValue || 0"
                :formatter="(val) => fmt(Number(val))"
              />
            </a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="stat-card">
              <a-statistic title="Complétion" :value="completionRate" suffix="%">
                <template #prefix><CheckCircleOutlined /></template>
              </a-statistic>
              <a-progress :percent="completionRate" :show-info="false" stroke-color="#14b8a6" class="mt-2" />
            </a-card>
          </a-col>
        </a-row>

        <!-- Quick Stats -->
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="quick-stat">
              <div class="quick-stat-content">
                <div class="quick-stat-icon star"><StarOutlined /></div>
                <div>
                  <p class="quick-stat-label">Note moyenne</p>
                  <p class="quick-stat-value">{{ avgRating }}</p>
                </div>
              </div>
            </a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="quick-stat">
              <div class="quick-stat-content">
                <div class="quick-stat-icon team"><TeamOutlined /></div>
                <div>
                  <p class="quick-stat-label">Membres fidélité</p>
                  <p class="quick-stat-value">{{ totalLoyalty }}</p>
                </div>
              </div>
            </a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="quick-stat">
              <div class="quick-stat-content">
                <div class="quick-stat-icon calendar"><CalendarOutlined /></div>
                <div>
                  <p class="quick-stat-label">Réservations</p>
                  <p class="quick-stat-value">{{ totalReservations }}</p>
                </div>
              </div>
            </a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="quick-stat">
              <div class="quick-stat-content">
                <div class="quick-stat-icon mobile"><MobileOutlined /></div>
                <div>
                  <p class="quick-stat-label">SMS envoyés</p>
                  <p class="quick-stat-value">{{ campaignSummary.totalMessagesSent }}</p>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>

        <!-- Charts -->
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="12">
            <a-card title="Revenus" :bordered="false">
              <div class="chart-container"><Line v-if="revenueChartData" :data="revenueChartData" :options="chartOptions" /></div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="12">
            <a-card title="Commandes" :bordered="false">
              <div class="chart-container"><Bar v-if="ordersChartData" :data="ordersChartData" :options="{ ...chartOptions, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true } } }" /></div>
            </a-card>
          </a-col>
        </a-row>

        <!-- Orders & Top Dishes -->
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="16">
            <a-card :bordered="false">
              <template #title>Commandes récentes</template>
              <template #extra><router-link to="/admin/orders">Voir tout</router-link></template>
              <a-table
                :data-source="recentOrders"
                :columns="orderColumns"
                :pagination="false"
                size="small"
                :row-key="(record) => record._id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'orderNumber'">
                    <a-tag>#{{ record.orderNumber }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'items'">
                    {{ record.items.length }} article{{ record.items.length > 1 ? 's' : '' }} · {{ timeSince(record.createdAt) }}
                  </template>
                  <template v-else-if="column.key === 'total'">
                    <strong>{{ fmt(record.total) }}</strong>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="statusConfig[record.status]?.color">
                      {{ statusConfig[record.status]?.label }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
              <a-empty v-if="recentOrders.length === 0" description="Aucune commande récente" />
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="8">
            <a-card title="Meilleures ventes" :bordered="false">
              <template #extra><FireOutlined style="color: #f59e0b" /></template>
              <a-empty v-if="topDishes.length === 0" description="Pas de données" />
              <div v-else class="top-dishes">
                <div v-for="(dish, index) in topDishes" :key="dish.name" class="top-dish-item">
                  <a-badge :count="index + 1" :number-style="{ backgroundColor: index === 0 ? '#f59e0b' : '#94a3b8' }" />
                  <div class="top-dish-info">
                    <p class="top-dish-name">{{ dish.name }}</p>
                    <p class="top-dish-count">{{ dish.count }} vendu{{ dish.count > 1 ? 's' : '' }}</p>
                  </div>
                  <span class="top-dish-revenue">{{ fmt(dish.revenue) }}</span>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </template>

      <!-- ==================== ORDERS ==================== -->
      <template v-if="activeSection === 'orders'">
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <router-link to="/admin/orders?status=pending">
              <a-card :bordered="false" class="status-card pending" hoverable>
                <a-statistic title="En attente" :value="pendingCount" :value-style="{ color: '#d97706' }">
                  <template #prefix><ClockCircleOutlined /></template>
                </a-statistic>
              </a-card>
            </router-link>
          </a-col>
          <a-col :xs="12" :lg="6">
            <router-link to="/admin/orders?status=preparing">
              <a-card :bordered="false" class="status-card preparing" hoverable>
                <a-statistic title="En cuisine" :value="preparingCount" :value-style="{ color: '#7c3aed' }">
                  <template #prefix><FireOutlined /></template>
                </a-statistic>
              </a-card>
            </router-link>
          </a-col>
          <a-col :xs="12" :lg="6">
            <router-link to="/admin/orders?status=ready">
              <a-card :bordered="false" class="status-card ready" hoverable>
                <a-statistic title="Prêtes" :value="readyCount" :value-style="{ color: '#059669' }">
                  <template #prefix><CheckCircleOutlined /></template>
                </a-statistic>
              </a-card>
            </router-link>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="status-card completed">
              <a-statistic title="Terminées" :value="stats?.summary?.completedOrders || 0">
                <template #prefix><CheckCircleOutlined /></template>
              </a-statistic>
            </a-card>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="12">
            <a-card title="Revenus" :bordered="false">
              <div class="chart-container-lg"><Line v-if="revenueChartData" :data="revenueChartData" :options="chartOptions" /></div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="12">
            <a-card title="Commandes" :bordered="false">
              <div class="chart-container-lg"><Bar v-if="ordersChartData" :data="ordersChartData" :options="{ ...chartOptions, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true } } }" /></div>
            </a-card>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="8">
            <a-card title="Modes de commande" :bordered="false">
              <div class="chart-container"><Doughnut v-if="orderModesChartData" :data="orderModesChartData" :options="doughnutOptions" /></div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="16">
            <a-row :gutter="[16, 16]">
              <a-col :span="12">
                <a-card :bordered="false" class="highlight-card success">
                  <a-statistic title="Terminées" :value="stats?.summary?.completedOrders || 0" :value-style="{ color: '#fff' }" />
                  <p class="highlight-sub">{{ completionRate }}% du total</p>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card :bordered="false" class="highlight-card danger">
                  <a-statistic title="Annulées" :value="stats?.summary?.cancelledOrders || 0" :value-style="{ color: '#fff' }" />
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card :bordered="false" class="highlight-card dark">
                  <a-statistic title="Panier moyen" :value="stats?.summary?.averageOrderValue || 0" :formatter="(val) => fmt(Number(val))" :value-style="{ color: '#fff' }" />
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card :bordered="false" class="highlight-card darker">
                  <a-statistic title="Revenue total" :value="stats?.summary?.totalRevenue || 0" :formatter="(val) => fmt(Number(val))" :value-style="{ color: '#fff' }" />
                </a-card>
              </a-col>
            </a-row>
          </a-col>
        </a-row>
      </template>

      <!-- ==================== RESERVATIONS ==================== -->
      <template v-if="activeSection === 'reservations'">
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Cette période" :value="totalReservations" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Tables actives" :value="`${tableStats?.active || 0}/${tableStats?.total || 0}`" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Taux no-show" :value="noShowRate" suffix="%" :precision="1" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Taille moy. groupe" :value="reservationStats?.avgPartySize || 0" :precision="1" /></a-card>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="12">
            <a-card title="Réservations par jour" :bordered="false">
              <div class="chart-container-lg"><Line v-if="reservationsChartData" :data="reservationsChartData" :options="chartOptions" /></div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="12">
            <a-card title="Statistiques Tables" :bordered="false">
              <div class="table-stats">
                <div class="table-stat-item">
                  <div class="table-stat-header"><span>Tables actives</span><span class="value success">{{ tableStats?.active || 0 }}</span></div>
                  <a-progress :percent="tableStats?.total ? (tableStats.active / tableStats.total) * 100 : 0" :show-info="false" stroke-color="#10b981" />
                </div>
                <div class="table-stat-item">
                  <div class="table-stat-header"><span>Capacité totale</span><span class="value primary">{{ tableStats?.totalCapacity || 0 }} places</span></div>
                </div>
                <div class="table-stat-item">
                  <div class="table-stat-header"><span>Capacité moyenne</span><span class="value purple">{{ tableStats?.avgCapacity?.toFixed(1) || 0 }} pers.</span></div>
                </div>
                <div class="table-stat-item">
                  <div class="table-stat-header"><span>Pré-commandes</span><span class="value teal">{{ (reservationStats?.preOrderRate || 0).toFixed(0) }}%</span></div>
                  <a-progress :percent="reservationStats?.preOrderRate || 0" :show-info="false" stroke-color="#14b8a6" />
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </template>

      <!-- ==================== LOYALTY ==================== -->
      <template v-if="activeSection === 'loyalty'">
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="tier-card bronze"><a-statistic title="Bronze" :value="tierDistribution.bronze" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="tier-card silver"><a-statistic title="Argent" :value="tierDistribution.silver" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="tier-card gold"><a-statistic title="Or" :value="tierDistribution.gold" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="tier-card platinum"><a-statistic title="Platine" :value="tierDistribution.platinum" /></a-card>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="12">
            <a-card title="Répartition des tiers" :bordered="false">
              <div class="chart-container-lg"><Doughnut v-if="loyaltyTierChartData" :data="loyaltyTierChartData" :options="doughnutOptions" /></div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="12">
            <a-card title="Flux de points" :bordered="false">
              <div class="chart-container-lg"><Line v-if="pointsFlowChartData" :data="pointsFlowChartData" :options="{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true, position: 'top' } } }" /></div>
            </a-card>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="8">
            <a-card :bordered="false"><a-statistic title="Points émis" :value="loyaltyStats?.totalPointsIssued || 0" :value-style="{ color: '#10b981' }" /></a-card>
          </a-col>
          <a-col :xs="24" :lg="8">
            <a-card :bordered="false"><a-statistic title="Points échangés" :value="loyaltyStats?.totalPointsRedeemed || 0" :value-style="{ color: '#6366f1' }" /></a-card>
          </a-col>
          <a-col :xs="24" :lg="8">
            <a-card :bordered="false">
              <a-statistic title="Membres actifs" :value="totalLoyalty" />
              <a-progress :percent="100" :show-info="false" stroke-color="#10b981" class="mt-2" />
            </a-card>
          </a-col>
        </a-row>
      </template>

      <!-- ==================== REVIEWS ==================== -->
      <template v-if="activeSection === 'reviews'">
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="rating-card"><a-statistic title="Note moyenne" :value="avgRating" suffix="⭐" :value-style="{ color: '#f59e0b' }" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Total avis" :value="totalReviews" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="En attente" :value="pendingReviews" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Taux de réponse" :value="reviewStats?.responseRate || 0" suffix="%" :precision="0" /></a-card>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="12">
            <a-card title="Distribution des notes" :bordered="false">
              <div class="chart-container-lg"><Bar v-if="reviewsChartData" :data="reviewsChartData" :options="{ ...chartOptions, indexAxis: 'y' }" /></div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="12">
            <a-card title="Évolution de la note" :bordered="false">
              <div class="chart-container-lg"><Line v-if="ratingTrendChartData" :data="ratingTrendChartData" :options="{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, min: 1, max: 5 } } }" /></div>
            </a-card>
          </a-col>
        </a-row>
      </template>

      <!-- ==================== CAMPAIGNS ==================== -->
      <template v-if="activeSection === 'campaigns'">
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Campagnes" :value="campaignSummary.totalCampaigns" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Messages envoyés" :value="campaignSummary.totalMessagesSent" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false" class="success-rate-card"><a-statistic title="Taux de succès" :value="deliveryRate" suffix="%" :value-style="{ color: '#10b981' }" /></a-card>
          </a-col>
          <a-col :xs="12" :lg="6">
            <a-card :bordered="false"><a-statistic title="Terminées" :value="campaignSummary.completedCampaigns" /></a-card>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :lg="12">
            <a-card title="Messages envoyés" :bordered="false">
              <div class="chart-container-lg"><Bar v-if="campaignChartData" :data="campaignChartData" :options="chartOptions" /></div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="12">
            <a-card title="Taux de délivrabilité" :bordered="false">
              <div class="chart-container-lg"><Doughnut v-if="deliveryRateChartData" :data="deliveryRateChartData" :options="doughnutOptions" /></div>
            </a-card>
          </a-col>
        </a-row>
      </template>

      <!-- Quick Actions -->
      <a-card title="Actions rapides" :bordered="false">
        <a-row :gutter="[16, 16]">
          <a-col :xs="12" :lg="6">
            <router-link to="/admin/dishes">
              <a-card hoverable size="small" class="action-card">
                <div class="action-content">
                  <div class="action-icon teal"><PlusOutlined /></div>
                  <div>
                    <p class="action-title">Ajouter un plat</p>
                    <p class="action-sub">{{ activeDishes }} actifs</p>
                  </div>
                </div>
              </a-card>
            </router-link>
          </a-col>
          <a-col :xs="12" :lg="6">
            <router-link to="/admin/reservations">
              <a-card hoverable size="small" class="action-card">
                <div class="action-content">
                  <div class="action-icon blue"><CalendarOutlined /></div>
                  <div>
                    <p class="action-title">Réservations</p>
                    <p class="action-sub">Gérer</p>
                  </div>
                </div>
              </a-card>
            </router-link>
          </a-col>
          <a-col :xs="12" :lg="6">
            <router-link to="/admin/campaigns">
              <a-card hoverable size="small" class="action-card">
                <div class="action-content">
                  <div class="action-icon purple"><MailOutlined /></div>
                  <div>
                    <p class="action-title">Nouvelle campagne</p>
                    <p class="action-sub">SMS</p>
                  </div>
                </div>
              </a-card>
            </router-link>
          </a-col>
          <a-col :xs="12" :lg="6">
            <router-link to="/admin/settings">
              <a-card hoverable size="small" class="action-card">
                <div class="action-content">
                  <div class="action-icon gray"><SettingOutlined /></div>
                  <div>
                    <p class="action-title">Paramètres</p>
                    <p class="action-sub">Configurer</p>
                  </div>
                </div>
              </a-card>
            </router-link>
          </a-col>
        </a-row>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left .date-text {
  color: #64748b;
  font-size: 13px;
  text-transform: capitalize;
  margin-bottom: 4px;
}

.header-left .greeting {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* Filters */
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.section-tabs {
  flex: 1;
}

.section-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

/* Alert */
.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Stat Cards */
.stat-card {
  height: 100%;
}

/* Quick Stats */
.quick-stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quick-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.quick-stat-icon.star { background: #fef3c7; color: #d97706; }
.quick-stat-icon.team { background: #ede9fe; color: #7c3aed; }
.quick-stat-icon.calendar { background: #dbeafe; color: #2563eb; }
.quick-stat-icon.mobile { background: #ccfbf1; color: #0d9488; }

.quick-stat-label {
  color: #64748b;
  font-size: 13px;
  margin: 0;
}

.quick-stat-value {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
}

/* Charts */
.chart-container {
  height: 220px;
}

.chart-container-lg {
  height: 260px;
}

/* Top Dishes */
.top-dishes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-dish-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-dish-info {
  flex: 1;
  min-width: 0;
}

.top-dish-name {
  font-weight: 500;
  color: #1e293b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-dish-count {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.top-dish-revenue {
  font-weight: 500;
  color: #334155;
}

/* Status Cards */
.status-card.pending { background: #fffbeb; }
.status-card.preparing { background: #f5f3ff; }
.status-card.ready { background: #ecfdf5; }
.status-card.completed { background: #f8fafc; }

/* Highlight Cards */
.highlight-card {
  color: white;
}

.highlight-card.success { background: #14b8a6; }
.highlight-card.danger { background: #ef4444; }
.highlight-card.dark { background: #334155; }
.highlight-card.darker { background: #1e293b; }

.highlight-card :deep(.ant-statistic-title) {
  color: rgba(255, 255, 255, 0.8);
}

.highlight-sub {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  margin-top: 8px;
}

/* Table Stats */
.table-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-stat-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.table-stat-header .value {
  font-weight: 500;
}

.table-stat-header .value.success { color: #10b981; }
.table-stat-header .value.primary { color: #2563eb; }
.table-stat-header .value.purple { color: #7c3aed; }
.table-stat-header .value.teal { color: #14b8a6; }

/* Tier Cards */
.tier-card.bronze { background: #fef3c7; }
.tier-card.silver { background: #f1f5f9; }
.tier-card.gold { background: #fef9c3; }
.tier-card.platinum { background: #f5f3ff; }

.tier-card.bronze :deep(.ant-statistic-title) { color: #92400e; }
.tier-card.silver :deep(.ant-statistic-title) { color: #475569; }
.tier-card.gold :deep(.ant-statistic-title) { color: #a16207; }
.tier-card.platinum :deep(.ant-statistic-title) { color: #6d28d9; }

/* Rating Card */
.rating-card {
  background: #fffbeb;
}

/* Success Rate Card */
.success-rate-card {
  background: #ecfdf5;
}

/* Action Cards */
.action-card {
  transition: all 0.3s;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.action-icon.teal { background: #ccfbf1; color: #0d9488; }
.action-icon.blue { background: #dbeafe; color: #2563eb; }
.action-icon.purple { background: #ede9fe; color: #7c3aed; }
.action-icon.gray { background: #f1f5f9; color: #475569; }

.action-title {
  font-weight: 500;
  color: #1e293b;
  margin: 0;
}

.action-sub {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .section-tabs :deep(.ant-tabs-nav-list) {
    flex-wrap: wrap;
  }

  .header-left .greeting {
    font-size: 20px;
  }
}
</style>
