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
const period = ref(90); // Default to 90 days for analytics
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

// Watch period changes
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
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
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
        backgroundColor: '#6366f1',
        borderRadius: 8,
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
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Revenus (x100)',
        data: weeklyData.map((d) => d.revenue / 100),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
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
      },
    ],
  };
});

// Restaurant growth chart data
const restaurantGrowthChartData = computed(() => {
  if (!chartData.value?.restaurantGrowth) {
    return { labels: [], datasets: [] };
  }

  // Sample data to reduce chart density
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
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: 'Nouvelles inscriptions',
        data: sampledData.map((d) => d.count),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
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
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
      {
        label: 'Revenus',
        data: chartData.value.topRestaurants.map((r) => r.revenue),
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
    ],
  };
});

// Chart options
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
    x: {
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
      position: 'right' as const,
    },
  },
  cutout: '60%',
};

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
    },
  },
};

const mixedChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      position: 'left' as const,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
    y1: {
      beginAtZero: true,
      position: 'right' as const,
      grid: {
        display: false,
      },
    },
    x: {
      grid: {
        display: false,
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
  }).format(value);
};

// Export data
const exportData = () => {
  if (!chartData.value) {return;}

  const data = {
    exportedAt: new Date().toISOString(),
    period: `${period.value} jours`,
    summary: {
      totalRevenue: totalRevenue.value,
      totalOrders: totalOrders.value,
      avgOrderValue: avgOrderValue.value,
      avgDailyOrders: avgDailyOrders.value,
    },
    ordersByDay: chartData.value.ordersByDay,
    topRestaurants: chartData.value.topRestaurants,
    orderStatusDistribution: chartData.value.orderStatusDistribution,
    subscriptionDistribution: chartData.value.subscriptionDistribution,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  message.success('Donnees exportees avec succes');
};
</script>

<template>
  <div class="analytics-view">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">Analytics</h1>
          <p class="page-subtitle">Statistiques et rapports detailles de la plateforme</p>
        </div>
        <div class="header-actions">
          <a-select
            v-model:value="period"
            :options="periodOptions"
            style="width: 140px"
          >
            <template #suffixIcon>
              <CalendarOutlined />
            </template>
          </a-select>
          <a-button @click="fetchData" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            Actualiser
          </a-button>
          <a-button type="primary" @click="exportData" :disabled="!chartData">
            <template #icon><DownloadOutlined /></template>
            Exporter
          </a-button>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <a-row :gutter="[16, 16]" class="stats-row">
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Revenus totaux"
            :value="totalRevenue"
            :precision="2"
            prefix="EUR"
            :loading="loading"
          >
            <template #suffix>
              <span class="period-label">/ {{ period }}j</span>
            </template>
          </a-statistic>
          <div class="stat-icon revenue">
            <DollarOutlined />
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Total commandes"
            :value="totalOrders"
            :loading="loading"
          >
            <template #suffix>
              <span class="period-label">/ {{ period }}j</span>
            </template>
          </a-statistic>
          <div class="stat-icon orders">
            <ShoppingCartOutlined />
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Panier moyen"
            :value="avgOrderValue"
            :precision="2"
            prefix="EUR"
            :loading="loading"
          />
          <div class="stat-icon avg">
            <BarChartOutlined />
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card class="stat-card">
          <a-statistic
            title="Commandes/jour"
            :value="avgDailyOrders"
            :precision="1"
            :loading="loading"
          />
          <div class="stat-icon daily">
            <LineChartOutlined />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Tabs for different views -->
    <a-tabs v-model:activeKey="activeTab" class="analytics-tabs">
      <a-tab-pane key="overview" tab="Vue d'ensemble">
        <a-row :gutter="[24, 24]">
          <!-- Monthly Revenue Chart -->
          <a-col :xs="24" :lg="12">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <LineChartOutlined />
                  Evolution des revenus mensuels
                </div>
              </template>
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
            </a-card>
          </a-col>

          <!-- Monthly Orders Chart -->
          <a-col :xs="24" :lg="12">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <BarChartOutlined />
                  Commandes par mois
                </div>
              </template>
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
            </a-card>
          </a-col>

          <!-- Subscription Distribution -->
          <a-col :xs="24" :lg="12">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <PieChartOutlined />
                  Repartition des abonnements
                </div>
              </template>
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
            </a-card>
          </a-col>

          <!-- Order Status Distribution -->
          <a-col :xs="24" :lg="12">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <PieChartOutlined />
                  Statut des commandes
                </div>
              </template>
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
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="trends" tab="Tendances">
        <a-row :gutter="[24, 24]">
          <!-- Weekly Trend Chart -->
          <a-col :span="24">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <LineChartOutlined />
                  Tendance hebdomadaire
                </div>
              </template>
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
            </a-card>
          </a-col>

          <!-- Restaurant Growth Chart -->
          <a-col :span="24">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <ShopOutlined />
                  Croissance des restaurants
                </div>
              </template>
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
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="restaurants" tab="Restaurants">
        <a-row :gutter="[24, 24]">
          <!-- Top Restaurants Chart -->
          <a-col :span="24">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <BarChartOutlined />
                  Top 10 Restaurants (ce mois)
                </div>
              </template>
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
            </a-card>
          </a-col>

          <!-- Top Restaurants Table -->
          <a-col :span="24">
            <a-card>
              <template #title>
                <div class="card-title">
                  <ShopOutlined />
                  Classement des restaurants
                </div>
              </template>
              <a-table
                :dataSource="chartData?.topRestaurants || []"
                :loading="loading"
                :pagination="false"
                rowKey="_id"
              >
                <a-table-column title="Rang" :width="80">
                  <template #default="{ index }">
                    <a-tag :color="index < 3 ? 'gold' : 'default'">
                      #{{ index + 1 }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="Restaurant" dataIndex="name" />
                <a-table-column title="Commandes" dataIndex="orders" :width="120">
                  <template #default="{ record }">
                    <span class="stat-value">{{ record.orders }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="Revenus" dataIndex="revenue" :width="150">
                  <template #default="{ record }">
                    <span class="stat-value green">{{ formatCurrency(record.revenue) }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="Panier moyen" :width="150">
                  <template #default="{ record }">
                    <span class="stat-value">
                      {{ record.orders > 0 ? formatCurrency(record.revenue / record.orders) : '-' }}
                    </span>
                  </template>
                </a-table-column>
              </a-table>
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="platform" tab="Plateforme">
        <a-row :gutter="[24, 24]">
          <!-- Platform Overview Stats -->
          <a-col :xs="12" :sm="8" :lg="4">
            <a-card class="metric-card">
              <a-statistic
                title="Total Restaurants"
                :value="stats?.overview.totalRestaurants || 0"
                :loading="loading"
              >
                <template #prefix>
                  <ShopOutlined class="metric-icon blue" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="8" :lg="4">
            <a-card class="metric-card">
              <a-statistic
                title="Restaurants actifs"
                :value="stats?.overview.activeRestaurants || 0"
                :loading="loading"
              >
                <template #prefix>
                  <ShopOutlined class="metric-icon green" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="8" :lg="4">
            <a-card class="metric-card">
              <a-statistic
                title="Utilisateurs"
                :value="stats?.overview.totalUsers || 0"
                :loading="loading"
              >
                <template #prefix>
                  <UserOutlined class="metric-icon purple" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="8" :lg="4">
            <a-card class="metric-card">
              <a-statistic
                title="Clients"
                :value="stats?.overview.totalCustomers || 0"
                :loading="loading"
              >
                <template #prefix>
                  <UserOutlined class="metric-icon orange" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="8" :lg="4">
            <a-card class="metric-card">
              <a-statistic
                title="Total commandes"
                :value="stats?.overview.totalOrders || 0"
                :loading="loading"
              >
                <template #prefix>
                  <ShoppingCartOutlined class="metric-icon cyan" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :xs="12" :sm="8" :lg="4">
            <a-card class="metric-card">
              <a-statistic
                title="Nouveaux ce mois"
                :value="stats?.thisMonth.newRestaurants || 0"
                :loading="loading"
              >
                <template #prefix>
                  <RiseOutlined class="metric-icon green" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>

          <!-- Growth indicators -->
          <a-col :span="24">
            <a-card>
              <template #title>
                <div class="card-title">
                  <RiseOutlined />
                  Croissance ce mois
                </div>
              </template>
              <a-row :gutter="[24, 24]">
                <a-col :xs="24" :sm="12" :lg="6">
                  <div class="growth-item">
                    <div class="growth-label">Commandes</div>
                    <div class="growth-value">
                      {{ stats?.thisMonth.orders || 0 }}
                      <a-tag
                        v-if="stats?.growth.orders"
                        :color="(stats?.growth.orders || 0) >= 0 ? 'green' : 'red'"
                      >
                        <template #icon>
                          <RiseOutlined v-if="(stats?.growth.orders || 0) >= 0" />
                          <FallOutlined v-else />
                        </template>
                        {{ Math.abs(stats?.growth.orders || 0).toFixed(1) }}%
                      </a-tag>
                    </div>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="12" :lg="6">
                  <div class="growth-item">
                    <div class="growth-label">Revenus</div>
                    <div class="growth-value">
                      {{ formatCurrency(stats?.thisMonth.revenue || 0) }}
                      <a-tag
                        v-if="stats?.growth.revenue"
                        :color="(stats?.growth.revenue || 0) >= 0 ? 'green' : 'red'"
                      >
                        <template #icon>
                          <RiseOutlined v-if="(stats?.growth.revenue || 0) >= 0" />
                          <FallOutlined v-else />
                        </template>
                        {{ Math.abs(stats?.growth.revenue || 0).toFixed(1) }}%
                      </a-tag>
                    </div>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="12" :lg="6">
                  <div class="growth-item">
                    <div class="growth-label">Nouveaux restaurants</div>
                    <div class="growth-value">
                      {{ stats?.thisMonth.newRestaurants || 0 }}
                    </div>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="12" :lg="6">
                  <div class="growth-item">
                    <div class="growth-label">Nouveaux clients</div>
                    <div class="growth-value">
                      {{ stats?.thisMonth.newCustomers || 0 }}
                    </div>
                  </div>
                </a-col>
              </a-row>
            </a-card>
          </a-col>

          <!-- Subscription Distribution -->
          <a-col :xs="24" :lg="12">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <PieChartOutlined />
                  Distribution des abonnements
                </div>
              </template>
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
            </a-card>
          </a-col>

          <!-- Order Status Distribution -->
          <a-col :xs="24" :lg="12">
            <a-card class="chart-card">
              <template #title>
                <div class="card-title">
                  <PieChartOutlined />
                  Distribution des commandes
                </div>
              </template>
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
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.analytics-view {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
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

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.stat-card :deep(.ant-statistic-title) {
  font-size: 13px;
  color: #64748b;
}

.stat-card :deep(.ant-statistic-content) {
  font-size: 24px;
}

.period-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
}

.stat-icon {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.revenue {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-icon.orders {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.stat-icon.avg {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-icon.daily {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.analytics-tabs {
  background: white;
  border-radius: 12px;
  padding: 16px;
}

.analytics-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 12px;
  height: 100%;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
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

.metric-card {
  border-radius: 12px;
  text-align: center;
}

.metric-card :deep(.ant-statistic-title) {
  font-size: 12px;
}

.metric-card :deep(.ant-statistic-content) {
  font-size: 20px;
}

.metric-icon {
  font-size: 18px;
  margin-right: 4px;
}

.metric-icon.blue {
  color: #3b82f6;
}

.metric-icon.green {
  color: #10b981;
}

.metric-icon.purple {
  color: #8b5cf6;
}

.metric-icon.orange {
  color: #f59e0b;
}

.metric-icon.cyan {
  color: #06b6d4;
}

.growth-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
}

.growth-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.growth-value {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.stat-value {
  font-weight: 600;
  color: #1e293b;
}

.stat-value.green {
  color: #10b981;
}

@media (max-width: 768px) {
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
}
</style>
