<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import api, { type SystemAlertEntry } from '@/services/api';
import {
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
  CheckOutlined,
  DeleteOutlined,
  BellOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  DollarOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ApiOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { Modal, message } from 'ant-design-vue';

const loading = ref(true);
const alerts = ref<SystemAlertEntry[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 50,
  total: 0,
});

// Filters
const typeFilter = ref<string>('all');
const categoryFilter = ref<string>('all');
const priorityFilter = ref<string>('all');
const resolvedFilter = ref<string>('unresolved');

// Drawer state
const drawerVisible = ref(false);
const selectedAlert = ref<SystemAlertEntry | null>(null);

// Resolution modal
const resolveModalVisible = ref(false);
const resolveModalLoading = ref(false);
const resolutionNote = ref('');

// Test alert modal
const testModalVisible = ref(false);
const testModalLoading = ref(false);
const testAlertForm = ref({
  type: 'info',
  category: 'system',
  priority: 'low',
  title: '',
  message: '',
});

// Stats
const stats = ref<{
  total: { unresolved: number; resolved: number; critical: number; last24h: number };
  byType: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  byPriority: { _id: string; count: number }[];
  unresolvedByPriority: Record<string, { count: number; unacknowledged: number }>;
} | null>(null);

const columns: TableColumnsType = [
  {
    title: 'Type',
    key: 'type',
    width: 100,
    fixed: 'left',
  },
  {
    title: 'Priorite',
    key: 'priority',
    width: 100,
  },
  {
    title: 'Titre',
    key: 'title',
    width: 280,
  },
  {
    title: 'Categorie',
    key: 'category',
    width: 130,
  },
  {
    title: 'Date',
    key: 'createdAt',
    width: 140,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 140,
    align: 'center',
  },
];

const typeColors: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
  critical: 'magenta',
};

const typeIcons: Record<string, typeof InfoCircleOutlined> = {
  info: InfoCircleOutlined,
  warning: WarningOutlined,
  error: CloseCircleOutlined,
  critical: ThunderboltOutlined,
};

const priorityColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const categoryIcons: Record<string, typeof SafetyOutlined> = {
  security: SafetyOutlined,
  performance: ThunderboltOutlined,
  billing: DollarOutlined,
  system: SettingOutlined,
  database: DatabaseOutlined,
  integration: ApiOutlined,
};

const categoryLabels: Record<string, string> = {
  security: 'Securite',
  performance: 'Performance',
  billing: 'Facturation',
  system: 'Systeme',
  database: 'Base de donnees',
  integration: 'Integration',
};

const fetchAlerts = async () => {
  loading.value = true;
  try {
    const params: Record<string, string | number | boolean | undefined> = {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
    };

    if (typeFilter.value !== 'all') {params.type = typeFilter.value;}
    if (categoryFilter.value !== 'all') {params.category = categoryFilter.value;}
    if (priorityFilter.value !== 'all') {params.priority = priorityFilter.value;}
    if (resolvedFilter.value === 'unresolved') {params.isResolved = false;}
    else if (resolvedFilter.value === 'resolved') {params.isResolved = true;}

    const response = await api.getSystemAlerts(params);

    if (response.success && response.data) {
      alerts.value = response.data.alerts;
      pagination.value.total = response.data.pagination.total;
    }
  } catch (_error) {
    console.error('Failed to fetch alerts:');
    message.error('Erreur lors du chargement des alertes');
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const response = await api.getSystemAlertStats();
    if (response.success && response.data) {
      stats.value = response.data;
    }
  } catch (_error) {
    console.error('Failed to fetch stats:');
  }
};

const handleTableChange = (pag: { current: number; pageSize: number }) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchAlerts();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchAlerts();
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatFullDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const openDrawer = (alert: SystemAlertEntry) => {
  selectedAlert.value = alert;
  drawerVisible.value = true;
};

const closeDrawer = () => {
  drawerVisible.value = false;
  selectedAlert.value = null;
};

