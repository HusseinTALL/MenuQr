<script setup lang="ts">
// @ts-nocheck - TODO: Fix Chart.js and possibly undefined type errors
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
  if (!chartData.value?.ordersByDay) {return [];}
  return chartData.value.ordersByDay.slice(-7);
});

// Sparkline data generators
const revenueSparkline = computed(() => last7DaysData.value.map(d => d.revenue));
const ordersSparkline = computed(() => last7DaysData.value.map(d => d.orders));

// Calculate trends (compare last 7 days vs previous 7 days)
const revenueTrend = computed(() => {
  if (!chartData.value?.ordersByDay || chartData.value.ordersByDay.length < 14) {return 0;}
  const data = chartData.value.ordersByDay;
  const recent = data.slice(-7).reduce((sum, d) => sum + d.revenue, 0);
  const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0);
  if (previous === 0) {return recent > 0 ? 100 : 0;}
  return ((recent - previous) / previous) * 100;
});

const ordersTrend = computed(() => {
  if (!chartData.value?.ordersByDay || chartData.value.ordersByDay.length < 14) {return 0;}
  const data = chartData.value.ordersByDay;
  const recent = data.slice(-7).reduce((sum, d) => sum + d.orders, 0);
  const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.orders, 0);
  if (previous === 0) {return recent > 0 ? 100 : 0;}
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

// Weekly comparison stats for Trends tab
const weeklyStats = computed(() => {
  if (!chartData.value?.ordersByDay) {return null;}
  const data = chartData.value.ordersByDay;

  const thisWeek = data.slice(-7);
  const lastWeek = data.slice(-14, -7);

  const thisWeekOrders = thisWeek.reduce((sum, d) => sum + d.orders, 0);
  const lastWeekOrders = lastWeek.reduce((sum, d) => sum + d.orders, 0);
  const thisWeekRevenue = thisWeek.reduce((sum, d) => sum + d.revenue, 0);
  const lastWeekRevenue = lastWeek.reduce((sum, d) => sum + d.revenue, 0);

  const ordersChange = lastWeekOrders > 0 ? ((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100 : 0;
  const revenueChange = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;

  const avgDailyOrders = thisWeekOrders / 7;
  const avgDailyRevenue = thisWeekRevenue / 7;
  const peakDay = thisWeek.reduce((max, d) => d.orders > max.orders ? d : max, thisWeek[0]);

  return {
    thisWeekOrders,
    lastWeekOrders,
    thisWeekRevenue,
    lastWeekRevenue,
    ordersChange,
    revenueChange,
    avgDailyOrders,
    avgDailyRevenue,
    peakDay: peakDay ? new Date(peakDay.date).toLocaleDateString('fr-FR', { weekday: 'long' }) : '-',
    peakOrders: peakDay?.orders || 0,
  };
});

// Monthly comparison for Trends tab
const monthlyStats = computed(() => {
  if (!chartData.value?.ordersByDay) {return null;}
  const data = chartData.value.ordersByDay;

  const thisMonth = data.slice(-30);
  const lastMonth = data.slice(-60, -30);

  const thisMonthOrders = thisMonth.reduce((sum, d) => sum + d.orders, 0);
  const lastMonthOrders = lastMonth.reduce((sum, d) => sum + d.orders, 0);
  const thisMonthRevenue = thisMonth.reduce((sum, d) => sum + d.revenue, 0);
  const lastMonthRevenue = lastMonth.reduce((sum, d) => sum + d.revenue, 0);

  const ordersChange = lastMonthOrders > 0 ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0;
  const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  return {
    thisMonthOrders,
    lastMonthOrders,
    thisMonthRevenue,
    lastMonthRevenue,
    ordersChange,
    revenueChange,
  };
});

// Restaurant performance stats
const restaurantStats = computed(() => {
  if (!chartData.value?.topRestaurants?.length) {return null;}
  const restaurants = chartData.value.topRestaurants;

  const totalRevenue = restaurants.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = restaurants.reduce((sum, r) => sum + r.orders, 0);
  const avgRevenue = totalRevenue / restaurants.length;
  const avgOrders = totalOrders / restaurants.length;

  const topPerformer = restaurants[0];
  const topRevenueShare = topPerformer ? (topPerformer.revenue / totalRevenue * 100) : 0;

  // Find best performing restaurant by average order value
  const bestAvgOrder = restaurants.reduce((best, r) => {
    const avgOrder = r.orders > 0 ? r.revenue / r.orders : 0;
    const bestAvg = best.orders > 0 ? best.revenue / best.orders : 0;
    return avgOrder > bestAvg ? r : best;
  }, restaurants[0]);

  return {
    totalRevenue,
    totalOrders,
    avgRevenue,
    avgOrders,
    topPerformer,
    topRevenueShare,
    bestAvgOrder,
    restaurantCount: restaurants.length,
  };
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
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
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
        backgroundColor: 'rgba(79, 70, 229, 0.85)',
        hoverBackgroundColor: '#6366f1',
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
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Revenus (x100)',
        data: weeklyData.map((d) => d.revenue / 100),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderDash: [5, 5],
        yAxisID: 'y1',
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
    active: '#059669',
    past_due: '#dc2626',
    cancelled: '#6b7280',
    expired: '#9ca3af',
  };

  return {
    labels: chartData.value.subscriptionDistribution.map(
      (d) => statusLabels[d._id] || d._id
    ),
    datasets: [
      {
        data: chartData.value.subscriptionDistribution.map((d) => d.count),
        backgroundColor: chartData.value.subscriptionDistribution.map(
          (d) => statusColors[d._id] || '#4f46e5'
        ),
        borderWidth: 3,
        borderColor: '#ffffff',
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
    ready: '#0891b2',
    delivered: '#059669',
    completed: '#10b981',
    paid: '#22c55e',
    cancelled: '#dc2626',
  };

  return {
    labels: chartData.value.orderStatusDistribution.map(
      (d) => statusLabels[d._id] || d._id
    ),
    datasets: [
      {
        data: chartData.value.orderStatusDistribution.map((d) => d.count),
        backgroundColor: chartData.value.orderStatusDistribution.map(
          (d) => statusColors[d._id] || '#4f46e5'
        ),
        borderWidth: 3,
        borderColor: '#ffffff',
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
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Nouvelles inscriptions',
        data: sampledData.map((d) => d.count),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
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
        backgroundColor: 'rgba(79, 70, 229, 0.85)',
        hoverBackgroundColor: '#6366f1',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Revenus',
        data: chartData.value.topRestaurants.map((r) => r.revenue),
        backgroundColor: 'rgba(5, 150, 105, 0.85)',
        hoverBackgroundColor: '#10b981',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
});

// Light theme chart options
const lightChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#374151',
        padding: 20,
        font: { family: "'DM Sans', sans-serif", size: 12, weight: '500' as const },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#111827',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 14,
      cornerRadius: 12,
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      titleFont: { family: "'DM Sans', sans-serif", weight: '600' as const, size: 13 },
      bodyFont: { family: "'DM Sans', sans-serif", size: 12 },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.04)',
      },
      ticks: {
        color: '#6b7280',
        font: { family: "'DM Sans', sans-serif", size: 11 },
      },
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#6b7280',
        font: { family: "'DM Sans', sans-serif", size: 11 },
      },
    },
  },
};

const lineChartOptions = { ...lightChartOptions };
const barChartOptions = { ...lightChartOptions };

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: '#374151',
        padding: 16,
        font: { family: "'DM Sans', sans-serif", size: 12, weight: '500' as const },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#111827',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 14,
      cornerRadius: 12,
    },
  },
  cutout: '68%',
};

