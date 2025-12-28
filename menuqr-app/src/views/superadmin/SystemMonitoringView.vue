<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import api from '@/services/api';
import type {
  SystemMetrics,
  DatabaseMetrics,
  AppMetrics,
  ServicesHealth,
  HealthCheck,
  MetricsHistoryPoint,
} from '@/services/api';
import {
  DashboardOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  MailOutlined,
  MessageOutlined,
} from '@ant-design/icons-vue';

// ============================================
// STATE
// ============================================

const loading = ref(true);
const autoRefresh = ref(true);
const refreshInterval = ref(30); // seconds
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const system = ref<SystemMetrics | null>(null);
const database = ref<DatabaseMetrics | null>(null);
const app = ref<AppMetrics | null>(null);
const services = ref<ServicesHealth | null>(null);
const health = ref<HealthCheck | null>(null);
const history = ref<MetricsHistoryPoint[]>([]);

// ============================================
// COMPUTED
// ============================================

const overallStatus = computed(() => {
  if (!health.value) {return 'loading';}
  return health.value.status;
});

const _statusColor = computed(() => {
  switch (overallStatus.value) {
    case 'healthy': return '#52c41a';
    case 'degraded': return '#faad14';
    case 'unhealthy': return '#ff4d4f';
    default: return '#d9d9d9';
  }
});
void _statusColor.value; // Reserved for status indicator styling

const statusLabel = computed(() => {
  switch (overallStatus.value) {
    case 'healthy': return 'Systeme en bonne sante';
    case 'degraded': return 'Performance degradee';
    case 'unhealthy': return 'Probleme detecte';
    default: return 'Chargement...';
  }
});

const cpuProgress = computed(() => system.value?.cpu.usage || 0);
const memoryProgress = computed(() => system.value?.memory.percentage || 0);

const getProgressStatus = (value: number) => {
  if (value >= 90) {return 'exception';}
  if (value >= 75) {return 'active';}
  return 'normal';
};

const getProgressColor = (value: number) => {
  if (value >= 90) {return '#ff4d4f';}
  if (value >= 75) {return '#faad14';}
  return '#52c41a';
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {return `${days}j ${hours}h ${minutes}m`;}
  if (hours > 0) {return `${hours}h ${minutes}m`;}
  return `${minutes}m`;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ============================================
// METHODS
// ============================================

const fetchMetrics = async () => {
  try {
    const response = await api.getAllMonitoringMetrics(1);
    if (response.success && response.data) {
      system.value = response.data.system;
      database.value = response.data.database;
      app.value = response.data.app;
      services.value = response.data.services;
      health.value = response.data.health;
      history.value = response.data.history;
    }
  } catch (_error) {
    console.error('Failed to fetch metrics:', error);
    message.error('Erreur lors du chargement des metriques');
  } finally {
    loading.value = false;
  }
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
    message.success('Actualisation automatique activee');
  } else {
    stopAutoRefresh();
    message.info('Actualisation automatique desactivee');
  }
};

const startAutoRefresh = () => {
  if (refreshTimer) {clearInterval(refreshTimer);}
  refreshTimer = setInterval(() => {
    fetchMetrics();
  }, refreshInterval.value * 1000);
};

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

const getServiceStatusColor = (status: string) => {
  switch (status) {
    case 'connected':
    case 'running':
    case 'configured':
      return 'green';
    case 'disconnected':
    case 'stopped':
    case 'not_configured':
      return 'red';
    case 'mock':
      return 'orange';
    default:
      return 'default';
  }
};

const getServiceStatusLabel = (status: string) => {
  switch (status) {
    case 'connected': return 'Connecte';
    case 'running': return 'En cours';
    case 'configured': return 'Configure';
    case 'disconnected': return 'Deconnecte';
    case 'stopped': return 'Arrete';
    case 'not_configured': return 'Non configure';
    case 'mock': return 'Mode test';
    default: return status;
  }
};

// ============================================
// LIFECYCLE
// ============================================

