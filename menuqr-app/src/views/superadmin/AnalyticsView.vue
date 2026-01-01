<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Line, Bar, Doughnut, Pie } from 'vue-chartjs';
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
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  FireOutlined,
  TrophyOutlined,
  BulbOutlined,
  RocketOutlined,
  StarOutlined,
  CrownOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import api from '@/services/api';

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

interface ChartDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface RestaurantGrowth {
  date: string;
  count: number;
  cumulative: number;
}

interface TopRestaurant {
  _id: string;
  name: string;
  slug: string;
  orders: number;
  revenue: number;
}

interface StatusDistribution {
  _id: string;
  count: number;
}

interface ChartApiResponse {
  ordersByDay: ChartDataPoint[];
  orderStatusDistribution: StatusDistribution[];
  topRestaurants: TopRestaurant[];
  subscriptionDistribution: StatusDistribution[];
  restaurantGrowth: RestaurantGrowth[];
}

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

// State
const loading = ref(false);
const period = ref(90);
const chartData = ref<ChartApiResponse | null>(null);
const stats = ref<DashboardStats | null>(null);
const activeTab = ref('overview');

// Period options
const periodOptions = [
  { label: '30 jours', value: 30 },
  { label: '60 jours', value: 60 },
  { label: '90 jours', value: 90 },
  { label: '180 jours', value: 180 },
  { label: '365 jours', value: 365 },
];

// Fetch data
const fetchData = async () => {
  loading.value = true;
  try {
    const [chartResponse, statsResponse] = await Promise.all([
      api.get<ChartApiResponse>(`/superadmin/dashboard/charts?days=${period.value}`),
      api.get<DashboardStats>('/superadmin/dashboard/stats'),
    ]);
    if (chartResponse.success && chartResponse.data) {
      chartData.value = chartResponse.data;
    }
    if (statsResponse.success && statsResponse.data) {
      stats.value = statsResponse.data;
    }
  } catch (fetchError) {
    message.error('Erreur lors du chargement des donnees');
    console.error(fetchError);
  } finally {
    loading.value = false;
  }
};

watch(period, () => {
  fetchData();
});

onMounted(() => {
  fetchData();
});

// Aggregate data by week
const aggregateByWeek = (data: ChartDataPoint[]) => {
  const weeks: Record<string, { orders: number; revenue: number }> = {};

  data.forEach((item) => {
    const date = new Date(item.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0] as string;

    if (!weeks[weekKey]) {
      weeks[weekKey] = { orders: 0, revenue: 0 };
    }
    const weekData = weeks[weekKey];
    weekData.orders += item.orders;
    weekData.revenue += item.revenue;
  });

  return Object.entries(weeks).map(([date, weekData]) => ({
    date,
    ...weekData,
  }));
};

// Aggregate data by month
const aggregateByMonth = (data: ChartDataPoint[]) => {
  const months: Record<string, { orders: number; revenue: number }> = {};

  data.forEach((item) => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!months[monthKey]) {
      months[monthKey] = { orders: 0, revenue: 0 };
    }
    const monthData = months[monthKey];
    monthData.orders += item.orders;
    monthData.revenue += item.revenue;
  });

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, monthData]) => ({
      date,
      ...monthData,
    }));
};

// Get last 7 days data for sparklines
const last7DaysData = computed(() => {
  if (!chartData.value?.ordersByDay) return [];
  return chartData.value.ordersByDay.slice(-7);
});

// Sparkline data generators
const revenueSparkline = computed(() => last7DaysData.value.map(d => d.revenue));
const ordersSparkline = computed(() => last7DaysData.value.map(d => d.orders));

// Calculate trends (compare last 7 days vs previous 7 days)
const revenueTrend = computed(() => {
  if (!chartData.value?.ordersByDay || chartData.value.ordersByDay.length < 14) return 0;
  const data = chartData.value.ordersByDay;
  const recent = data.slice(-7).reduce((sum, d) => sum + d.revenue, 0);
  const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0);
  if (previous === 0) return recent > 0 ? 100 : 0;
  return ((recent - previous) / previous) * 100;
});

const ordersTrend = computed(() => {
  if (!chartData.value?.ordersByDay || chartData.value.ordersByDay.length < 14) return 0;
  const data = chartData.value.ordersByDay;
  const recent = data.slice(-7).reduce((sum, d) => sum + d.orders, 0);
  const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.orders, 0);
  if (previous === 0) return recent > 0 ? 100 : 0;
  return ((recent - previous) / previous) * 100;
});

