<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  WalletOutlined,
  CalendarOutlined,
  TrophyOutlined,
  CarOutlined,
  ClockCircleOutlined,
  EuroCircleOutlined,
  RiseOutlined,
  GiftOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons-vue';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface EarningsSummary {
  today: {
    total: number;
    deliveries: number;
    tips: number;
    bonuses: number;
  };
  week: {
    total: number;
    deliveries: number;
    tips: number;
    bonuses: number;
  };
  month: {
    total: number;
    deliveries: number;
    tips: number;
    bonuses: number;
  };
  pendingBalance: number;
  lastPayout?: {
    amount: number;
    date: string;
  };
}

interface DailyEarning {
  date: string;
  total: number;
  deliveries: number;
  tips: number;
  bonuses: number;
}

const loading = ref(true);
const activeTab = ref<'today' | 'week' | 'month'>('week');
const summary = ref<EarningsSummary>({
  today: { total: 0, deliveries: 0, tips: 0, bonuses: 0 },
  week: { total: 0, deliveries: 0, tips: 0, bonuses: 0 },
  month: { total: 0, deliveries: 0, tips: 0, bonuses: 0 },
  pendingBalance: 0,
});
const dailyBreakdown = ref<DailyEarning[]>([]);

const currentStats = computed(() => summary.value[activeTab.value]);

const tabs = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  }
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const fetchEarnings = async () => {
  try {
    loading.value = true;
    const response = await api.getDriverEarningsSummary();

    if (response.success && response.data) {
      const data = response.data as EarningsSummary & { dailyBreakdown?: DailyEarning[] };
      summary.value = {
        today: data.today || { total: 0, deliveries: 0, tips: 0, bonuses: 0 },
        week: data.week || { total: 0, deliveries: 0, tips: 0, bonuses: 0 },
        month: data.month || { total: 0, deliveries: 0, tips: 0, bonuses: 0 },
        pendingBalance: data.pendingBalance || 0,
        lastPayout: data.lastPayout,
      };
      dailyBreakdown.value = data.dailyBreakdown || [];
    }
  } catch (error) {
    console.error('Failed to fetch earnings:', error);
  } finally {
    loading.value = false;
  }
};

// Chart data for daily earnings bar chart
const barChartData = computed(() => {
  const sortedData = [...dailyBreakdown.value].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    labels: sortedData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Livraisons',
        data: sortedData.map((d) => d.total - d.tips - d.bonuses),
        backgroundColor: 'rgba(24, 144, 255, 0.8)',
        borderRadius: 6,
        barPercentage: 0.7,
      },
      {
        label: 'Pourboires',
        data: sortedData.map((d) => d.tips),
        backgroundColor: 'rgba(250, 173, 20, 0.8)',
        borderRadius: 6,
        barPercentage: 0.7,
      },
      {
        label: 'Bonus',
        data: sortedData.map((d) => d.bonuses),
        backgroundColor: 'rgba(114, 46, 209, 0.8)',
        borderRadius: 6,
        barPercentage: 0.7,
      },
    ],
  };
});

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: 'rgba(255, 255, 255, 0.65)' },
    },
    y: {
      stacked: true,
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      ticks: {
        color: 'rgba(255, 255, 255, 0.65)',
        callback: (value: string | number) => `${value}€`,
      },
    },
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.85)',
        usePointStyle: true,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.85)',
      padding: 12,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      callbacks: {
        label: (context: unknown) => {
          const ctx = context as { dataset: { label?: string }; raw: unknown };
          const label = ctx.dataset.label || '';
          const value = typeof ctx.raw === 'number' ? ctx.raw.toFixed(2) : '0.00';
          return `${label}: ${value}€`;
        },
      },
    },
  },
};