const pieChartOptions = {
  ...doughnutChartOptions,
  cutout: 0,
};

const mixedChartOptions = {
  ...lightChartOptions,
  scales: {
    ...lightChartOptions.scales,
    y1: {
      beginAtZero: true,
      position: 'right' as const,
      grid: {
        display: false,
      },
      ticks: {
        color: '#6b7280',
        font: { family: "'DM Sans', sans-serif", size: 11 },
      },
    },
  },
};

// Calculate computed stats
const totalRevenue = computed(() => {
  if (!chartData.value?.ordersByDay) {return 0;}
  return chartData.value.ordersByDay.reduce((sum, d) => sum + d.revenue, 0);
});

const totalOrders = computed(() => {
  if (!chartData.value?.ordersByDay) {return 0;}
  return chartData.value.ordersByDay.reduce((sum, d) => sum + d.orders, 0);
});

const avgOrderValue = computed(() => {
  if (totalOrders.value === 0) {return 0;}
  return totalRevenue.value / totalOrders.value;
});

const avgDailyOrders = computed(() => {
  if (!chartData.value?.ordersByDay) {return 0;}
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
  if (value >= 1000000) {return `${(value / 1000000).toFixed(1)}M`;}
  if (value >= 1000) {return `${(value / 1000).toFixed(1)}K`;}
  return value.toFixed(0);
};

// Export data
const exportData = () => {
  if (!chartData.value) {return;}

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
const generateSparklinePath = (data: number[], width = 80, height = 28) => {
  if (!data.length) {return '';}
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
    <!-- Decorative Elements -->
    <div class="deco-shapes">
      <div class="deco-circle deco-1"></div>
      <div class="deco-circle deco-2"></div>
      <div class="deco-blob"></div>
    </div>

    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-badge">
            <ThunderboltOutlined />
            <span>Analytics</span>
          </div>
          <h1 class="page-title">Tableau de Bord</h1>
          <p class="page-subtitle">Performance et metriques de la plateforme</p>
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
        <div class="stat-decoration"></div>
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
          <div class="stat-period">sur {{ period }} jours</div>
          <div class="sparkline-wrapper">
            <svg class="sparkline" viewBox="0 0 80 28" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGradientRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#059669" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#059669" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path
                :d="generateSparklinePath(revenueSparkline) + ` L 80 28 L 0 28 Z`"
                fill="url(#sparkGradientRevenue)"
              />
              <path
                :d="generateSparklinePath(revenueSparkline)"
                fill="none"
                stroke="#059669"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Orders Card -->
      <div class="stat-card orders-card">
        <div class="stat-decoration"></div>
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
          <div class="stat-period">sur {{ period }} jours</div>
          <div class="sparkline-wrapper">
            <svg class="sparkline" viewBox="0 0 80 28" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGradientOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path
                :d="generateSparklinePath(ordersSparkline) + ` L 80 28 L 0 28 Z`"
                fill="url(#sparkGradientOrders)"
              />
              <path
                :d="generateSparklinePath(ordersSparkline)"
                fill="none"
                stroke="#4f46e5"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Average Order Card -->
      <div class="stat-card avg-card">
        <div class="stat-decoration"></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="stat-icon-wrapper">
              <BarChartOutlined />
            </div>
          </div>
          <div class="stat-value">{{ formatCurrency(avgOrderValue) }}</div>
          <div class="stat-label">Panier moyen</div>
          <div class="stat-progress">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: Math.min((avgOrderValue / 50) * 100, 100) + '%' }"></div>
            </div>
            <span class="progress-target">Objectif: 50€</span>
          </div>
        </div>
      </div>

      <!-- Daily Orders Card -->
      <div class="stat-card daily-card">
        <div class="stat-decoration"></div>
        <div class="stat-content">
          <div class="stat-header">
            <div class="stat-icon-wrapper">
              <LineChartOutlined />
            </div>
          </div>
          <div class="stat-value">{{ avgDailyOrders.toFixed(1) }}</div>
          <div class="stat-label">Commandes/jour</div>
          <div class="stat-progress">
            <div class="progress-track cyan">
              <div class="progress-fill" :style="{ width: Math.min((avgDailyOrders / 100) * 100, 100) + '%' }"></div>
            </div>
            <span class="progress-target">Objectif: 100/jour</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Platform Metrics Row -->
    <div class="metrics-row">
      <div class="metric-item">
        <div class="metric-icon-box blue">
          <ShopOutlined />
        </div>
        <div class="metric-data">
          <span class="metric-value">{{ stats?.overview.totalRestaurants || 0 }}</span>
          <span class="metric-label">Restaurants</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item">
        <div class="metric-icon-box green">
          <ShopOutlined />
        </div>
        <div class="metric-data">
          <span class="metric-value">{{ stats?.overview.activeRestaurants || 0 }}</span>
          <span class="metric-label">Actifs</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item">
        <div class="metric-icon-box purple">
          <UserOutlined />
        </div>
        <div class="metric-data">
          <span class="metric-value">{{ formatNumber(stats?.overview.totalUsers || 0) }}</span>
          <span class="metric-label">Utilisateurs</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item">
        <div class="metric-icon-box orange">
          <UserOutlined />
        </div>
        <div class="metric-data">
          <span class="metric-value">{{ formatNumber(stats?.overview.totalCustomers || 0) }}</span>
          <span class="metric-label">Clients</span>
        </div>
      </div>
      <div class="metric-divider"></div>
      <div class="metric-item highlight">
        <div class="metric-icon-box emerald">
          <RiseOutlined />
        </div>
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
            <!-- Weekly Comparison Cards -->
            <a-col :span="24">
              <div class="comparison-section">
                <div class="comparison-header">
                  <CalendarOutlined class="comparison-icon" />
                  <span>Comparaison Hebdomadaire</span>
                  <span class="comparison-subtitle">Cette semaine vs semaine precedente</span>
                </div>
                <div class="comparison-grid">
                  <div class="comparison-card">
                    <div class="comparison-label">Commandes cette semaine</div>
                    <div class="comparison-value">{{ weeklyStats?.thisWeekOrders || 0 }}</div>
                    <div class="comparison-change" :class="(weeklyStats?.ordersChange || 0) >= 0 ? 'positive' : 'negative'">
                      <RiseOutlined v-if="(weeklyStats?.ordersChange || 0) >= 0" />
                      <FallOutlined v-else />
                      {{ Math.abs(weeklyStats?.ordersChange || 0).toFixed(1) }}% vs sem. derniere
                    </div>
                    <div class="comparison-previous">Semaine precedente: {{ weeklyStats?.lastWeekOrders || 0 }}</div>
                  </div>
                  <div class="comparison-card">
                    <div class="comparison-label">Revenus cette semaine</div>
                    <div class="comparison-value">{{ formatCurrency(weeklyStats?.thisWeekRevenue || 0) }}</div>
                    <div class="comparison-change" :class="(weeklyStats?.revenueChange || 0) >= 0 ? 'positive' : 'negative'">
                      <RiseOutlined v-if="(weeklyStats?.revenueChange || 0) >= 0" />
                      <FallOutlined v-else />
                      {{ Math.abs(weeklyStats?.revenueChange || 0).toFixed(1) }}% vs sem. derniere
                    </div>
                    <div class="comparison-previous">Semaine precedente: {{ formatCurrency(weeklyStats?.lastWeekRevenue || 0) }}</div>
                  </div>
                  <div class="comparison-card highlight">
                    <div class="comparison-label">Moyenne journaliere</div>
                    <div class="comparison-value">{{ (weeklyStats?.avgDailyOrders || 0).toFixed(1) }}</div>
                    <div class="comparison-subtitle-small">commandes/jour</div>
                    <div class="comparison-extra">{{ formatCurrency(weeklyStats?.avgDailyRevenue || 0) }}/jour</div>
                  </div>
                  <div class="comparison-card accent">
                    <div class="comparison-label">Jour le plus actif</div>
                    <div class="comparison-value capitalize">{{ weeklyStats?.peakDay || '-' }}</div>
                    <div class="comparison-subtitle-small">cette semaine</div>
                    <div class="comparison-extra">{{ weeklyStats?.peakOrders || 0 }} commandes</div>
                  </div>
                </div>
              </div>
            </a-col>

            <!-- Weekly Trend Chart -->
            <a-col :span="24">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <LineChartOutlined />
                    <span>Tendance hebdomadaire</span>
                  </div>
                </div>
                <div class="chart-container xlarge">
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

            <!-- Monthly Comparison Cards -->
            <a-col :span="24">
              <div class="comparison-section">
                <div class="comparison-header">
                  <BarChartOutlined class="comparison-icon" />
                  <span>Comparaison Mensuelle</span>
                  <span class="comparison-subtitle">30 derniers jours vs 30 jours precedents</span>
                </div>
                <div class="comparison-grid two-col">
                  <div class="comparison-card large">
                    <div class="comparison-icon-box orders">
                      <ShoppingCartOutlined />
                    </div>
                    <div class="comparison-content">
                      <div class="comparison-label">Commandes (30j)</div>
                      <div class="comparison-value">{{ monthlyStats?.thisMonthOrders || 0 }}</div>
                      <div class="comparison-bar">
                        <div class="bar-track">
                          <div class="bar-fill orders" :style="{ width: Math.min(100, ((monthlyStats?.thisMonthOrders || 0) / Math.max(monthlyStats?.lastMonthOrders || 1, 1)) * 100) + '%' }"></div>
                        </div>
                        <span class="bar-label">vs {{ monthlyStats?.lastMonthOrders || 0 }} (mois prec.)</span>
                      </div>
                    </div>
                    <div class="comparison-badge" :class="(monthlyStats?.ordersChange || 0) >= 0 ? 'positive' : 'negative'">
                      <RiseOutlined v-if="(monthlyStats?.ordersChange || 0) >= 0" />
                      <FallOutlined v-else />
                      {{ Math.abs(monthlyStats?.ordersChange || 0).toFixed(1) }}%
                    </div>
                  </div>
                  <div class="comparison-card large">
                    <div class="comparison-icon-box revenue">
                      <DollarOutlined />
                    </div>
                    <div class="comparison-content">
                      <div class="comparison-label">Revenus (30j)</div>
                      <div class="comparison-value">{{ formatCurrency(monthlyStats?.thisMonthRevenue || 0) }}</div>
                      <div class="comparison-bar">
                        <div class="bar-track">
                          <div class="bar-fill revenue" :style="{ width: Math.min(100, ((monthlyStats?.thisMonthRevenue || 0) / Math.max(monthlyStats?.lastMonthRevenue || 1, 1)) * 100) + '%' }"></div>
                        </div>
                        <span class="bar-label">vs {{ formatCurrency(monthlyStats?.lastMonthRevenue || 0) }} (mois prec.)</span>
                      </div>
                    </div>
                    <div class="comparison-badge" :class="(monthlyStats?.revenueChange || 0) >= 0 ? 'positive' : 'negative'">
                      <RiseOutlined v-if="(monthlyStats?.revenueChange || 0) >= 0" />
                      <FallOutlined v-else />
                      {{ Math.abs(monthlyStats?.revenueChange || 0).toFixed(1) }}%
                    </div>
                  </div>
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
                <div class="chart-container xlarge">
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
            <!-- Restaurant Performance Summary -->
            <a-col :span="24">
              <div class="performance-section">
                <div class="performance-header">
                  <TrophyOutlined class="performance-icon" />
                  <span>Performance des Restaurants</span>
                  <span class="performance-subtitle">Top 10 ce mois</span>
                </div>
                <div class="performance-grid">
                  <!-- Top Performer Card -->
                  <div class="performance-card champion">
                    <div class="champion-crown">
                      <CrownOutlined />
                    </div>
                    <div class="champion-content">
                      <div class="champion-label">Champion du mois</div>
                      <div class="champion-name">{{ restaurantStats?.topPerformer?.name || '-' }}</div>
                      <div class="champion-stats">
                        <span class="champion-stat">
                          <ShoppingCartOutlined />
                          {{ restaurantStats?.topPerformer?.orders || 0 }} commandes
                        </span>
                        <span class="champion-stat">
                          <DollarOutlined />
                          {{ formatCurrency(restaurantStats?.topPerformer?.revenue || 0) }}
                        </span>
                      </div>
                      <div class="champion-share">
                        {{ (restaurantStats?.topRevenueShare || 0).toFixed(1) }}% du revenu total
                      </div>
                    </div>
                  </div>

                  <!-- Stats Cards -->
                  <div class="performance-card">
                    <div class="perf-icon-box purple">
                      <ShopOutlined />
                    </div>
                    <div class="perf-data">
                      <div class="perf-value">{{ restaurantStats?.restaurantCount || 0 }}</div>
                      <div class="perf-label">Restaurants actifs</div>
                    </div>
                  </div>

                  <div class="performance-card">
                    <div class="perf-icon-box green">
                      <DollarOutlined />
                    </div>
                    <div class="perf-data">
                      <div class="perf-value">{{ formatCurrency(restaurantStats?.totalRevenue || 0) }}</div>
                      <div class="perf-label">Revenu total Top 10</div>
                    </div>
                  </div>

                  <div class="performance-card">
                    <div class="perf-icon-box blue">
                      <ShoppingCartOutlined />
                    </div>
                    <div class="perf-data">
                      <div class="perf-value">{{ restaurantStats?.totalOrders || 0 }}</div>
                      <div class="perf-label">Commandes Top 10</div>
                    </div>
                  </div>

                  <div class="performance-card">
                    <div class="perf-icon-box orange">
                      <BarChartOutlined />
                    </div>
                    <div class="perf-data">
                      <div class="perf-value">{{ formatCurrency(restaurantStats?.avgRevenue || 0) }}</div>
                      <div class="perf-label">Revenu moyen/restaurant</div>
                    </div>
                  </div>

                  <!-- Best Average Order Card -->
                  <div class="performance-card highlight">
                    <div class="perf-icon-box emerald">
                      <StarOutlined />
                    </div>
                    <div class="perf-data">
                      <div class="perf-label">Meilleur panier moyen</div>
                      <div class="perf-value small">{{ restaurantStats?.bestAvgOrder?.name?.substring(0, 20) || '-' }}</div>
                      <div class="perf-extra">
                        {{ restaurantStats?.bestAvgOrder?.orders ? formatCurrency(restaurantStats.bestAvgOrder.revenue / restaurantStats.bestAvgOrder.orders) : '-' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a-col>

            <!-- Top Restaurants Chart -->
            <a-col :span="24">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">
                    <TrophyOutlined />
                    <span>Comparaison des Top 10</span>
                  </div>
                </div>
                <div class="chart-container xlarge">
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
                    <span>Classement detaille</span>
                  </div>
                </div>
                <a-table
                  :dataSource="chartData?.topRestaurants || []"
                  :loading="loading"
                  :pagination="false"
                  rowKey="_id"
                  class="premium-table"
                >
                  <a-table-column title="Rang" :width="80">
                    <template #default="{ index }">
                      <div class="rank-badge" :class="{ gold: index === 0, silver: index === 1, bronze: index === 2 }">
                        <TrophyOutlined v-if="index < 3" />
                        <span v-else>{{ index + 1 }}</span>
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
                  <a-table-column title="Part revenus" :width="120">
                    <template #default="{ record }">
                      <div class="share-bar">
                        <div class="share-fill" :style="{ width: (restaurantStats?.totalRevenue ? (record.revenue / restaurantStats.totalRevenue * 100) : 0) + '%' }"></div>
                        <span class="share-text">{{ restaurantStats?.totalRevenue ? (record.revenue / restaurantStats.totalRevenue * 100).toFixed(1) : 0 }}%</span>
                      </div>
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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

.analytics-view {
  padding: 0;
  font-family: 'DM Sans', sans-serif;
  position: relative;
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  color: #1e293b;
}

/* Decorative Shapes */
.deco-shapes {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
}

.deco-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%);
  top: -200px;
  right: -100px;
}

.deco-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(5, 150, 105, 0.06) 0%, transparent 70%);
  bottom: 10%;
  left: -100px;
}