// Quick insights generator
const insights = computed(() => {
  const result: { icon: string; text: string; type: 'success' | 'warning' | 'info' }[] = [];

  if (stats.value) {
    const activeRate = stats.value.overview.totalRestaurants > 0
      ? (stats.value.overview.activeRestaurants / stats.value.overview.totalRestaurants * 100).toFixed(0)
      : 0;

    if (Number(activeRate) >= 80) {
      result.push({ icon: 'fire', text: `${activeRate}% des restaurants sont actifs - excellente retention!`, type: 'success' });
    } else if (Number(activeRate) >= 50) {
      result.push({ icon: 'bulb', text: `${activeRate}% des restaurants sont actifs - potentiel d'amelioration`, type: 'warning' });
    }

    if (stats.value.growth.orders > 0) {
      result.push({ icon: 'rocket', text: `Croissance des commandes de +${stats.value.growth.orders.toFixed(1)}% ce mois`, type: 'success' });
    }

    if (stats.value.thisMonth.newRestaurants > 0) {
      result.push({ icon: 'star', text: `${stats.value.thisMonth.newRestaurants} nouveaux restaurants ce mois`, type: 'info' });
    }
  }

  if (chartData.value?.topRestaurants?.length) {
    const topRestaurant = chartData.value.topRestaurants[0];
    result.push({ icon: 'crown', text: `${topRestaurant.name} en tete avec ${topRestaurant.orders} commandes`, type: 'info' });
  }

  if (revenueTrend.value > 10) {
    result.push({ icon: 'thunder', text: `Revenus en hausse de ${revenueTrend.value.toFixed(0)}% sur 7 jours`, type: 'success' });
  }

  return result.slice(0, 4);
});

// Monthly revenue chart data
const monthlyRevenueChartData = computed(() => {
  if (!chartData.value?.ordersByDay) {
    return { labels: [], datasets: [] };
  }

  const monthlyData = aggregateByMonth(chartData.value.ordersByDay);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    labels: monthlyData.map((d) => {
      const parts = d.date.split('-');
      const year = parts[0] || '';
      const month = parts[1] || '01';
      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    }),
    datasets: [
      {
        label: 'Revenus',
        data: monthlyData.map((d) => d.revenue),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0a0f1a',
        pointBorderWidth: 2,
      },
    ],
  };
});