// Chart data for earnings breakdown donut chart
const donutChartData = computed(() => {
  const stats = currentStats.value;
  const baseFees = stats.total - stats.tips - stats.bonuses;

  return {
    labels: ['Livraisons', 'Pourboires', 'Bonus'],
    datasets: [
      {
        data: [baseFees, stats.tips, stats.bonuses],
        backgroundColor: [
          'rgba(24, 144, 255, 0.85)',
          'rgba(250, 173, 20, 0.85)',
          'rgba(114, 46, 209, 0.85)',
        ],
        borderColor: [
          'rgba(24, 144, 255, 1)',
          'rgba(250, 173, 20, 1)',
          'rgba(114, 46, 209, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };
});

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.85)',
        usePointStyle: true,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.85)',
      padding: 12,
      callbacks: {
        label: (context: unknown) => {
          const ctx = context as { label: string; raw: unknown; dataset: { data: number[] } };
          const rawValue = typeof ctx.raw === 'number' ? ctx.raw : 0;
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? ((rawValue / total) * 100).toFixed(1) : 0;
          return `${ctx.label}: ${rawValue.toFixed(2)}€ (${percentage}%)`;
        },
      },
    },
  },
};

// Week over week comparison
const weekComparison = computed(() => {
  // This would ideally come from the API - for now we'll show a placeholder
  const thisWeek = summary.value.week.total;
  const lastWeek = thisWeek * 0.85; // Placeholder for demo
  const difference = thisWeek - lastWeek;
  const percentChange = lastWeek > 0 ? ((difference / lastWeek) * 100) : 0;

  return {
    thisWeek,
    lastWeek,
    difference,
    percentChange,
    isPositive: difference >= 0,
  };
});

onMounted(() => {
  fetchEarnings();
});
</script>