.deco-blob {
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 70%);
  top: 40%;
  right: 10%;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
}

/* Page Header */
.page-header {
  position: relative;
  z-index: 1;
  margin-bottom: 32px;
  padding: 28px 0 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
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
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
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
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.5px;
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
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  color: #334155 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.period-select :deep(.ant-select-arrow) {
  color: #64748b;
}

.action-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #334155;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.action-btn.primary {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border: none;
  color: white;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
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
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.insights-icon {
  color: #f59e0b;
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
  gap: 14px;
  padding: 16px 20px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.insight-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.insight-card.success {
  border-left: 4px solid #059669;
}

.insight-card.warning {
  border-left: 4px solid #f59e0b;
}

.insight-card.info {
  border-left: 4px solid #4f46e5;
}

.insight-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.insight-card.success .insight-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.insight-card.warning .insight-icon {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
}

.insight-card.info .insight-icon {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4f46e5;
}

.insight-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  font-weight: 500;
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
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.stat-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.5;
  transform: translate(40%, -40%);
}

.revenue-card .stat-decoration {
  background: radial-gradient(circle, rgba(5, 150, 105, 0.15) 0%, transparent 70%);
}

.orders-card .stat-decoration {
  background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%);
}

.avg-card .stat-decoration {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
}

.daily-card .stat-decoration {
  background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
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
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.revenue-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.orders-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4f46e5;
}