// Monthly orders chart data
const monthlyOrdersChartData = computed(() => {
  if (!chartData.value?.ordersByDay) {
    return { labels: [], datasets: [] };
  }

  const monthlyData = aggregateByMonth(chartData.value.ordersByDay);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    labels: monthlyData.map((d) => {
      const parts = d.date.split('-');
      const year = parts[0] || '';
      const month = parts[1] || '01';
      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    }),
    datasets: [
      {
        label: 'Commandes',
        data: monthlyData.map((d) => d.orders),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        hoverBackgroundColor: '#818cf8',
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };
});

// Weekly trend chart data
const weeklyTrendChartData = computed(() => {
  if (!chartData.value?.ordersByDay) {
    return { labels: [], datasets: [] };
  }

  const weeklyData = aggregateByWeek(chartData.value.ordersByDay);

  return {
    labels: weeklyData.map((d) => {
      const date = new Date(d.date);
      return `Sem. ${Math.ceil(date.getDate() / 7)} - ${date.toLocaleDateString('fr-FR', { month: 'short' })}`;
    }),
    datasets: [
      {
        label: 'Commandes',
        data: weeklyData.map((d) => d.orders),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#0a0f1a',
        pointBorderWidth: 2,
      },
      {
        label: 'Revenus (x100)',
        data: weeklyData.map((d) => d.revenue / 100),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0a0f1a',
        pointBorderWidth: 2,
      },
    ],
  };
});

// Subscription distribution chart data
const subscriptionChartData = computed(() => {
  if (!chartData.value?.subscriptionDistribution) {
    return { labels: [], datasets: [] };
  }

  const statusLabels: Record<string, string> = {
    trial: 'Essai',
    active: 'Actif',
    past_due: 'En retard',
    cancelled: 'Annule',
    expired: 'Expire',
  };

  const statusColors: Record<string, string> = {
    trial: '#f59e0b',
    active: '#10b981',
    past_due: '#ef4444',
    cancelled: '#6b7280',
    expired: '#94a3b8',
  };

  return {
    labels: chartData.value.subscriptionDistribution.map(
      (d) => statusLabels[d._id] || d._id
    ),
    datasets: [
      {
        data: chartData.value.subscriptionDistribution.map((d) => d.count),
        backgroundColor: chartData.value.subscriptionDistribution.map(
          (d) => statusColors[d._id] || '#6366f1'
        ),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };
});

// Order status distribution chart data
const orderStatusChartData = computed(() => {
  if (!chartData.value?.orderStatusDistribution) {
    return { labels: [], datasets: [] };
  }

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirme',
    preparing: 'En preparation',
    ready: 'Pret',
    delivered: 'Livre',
    completed: 'Complete',
    paid: 'Paye',
    cancelled: 'Annule',
  };

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    preparing: '#8b5cf6',
    ready: '#06b6d4',
    delivered: '#10b981',
    completed: '#10b981',
    paid: '#22c55e',
    cancelled: '#ef4444',
  };

  return {
    labels: chartData.value.orderStatusDistribution.map(
      (d) => statusLabels[d._id] || d._id
    ),
    datasets: [
      {
        data: chartData.value.orderStatusDistribution.map((d) => d.count),
        backgroundColor: chartData.value.orderStatusDistribution.map(
          (d) => statusColors[d._id] || '#6366f1'
        ),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };
});

// Restaurant growth chart data
const restaurantGrowthChartData = computed(() => {
  if (!chartData.value?.restaurantGrowth) {
    return { labels: [], datasets: [] };
  }

  const data = chartData.value.restaurantGrowth;
  const sampleRate = Math.max(1, Math.floor(data.length / 30));
  const sampledData = data.filter((_, index) => index % sampleRate === 0);

  return {
    labels: sampledData.map((d) =>
      new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    ),
    datasets: [
      {
        label: 'Total Restaurants',
        data: sampledData.map((d) => d.cumulative),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#0a0f1a',
        pointBorderWidth: 2,
      },
      {
        label: 'Nouvelles inscriptions',
        data: sampledData.map((d) => d.count),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0a0f1a',
        pointBorderWidth: 2,
        borderDash: [5, 5],
        yAxisID: 'y1',
      },
    ],
  };
});

// Top restaurants chart data
const topRestaurantsChartData = computed(() => {
  if (!chartData.value?.topRestaurants) {
    return { labels: [], datasets: [] };
  }

  return {
    labels: chartData.value.topRestaurants.map((r) => r.name.substring(0, 15) + (r.name.length > 15 ? '...' : '')),
    datasets: [
      {
        label: 'Commandes',
        data: chartData.value.topRestaurants.map((r) => r.orders),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        hoverBackgroundColor: '#818cf8',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Revenus',
        data: chartData.value.topRestaurants.map((r) => r.revenue),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        hoverBackgroundColor: '#34d399',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
});

// Dark theme chart options
const darkChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#94a3b8',
        padding: 20,
        font: { family: "'Outfit', sans-serif", size: 12 },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: "'Outfit', sans-serif", weight: '600' as const },
      bodyFont: { family: "'Outfit', sans-serif" },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(148, 163, 184, 0.08)',
      },
      ticks: {
        color: '#64748b',
        font: { family: "'Outfit', sans-serif", size: 11 },
      },
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#64748b',
        font: { family: "'Outfit', sans-serif", size: 11 },
      },
    },
  },
};

const lineChartOptions = { ...darkChartOptions };
const barChartOptions = { ...darkChartOptions };

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: '#94a3b8',
        padding: 16,
        font: { family: "'Outfit', sans-serif", size: 12 },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  cutout: '65%',
};

const pieChartOptions = {
  ...doughnutChartOptions,
  cutout: 0,
};

const mixedChartOptions = {
  ...darkChartOptions,
  scales: {
    ...darkChartOptions.scales,
    y1: {
      beginAtZero: true,
      position: 'right' as const,
      grid: {
        display: false,
      },
      ticks: {
        color: '#64748b',
        font: { family: "'Outfit', sans-serif", size: 11 },
      },
    },
  },
};

// Calculate computed stats
const totalRevenue = computed(() => {
  if (!chartData.value?.ordersByDay) return 0;
  return chartData.value.ordersByDay.reduce((sum, d) => sum + d.revenue, 0);
});

const totalOrders = computed(() => {
  if (!chartData.value?.ordersByDay) return 0;
  return chartData.value.ordersByDay.reduce((sum, d) => sum + d.orders, 0);
});