const acknowledgeAlert = async (alert: SystemAlertEntry) => {
  try {
    const response = await api.acknowledgeAlert(alert._id);
    if (response.success) {
      message.success('Alerte acquittee');
      fetchAlerts();
      fetchStats();
      if (selectedAlert.value?._id === alert._id && response.data) {
        selectedAlert.value = response.data;
      }
    }
  } catch (_error) {
    console.error('Failed to acknowledge alert:');
    message.error('Erreur lors de l\'acquittement');
  }
};

const openResolveModal = (alert: SystemAlertEntry) => {
  selectedAlert.value = alert;
  resolutionNote.value = '';
  resolveModalVisible.value = true;
};

const handleResolve = async () => {
  if (!selectedAlert.value) {return;}

  resolveModalLoading.value = true;
  try {
    const response = await api.resolveAlert(selectedAlert.value._id, resolutionNote.value || undefined);
    if (response.success) {
      message.success('Alerte resolue');
      resolveModalVisible.value = false;
      fetchAlerts();
      fetchStats();
      closeDrawer();
    }
  } catch (_error) {
    console.error('Failed to resolve alert:');
    message.error('Erreur lors de la resolution');
  } finally {
    resolveModalLoading.value = false;
  }
};

const deleteAlert = (alert: SystemAlertEntry) => {
  Modal.confirm({
    title: 'Supprimer l\'alerte ?',
    icon: h(ExclamationCircleOutlined),
    content: h('div', {}, [
      h('p', {}, 'Cette action est irreversible.'),
      h('p', { style: 'font-weight: 600; margin-top: 8px;' }, alert.title),
    ]),
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        const response = await api.deleteAlert(alert._id);
        if (response.success) {
          message.success('Alerte supprimee');
          fetchAlerts();
          fetchStats();
          if (selectedAlert.value?._id === alert._id) {
            closeDrawer();
          }
        }
      } catch (_error) {
        console.error('Failed to delete alert:');
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

const resetFilters = () => {
  typeFilter.value = 'all';
  categoryFilter.value = 'all';
  priorityFilter.value = 'all';
  resolvedFilter.value = 'unresolved';
  pagination.value.current = 1;
  fetchAlerts();
};

const openTestModal = () => {
  testAlertForm.value = {
    type: 'info',
    category: 'system',
    priority: 'low',
    title: '',
    message: '',
  };
  testModalVisible.value = true;
};

const handleCreateTestAlert = async () => {
  if (!testAlertForm.value.title || !testAlertForm.value.message) {
    message.error('Veuillez remplir le titre et le message');
    return;
  }

  testModalLoading.value = true;
  try {
    const response = await api.createTestAlert(testAlertForm.value);
    if (response.success) {
      message.success('Alerte de test creee');
      testModalVisible.value = false;
      fetchAlerts();
      fetchStats();
    }
  } catch (_error) {
    console.error('Failed to create test alert:');
    message.error('Erreur lors de la creation');
  } finally {
    testModalLoading.value = false;
  }
};

onMounted(() => {
  fetchAlerts();
  fetchStats();
});
</script>

<template>
  <div class="system-alerts-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Alertes Systeme</h1>
        <p class="page-subtitle">Surveillance et gestion des alertes de la plateforme</p>
      </div>
      <a-space>
        <a-button @click="openTestModal">
          <template #icon><PlusOutlined /></template>
          Alerte test
        </a-button>
        <a-button @click="resetFilters">
          <template #icon><FilterOutlined /></template>
          Reinitialiser
        </a-button>
        <a-button @click="fetchAlerts">
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
            title="Non resolues"
            :value="stats?.total?.unresolved || 0"
            :value-style="{ color: '#faad14' }"
          >
            <template #prefix>
              <BellOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Critiques"
            :value="stats?.total?.critical || 0"
            :value-style="{ color: '#ff4d4f' }"
          >
            <template #prefix>
              <ThunderboltOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Dernieres 24h"
            :value="stats?.total?.last24h || 0"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <WarningOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card>
          <a-statistic
            title="Resolues"
            :value="stats?.total?.resolved || 0"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix>
              <CheckOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="filters-card mb-4">
      <a-row :gutter="16" align="middle">
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="typeFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Tous types</a-select-option>
            <a-select-option value="info">Info</a-select-option>
            <a-select-option value="warning">Warning</a-select-option>
            <a-select-option value="error">Erreur</a-select-option>
            <a-select-option value="critical">Critique</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="categoryFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Toutes categories</a-select-option>
            <a-select-option v-for="(label, key) in categoryLabels" :key="key" :value="key">
              {{ label }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="priorityFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Toutes priorites</a-select-option>
            <a-select-option v-for="(label, key) in priorityLabels" :key="key" :value="key">
              {{ label }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="resolvedFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Tous statuts</a-select-option>
            <a-select-option value="unresolved">Non resolues</a-select-option>
            <a-select-option value="resolved">Resolues</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="alerts"
        :loading="loading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} alertes`,
          pageSizeOptions: ['20', '50', '100'],
        }"
        :scroll="{ x: 1100 }"
        row-key="_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="typeColors[record.type]">
              <component :is="typeIcons[record.type]" class="type-icon" />
              {{ record.type }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'priority'">
            <a-tag :color="priorityColors[record.priority]">
              {{ priorityLabels[record.priority] || record.priority }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'title'">
            <div class="title-cell" @click="openDrawer(record)">
              <span class="alert-title">{{ record.title }}</span>
              <span class="alert-message">{{ record.message }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'category'">
            <span class="category-cell">
              <component :is="categoryIcons[record.category]" class="category-icon" />
              {{ categoryLabels[record.category] || record.category }}
            </span>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag v-if="record.isResolved" color="green">
              <CheckOutlined /> Resolue
            </a-tag>
            <a-tag v-else-if="record.acknowledgedBy?.length > 0" color="blue">
              Vue
            </a-tag>
            <a-tag v-else color="orange">
              Nouvelle
            </a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Voir details">
                <a-button type="text" size="small" @click="openDrawer(record)">
                  <template #icon><EyeOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip v-if="!record.isResolved" title="Resoudre">
                <a-button type="text" size="small" @click="openResolveModal(record)">
                  <template #icon><CheckOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Supprimer">
                <a-button type="text" size="small" danger @click="deleteAlert(record)">
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Alert Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Details de l'alerte"
      placement="right"
      :width="560"
      @close="closeDrawer"
    >
      <template v-if="selectedAlert">
        <div class="drawer-content">
          <!-- Header -->
          <div class="alert-header">
            <a-tag :color="typeColors[selectedAlert.type]" class="type-tag">
              <component :is="typeIcons[selectedAlert.type]" />
              {{ selectedAlert.type.toUpperCase() }}
            </a-tag>
            <a-tag :color="priorityColors[selectedAlert.priority]">
              {{ priorityLabels[selectedAlert.priority] }}
            </a-tag>
            <a-tag v-if="selectedAlert.isResolved" color="green">
              Resolue
            </a-tag>
          </div>

          <h3 class="alert-drawer-title">{{ selectedAlert.title }}</h3>
          <p class="alert-drawer-message">{{ selectedAlert.message }}</p>

          <a-descriptions :column="1" bordered size="small" class="mt-4">
            <a-descriptions-item label="Categorie">
              <component :is="categoryIcons[selectedAlert.category]" class="mr-1" />
              {{ categoryLabels[selectedAlert.category] || selectedAlert.category }}
            </a-descriptions-item>
            <a-descriptions-item label="Source">
              {{ selectedAlert.source }}
            </a-descriptions-item>
            <a-descriptions-item label="Date de creation">
              {{ formatFullDate(selectedAlert.createdAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedAlert.resolvedAt" label="Date de resolution">
              {{ formatFullDate(selectedAlert.resolvedAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedAlert.resolutionNote" label="Note de resolution">
              {{ selectedAlert.resolutionNote }}
            </a-descriptions-item>
          </a-descriptions>

          <!-- Details -->
          <template v-if="selectedAlert.details && Object.keys(selectedAlert.details).length > 0">
            <a-divider>Details</a-divider>
            <pre class="details-pre">{{ JSON.stringify(selectedAlert.details, null, 2) }}</pre>
          </template>

          <!-- Acknowledgments -->
          <template v-if="selectedAlert.acknowledgedBy?.length > 0">
            <a-divider>Acquittements</a-divider>
            <a-list
              :data-source="selectedAlert.acknowledgedBy"
              size="small"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta
                    :title="item.userName"
                    :description="formatFullDate(item.acknowledgedAt)"
                  />
                </a-list-item>
              </template>
            </a-list>
          </template>

          <!-- Actions -->
          <a-divider />
          <div class="drawer-actions">
            <a-button
              v-if="!selectedAlert.isAcknowledged && !selectedAlert.isResolved"
              block
              @click="acknowledgeAlert(selectedAlert)"
            >
              <template #icon><EyeOutlined /></template>
              Marquer comme vue
            </a-button>
            <a-button
              v-if="!selectedAlert.isResolved"
              block
              type="primary"
              @click="openResolveModal(selectedAlert)"
            >
              <template #icon><CheckOutlined /></template>
              Resoudre
            </a-button>
            <a-button block danger @click="deleteAlert(selectedAlert)">
              <template #icon><DeleteOutlined /></template>
              Supprimer
            </a-button>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- Resolve Modal -->
    <a-modal
      v-model:open="resolveModalVisible"
      title="Resoudre l'alerte"
      :confirm-loading="resolveModalLoading"
      ok-text="Resoudre"
      cancel-text="Annuler"
      @ok="handleResolve"
    >
      <template v-if="selectedAlert">
        <a-alert
          :type="selectedAlert.type === 'critical' ? 'error' : selectedAlert.type === 'error' ? 'error' : 'warning'"
          show-icon
          class="mb-4"
        >
          <template #message>{{ selectedAlert.title }}</template>
          <template #description>{{ selectedAlert.message }}</template>
        </a-alert>

        <a-form layout="vertical">
          <a-form-item label="Note de resolution (optionnel)">
            <a-textarea
              v-model:value="resolutionNote"
              placeholder="Decrivez comment l'alerte a ete resolue..."
              :rows="4"
            />
          </a-form-item>
        </a-form>
      </template>
    </a-modal>

    <!-- Test Alert Modal -->
    <a-modal
      v-model:open="testModalVisible"
      title="Creer une alerte de test"
      :confirm-loading="testModalLoading"
      ok-text="Creer"
      cancel-text="Annuler"
      @ok="handleCreateTestAlert"
    >
      <a-form layout="vertical">
        <a-form-item label="Type" required>
          <a-select v-model:value="testAlertForm.type">
            <a-select-option value="info">Info</a-select-option>
            <a-select-option value="warning">Warning</a-select-option>
            <a-select-option value="error">Erreur</a-select-option>
            <a-select-option value="critical">Critique</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Categorie" required>
          <a-select v-model:value="testAlertForm.category">
            <a-select-option v-for="(label, key) in categoryLabels" :key="key" :value="key">
              {{ label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Priorite" required>
          <a-select v-model:value="testAlertForm.priority">
            <a-select-option v-for="(label, key) in priorityLabels" :key="key" :value="key">
              {{ label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Titre" required>
          <a-input v-model:value="testAlertForm.title" placeholder="Titre de l'alerte" />
        </a-form-item>
        <a-form-item label="Message" required>
          <a-textarea v-model:value="testAlertForm.message" placeholder="Message de l'alerte" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.system-alerts-view {
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

.type-icon {
  margin-right: 4px;
}

.title-cell {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.title-cell:hover .alert-title {
  color: #1890ff;
}

.alert-title {
  font-weight: 500;
  color: #1e293b;
  transition: color 0.2s;
}

.alert-message {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
}

.category-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-icon {
  color: #64748b;
}

.drawer-content {
  display: flex;
  flex-direction: column;
}

.alert-header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.type-tag {
  font-size: 12px;
  padding: 4px 10px;
}

.alert-drawer-title {
  margin: 16px 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.alert-drawer-message {
  color: #475569;
  margin: 0 0 16px;
}

.details-pre {
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
