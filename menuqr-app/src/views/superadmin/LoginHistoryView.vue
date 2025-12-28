<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api, { type LoginHistoryEntry } from '@/services/api';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  GlobalOutlined,
  LoginOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

const loading = ref(true);
const history = ref<LoginHistoryEntry[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 50,
  total: 0,
});

// Filters
const search = ref('');
const statusFilter = ref<string>('all');
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

// Drawer state
const drawerVisible = ref(false);
const selectedEntry = ref<LoginHistoryEntry | null>(null);

// Stats
const stats = ref<{
  today: { total: number; success: number; failed: number; uniqueUsers: number };
  byStatus: { _id: string; count: number }[];
  byDevice: { _id: string; count: number }[];
  daily: { date: string; total: number; success: number; failed: number }[];
  topIPs: { _id: string; count: number; successCount: number; failedCount: number }[];
  failureReasons: { _id: string; count: number }[];
  avgSessionDuration: number;
} | null>(null);

const columns: TableColumnsType = [
  {
    title: 'Date',
    key: 'loginAt',
    width: 160,
    fixed: 'left',
  },
  {
    title: 'Utilisateur',
    key: 'user',
    width: 240,
  },
  {
    title: 'Role',
    key: 'role',
    width: 100,
  },
  {
    title: 'Device',
    key: 'device',
    width: 140,
  },
  {
    title: 'Adresse IP',
    key: 'ip',
    width: 140,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 80,
    align: 'center',
  },
];

const roleColors: Record<string, string> = {
  superadmin: 'purple',
  owner: 'blue',
  admin: 'cyan',
  staff: 'default',
};

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  owner: 'Proprietaire',
  admin: 'Admin',
  staff: 'Staff',
};

const failureReasonLabels: Record<string, string> = {
  invalid_credentials: 'Identifiants invalides',
  account_locked: 'Compte verrouille',
  account_disabled: 'Compte desactive',
  session_expired: 'Session expiree',
  token_revoked: 'Token revoque',
  ip_blocked: 'IP bloquee',
  too_many_attempts: 'Trop de tentatives',
  other: 'Autre',
};

const getDeviceIcon = (type?: string) => {
  switch (type) {
    case 'mobile':
      return MobileOutlined;
    case 'tablet':
      return TabletOutlined;
    case 'desktop':
    default:
      return DesktopOutlined;
  }
};