const avgOrderValue = computed(() => {
  if (totalOrders.value === 0) return 0;
  return totalRevenue.value / totalOrders.value;
});

const avgDailyOrders = computed(() => {
  if (!chartData.value?.ordersByDay) return 0;
  return totalOrders.value / chartData.value.ordersByDay.length;
});

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format large numbers
const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
};

// Export data
const exportData = () => {
  if (!chartData.value) return;

  const exportObj = {
    period: `${period.value} jours`,
    summary: {
      totalRevenue: totalRevenue.value,
      totalOrders: totalOrders.value,
      avgOrderValue: avgOrderValue.value,
      avgDailyOrders: avgDailyOrders.value,
    },
    ordersByDay: chartData.value.ordersByDay,
    topRestaurants: chartData.value.topRestaurants,
  };

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  message.success('Donnees exportees avec succes');
};

// SVG Sparkline generator
const generateSparklinePath = (data: number[], width = 80, height = 24) => {
  if (!data.length) return '';
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);

  return data.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
};
</script>

<template>
  <div class="analytics-view">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
      <div class="ambient-orb orb-3"></div>
    </div>

    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-badge">
            <ThunderboltOutlined />
            <span>Analytics</span>
          </div>
          <h1 class="page-title">Centre de Commande</h1>
          <p class="page-subtitle">Vue en temps reel de la performance de la plateforme</p>
        </div>
        <div class="header-actions">
          <a-select
            v-model:value="period"
            :options="periodOptions"
            class="period-select"
          >
            <template #suffixIcon>
              <CalendarOutlined />
            </template>
          </a-select>
          <a-button class="action-btn" @click="fetchData" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            Actualiser
          </a-button>
          <a-button class="action-btn primary" @click="exportData" :disabled="!chartData">
            <template #icon><DownloadOutlined /></template>
            Exporter
          </a-button>
        </div>
      </div>
    </div>

    <!-- Quick Insights Section -->
    <div v-if="insights.length > 0" class="insights-section">
      <div class="insights-header">
        <BulbOutlined class="insights-icon" />
        <span>Insights Cles</span>
      </div>
      <div class="insights-grid">
        <div
          v-for="(insight, index) in insights"
          :key="index"
          class="insight-card"
          :class="insight.type"
        >
          <div class="insight-icon">
            <FireOutlined v-if="insight.icon === 'fire'" />
            <BulbOutlined v-else-if="insight.icon === 'bulb'" />
            <RocketOutlined v-else-if="insight.icon === 'rocket'" />
            <StarOutlined v-else-if="insight.icon === 'star'" />
            <CrownOutlined v-else-if="insight.icon === 'crown'" />
            <ThunderboltOutlined v-else />
          </div>
          <span class="insight-text">{{ insight.text }}</span>
        </div>
      </div>
    </div>

    <!-- Premium Stat Cards -->
    <div class="stats-grid">
      <!-- Revenue Card -->
      <div class="stat-card revenue-card">
        <div class="stat-glow"></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="stat-icon-wrapper">
              <DollarOutlined />
            </div>
            <div class="stat-trend" :class="revenueTrend >= 0 ? 'up' : 'down'">
              <RiseOutlined v-if="revenueTrend >= 0" />
              <FallOutlined v-else />
              <span>{{ Math.abs(revenueTrend).toFixed(1) }}%</span>
            </div>
          </div>
          <div class="stat-value">{{ formatCurrency(totalRevenue) }}</div>
          <div class="stat-label">Revenus totaux</div>
          <div class="stat-period">/ {{ period }} jours</div>
          <svg class="sparkline" viewBox="0 0 80 24" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparklineGradientRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path
              :d="generateSparklinePath(revenueSparkline)"
              fill="none"
              stroke="#10b981"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>
      </div>

      <!-- Orders Card -->
      <div class="stat-card orders-card">
        <div class="stat-glow"></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="stat-icon-wrapper">
              <ShoppingCartOutlined />
            </div>
            <div class="stat-trend" :class="ordersTrend >= 0 ? 'up' : 'down'">
              <RiseOutlined v-if="ordersTrend >= 0" />
              <FallOutlined v-else />
              <span>{{ Math.abs(ordersTrend).toFixed(1) }}%</span>
            </div>
          </div>
          <div class="stat-value">{{ formatNumber(totalOrders) }}</div>
          <div class="stat-label">Commandes</div>
          <div class="stat-period">/ {{ period }} jours</div>
          <svg class="sparkline" viewBox="0 0 80 24" preserveAspectRatio="none">
            <path
              :d="generateSparklinePath(ordersSparkline)"
              fill="none"
              stroke="#6366f1"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>
      </div>

      <!-- Average Order Card -->
      <div class="stat-card avg-card">
        <div class="stat-glow"></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="stat-icon-wrapper">
              <BarChartOutlined />
            </div>
          </div>
          <div class="stat-value">{{ formatCurrency(avgOrderValue) }}</div>
          <div class="stat-label">Panier moyen</div>
          <div class="stat-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: Math.min((avgOrderValue / 50) * 100, 100) + '%' }"></div>
            </div>
            <span class="progress-target">Cible: 50€</span>
          </div>
        </div>
      </div>

      <!-- Daily Orders Card -->
      <div class="stat-card daily-card">
        <div class="stat-glow"></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="stat-icon-wrapper">
              <LineChartOutlined />
            </div>
          </div>
          <div class="stat-value">{{ avgDailyOrders.toFixed(1) }}</div>
          <div class="stat-label">Commandes/jour</div>
          <div class="stat-progress">
            <div class="progress-bar cyan">
              <div class="progress-fill" :style="{ width: Math.min((avgDailyOrders / 100) * 100, 100) + '%' }"></div>
            </div>
            <span class="progress-target">Cible: 100/j</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Platform Metrics Row -->
    <div class="metrics-row">
      <div class="metric-item">
        <ShopOutlined class="metric-icon blue" />
        <div class="metric-data">
          <span class="metric-value">{{ stats?.overview.totalRestaurants || 0 }}</span>
          <span class="metric-label">Restaurants</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item">
        <ShopOutlined class="metric-icon green" />
        <div class="metric-data">
          <span class="metric-value">{{ stats?.overview.activeRestaurants || 0 }}</span>
          <span class="metric-label">Actifs</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item">
        <UserOutlined class="metric-icon purple" />
        <div class="metric-data">
          <span class="metric-value">{{ formatNumber(stats?.overview.totalUsers || 0) }}</span>
          <span class="metric-label">Utilisateurs</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item">
        <UserOutlined class="metric-icon orange" />
        <div class="metric-data">
          <span class="metric-value">{{ formatNumber(stats?.overview.totalCustomers || 0) }}</span>
          <span class="metric-label">Clients</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item highlight">
        <RiseOutlined class="metric-icon" />
        <div class="metric-data">
          <span class="metric-value">+{{ stats?.thisMonth.newRestaurants || 0 }}</span>
          <span class="metric-label">Ce mois</span>
        </div>
      </div>
    </div>

    <!-- Tabs for different views -->
    <div class="analytics-tabs-wrapper">
      <a-tabs v-model:activeKey="activeTab" class="analytics-tabs">
        <a-tab-pane key="overview" tab="Vue d'ensemble">
          <a-row :gutter="[24, 24]">
            <!-- Monthly Revenue Chart -->
            <a-col :xs="24" :lg="12">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <LineChartOutlined />
                    <span>Evolution des revenus</span>
                  </div>
                </div>
                <div class="chart-container">
                  <a-spin :spinning="loading">
                    <Line
                      v-if="monthlyRevenueChartData.labels.length > 0"
                      :data="monthlyRevenueChartData"
                      :options="lineChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>

            <!-- Monthly Orders Chart -->
            <a-col :xs="24" :lg="12">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <BarChartOutlined />
                    <span>Commandes par mois</span>
                  </div>
                </div>
                <div class="chart-container">
                  <a-spin :spinning="loading">
                    <Bar
                      v-if="monthlyOrdersChartData.labels.length > 0"
                      :data="monthlyOrdersChartData"
                      :options="barChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>

            <!-- Subscription Distribution -->
            <a-col :xs="24" :lg="12">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <PieChartOutlined />
                    <span>Repartition des abonnements</span>
                  </div>
                </div>
                <div class="chart-container doughnut">
                  <a-spin :spinning="loading">
                    <Doughnut
                      v-if="subscriptionChartData.labels.length > 0"
                      :data="subscriptionChartData"
                      :options="doughnutChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>

            <!-- Order Status Distribution -->
            <a-col :xs="24" :lg="12">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <PieChartOutlined />
                    <span>Statut des commandes</span>
                  </div>
                </div>
                <div class="chart-container doughnut">
                  <a-spin :spinning="loading">
                    <Pie
                      v-if="orderStatusChartData.labels.length > 0"
                      :data="orderStatusChartData"
                      :options="pieChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-tab-pane>

        <a-tab-pane key="trends" tab="Tendances">
          <a-row :gutter="[24, 24]">
            <!-- Weekly Trend Chart -->
            <a-col :span="24">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <LineChartOutlined />
                    <span>Tendance hebdomadaire</span>
                  </div>
                </div>
                <div class="chart-container large">
                  <a-spin :spinning="loading">
                    <Line
                      v-if="weeklyTrendChartData.labels.length > 0"
                      :data="weeklyTrendChartData"
                      :options="lineChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>

            <!-- Restaurant Growth Chart -->
            <a-col :span="24">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <ShopOutlined />
                    <span>Croissance des restaurants</span>
                  </div>
                </div>
                <div class="chart-container large">
                  <a-spin :spinning="loading">
                    <Line
                      v-if="restaurantGrowthChartData.labels.length > 0"
                      :data="restaurantGrowthChartData"
                      :options="mixedChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-tab-pane>

        <a-tab-pane key="restaurants" tab="Restaurants">
          <a-row :gutter="[24, 24]">
            <!-- Top Restaurants Chart -->
            <a-col :span="24">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <TrophyOutlined />
                    <span>Top 10 Restaurants (ce mois)</span>
                  </div>
                </div>
                <div class="chart-container large">
                  <a-spin :spinning="loading">
                    <Bar
                      v-if="topRestaurantsChartData.labels.length > 0"
                      :data="topRestaurantsChartData"
                      :options="barChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>

            <!-- Top Restaurants Table -->
            <a-col :span="24">
              <div class="chart-card table-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <CrownOutlined />
                    <span>Classement des restaurants</span>
                  </div>
                </div>
                <a-table
                  :dataSource="chartData?.topRestaurants || []"
                  :loading="loading"
                  :pagination="false"
                  rowKey="_id"
                  class="dark-table"
                >
                  <a-table-column title="Rang" :width="80">
                    <template #default="{ index }">
                      <div class="rank-badge" :class="{ gold: index === 0, silver: index === 1, bronze: index === 2 }">
                        {{ index + 1 }}
                      </div>
                    </template>
                  </a-table-column>
                  <a-table-column title="Restaurant" dataIndex="name">
                    <template #default="{ record }">
                      <span class="restaurant-name">{{ record.name }}</span>
                    </template>
                  </a-table-column>
                  <a-table-column title="Commandes" dataIndex="orders" :width="120">
                    <template #default="{ record }">
                      <span class="stat-cell orders">{{ record.orders }}</span>
                    </template>
                  </a-table-column>
                  <a-table-column title="Revenus" dataIndex="revenue" :width="150">
                    <template #default="{ record }">
                      <span class="stat-cell revenue">{{ formatCurrency(record.revenue) }}</span>
                    </template>
                  </a-table-column>
                  <a-table-column title="Panier moyen" :width="150">
                    <template #default="{ record }">
                      <span class="stat-cell">
                        {{ record.orders > 0 ? formatCurrency(record.revenue / record.orders) : '-' }}
                      </span>
                    </template>
                  </a-table-column>
                </a-table>
              </div>
            </a-col>
          </a-row>
        </a-tab-pane>

        <a-tab-pane key="platform" tab="Plateforme">
          <a-row :gutter="[24, 24]">
            <!-- Growth indicators -->
            <a-col :span="24">
              <div class="chart-card growth-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <RiseOutlined />
                    <span>Performance ce mois</span>
                  </div>
                </div>
                <div class="growth-grid">
                  <div class="growth-item">
                    <div class="growth-icon orders-bg">
                      <ShoppingCartOutlined />
                    </div>
                    <div class="growth-data">
                      <span class="growth-value">{{ stats?.thisMonth.orders || 0 }}</span>
                      <span class="growth-label">Commandes</span>
                    </div>
                    <div v-if="stats?.growth.orders" class="growth-badge" :class="(stats?.growth.orders || 0) >= 0 ? 'positive' : 'negative'">
                      <RiseOutlined v-if="(stats?.growth.orders || 0) >= 0" />
                      <FallOutlined v-else />
                      {{ Math.abs(stats?.growth.orders || 0).toFixed(1) }}%
                    </div>
                  </div>

                  <div class="growth-item">
                    <div class="growth-icon revenue-bg">
                      <DollarOutlined />
                    </div>
                    <div class="growth-data">
                      <span class="growth-value">{{ formatCurrency(stats?.thisMonth.revenue || 0) }}</span>
                      <span class="growth-label">Revenus</span>
                    </div>
                    <div v-if="stats?.growth.revenue" class="growth-badge" :class="(stats?.growth.revenue || 0) >= 0 ? 'positive' : 'negative'">
                      <RiseOutlined v-if="(stats?.growth.revenue || 0) >= 0" />
                      <FallOutlined v-else />
                      {{ Math.abs(stats?.growth.revenue || 0).toFixed(1) }}%
                    </div>
                  </div>

                  <div class="growth-item">
                    <div class="growth-icon restaurants-bg">
                      <ShopOutlined />
                    </div>
                    <div class="growth-data">
                      <span class="growth-value">+{{ stats?.thisMonth.newRestaurants || 0 }}</span>
                      <span class="growth-label">Nouveaux restaurants</span>
                    </div>
                  </div>

                  <div class="growth-item">
                    <div class="growth-icon customers-bg">
                      <UserOutlined />
                    </div>
                    <div class="growth-data">
                      <span class="growth-value">+{{ stats?.thisMonth.newCustomers || 0 }}</span>
                      <span class="growth-label">Nouveaux clients</span>
                    </div>
                  </div>
                </div>
              </div>
            </a-col>

            <!-- Subscription Distribution -->
            <a-col :xs="24" :lg="12">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <PieChartOutlined />
                    <span>Distribution des abonnements</span>
                  </div>
                </div>
                <div class="chart-container doughnut">
                  <a-spin :spinning="loading">
                    <Doughnut
                      v-if="subscriptionChartData.labels.length > 0"
                      :data="subscriptionChartData"
                      :options="doughnutChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>

            <!-- Order Status Distribution -->
            <a-col :xs="24" :lg="12">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <PieChartOutlined />
                    <span>Distribution des commandes</span>
                  </div>
                </div>
                <div class="chart-container doughnut">
                  <a-spin :spinning="loading">
                    <Pie
                      v-if="orderStatusChartData.labels.length > 0"
                      :data="orderStatusChartData"
                      :options="pieChartOptions"
                    />
                    <a-empty v-else description="Aucune donnee disponible" />
                  </a-spin>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.analytics-view {
  padding: 0;
  font-family: 'Outfit', sans-serif;
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0f172a 100%);
  color: #e2e8f0;
}