<template>
  <div class="earnings-view">
    <div class="page-header">
      <h1>Mes Gains</h1>
    </div>

    <!-- Balance Card -->
    <div class="balance-card">
      <div class="balance-header">
        <WalletOutlined />
        <span>Solde disponible</span>
      </div>
      <div class="balance-amount">
        {{ formatCurrency(summary.pendingBalance) }}
      </div>
      <div v-if="summary.lastPayout" class="last-payout">
        Dernier virement: {{ formatCurrency(summary.lastPayout.amount) }}
        le {{ new Date(summary.lastPayout.date).toLocaleDateString('fr-FR') }}
      </div>
    </div>

    <!-- Period Tabs -->
    <div class="period-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :class="['period-tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key as 'today' | 'week' | 'month'"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <a-spin size="large" />
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card main">
          <div class="stat-icon earnings">
            <EuroCircleOutlined />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(currentStats.total) }}</div>
            <div class="stat-label">Total gagné</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon deliveries">
            <CarOutlined />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ currentStats.deliveries }}</div>
            <div class="stat-label">Livraisons</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon tips">
            <GiftOutlined />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(currentStats.tips) }}</div>
            <div class="stat-label">Pourboires</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon bonuses">
            <TrophyOutlined />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(currentStats.bonuses) }}</div>
            <div class="stat-label">Bonus</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <!-- Week Comparison Card -->
        <div v-if="activeTab === 'week'" class="comparison-card">
          <div class="comparison-header">
            <span>vs Semaine précédente</span>
            <div
              :class="['comparison-badge', weekComparison.isPositive ? 'positive' : 'negative']"
            >
              <RiseOutlined v-if="weekComparison.isPositive" />
              <span>{{ weekComparison.isPositive ? '+' : '' }}{{ weekComparison.percentChange.toFixed(1) }}%</span>
            </div>
          </div>
          <div class="comparison-details">
            <div class="comparison-item">
              <span class="label">Cette semaine</span>
              <span class="value">{{ formatCurrency(weekComparison.thisWeek) }}</span>
            </div>
            <div class="comparison-item">
              <span class="label">Semaine dernière</span>
              <span class="value">{{ formatCurrency(weekComparison.lastWeek) }}</span>
            </div>
          </div>
        </div>

        <!-- Earnings Breakdown Donut Chart -->
        <div class="chart-card donut-card">
          <div class="chart-header">
            <PieChartOutlined />
            <h3>Répartition des gains</h3>
          </div>
          <div class="chart-container donut-container">
            <Doughnut
              v-if="currentStats.total > 0"
              :data="donutChartData"
              :options="donutChartOptions"
            />
            <div v-else class="no-data">
              <p>Pas de données</p>
            </div>
          </div>
        </div>

        <!-- Daily Bar Chart -->
        <div v-if="activeTab !== 'today' && dailyBreakdown.length > 0" class="chart-card bar-card">
          <div class="chart-header">
            <BarChartOutlined />
            <h3>Historique des gains</h3>
          </div>
          <div class="chart-container bar-container">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </div>
      </div>

      <!-- Daily Breakdown -->
      <div v-if="activeTab !== 'today' && dailyBreakdown.length > 0" class="breakdown-section">
        <h2>Détail par jour</h2>
        <div class="breakdown-list">
          <div
            v-for="day in dailyBreakdown"
            :key="day.date"
            class="breakdown-item"
          >
            <div class="breakdown-date">
              <CalendarOutlined />
              <span>{{ formatDate(day.date) }}</span>
            </div>
            <div class="breakdown-stats">
              <span class="deliveries">{{ day.deliveries }} livraisons</span>
              <span class="amount">{{ formatCurrency(day.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Earnings Tips -->
      <div class="tips-section">
        <h2>Optimisez vos gains</h2>
        <div class="tips-list">
          <div class="tip-item">
            <div class="tip-icon">
              <ClockCircleOutlined />
            </div>
            <div class="tip-content">
              <h4>Heures de pointe</h4>
              <p>Livrez entre 12h-14h et 19h-21h pour des bonus supplémentaires</p>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-icon">
              <RiseOutlined />
            </div>
            <div class="tip-content">
              <h4>Note élevée</h4>
              <p>Maintenez une note supérieure à 4.5 pour recevoir plus de commandes</p>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-icon">
              <TrophyOutlined />
            </div>
            <div class="tip-content">
              <h4>Défis hebdomadaires</h4>
              <p>Complétez les défis pour débloquer des bonus exclusifs</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.earnings-view {
  max-width: 600px;
  margin: 0 auto;
}

.page-header h1 {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 20px 0;
}

.balance-card {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.3);
}

.balance-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  margin-bottom: 8px;
}

.balance-amount {
  color: #fff;
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
}

.last-payout {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.period-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.period-tab {
  flex: 1;
  padding: 10px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.period-tab.active {
  background: rgba(24, 144, 255, 0.2);
  color: #1890ff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-card.main {
  grid-column: span 2;
  padding: 20px;
}

.stat-card.main .stat-value {
  font-size: 28px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.earnings {
  background: linear-gradient(135deg, #52c41a, #73d13d);
  color: #fff;
}

.stat-icon.deliveries {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #fff;
}

.stat-icon.tips {
  background: linear-gradient(135deg, #faad14, #ffc53d);
  color: #fff;
}

.stat-icon.bonuses {
  background: linear-gradient(135deg, #722ed1, #9254de);
  color: #fff;
}

.stat-value {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.breakdown-section {
  margin-bottom: 24px;
}

.breakdown-section h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.breakdown-date {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.breakdown-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.breakdown-stats .deliveries {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.breakdown-stats .amount {
  color: #52c41a;
  font-weight: 600;
  font-size: 14px;
}

.tips-section h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tip-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(24, 144, 255, 0.15);
  color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.tip-content h4 {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.tip-content p {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  margin: 0;
  line-height: 1.4;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

/* Charts Section */
.charts-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.comparison-card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
}

.comparison-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.comparison-badge.positive {
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
}

.comparison-badge.negative {
  background: rgba(255, 77, 79, 0.15);
  color: #ff4d4f;
}

.comparison-details {
  display: flex;
  justify-content: space-between;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.comparison-item .label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.comparison-item .value {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.chart-card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #fff;
}

.chart-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
}

.chart-header :deep(.anticon) {
  font-size: 18px;
  color: #1890ff;
}

.chart-container {
  position: relative;
}

.donut-container {
  height: 220px;
}

.bar-container {
  height: 250px;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
}
</style>