.avg-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
}

.daily-card .stat-icon-wrapper {
  background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
  color: #0891b2;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.stat-trend.up {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.stat-trend.down {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.stat-period {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.sparkline-wrapper {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;
}

.sparkline {
  width: 100%;
  height: 28px;
}

.stat-progress {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;
}

.progress-track {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-track.cyan .progress-fill {
  background: linear-gradient(90deg, #0891b2, #22d3ee);
}

.progress-target {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

/* Metrics Row */
.metrics-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 22px 36px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  margin-bottom: 28px;
  flex-wrap: wrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.metric-item.highlight {
  padding: 10px 18px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 12px;
  border: 1px solid #bbf7d0;
}

.metric-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.metric-icon-box.blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.metric-icon-box.green {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.metric-icon-box.purple {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #7c3aed;
}

.metric-icon-box.orange {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  color: #ea580c;
}

.metric-icon-box.emerald {
  background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%);
  color: #059669;
}

.metric-data {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.metric-divider {
  width: 1px;
  height: 44px;
  background: linear-gradient(180deg, transparent, #e2e8f0, transparent);
}

/* Tabs Wrapper */
.analytics-tabs-wrapper {
  position: relative;
  z-index: 1;
}

.analytics-tabs {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.analytics-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.analytics-tabs :deep(.ant-tabs-nav::before) {
  border-color: #f1f5f9;
}

.analytics-tabs :deep(.ant-tabs-tab) {
  color: #64748b;
  font-weight: 500;
  transition: all 0.2s ease;
  padding: 10px 16px;
}

.analytics-tabs :deep(.ant-tabs-tab:hover) {
  color: #4f46e5;
}

.analytics-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #4f46e5 !important;
  font-weight: 600;
}

.analytics-tabs :deep(.ant-tabs-ink-bar) {
  background: linear-gradient(90deg, #4f46e5, #6366f1);
  height: 3px;
  border-radius: 2px;
}

/* Chart Cards */
.chart-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 18px;
  padding: 24px;
  height: 100%;
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
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
  color: #0f172a;
}

.chart-title :deep(.anticon) {
  color: #4f46e5;
  font-size: 18px;
}

.chart-container {
  height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-container.large {
  height: 550px;
}

.chart-container.doughnut {
  height: 380px;
}

/* Fix: Force a-spin to fill chart container height */
.chart-container :deep(.ant-spin-nested-loading) {
  width: 100%;
  height: 100%;
}

.chart-container :deep(.ant-spin-container) {
  width: 100%;
  height: 100%;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}

/* Table Styling */
.table-card {
  padding: 24px;
}

.premium-table :deep(.ant-table) {
  background: transparent;
  color: #334155;
}

.premium-table :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.premium-table :deep(.ant-table-tbody > tr > td) {
  background: transparent;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.premium-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fafc;
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: #f1f5f9;
  color: #64748b;
}

.rank-badge.gold {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #b45309;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.rank-badge.silver {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  box-shadow: 0 2px 8px rgba(148, 163, 184, 0.3);
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  color: #c2410c;
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.3);
}

.restaurant-name {
  font-weight: 600;
  color: #0f172a;
}

.stat-cell {
  font-weight: 600;
  color: #334155;
}

.stat-cell.orders {
  color: #4f46e5;
}

.stat-cell.revenue {
  color: #059669;
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
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}

.growth-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.growth-icon.orders-bg {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4f46e5;
}

.growth-icon.revenue-bg {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.growth-icon.restaurants-bg {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.growth-icon.customers-bg {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  color: #ea580c;
}

.growth-data {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.growth-value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.growth-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.growth-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.growth-badge.positive {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.growth-badge.negative {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

/* Empty State */
.analytics-tabs :deep(.ant-empty-description) {
  color: #64748b;
}

/* Extra Large Chart Container */
.chart-container.xlarge {
  height: 650px;
}

/* Comparison Section - Trends Tab */
.comparison-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.comparison-icon {
  font-size: 20px;
  color: #4f46e5;
}

.comparison-header > span:first-of-type {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.comparison-subtitle {
  font-size: 13px;
  color: #64748b;
  padding: 4px 12px;
  background: #f1f5f9;
  border-radius: 20px;
  margin-left: auto;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.comparison-grid.two-col {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 1200px) {
  .comparison-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .comparison-grid.two-col {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
}

.comparison-card {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 20px;
}

.comparison-card.highlight {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #bbf7d0;
}

.comparison-card.accent {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #bfdbfe;
}

.comparison-card.large {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
}

.comparison-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 8px;
}

.comparison-value {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.comparison-value.capitalize {
  text-transform: capitalize;
}

.comparison-change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.comparison-change.positive {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.comparison-change.negative {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

.comparison-previous {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
}

.comparison-subtitle-small {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.comparison-extra {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
  margin-top: 8px;
}

.comparison-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.comparison-icon-box.orders {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4f46e5;
}

.comparison-icon-box.revenue {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.comparison-content {
  flex: 1;
}

.comparison-bar {
  margin-top: 12px;
}

.bar-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-fill.orders {
  background: linear-gradient(90deg, #4f46e5, #6366f1);
}

.bar-fill.revenue {
  background: linear-gradient(90deg, #059669, #10b981);
}

.bar-label {
  font-size: 11px;
  color: #94a3b8;
}

.comparison-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.comparison-badge.positive {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.comparison-badge.negative {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

/* Performance Section - Restaurants Tab */
.performance-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.performance-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.performance-icon {
  font-size: 20px;
  color: #f59e0b;
}

.performance-header > span:first-of-type {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.performance-subtitle {
  font-size: 13px;
  color: #64748b;
  padding: 4px 12px;
  background: #f1f5f9;
  border-radius: 20px;
  margin-left: auto;
}

.performance-grid {
  display: grid;
  grid-template-columns: 2fr repeat(5, 1fr);
  gap: 16px;
}

@media (max-width: 1400px) {
  .performance-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .performance-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .performance-grid {
    grid-template-columns: 1fr;
  }
}

.performance-card {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.performance-card.highlight {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #bbf7d0;
}

.performance-card.champion {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #fbbf24;
  flex-direction: column;
  align-items: stretch;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.champion-crown {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 28px;
  color: #f59e0b;
  opacity: 0.6;
}

.champion-content {
  position: relative;
}

.champion-label {
  font-size: 12px;
  color: #92400e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.champion-name {
  font-size: 22px;
  font-weight: 800;
  color: #78350f;
  line-height: 1.2;
  margin-bottom: 12px;
}

.champion-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.champion-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.champion-share {
  font-size: 13px;
  color: #a16207;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  display: inline-block;
}

.perf-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.perf-icon-box.purple {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #7c3aed;
}

.perf-icon-box.green {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.perf-icon-box.blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.perf-icon-box.orange {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  color: #ea580c;
}

.perf-icon-box.emerald {
  background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%);
  color: #059669;
}

.perf-data {
  flex: 1;
  min-width: 0;
}

.perf-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.perf-value.small {
  font-size: 16px;
}

.perf-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.perf-extra {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
  margin-top: 4px;
}

/* Share Bar in Table */
.share-bar {
  position: relative;
  height: 24px;
  background: #f1f5f9;
  border-radius: 12px;
  overflow: hidden;
}

.share-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #6366f1);
  border-radius: 12px;
  transition: width 0.5s ease;
  min-width: 20px;
}

.share-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  z-index: 1;
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
    height: 350px;
  }

  .chart-container.large {
    height: 400px;
  }

  .chart-container.xlarge {
    height: 500px;
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

  .comparison-value {
    font-size: 22px;
  }

  .comparison-card.large {
    flex-direction: column;
    align-items: flex-start;
  }

  .comparison-badge {
    margin-top: 12px;
  }
}
</style>