/* Ambient Background Effects */
.ambient-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s infinite ease-in-out;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
  top: -100px;
  right: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%);
  bottom: 20%;
  left: -50px;
  animation-delay: -7s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%);
  top: 50%;
  right: 20%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Page Header */
.page-header {
  position: relative;
  z-index: 1;
  margin-bottom: 32px;
  padding: 24px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #a5b4fc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
}

.header-badge :deep(.anticon) {
  font-size: 14px;
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 15px;
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.period-select {
  width: 140px;
}

.period-select :deep(.ant-select-selector) {
  background: rgba(30, 41, 59, 0.8) !important;
  border: 1px solid rgba(148, 163, 184, 0.2) !important;
  border-radius: 10px !important;
  color: #e2e8f0 !important;
}

.period-select :deep(.ant-select-arrow) {
  color: #64748b;
}

.action-btn {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  color: #e2e8f0;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(148, 163, 184, 0.4);
  color: #f8fafc;
  transform: translateY(-1px);
}

.action-btn.primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: white;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
}

/* Insights Section */
.insights-section {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
}

.insights-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.insights-icon {
  color: #fbbf24;
  font-size: 16px;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.insight-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.insight-card:hover {
  background: rgba(30, 41, 59, 0.8);
  transform: translateX(4px);
}

.insight-card.success {
  border-left: 3px solid #10b981;
}

.insight-card.warning {
  border-left: 3px solid #f59e0b;
}

.insight-card.info {
  border-left: 3px solid #6366f1;
}

.insight-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.insight-card.success .insight-icon {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.insight-card.warning .insight-icon {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.insight-card.info .insight-icon {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.insight-text {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.4;
}

/* Stats Grid */
.stats-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
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
  position: relative;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(148, 163, 184, 0.2);
}

.stat-card:hover .stat-glow {
  opacity: 1;
}

.stat-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.revenue-card .stat-glow {
  background: linear-gradient(90deg, transparent, #10b981, transparent);
}

.orders-card .stat-glow {
  background: linear-gradient(90deg, transparent, #6366f1, transparent);
}

.avg-card .stat-glow {
  background: linear-gradient(90deg, transparent, #f59e0b, transparent);
}

.daily-card .stat-glow {
  background: linear-gradient(90deg, transparent, #06b6d4, transparent);
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stat-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.revenue-card .stat-icon-wrapper {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.orders-card .stat-icon-wrapper {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.avg-card .stat-icon-wrapper {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.daily-card .stat-icon-wrapper {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.stat-trend.up {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.stat-trend.down {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
}

.stat-period {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.sparkline {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 80px;
  height: 24px;
  opacity: 0.8;
}

.stat-progress {
  margin-top: 16px;
}

.progress-bar {
  height: 6px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-bar.cyan .progress-fill {
  background: linear-gradient(90deg, #06b6d4, #22d3ee);
}

.progress-target {
  font-size: 11px;
  color: #64748b;
}

/* Metrics Row */
.metrics-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 20px 32px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
  backdrop-filter: blur(10px);
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-item.highlight {
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
  border-radius: 10px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.metric-icon {
  font-size: 22px;
}

.metric-icon.blue { color: #60a5fa; }
.metric-icon.green { color: #34d399; }
.metric-icon.purple { color: #a78bfa; }
.metric-icon.orange { color: #fb923c; }

.metric-item.highlight .metric-icon {
  color: #34d399;
}

.metric-data {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: #f8fafc;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
}

.metric-divider {
  width: 1px;
  height: 40px;
  background: rgba(148, 163, 184, 0.15);
}

/* Tabs Wrapper */
.analytics-tabs-wrapper {
  position: relative;
  z-index: 1;
}

.analytics-tabs {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.analytics-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.analytics-tabs :deep(.ant-tabs-nav::before) {
  border-color: rgba(148, 163, 184, 0.1);
}

.analytics-tabs :deep(.ant-tabs-tab) {
  color: #64748b;
  font-weight: 500;
  transition: all 0.2s ease;
}

.analytics-tabs :deep(.ant-tabs-tab:hover) {
  color: #94a3b8;
}

.analytics-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #f8fafc !important;
}

.analytics-tabs :deep(.ant-tabs-ink-bar) {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  height: 3px;
  border-radius: 2px;
}

/* Chart Cards */
.chart-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  height: 100%;
  transition: all 0.3s ease;
}

.chart-card:hover {
  border-color: rgba(148, 163, 184, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}

.chart-title :deep(.anticon) {
  color: #818cf8;
  font-size: 18px;
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-container.large {
  height: 400px;
}

.chart-container.doughnut {
  height: 280px;
}

.chart-container canvas {
  max-height: 100%;
}

/* Table Styling */
.table-card {
  padding: 24px;
}

.dark-table :deep(.ant-table) {
  background: transparent;
  color: #e2e8f0;
}

.dark-table :deep(.ant-table-thead > tr > th) {
  background: rgba(30, 41, 59, 0.5);
  color: #94a3b8;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.dark-table :deep(.ant-table-tbody > tr > td) {
  background: transparent;
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
  color: #e2e8f0;
}

.dark-table :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(99, 102, 241, 0.1);
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.rank-badge.gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #1e293b;
}

.rank-badge.silver {
  background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
  color: #1e293b;
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
  color: white;
}

.restaurant-name {
  font-weight: 500;
  color: #f8fafc;
}

.stat-cell {
  font-weight: 600;
  color: #e2e8f0;
}

.stat-cell.orders {
  color: #818cf8;
}

.stat-cell.revenue {
  color: #34d399;
}

/* Growth Card */
.growth-card {
  padding: 24px;
}

.growth-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .growth-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .growth-grid {
    grid-template-columns: 1fr;
  }
}

.growth-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.growth-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.growth-icon.orders-bg {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.growth-icon.revenue-bg {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.growth-icon.restaurants-bg {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.growth-icon.customers-bg {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.growth-data {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.growth-value {
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
}

.growth-label {
  font-size: 13px;
  color: #64748b;
}

.growth-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.growth-badge.positive {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.growth-badge.negative {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

/* Empty State */
.analytics-tabs :deep(.ant-empty-description) {
  color: #64748b;
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }

  .header-content {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .chart-container {
    height: 250px;
  }

  .chart-container.large {
    height: 300px;
  }

  .metrics-row {
    padding: 16px;
    gap: 16px;
  }

  .metric-divider {
    display: none;
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }
}
</style>
