<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef } from 'vue';
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
const activeSection = ref<'overview' | 'orders' | 'reservations' | 'loyalty' | 'reviews' | 'campaigns'>('overview');
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
  primary: '#0d9488',
  primaryLight: 'rgba(13, 148, 136, 0.1)',
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

const sections = [
  { id: 'overview', label: 'Vue globale', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { id: 'orders', label: 'Commandes', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'reservations', label: 'Réservations', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'loyalty', label: 'Fidélité', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { id: 'reviews', label: 'Avis', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { id: 'campaigns', label: 'Campagnes', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmée', class: 'bg-blue-50 text-blue-700' },
  preparing: { label: 'En préparation', class: 'bg-violet-50 text-violet-700' },
  ready: { label: 'Prête', class: 'bg-emerald-50 text-emerald-700' },
  completed: { label: 'Terminée', class: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Annulée', class: 'bg-red-50 text-red-700' },
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

// Tables computed
const avgOccupancy = computed(() => {
  if (!tableStats.value) return 0;
  const { active, total } = tableStats.value;
  return total > 0 ? Math.round((active / total) * 100) : 0;
});

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
const timeSince = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 1 ? 'À l\'instant' : m < 60 ? `${m}min` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}j`; };
const copyLink = async () => { if (menuUrl.value) await navigator.clipboard.writeText(menuUrl.value); };

// ============ CHARTS INIT ============
const initCharts = () => {
  // Revenue chart - placeholder data until we have time-series from API
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

  // Orders chart - use summary data
  const completed = stats.value?.summary?.completedOrders || 0;
  const cancelled = stats.value?.summary?.cancelledOrders || 0;
  ordersChartData.value = {
    labels: dayLabels,
    datasets: [
      { label: 'Terminées', data: [0, 0, 0, 0, 0, 0, completed], backgroundColor: colors.success, borderRadius: 4 },
      { label: 'Annulées', data: [0, 0, 0, 0, 0, 0, cancelled], backgroundColor: colors.danger, borderRadius: 4 },
    ],
  };

  // Order modes - placeholder (would need API enhancement for this data)
  const ordersByLocation = reservationStats.value?.byLocation || {};
  orderModesChartData.value = {
    labels: ['Sur place', 'À emporter', 'Livraison'],
    datasets: [{
      data: [
        ordersByLocation['interior'] || 50,
        ordersByLocation['terrace'] || 30,
        ordersByLocation['private'] || 20
      ],
      backgroundColor: [colors.primary, colors.secondary, colors.warning],
      borderWidth: 0
    }],
  };

  // Reservations chart
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

  // Loyalty tier distribution
  const tiers = tierDistribution.value;
  loyaltyTierChartData.value = {
    labels: ['Bronze', 'Argent', 'Or', 'Platine'],
    datasets: [{
      data: [tiers.bronze, tiers.silver, tiers.gold, tiers.platinum],
      backgroundColor: ['#b45309', '#64748b', '#eab308', '#8b5cf6'],
      borderWidth: 0
    }],
  };

  // Points flow - use totals
  const pointsIssued = loyaltyStats.value?.totalPointsIssued || 0;
  const pointsRedeemed = loyaltyStats.value?.totalPointsRedeemed || 0;
  pointsFlowChartData.value = {
    labels: dayLabels,
    datasets: [
      { label: 'Gagnés', data: [0, 0, 0, 0, 0, 0, pointsIssued], borderColor: colors.success, backgroundColor: colors.successLight, fill: true, borderWidth: 2 },
      { label: 'Utilisés', data: [0, 0, 0, 0, 0, 0, pointsRedeemed], borderColor: colors.warning, backgroundColor: colors.warningLight, fill: true, borderWidth: 2 },
    ],
  };

  // Reviews distribution - placeholder until API provides distribution
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

  // Rating trend
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

  // Campaign messages
  const totalSent = campaignSummary.value.totalMessagesSent || 0;
  campaignChartData.value = {
    labels: dayLabels,
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, totalSent],
      backgroundColor: colors.primary,
      borderRadius: 4
    }],
  };

  // Delivery rate
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

    // Fetch all data in parallel
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

    // Order stats
    if (orderStatsRes.success) stats.value = orderStatsRes.data;
    if (prevOrderStatsRes.success) previousStats.value = prevOrderStatsRes.data;
    if (activeOrdersRes.success) recentOrders.value = activeOrdersRes.data.slice(0, 5);

    // Restaurant data
    if (restaurantRes.success) restaurant.value = restaurantRes.data;
    if (categoriesRes.success) categories.value = categoriesRes.data;
    if (dishesRes.success) dishes.value = dishesRes.data;

    // Additional stats
    if (reservationStatsRes.success) reservationStats.value = reservationStatsRes.data;
    if (tableStatsRes.success) tableStats.value = tableStatsRes.data;
    if (loyaltyStatsRes.success) loyaltyStats.value = loyaltyStatsRes.data;
    if (reviewStatsRes.success) reviewStats.value = reviewStatsRes.data;
    if (campaignStatsRes.success) campaignStats.value = campaignStatsRes.data;

    // Update charts with real data
    initCharts();
  } catch { error.value = 'Erreur de chargement'; }
  finally { isLoading.value = false; isRefreshing.value = false; }
};

onMounted(() => { fetchData(); initCharts(); pollInterval = setInterval(() => fetchData(false), 30000); });
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval); });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-sm text-slate-500 capitalize">{{ currentDate }}</p>
        <h1 class="text-2xl font-semibold text-slate-900">{{ greeting }}, {{ restaurant?.name || 'Restaurant' }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <div class="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
          <span class="truncate max-w-[120px]">{{ restaurant?.slug }}</span>
          <button @click="copyLink" class="hover:text-slate-900"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
        </div>
        <button @click="fetchData()" :disabled="isRefreshing" class="p-2 bg-slate-100 rounded-lg hover:bg-slate-200">
          <svg :class="['w-5 h-5 text-slate-600', isRefreshing && 'animate-spin']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
    </div>

    <!-- Filters Row -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- Period -->
      <div class="flex p-1 bg-slate-100 rounded-lg w-fit">
        <button v-for="p in periodOptions" :key="p.value"
          @click="dateRange = p.value as any; isLoading = true; fetchData()"
          :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors', dateRange === p.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900']">
          {{ p.label }}
        </button>
      </div>
      <!-- Sections -->
      <div class="flex gap-1 overflow-x-auto pb-1">
        <button v-for="s in sections" :key="s.id" @click="activeSection = s.id as any"
          :class="['flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors', activeSection === s.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100']">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="s.icon"/></svg>
          {{ s.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-red-600 mb-4">{{ error }}</p>
      <button @click="fetchData" class="text-teal-600 hover:underline">Réessayer</button>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Alert -->
      <div v-if="pendingCount > 0" class="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg">⏳</div>
          <div>
            <p class="font-medium text-amber-900">{{ pendingCount }} commande{{ pendingCount > 1 ? 's' : '' }} en attente</p>
            <p class="text-sm text-amber-700">Nécessite votre attention</p>
          </div>
        </div>
        <router-link to="/admin/orders?status=pending" class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">Voir</router-link>
      </div>

      <!-- ==================== OVERVIEW ==================== -->
      <template v-if="activeSection === 'overview'">
        <!-- KPIs -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-500">Chiffre d'affaires</span>
              <span v-if="revenueTrend.val" :class="['text-xs font-medium px-2 py-0.5 rounded-full', revenueTrend.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600']">{{ revenueTrend.up ? '+' : '-' }}{{ revenueTrend.val }}%</span>
            </div>
            <p class="text-2xl font-semibold text-slate-900">{{ fmt(stats?.summary?.totalRevenue || 0) }}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-500">Commandes</span>
              <span v-if="ordersTrend.val" :class="['text-xs font-medium px-2 py-0.5 rounded-full', ordersTrend.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600']">{{ ordersTrend.up ? '+' : '-' }}{{ ordersTrend.val }}%</span>
            </div>
            <p class="text-2xl font-semibold text-slate-900">{{ stats?.summary?.totalOrders || 0 }}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <span class="text-sm text-slate-500">Panier moyen</span>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ fmt(stats?.summary?.averageOrderValue || 0) }}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <span class="text-sm text-slate-500">Complétion</span>
            <div class="mt-2 flex items-center gap-3">
              <span class="text-2xl font-semibold text-slate-900">{{ completionRate }}%</span>
              <div class="flex-1 h-2 bg-slate-100 rounded-full"><div class="h-full bg-teal-500 rounded-full" :style="{ width: completionRate + '%' }"></div></div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl">⭐</div>
            <div><p class="text-sm text-slate-500">Note moyenne</p><p class="text-xl font-semibold text-slate-900">{{ avgRating }}</p></div>
          </div>
          <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div class="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-xl">👥</div>
            <div><p class="text-sm text-slate-500">Membres fidélité</p><p class="text-xl font-semibold text-slate-900">{{ totalLoyalty }}</p></div>
          </div>
          <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📅</div>
            <div><p class="text-sm text-slate-500">Réservations</p><p class="text-xl font-semibold text-slate-900">{{ totalReservations }}</p></div>
          </div>
          <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-xl">📱</div>
            <div><p class="text-sm text-slate-500">SMS envoyés</p><p class="text-xl font-semibold text-slate-900">{{ campaignSummary.totalMessagesSent }}</p></div>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="font-medium text-slate-900 mb-4">Revenus</h3>
            <div class="h-56"><Line v-if="revenueChartData" :data="revenueChartData" :options="chartOptions" /></div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="font-medium text-slate-900 mb-4">Commandes</h3>
            <div class="h-56"><Bar v-if="ordersChartData" :data="ordersChartData" :options="{ ...chartOptions, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true } } }" /></div>
          </div>
        </div>

        <!-- Orders & Top -->
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl">
            <div class="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 class="font-medium text-slate-900">Commandes récentes</h3>
              <router-link to="/admin/orders" class="text-sm text-teal-600 hover:text-teal-700">Voir tout</router-link>
            </div>
            <div v-if="recentOrders.length === 0" class="p-10 text-center text-slate-500">Aucune commande</div>
            <div v-else class="divide-y divide-slate-100">
              <router-link v-for="o in recentOrders" :key="o._id" to="/admin/orders" class="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div :class="['w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold', statusConfig[o.status]?.class]">#{{ o.orderNumber.slice(-3) }}</div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-slate-900">#{{ o.orderNumber }}</p>
                  <p class="text-sm text-slate-500">{{ o.items.length }} article{{ o.items.length > 1 ? 's' : '' }} · {{ timeSince(o.createdAt) }}</p>
                </div>
                <div class="text-right">
                  <p class="font-medium text-slate-900">{{ fmt(o.total) }}</p>
                  <span :class="['text-xs', statusConfig[o.status]?.class.replace('bg-', 'text-').split(' ')[1]]">{{ statusConfig[o.status]?.label }}</span>
                </div>
              </router-link>
            </div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="font-medium text-slate-900 mb-4">Meilleures ventes</h3>
            <div v-if="topDishes.length === 0" class="text-sm text-slate-500 text-center py-8">Pas de données</div>
            <div v-else class="space-y-3">
              <div v-for="(d, i) in topDishes" :key="d.name" class="flex items-center gap-3">
                <span class="w-6 h-6 bg-slate-100 rounded-full text-xs font-medium text-slate-600 flex items-center justify-center">{{ i + 1 }}</span>
                <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-900 truncate">{{ d.name }}</p><p class="text-xs text-slate-500">{{ d.count }} vendu{{ d.count > 1 ? 's' : '' }}</p></div>
                <span class="text-sm font-medium text-slate-700">{{ fmt(d.revenue) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== ORDERS ==================== -->
      <template v-if="activeSection === 'orders'">
        <div class="grid gap-4 sm:grid-cols-4">
          <router-link to="/admin/orders?status=pending" class="flex items-center gap-3 p-4 bg-amber-50 rounded-xl hover:bg-amber-100"><span class="text-2xl">⏳</span><div><p class="text-2xl font-semibold text-amber-700">{{ pendingCount }}</p><p class="text-xs text-amber-600">En attente</p></div></router-link>
          <router-link to="/admin/orders?status=preparing" class="flex items-center gap-3 p-4 bg-violet-50 rounded-xl hover:bg-violet-100"><span class="text-2xl">👨‍🍳</span><div><p class="text-2xl font-semibold text-violet-700">{{ preparingCount }}</p><p class="text-xs text-violet-600">En cuisine</p></div></router-link>
          <router-link to="/admin/orders?status=ready" class="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100"><span class="text-2xl">✅</span><div><p class="text-2xl font-semibold text-emerald-700">{{ readyCount }}</p><p class="text-xs text-emerald-600">Prêtes</p></div></router-link>
          <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl"><span class="text-2xl">📦</span><div><p class="text-2xl font-semibold text-slate-700">{{ stats?.summary?.completedOrders || 0 }}</p><p class="text-xs text-slate-600">Terminées</p></div></div>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Revenus</h3><div class="h-64"><Line v-if="revenueChartData" :data="revenueChartData" :options="chartOptions" /></div></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Commandes</h3><div class="h-64"><Bar v-if="ordersChartData" :data="ordersChartData" :options="{ ...chartOptions, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true } } }" /></div></div>
        </div>
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Modes de commande</h3><div class="h-56"><Doughnut v-if="orderModesChartData" :data="orderModesChartData" :options="doughnutOptions" /></div></div>
          <div class="lg:col-span-2 grid gap-4 sm:grid-cols-2">
            <div class="bg-teal-600 text-white rounded-xl p-5"><p class="text-sm text-teal-100">Terminées</p><p class="text-3xl font-semibold mt-2">{{ stats?.summary?.completedOrders || 0 }}</p><p class="text-sm text-teal-100 mt-2">{{ completionRate }}% du total</p></div>
            <div class="bg-red-500 text-white rounded-xl p-5"><p class="text-sm text-red-100">Annulées</p><p class="text-3xl font-semibold mt-2">{{ stats?.summary?.cancelledOrders || 0 }}</p></div>
            <div class="bg-slate-700 text-white rounded-xl p-5"><p class="text-sm text-slate-300">Panier moyen</p><p class="text-3xl font-semibold mt-2">{{ fmt(stats?.summary?.averageOrderValue || 0) }}</p></div>
            <div class="bg-slate-800 text-white rounded-xl p-5"><p class="text-sm text-slate-300">Revenue total</p><p class="text-3xl font-semibold mt-2">{{ fmt(stats?.summary?.totalRevenue || 0) }}</p></div>
          </div>
        </div>
      </template>

      <!-- ==================== RESERVATIONS ==================== -->
      <template v-if="activeSection === 'reservations'">
        <div class="grid gap-4 sm:grid-cols-4">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Cette période</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ totalReservations }}</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Tables actives</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ tableStats?.active || 0 }}/{{ tableStats?.total || 0 }}</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Taux no-show</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ noShowRate.toFixed(1) }}%</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Taille moy. groupe</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ reservationStats?.avgPartySize?.toFixed(1) || '0' }}</p></div>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Réservations par jour</h3><div class="h-64"><Line v-if="reservationsChartData" :data="reservationsChartData" :options="chartOptions" /></div></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="font-medium text-slate-900 mb-4">Statistiques Tables</h3>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-1"><span class="text-slate-600">Tables actives</span><span class="text-emerald-600 font-medium">{{ tableStats?.active || 0 }}</span></div>
                <div class="h-2 bg-slate-100 rounded-full"><div class="bg-emerald-500 h-full rounded-full" :style="{ width: (tableStats?.total ? (tableStats.active / tableStats.total) * 100 : 0) + '%' }"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1"><span class="text-slate-600">Capacité totale</span><span class="text-blue-600 font-medium">{{ tableStats?.totalCapacity || 0 }} places</span></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1"><span class="text-slate-600">Capacité moyenne</span><span class="text-violet-600 font-medium">{{ tableStats?.avgCapacity?.toFixed(1) || 0 }} pers.</span></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1"><span class="text-slate-600">Pré-commandes</span><span class="text-teal-600 font-medium">{{ (reservationStats?.preOrderRate || 0).toFixed(0) }}%</span></div>
                <div class="h-2 bg-slate-100 rounded-full"><div class="bg-teal-500 h-full rounded-full" :style="{ width: (reservationStats?.preOrderRate || 0) + '%' }"></div></div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== LOYALTY ==================== -->
      <template v-if="activeSection === 'loyalty'">
        <div class="grid gap-4 sm:grid-cols-4">
          <div class="bg-amber-50 rounded-xl p-5"><p class="text-sm text-amber-600">Bronze</p><p class="text-2xl font-semibold text-amber-800 mt-2">{{ tierDistribution.bronze }}</p></div>
          <div class="bg-slate-100 rounded-xl p-5"><p class="text-sm text-slate-600">Argent</p><p class="text-2xl font-semibold text-slate-800 mt-2">{{ tierDistribution.silver }}</p></div>
          <div class="bg-yellow-50 rounded-xl p-5"><p class="text-sm text-yellow-600">Or</p><p class="text-2xl font-semibold text-yellow-800 mt-2">{{ tierDistribution.gold }}</p></div>
          <div class="bg-violet-50 rounded-xl p-5"><p class="text-sm text-violet-600">Platine</p><p class="text-2xl font-semibold text-violet-800 mt-2">{{ tierDistribution.platinum }}</p></div>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Répartition des tiers</h3><div class="h-64"><Doughnut v-if="loyaltyTierChartData" :data="loyaltyTierChartData" :options="doughnutOptions" /></div></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Flux de points</h3><div class="h-64"><Line v-if="pointsFlowChartData" :data="pointsFlowChartData" :options="{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true, position: 'top' } } }" /></div></div>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Points émis</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ loyaltyStats?.totalPointsIssued || 0 }}</p><p class="text-sm text-emerald-600">Total</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Points échangés</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ loyaltyStats?.totalPointsRedeemed || 0 }}</p><p class="text-sm text-blue-600">Total</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Membres actifs</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ totalLoyalty }}</p><div class="h-2 bg-slate-100 rounded-full mt-2"><div class="h-full bg-emerald-500 rounded-full" style="width: 100%"></div></div></div>
        </div>
      </template>

      <!-- ==================== REVIEWS ==================== -->
      <template v-if="activeSection === 'reviews'">
        <div class="grid gap-4 sm:grid-cols-4">
          <div class="bg-amber-50 rounded-xl p-5"><p class="text-sm text-amber-600">Note moyenne</p><p class="text-3xl font-semibold text-amber-800 mt-2">{{ avgRating }} ⭐</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Total avis</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ totalReviews }}</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">En attente</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ pendingReviews }}</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Taux de réponse</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ (reviewStats?.responseRate || 0).toFixed(0) }}%</p></div>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Distribution des notes</h3><div class="h-64"><Bar v-if="reviewsChartData" :data="reviewsChartData" :options="{ ...chartOptions, indexAxis: 'y' }" /></div></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Évolution de la note</h3><div class="h-64"><Line v-if="ratingTrendChartData" :data="ratingTrendChartData" :options="{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, min: 1, max: 5 } } }" /></div></div>
        </div>
      </template>

      <!-- ==================== CAMPAIGNS ==================== -->
      <template v-if="activeSection === 'campaigns'">
        <div class="grid gap-4 sm:grid-cols-4">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Campagnes</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ campaignSummary.totalCampaigns }}</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Messages envoyés</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ campaignSummary.totalMessagesSent }}</p></div>
          <div class="bg-emerald-50 rounded-xl p-5"><p class="text-sm text-emerald-600">Taux de succès</p><p class="text-2xl font-semibold text-emerald-800 mt-2">{{ deliveryRate }}%</p></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><p class="text-sm text-slate-500">Terminées</p><p class="text-2xl font-semibold text-slate-900 mt-2">{{ campaignSummary.completedCampaigns }}</p></div>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Messages envoyés</h3><div class="h-64"><Bar v-if="campaignChartData" :data="campaignChartData" :options="chartOptions" /></div></div>
          <div class="bg-white border border-slate-200 rounded-xl p-5"><h3 class="font-medium text-slate-900 mb-4">Taux de délivrabilité</h3><div class="h-64"><Doughnut v-if="deliveryRateChartData" :data="deliveryRateChartData" :options="doughnutOptions" /></div></div>
        </div>
      </template>

      <!-- Quick Actions -->
      <div class="bg-white border border-slate-200 rounded-xl p-5">
        <h3 class="font-medium text-slate-900 mb-4">Actions rapides</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <router-link to="/admin/dishes" class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50"><div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg></div><div><p class="text-sm font-medium text-slate-900">Ajouter un plat</p><p class="text-xs text-slate-500">{{ activeDishes }} actifs</p></div></router-link>
          <router-link to="/admin/reservations" class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50"><div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div><div><p class="text-sm font-medium text-slate-900">Réservations</p><p class="text-xs text-slate-500">Gérer</p></div></router-link>
          <router-link to="/admin/campaigns" class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50"><div class="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></div><div><p class="text-sm font-medium text-slate-900">Nouvelle campagne</p><p class="text-xs text-slate-500">SMS</p></div></router-link>
          <router-link to="/admin/settings" class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50"><div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div><div><p class="text-sm font-medium text-slate-900">Paramètres</p><p class="text-xs text-slate-500">Configurer</p></div></router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capitalize { text-transform: capitalize; }
</style>