const formatDuration = (ms: number) => {
  if (!ms) {return '-';}
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}min`;
  }
  return `${minutes}min`;
};

const fetchHistory = async () => {
  loading.value = true;
  try {
    const params: Record<string, string | number | undefined> = {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
    };

    if (search.value) {params.userEmail = search.value;}
    if (statusFilter.value !== 'all') {params.status = statusFilter.value;}
    if (dateRange.value) {
      params.startDate = dateRange.value[0].toISOString();
      params.endDate = dateRange.value[1].toISOString();
    }

    const response = await api.getLoginHistory(params);

    if (response.success && response.data) {
      history.value = response.data.history;
      pagination.value.total = response.data.pagination.total;
    }
  } catch (_error) {
    console.error('Failed to fetch login history:', error);
    message.error('Erreur lors du chargement de l\'historique');
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const response = await api.getLoginHistoryStats(30);
    if (response.success && response.data) {
      stats.value = response.data;
    }
  } catch (_error) {
    console.error('Failed to fetch stats:', error);
  }
};

const handleTableChange = (pag: { current: number; pageSize: number }) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchHistory();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchHistory();
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const openDrawer = (entry: LoginHistoryEntry) => {
  selectedEntry.value = entry;
  drawerVisible.value = true;
};

const closeDrawer = () => {
  drawerVisible.value = false;
  selectedEntry.value = null;
};

const resetFilters = () => {
  search.value = '';
  statusFilter.value = 'all';
  dateRange.value = null;
  pagination.value.current = 1;
  fetchHistory();
};

onMounted(() => {
  fetchHistory();
  fetchStats();
});
</script>

<template>
  <div class="login-history-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Historique des Connexions</h1>
        <p class="page-subtitle">Suivi de toutes les tentatives de connexion</p>
      </div>
      <a-space>
        <a-button @click="resetFilters">
          <template #icon><FilterOutlined /></template>
          Reinitialiser
        </a-button>
        <a-button @click="fetchHistory">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
      </a-space>
    </div>

    <!-- Stats Cards -->
    <a-row :gutter="16" class="stats-row mb-4">
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Aujourd'hui"
            :value="stats?.today?.total || 0"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <LoginOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Succes"
            :value="stats?.today?.success || 0"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix>
              <CheckCircleOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Echecs"
            :value="stats?.today?.failed || 0"
            :value-style="{ color: '#ff4d4f' }"
          >
            <template #prefix>
              <CloseCircleOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Utilisateurs uniques"
            :value="stats?.today?.uniqueUsers || 0"
            :value-style="{ color: '#722ed1' }"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="filters-card mb-4">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="8">
          <a-input-search
            v-model:value="search"
            placeholder="Rechercher par email..."
            allow-clear
            @search="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input-search>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="statusFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Tous statuts</a-select-option>
            <a-select-option value="success">Succes</a-select-option>
            <a-select-option value="failed">Echec</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8">
          <a-range-picker
            v-model:value="dateRange"
            style="width: 100%"
            format="DD/MM/YYYY"
            @change="handleSearch"
          />
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="history"
        :loading="loading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} connexions`,
          pageSizeOptions: ['20', '50', '100'],
        }"
        :scroll="{ x: 1100 }"
        row-key="_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'loginAt'">
            <div class="date-cell">
              <ClockCircleOutlined class="date-icon" />
              {{ formatDate(record.loginAt) }}
            </div>
          </template>

          <template v-else-if="column.key === 'user'">
            <div class="user-cell">
              <a-avatar size="small" :style="{ backgroundColor: record.status === 'success' ? '#52c41a' : '#ff4d4f' }">
                {{ record.userName?.charAt(0)?.toUpperCase() || record.userEmail?.charAt(0)?.toUpperCase() }}
              </a-avatar>
              <div class="user-info">
                <span class="user-name">{{ record.userName || 'Inconnu' }}</span>
                <span class="user-email">{{ record.userEmail }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'role'">
            <a-tag v-if="record.userRole" :color="roleColors[record.userRole] || 'default'">
              {{ roleLabels[record.userRole] || record.userRole }}
            </a-tag>
            <span v-else class="text-gray">-</span>
          </template>

          <template v-else-if="column.key === 'device'">
            <div class="device-cell" v-if="record.device">
              <component :is="getDeviceIcon(record.device.type)" class="device-icon" />
              <span>{{ record.device.browser || 'Unknown' }}</span>
            </div>
            <span v-else class="text-gray">-</span>
          </template>

          <template v-else-if="column.key === 'ip'">
            <span v-if="record.ipAddress" class="ip-address">
              <GlobalOutlined class="ip-icon" />
              {{ record.ipAddress }}
            </span>
            <span v-else class="text-gray">-</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'success' ? 'green' : 'red'">
              <template v-if="record.status === 'success'">
                <CheckCircleOutlined /> OK
              </template>
              <template v-else>
                <CloseCircleOutlined /> Echec
              </template>
            </a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-tooltip title="Voir details">
              <a-button type="text" size="small" @click="openDrawer(record)">
                <template #icon><EyeOutlined /></template>
              </a-button>
            </a-tooltip>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Entry Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Details de la connexion"
      placement="right"
      :width="480"
      @close="closeDrawer"
    >
      <template v-if="selectedEntry">
        <div class="drawer-content">
          <!-- Header -->
          <div class="entry-header">
            <a-tag :color="selectedEntry.status === 'success' ? 'green' : 'red'" class="status-tag">
              <template v-if="selectedEntry.status === 'success'">
                <CheckCircleOutlined /> Connexion reussie
              </template>
              <template v-else>
                <CloseCircleOutlined /> Connexion echouee
              </template>
            </a-tag>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mt-4">
            <a-descriptions-item label="Date de connexion">
              {{ formatDate(selectedEntry.loginAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedEntry.logoutAt" label="Date de deconnexion">
              {{ formatDate(selectedEntry.logoutAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedEntry.sessionDuration" label="Duree de session">
              {{ formatDuration(selectedEntry.sessionDuration) }}
            </a-descriptions-item>
            <a-descriptions-item label="Email">
              {{ selectedEntry.userEmail }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedEntry.userName" label="Nom">
              {{ selectedEntry.userName }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedEntry.userRole" label="Role">
              <a-tag :color="roleColors[selectedEntry.userRole] || 'default'">
                {{ roleLabels[selectedEntry.userRole] || selectedEntry.userRole }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedEntry.ipAddress" label="Adresse IP">
              <GlobalOutlined class="mr-1" />
              {{ selectedEntry.ipAddress }}
            </a-descriptions-item>
          </a-descriptions>

          <!-- Device Info -->
          <template v-if="selectedEntry.device">
            <a-divider>Appareil</a-divider>
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="Type">
                <component :is="getDeviceIcon(selectedEntry.device.type)" class="mr-1" />
                {{ selectedEntry.device.type }}
              </a-descriptions-item>
              <a-descriptions-item v-if="selectedEntry.device.browser" label="Navigateur">
                {{ selectedEntry.device.browser }}
              </a-descriptions-item>
              <a-descriptions-item v-if="selectedEntry.device.os" label="Systeme">
                {{ selectedEntry.device.os }}
              </a-descriptions-item>
            </a-descriptions>
          </template>

          <!-- Failure Reason -->
          <template v-if="selectedEntry.status === 'failed' && selectedEntry.failureReason">
            <a-divider>Raison de l'echec</a-divider>
            <a-alert
              type="error"
              show-icon
            >
              <template #icon><WarningOutlined /></template>
              <template #message>
                {{ failureReasonLabels[selectedEntry.failureReason] || selectedEntry.failureReason }}
              </template>
            </a-alert>
          </template>

          <!-- User Agent -->
          <template v-if="selectedEntry.userAgent">
            <a-divider>User Agent</a-divider>
            <a-typography-text type="secondary" class="user-agent">
              {{ selectedEntry.userAgent }}
            </a-typography-text>
          </template>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.login-history-view {
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
  margin-bottom: 16px;
}

.filters-card {
  border-radius: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.mr-1 {
  margin-right: 4px;
}

.text-gray {
  color: #9ca3af;
}

.date-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.date-icon {
  color: #94a3b8;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 13px;
}

.user-email {
  font-size: 11px;
  color: #64748b;
}

.device-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.device-icon {
  color: #64748b;
}

.ip-address {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: monospace;
  font-size: 12px;
}

.ip-icon {
  color: #94a3b8;
}

.drawer-content {
  display: flex;
  flex-direction: column;
}

.entry-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.status-tag {
  font-size: 14px;
  padding: 4px 12px;
}

.user-agent {
  font-size: 12px;
  word-break: break-all;
}
</style>