onMounted(() => {
  fetchMetrics();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div class="monitoring-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <DashboardOutlined class="header-icon" />
          Monitoring Systeme
        </h1>
        <p class="page-subtitle">Surveillance en temps reel des performances</p>
      </div>
      <a-space>
        <a-switch
          v-model:checked="autoRefresh"
          @change="toggleAutoRefresh"
        />
        <span class="refresh-label">Auto-refresh ({{ refreshInterval }}s)</span>
        <a-button @click="fetchMetrics" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
      </a-space>
    </div>

    <!-- Overall Status Banner -->
    <a-alert
      :message="statusLabel"
      :type="overallStatus === 'healthy' ? 'success' : overallStatus === 'degraded' ? 'warning' : 'error'"
      show-icon
      class="status-banner"
    >
      <template #icon>
        <CheckCircleOutlined v-if="overallStatus === 'healthy'" />
        <WarningOutlined v-else-if="overallStatus === 'degraded'" />
        <CloseCircleOutlined v-else />
      </template>
      <template #description v-if="health">
        <span>
          CPU: {{ health.details.cpuUsage.toFixed(1) }}% |
          Memoire: {{ health.details.memoryUsage.toFixed(1) }}% |
          Uptime: {{ formatUptime(health.details.uptime) }}
        </span>
      </template>
    </a-alert>

    <a-spin :spinning="loading">
      <a-row :gutter="[24, 24]">
        <!-- SYSTEM METRICS -->
        <a-col :xs="24" :lg="12">
          <a-card class="metric-card">
            <template #title>
              <div class="card-title">
                <CloudServerOutlined class="card-icon" />
                <span>Systeme</span>
              </div>
            </template>

            <template v-if="system">
              <!-- CPU -->
              <div class="metric-section">
                <div class="metric-header">
                  <span class="metric-label">CPU</span>
                  <span class="metric-value" :style="{ color: getProgressColor(cpuProgress) }">
                    {{ cpuProgress.toFixed(1) }}%
                  </span>
                </div>
                <a-progress
                  :percent="cpuProgress"
                  :status="getProgressStatus(cpuProgress)"
                  :stroke-color="getProgressColor(cpuProgress)"
                  :show-info="false"
                />
                <div class="metric-details">
                  <span>{{ system.cpu.cores }} cores</span>
                  <span>{{ system.cpu.model }}</span>
                </div>
              </div>

              <!-- Memory -->
              <div class="metric-section">
                <div class="metric-header">
                  <span class="metric-label">Memoire</span>
                  <span class="metric-value" :style="{ color: getProgressColor(memoryProgress) }">
                    {{ memoryProgress.toFixed(1) }}%
                  </span>
                </div>
                <a-progress
                  :percent="memoryProgress"
                  :status="getProgressStatus(memoryProgress)"
                  :stroke-color="getProgressColor(memoryProgress)"
                  :show-info="false"
                />
                <div class="metric-details">
                  <span>{{ formatBytes(system.memory.used) }} / {{ formatBytes(system.memory.total) }}</span>
                  <span>{{ formatBytes(system.memory.free) }} libre</span>
                </div>
              </div>

              <!-- System Info -->
              <a-divider />
              <a-descriptions :column="2" size="small">
                <a-descriptions-item label="Plateforme">{{ system.platform }}</a-descriptions-item>
                <a-descriptions-item label="Node.js">{{ system.nodeVersion }}</a-descriptions-item>
                <a-descriptions-item label="Hostname">{{ system.hostname }}</a-descriptions-item>
                <a-descriptions-item label="Uptime">
                  <a-tag color="blue">{{ formatUptime(system.uptime.process) }}</a-tag>
                </a-descriptions-item>
              </a-descriptions>
            </template>
          </a-card>
        </a-col>

        <!-- DATABASE METRICS -->
        <a-col :xs="24" :lg="12">
          <a-card class="metric-card">
            <template #title>
              <div class="card-title">
                <DatabaseOutlined class="card-icon" />
                <span>Base de donnees</span>
              </div>
            </template>

            <template v-if="database">
              <a-row :gutter="16" class="mb-4">
                <a-col :span="12">
                  <a-statistic
                    title="Statut"
                    :value="database.status === 'connected' ? 'Connecte' : 'Deconnecte'"
                    :value-style="{ color: database.status === 'connected' ? '#52c41a' : '#ff4d4f' }"
                  />
                </a-col>
                <a-col :span="12">
                  <a-statistic
                    title="Taille totale"
                    :value="formatBytes(database.totalSize)"
                  />
                </a-col>
              </a-row>

              <a-divider orientation="left">Collections</a-divider>

              <a-table
                :data-source="database.collections.slice(0, 8)"
                :pagination="false"
                size="small"
                :columns="[
                  { title: 'Collection', dataIndex: 'name', key: 'name' },
                  { title: 'Documents', dataIndex: 'count', key: 'count', align: 'right' },
                  { title: 'Taille', key: 'size', align: 'right' },
                ]"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'size'">
                    {{ formatBytes(record.size) }}
                  </template>
                </template>
              </a-table>
            </template>
          </a-card>
        </a-col>

        <!-- APPLICATION METRICS -->
        <a-col :xs="24" :lg="12">
          <a-card class="metric-card">
            <template #title>
              <div class="card-title">
                <AppstoreOutlined class="card-icon" />
                <span>Application</span>
              </div>
            </template>

            <template v-if="app">
              <a-row :gutter="[16, 24]">
                <a-col :span="12">
                  <a-statistic title="Utilisateurs actifs" :value="app.activeUsers">
                    <template #prefix><ThunderboltOutlined /></template>
                  </a-statistic>
                </a-col>
                <a-col :span="12">
                  <a-statistic title="Restaurants actifs" :value="app.activeRestaurants">
                    <template #prefix><ThunderboltOutlined /></template>
                  </a-statistic>
                </a-col>
                <a-col :span="12">
                  <a-statistic title="Commandes (aujourd'hui)" :value="app.ordersToday" />
                </a-col>
                <a-col :span="12">
                  <a-statistic title="Clients total" :value="app.customersTotal" />
                </a-col>
                <a-col :span="12">
                  <a-statistic title="Abonnements actifs" :value="app.activeSubscriptions" />
                </a-col>
              </a-row>

              <a-divider orientation="left">Performance</a-divider>

              <a-row :gutter="[16, 16]">
                <a-col :span="8">
                  <a-statistic
                    title="Req/min"
                    :value="app.requestsPerMinute"
                    :value-style="{ color: '#1890ff' }"
                  >
                    <template #suffix>
                      <ApiOutlined />
                    </template>
                  </a-statistic>
                </a-col>
                <a-col :span="8">
                  <a-statistic
                    title="Temps reponse"
                    :value="app.averageResponseTime.toFixed(0)"
                    suffix="ms"
                    :value-style="{ color: app.averageResponseTime > 500 ? '#faad14' : '#52c41a' }"
                  >
                    <template #prefix><ClockCircleOutlined /></template>
                  </a-statistic>
                </a-col>
                <a-col :span="8">
                  <a-statistic
                    title="Taux erreur"
                    :value="app.errorRate.toFixed(1)"
                    suffix="%"
                    :value-style="{ color: app.errorRate > 5 ? '#ff4d4f' : '#52c41a' }"
                  />
                </a-col>
              </a-row>
            </template>
          </a-card>
        </a-col>

        <!-- SERVICES STATUS -->
        <a-col :xs="24" :lg="12">
          <a-card class="metric-card">
            <template #title>
              <div class="card-title">
                <ApiOutlined class="card-icon" />
                <span>Services</span>
              </div>
            </template>

            <template v-if="services">
              <a-list item-layout="horizontal">
                <!-- MongoDB -->
                <a-list-item>
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar class="service-avatar mongodb">
                        <template #icon><DatabaseOutlined /></template>
                      </a-avatar>
                    </template>
                    <template #title>
                      <span>MongoDB</span>
                      <a-tag :color="getServiceStatusColor(services.mongodb.status)" class="ml-2">
                        {{ getServiceStatusLabel(services.mongodb.status) }}
                      </a-tag>
                    </template>
                    <template #description>
                      <span v-if="services.mongodb.latency">
                        Latence: {{ services.mongodb.latency }}ms
                      </span>
                    </template>
                  </a-list-item-meta>
                </a-list-item>

                <!-- Scheduler -->
                <a-list-item>
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar class="service-avatar scheduler">
                        <template #icon><ClockCircleOutlined /></template>
                      </a-avatar>
                    </template>
                    <template #title>
                      <span>Scheduler</span>
                      <a-tag :color="getServiceStatusColor(services.scheduler.status)" class="ml-2">
                        {{ getServiceStatusLabel(services.scheduler.status) }}
                      </a-tag>
                    </template>
                    <template #description>
                      Planificateur de taches
                    </template>
                  </a-list-item-meta>
                </a-list-item>

                <!-- SMS Service -->
                <a-list-item>
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar class="service-avatar sms">
                        <template #icon><MessageOutlined /></template>
                      </a-avatar>
                    </template>
                    <template #title>
                      <span>SMS Service</span>
                      <a-tag :color="getServiceStatusColor(services.sms.status)" class="ml-2">
                        {{ getServiceStatusLabel(services.sms.status) }}
                      </a-tag>
                    </template>
                    <template #description>
                      {{ services.sms.status === 'mock' ? 'Mode simulation (dev)' : 'Service SMS actif' }}
                    </template>
                  </a-list-item-meta>
                </a-list-item>

                <!-- Email Service -->
                <a-list-item>
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar class="service-avatar email">
                        <template #icon><MailOutlined /></template>
                      </a-avatar>
                    </template>
                    <template #title>
                      <span>Email Service</span>
                      <a-tag :color="getServiceStatusColor(services.email.status)" class="ml-2">
                        {{ getServiceStatusLabel(services.email.status) }}
                      </a-tag>
                    </template>
                    <template #description>
                      Service d'envoi d'emails
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </a-list>
            </template>
          </a-card>
        </a-col>

        <!-- METRICS HISTORY -->
        <a-col :span="24">
          <a-card class="metric-card">
            <template #title>
              <div class="card-title">
                <HistoryOutlined class="card-icon" />
                <span>Historique (derniere heure)</span>
              </div>
            </template>

            <template v-if="history.length > 0">
              <a-table
                :data-source="history.slice(-20).reverse()"
                :pagination="false"
                size="small"
                :scroll="{ x: 800 }"
                :columns="[
                  { title: 'Heure', key: 'timestamp', width: 150 },
                  { title: 'CPU %', key: 'cpu', align: 'right', width: 100 },
                  { title: 'Memoire %', key: 'memory', align: 'right', width: 100 },
                  { title: 'Requetes', key: 'requests', align: 'right', width: 100 },
                  { title: 'Temps rep.', key: 'avgResponseTime', align: 'right', width: 120 },
                  { title: 'Erreurs %', key: 'errorRate', align: 'right', width: 100 },
                ]"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'timestamp'">
                    {{ new Date(record.timestamp).toLocaleTimeString('fr-FR') }}
                  </template>
                  <template v-else-if="column.key === 'cpu'">
                    <span :style="{ color: getProgressColor(record.cpu) }">
                      {{ record.cpu.toFixed(1) }}%
                    </span>
                  </template>
                  <template v-else-if="column.key === 'memory'">
                    <span :style="{ color: getProgressColor(record.memory) }">
                      {{ record.memory.toFixed(1) }}%
                    </span>
                  </template>
                  <template v-else-if="column.key === 'requests'">
                    {{ record.requests }}
                  </template>
                  <template v-else-if="column.key === 'avgResponseTime'">
                    {{ record.avgResponseTime.toFixed(0) }}ms
                  </template>
                  <template v-else-if="column.key === 'errorRate'">
                    <span :style="{ color: record.errorRate > 5 ? '#ff4d4f' : '#52c41a' }">
                      {{ record.errorRate.toFixed(1) }}%
                    </span>
                  </template>
                </template>
              </a-table>
            </template>
            <a-empty v-else description="Aucun historique disponible" />
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<style scoped>
.monitoring-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 28px;
  color: #8b5cf6;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.refresh-label {
  font-size: 13px;
  color: #64748b;
}

.status-banner {
  margin-bottom: 24px;
  border-radius: 8px;
}

.metric-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.card-icon {
  font-size: 18px;
  color: #8b5cf6;
}

.metric-section {
  margin-bottom: 24px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-label {
  font-weight: 600;
  color: #1e293b;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
}

.metric-details {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.mb-4 {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.service-avatar {
  width: 40px;
  height: 40px;
}

.service-avatar.mongodb {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
}

.service-avatar.scheduler {
  background: linear-gradient(135deg, #2196f3, #1565c0);
}

.service-avatar.sms {
  background: linear-gradient(135deg, #ff9800, #ef6c00);
}

.service-avatar.email {
  background: linear-gradient(135deg, #9c27b0, #6a1b9a);
}

:deep(.ant-card-head) {
  border-bottom-color: #f1f5f9;
}

:deep(.ant-progress-inner) {
  border-radius: 4px;
}

:deep(.ant-progress-bg) {
  border-radius: 4px;
}

:deep(.ant-statistic-title) {
  color: #64748b;
  font-size: 12px;
}

:deep(.ant-statistic-content-value) {
  font-size: 24px;
  font-weight: 600;
}

:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
}

:deep(.ant-descriptions-item-label) {
  color: #64748b;
}
</style>
