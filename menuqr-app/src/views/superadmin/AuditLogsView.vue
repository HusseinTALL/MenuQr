<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api, { type AuditLog } from '@/services/api';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

const loading = ref(true);
const logs = ref<AuditLog[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 50,
  total: 0,
});

// Filters
const search = ref('');
const categoryFilter = ref<string>('all');
const actionFilter = ref<string>('all');
const statusFilter = ref<string>('all');
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

// Drawer state
const drawerVisible = ref(false);
const selectedLog = ref<AuditLog | null>(null);

// Stats
const stats = ref<{
  total: number;
  byAction: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
  daily: { date: string; count: number; success: number; failure: number }[];
  topUsers: { _id: string; userName: string; userEmail: string; count: number }[];
} | null>(null);

const columns: TableColumnsType = [
  {
    title: 'Date',
    key: 'createdAt',
    width: 160,
    fixed: 'left',
  },
  {
    title: 'Utilisateur',
    key: 'user',
    width: 220,
  },
  {
    title: 'Action',
    key: 'action',
    width: 140,
  },
  {
    title: 'Categorie',
    key: 'category',
    width: 120,
  },
  {
    title: 'Description',
    key: 'description',
    ellipsis: true,
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

const actionColors: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'cyan',
  logout: 'default',
  login_failed: 'orange',
  password_reset: 'purple',
  password_change: 'purple',
  settings_change: 'gold',
  permission_change: 'magenta',
  status_change: 'geekblue',
  export: 'lime',
  import: 'lime',
  impersonate: 'volcano',
  bulk_action: 'orange',
};

const actionLabels: Record<string, string> = {
  create: 'Creation',
  update: 'Modification',
  delete: 'Suppression',
  login: 'Connexion',
  logout: 'Deconnexion',
  login_failed: 'Echec connexion',
  password_reset: 'Reset MDP',
  password_change: 'Changement MDP',
  settings_change: 'Parametres',
  permission_change: 'Permissions',
  status_change: 'Statut',
  export: 'Export',
  import: 'Import',
  impersonate: 'Impersonation',
  bulk_action: 'Action groupee',
};

const categoryLabels: Record<string, string> = {
  authentication: 'Authentification',
  user: 'Utilisateur',
  restaurant: 'Restaurant',
  order: 'Commande',
  subscription: 'Abonnement',
  settings: 'Parametres',
  system: 'Systeme',
  billing: 'Facturation',
};

const _categoryIcons: Record<string, string> = {
  authentication: 'key',
  user: 'user',
  restaurant: 'shop',
  order: 'shopping-cart',
  subscription: 'credit-card',
  settings: 'setting',
  system: 'tool',
  billing: 'dollar',
};
void _categoryIcons; // Reserved for icon display

const _uniqueActions = computed(() => {
  const actions = new Set<string>();
  logs.value.forEach(log => actions.add(log.action));
  return Array.from(actions);
});
void _uniqueActions.value; // Reserved for filter options

const _uniqueCategories = computed(() => {
  const categories = new Set<string>();
  logs.value.forEach(log => categories.add(log.category));
  return Array.from(categories);
});
void _uniqueCategories.value; // Reserved for filter options

const fetchLogs = async () => {
  loading.value = true;
  try {
    const params: Record<string, string | number | undefined> = {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
    };

    if (search.value) {params.search = search.value;}
    if (categoryFilter.value !== 'all') {params.category = categoryFilter.value;}
    if (actionFilter.value !== 'all') {params.action = actionFilter.value;}
    if (statusFilter.value !== 'all') {params.status = statusFilter.value;}
    if (dateRange.value) {
      params.startDate = dateRange.value[0].toISOString();
      params.endDate = dateRange.value[1].toISOString();
    }

    const response = await api.getAuditLogs(params);

    if (response.success && response.data) {
      logs.value = response.data.logs;
      pagination.value.total = response.data.pagination.total;
    }
  } catch {
    console.error('Failed to fetch audit logs:', error);
    message.error('Erreur lors du chargement des logs');
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const response = await api.getAuditLogStats(30);
    if (response.success && response.data) {
      stats.value = response.data;
    }
  } catch {
    console.error('Failed to fetch stats:', error);
  }
};

const handleTableChange = (pag: { current: number; pageSize: number }) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchLogs();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchLogs();
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

const openDrawer = (log: AuditLog) => {
  selectedLog.value = log;
  drawerVisible.value = true;
};

const closeDrawer = () => {
  drawerVisible.value = false;
  selectedLog.value = null;
};

const resetFilters = () => {
  search.value = '';
  categoryFilter.value = 'all';
  actionFilter.value = 'all';
  statusFilter.value = 'all';
  dateRange.value = null;
  pagination.value.current = 1;
  fetchLogs();
};

onMounted(() => {
  fetchLogs();
  fetchStats();
});
</script>

<template>
  <div class="audit-logs-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Journal d'Audit</h1>
        <p class="page-subtitle">Historique de toutes les actions effectuees sur la plateforme</p>
      </div>
      <a-space>
        <a-button @click="resetFilters">
          <template #icon><FilterOutlined /></template>
          Reinitialiser
        </a-button>
        <a-button @click="fetchLogs">
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
            title="Total (30j)"
            :value="stats?.total || 0"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <FileTextOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Succes"
            :value="stats?.byStatus?.find(s => s._id === 'success')?.count || 0"
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
            :value="stats?.byStatus?.find(s => s._id === 'failure')?.count || 0"
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
            title="Utilisateurs actifs"
            :value="stats?.topUsers?.length || 0"
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
        <a-col :xs="24" :sm="12" :md="6">
          <a-input-search
            v-model:value="search"
            placeholder="Rechercher..."
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
            v-model:value="categoryFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Toutes categories</a-select-option>
            <a-select-option v-for="cat in Object.keys(categoryLabels)" :key="cat" :value="cat">
              {{ categoryLabels[cat] }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="actionFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Toutes actions</a-select-option>
            <a-select-option v-for="action in Object.keys(actionLabels)" :key="action" :value="action">
              {{ actionLabels[action] }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="3">
          <a-select
            v-model:value="statusFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Tous statuts</a-select-option>
            <a-select-option value="success">Succes</a-select-option>
            <a-select-option value="failure">Echec</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="7">
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
        :data-source="logs"
        :loading="loading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} logs`,
          pageSizeOptions: ['20', '50', '100'],
        }"
        :scroll="{ x: 1200 }"
        row-key="_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'createdAt'">
            <div class="date-cell">
              <ClockCircleOutlined class="date-icon" />
              {{ formatDate(record.createdAt) }}
            </div>
          </template>

          <template v-else-if="column.key === 'user'">
            <div class="user-cell">
              <a-avatar size="small" :style="{ backgroundColor: '#1890ff' }">
                {{ record.userName?.charAt(0)?.toUpperCase() }}
              </a-avatar>
              <div class="user-info">
                <span class="user-name">{{ record.userName }}</span>
                <span class="user-email">{{ record.userEmail }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-tag :color="actionColors[record.action] || 'default'">
              {{ actionLabels[record.action] || record.action }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'category'">
            <a-tag>
              {{ categoryLabels[record.category] || record.category }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'description'">
            <a-tooltip :title="record.description">
              <span class="description-text">{{ record.description }}</span>
            </a-tooltip>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'success' ? 'green' : 'red'">
              {{ record.status === 'success' ? 'OK' : 'Echec' }}
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

    <!-- Log Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Details du log"
      placement="right"
      :width="560"
      @close="closeDrawer"
    >
      <template v-if="selectedLog">
        <div class="drawer-content">
          <!-- Header -->
          <div class="log-header">
            <a-tag :color="actionColors[selectedLog.action] || 'default'" class="action-tag">
              {{ actionLabels[selectedLog.action] || selectedLog.action }}
            </a-tag>
            <a-tag :color="selectedLog.status === 'success' ? 'green' : 'red'">
              {{ selectedLog.status === 'success' ? 'Succes' : 'Echec' }}
            </a-tag>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mt-4">
            <a-descriptions-item label="Date">
              {{ formatDate(selectedLog.createdAt) }}
            </a-descriptions-item>
            <a-descriptions-item label="Utilisateur">
              {{ selectedLog.userName }} ({{ selectedLog.userEmail }})
            </a-descriptions-item>
            <a-descriptions-item label="Role">
              {{ selectedLog.userRole }}
            </a-descriptions-item>
            <a-descriptions-item label="Categorie">
              {{ categoryLabels[selectedLog.category] || selectedLog.category }}
            </a-descriptions-item>
            <a-descriptions-item label="Description">
              {{ selectedLog.description }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedLog.targetType" label="Cible">
              {{ selectedLog.targetType }}
              <template v-if="selectedLog.targetName">: {{ selectedLog.targetName }}</template>
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedLog.ipAddress" label="Adresse IP">
              <GlobalOutlined class="mr-1" />
              {{ selectedLog.ipAddress }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedLog.errorMessage" label="Erreur">
              <a-typography-text type="danger">
                {{ selectedLog.errorMessage }}
              </a-typography-text>
            </a-descriptions-item>
          </a-descriptions>

          <!-- Changes -->
          <template v-if="selectedLog.changes && selectedLog.changes.length > 0">
            <a-divider>Modifications</a-divider>
            <a-table
              :columns="[
                { title: 'Champ', dataIndex: 'field', key: 'field', width: 120 },
                { title: 'Ancienne valeur', dataIndex: 'oldValue', key: 'old' },
                { title: 'Nouvelle valeur', dataIndex: 'newValue', key: 'new' },
              ]"
              :data-source="selectedLog.changes"
              :pagination="false"
              size="small"
              row-key="field"
            >
              <template #bodyCell="{ column, record: change }">
                <template v-if="column.key === 'old'">
                  <code class="value-code old">{{ JSON.stringify(change.oldValue) }}</code>
                </template>
                <template v-else-if="column.key === 'new'">
                  <code class="value-code new">{{ JSON.stringify(change.newValue) }}</code>
                </template>
              </template>
            </a-table>
          </template>

          <!-- Metadata -->
          <template v-if="selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0">
            <a-divider>Metadonnees</a-divider>
            <pre class="metadata-pre">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
          </template>

          <!-- User Agent -->
          <template v-if="selectedLog.userAgent">
            <a-divider>User Agent</a-divider>
            <a-typography-text type="secondary" class="user-agent">
              {{ selectedLog.userAgent }}
            </a-typography-text>
          </template>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.audit-logs-view {
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

.description-text {
  color: #475569;
}

.drawer-content {
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-tag {
  font-size: 14px;
  padding: 4px 12px;
}

.value-code {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}

.value-code.old {
  background-color: #fef2f2;
  color: #991b1b;
}

.value-code.new {
  background-color: #f0fdf4;
  color: #166534;
}

.metadata-pre {
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
}

.user-agent {
  font-size: 12px;
  word-break: break-all;
}
</style>
