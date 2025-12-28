<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import api from '@/services/api';
import type { Backup } from '@/services/api';
import {
  ToolOutlined,
  ThunderboltOutlined,
  UserSwitchOutlined,
  CloudDownloadOutlined,
  ExportOutlined,
  SearchOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileZipOutlined,
  DatabaseOutlined,
} from '@ant-design/icons-vue';

// ============================================
// BULK OPERATIONS STATE
// ============================================

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  email?: string;
  ownerId?: { name: string; email: string };
  createdAt: string;
}

const restaurantsLoading = ref(false);
const restaurants = ref<Restaurant[]>([]);
const selectedRowKeys = ref<string[]>([]);
const bulkActionLoading = ref(false);
const restaurantSearch = ref('');
const restaurantStatusFilter = ref<string>('all');
const restaurantPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

// Bulk Preview Modal State
const bulkPreviewVisible = ref(false);
const bulkPreviewAction = ref<'activate' | 'suspend' | 'delete' | 'export'>('activate');
const deleteConfirmText = ref('');
const selectedRestaurantsDetails = computed(() => {
  return restaurants.value.filter((r) => selectedRowKeys.value.includes(r._id));
});

const restaurantColumns = [
  {
    title: 'Restaurant',
    key: 'name',
    width: 200,
  },
  {
    title: 'Proprietaire',
    key: 'owner',
    width: 180,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 100,
    align: 'center' as const,
  },
  {
    title: 'Date creation',
    key: 'createdAt',
    width: 120,
  },
];

const fetchRestaurants = async () => {
  restaurantsLoading.value = true;
  try {
    const response = await api.get<{
      restaurants: Restaurant[];
      pagination: { total: number };
    }>('/superadmin/restaurants', {
      page: restaurantPagination.value.current,
      limit: restaurantPagination.value.pageSize,
      search: restaurantSearch.value || undefined,
      status: restaurantStatusFilter.value !== 'all' ? restaurantStatusFilter.value : undefined,
    });

    if (response.success && response.data) {
      restaurants.value = response.data.restaurants;
      restaurantPagination.value.total = response.data.pagination.total;
    }
  } catch (e) {
    console.error('Failed to fetch restaurants:', e);
    message.error('Erreur lors du chargement des restaurants');
  } finally {
    restaurantsLoading.value = false;
  }
};

const handleRestaurantTableChange = (pag: { current: number; pageSize: number }) => {
  restaurantPagination.value.current = pag.current;
  restaurantPagination.value.pageSize = pag.pageSize;
  fetchRestaurants();
};

// Open preview modal for bulk action
const openBulkPreview = (action: 'activate' | 'suspend' | 'delete' | 'export') => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('Selectionnez au moins un restaurant');
    return;
  }
  bulkPreviewAction.value = action;
  deleteConfirmText.value = '';
  bulkPreviewVisible.value = true;
};

// Check if delete confirmation is valid (requires typing DELETE)
const isDeleteConfirmValid = computed(() => {
  if (bulkPreviewAction.value !== 'delete') {return true;}
  return deleteConfirmText.value === 'SUPPRIMER';
});

// Execute the bulk action after preview confirmation
const executeBulkAction = async () => {
  if (bulkPreviewAction.value === 'delete' && !isDeleteConfirmValid.value) {
    message.error('Veuillez taper SUPPRIMER pour confirmer');
    return;
  }

  const count = selectedRowKeys.value.length;
  bulkActionLoading.value = true;

  try {
    switch (bulkPreviewAction.value) {
      case 'activate':
        await api.bulkUpdateRestaurantStatus(selectedRowKeys.value, true);
        message.success(`${count} restaurant(s) active(s)`);
        break;
      case 'suspend':
        await api.bulkUpdateRestaurantStatus(selectedRowKeys.value, false);
        message.success(`${count} restaurant(s) suspendu(s)`);
        break;
      case 'delete':
        await api.bulkDeleteRestaurants(selectedRowKeys.value, true);
        message.success(`${count} restaurant(s) supprime(s) definitivement`);
        break;
      case 'export': {
        const response = await api.bulkExportRestaurants(selectedRowKeys.value, 'json');
        if (response.data) {
          const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `restaurants-export-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          message.success('Export telecharge');
        }
        break;
      }
    }
    selectedRowKeys.value = [];
    bulkPreviewVisible.value = false;
    fetchRestaurants();
  } catch (e) {
    console.error('Bulk action failed:', e);
    message.error('Erreur lors de l\'operation');
  } finally {
    bulkActionLoading.value = false;
  }
};

// Get action details for preview modal
const bulkActionDetails = computed(() => {
  const actions = {
    activate: {
      title: 'Activer les restaurants',
      description: 'Les restaurants suivants seront actives et visibles pour les clients.',
      icon: CheckCircleOutlined,
      color: '#52c41a',
      buttonText: 'Activer',
      buttonType: 'primary' as const,
    },
    suspend: {
      title: 'Suspendre les restaurants',
      description: 'Les restaurants suivants seront suspendus et ne seront plus visibles.',
      icon: StopOutlined,
      color: '#faad14',
      buttonText: 'Suspendre',
      buttonType: 'default' as const,
    },
    delete: {
      title: 'Supprimer les restaurants',
      description: 'ATTENTION: Cette action est IRREVERSIBLE. Toutes les donnees seront perdues.',
      icon: DeleteOutlined,
      color: '#ff4d4f',
      buttonText: 'Supprimer definitivement',
      buttonType: 'primary' as const,
    },
    export: {
      title: 'Exporter les restaurants',
      description: 'Les donnees des restaurants suivants seront exportees en JSON.',
      icon: ExportOutlined,
      color: '#1890ff',
      buttonText: 'Exporter',
      buttonType: 'primary' as const,
    },
  };
  return actions[bulkPreviewAction.value];
});

// ============================================
// IMPERSONATION STATE
// ============================================

const impersonationSearch = ref('');
const impersonationResults = ref<Restaurant[]>([]);
const impersonationLoading = ref(false);
const impersonationActionLoading = ref<string | null>(null);

const searchForImpersonation = async () => {
  if (!impersonationSearch.value.trim()) {
    impersonationResults.value = [];
    return;
  }

  impersonationLoading.value = true;
  try {
    const response = await api.get<{
      restaurants: Restaurant[];
    }>('/superadmin/restaurants', {
      search: impersonationSearch.value,
      limit: 5,
    });

    if (response.success && response.data) {
      impersonationResults.value = response.data.restaurants;
    }
  } catch (e) {
    console.error('Search failed:', e);
  } finally {
    impersonationLoading.value = false;
  }
};

const startImpersonation = async (restaurant: Restaurant) => {
  Modal.confirm({
    title: 'Impersonation',
    content: `Se connecter en tant que "${restaurant.name}" ?`,
    icon: h(UserSwitchOutlined),
    okText: 'Confirmer',
    cancelText: 'Annuler',
    async onOk() {
      impersonationActionLoading.value = restaurant._id;
      try {
        const response = await api.startImpersonation(restaurant._id);
        if (response.success && response.data) {
          // Store impersonation token and redirect
          const impersonationData = {
            accessToken: response.data.impersonationToken,
            restaurantId: response.data.restaurantId,
            restaurantName: response.data.restaurantName,
            isImpersonation: true,
            originalUrl: window.location.href,
          };
          localStorage.setItem('menuqr_impersonation', JSON.stringify(impersonationData));

          // Update admin auth with impersonation token temporarily
          const adminAuth = localStorage.getItem('menuqr_admin_auth');
          if (adminAuth) {
            const parsed = JSON.parse(adminAuth);
            parsed.accessToken = response.data.impersonationToken;
            parsed.isImpersonation = true;
            localStorage.setItem('menuqr_admin_auth', JSON.stringify(parsed));
          }

          message.success(`Connecte en tant que ${response.data.restaurantName}`);
          window.location.href = response.data.impersonationUrl;
        }
      } catch (e) {
        console.error('Impersonation failed:', e);
        message.error('Erreur lors de l\'impersonation');
      } finally {
        impersonationActionLoading.value = null;
      }
    },
  });
};

// ============================================
// BACKUPS STATE
// ============================================

const backupsLoading = ref(false);
const backups = ref<Backup[]>([]);
const backupStats = ref<{
  totalBackups: number;
  totalSize: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  lastBackup: string | null;
} | null>(null);
const createBackupLoading = ref(false);
const downloadBackupLoading = ref<string | null>(null);
const deleteBackupLoading = ref<string | null>(null);

const backupColumns = [
  {
    title: 'Fichier',
    key: 'filename',
    width: 300,
  },
  {
    title: 'Type',
    key: 'type',
    width: 100,
    align: 'center' as const,
  },
  {
    title: 'Taille',
    key: 'size',
    width: 100,
    align: 'right' as const,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 120,
    align: 'center' as const,
  },
  {
    title: 'Date',
    key: 'createdAt',
    width: 150,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    align: 'center' as const,
  },
];

const fetchBackups = async () => {
  backupsLoading.value = true;
  try {
    const [backupsResponse, statsResponse] = await Promise.all([
      api.getBackups({ limit: 20 }),
      api.getBackupStats(),
    ]);

    if (backupsResponse.success && backupsResponse.data) {
      backups.value = backupsResponse.data.backups;
    }
    if (statsResponse.success && statsResponse.data) {
      backupStats.value = statsResponse.data;
    }
  } catch (e) {
    console.error('Failed to fetch backups:', e);
    message.error('Erreur lors du chargement des backups');
  } finally {
    backupsLoading.value = false;
  }
};

const createFullBackup = async () => {
  createBackupLoading.value = true;
  try {
    await api.createFullBackup();
    message.success('Backup en cours de creation...');
    fetchBackups();
  } catch (e) {
    console.error('Failed to create backup:', e);
    message.error('Erreur lors de la creation du backup');
  } finally {
    createBackupLoading.value = false;
  }
};

const downloadBackup = async (backup: Backup) => {
  downloadBackupLoading.value = backup._id;
  try {
    const blob = await api.downloadBackup(backup._id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.filename;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Telechargement demarre');
  } catch (e) {
    console.error('Download failed:', e);
    message.error('Erreur lors du telechargement');
  } finally {
    downloadBackupLoading.value = null;
  }
};

const deleteBackup = async (backup: Backup) => {
  Modal.confirm({
    title: 'Supprimer ce backup ?',
    content: `Le fichier "${backup.filename}" sera supprime definitivement.`,
    icon: h(ExclamationCircleOutlined),
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      deleteBackupLoading.value = backup._id;
      try {
        await api.deleteBackup(backup._id);
        message.success('Backup supprime');
        fetchBackups();
      } catch (e) {
        console.error('Delete failed:', e);
        message.error('Erreur lors de la suppression');
      } finally {
        deleteBackupLoading.value = null;
      }
    },
  });
};

// ============================================
// EXPORT STATE
// ============================================

const exportType = ref<string>('restaurants');
const exportFormat = ref<'json' | 'csv'>('json');
const exportLoading = ref(false);

const exportTypes = [
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'users', label: 'Utilisateurs' },
  { value: 'customers', label: 'Clients' },
  { value: 'orders', label: 'Commandes' },
];

const handleExport = async () => {
  exportLoading.value = true;
  try {
    let response;
    switch (exportType.value) {
      case 'restaurants':
        response = await api.bulkExportRestaurants(undefined, exportFormat.value);
        break;
      case 'users':
        response = await api.post<unknown[]>('/superadmin/bulk/users/export', { format: exportFormat.value });
        break;
      case 'customers':
        response = await api.post<unknown[]>('/superadmin/bulk/customers/export', { format: exportFormat.value });
        break;
      case 'orders':
        response = await api.post<unknown[]>('/superadmin/bulk/orders/export', { format: exportFormat.value });
        break;
    }

    if (response?.data) {
      const content = exportFormat.value === 'json'
        ? JSON.stringify(response.data, null, 2)
        : response.data as unknown as string;
      const mimeType = exportFormat.value === 'json' ? 'application/json' : 'text/csv';
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType.value}-export-${new Date().toISOString().slice(0, 10)}.${exportFormat.value}`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Export telecharge');
    }
  } catch (e) {
    console.error('Export failed:', e);
    message.error('Erreur lors de l\'export');
  } finally {
    exportLoading.value = false;
  }
};

// ============================================
// UTILITIES
// ============================================

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatSize = (bytes: number) => {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'green';
    case 'pending': case 'in_progress': return 'blue';
    case 'failed': return 'red';
    default: return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Termine';
    case 'pending': return 'En attente';
    case 'in_progress': return 'En cours';
    case 'failed': return 'Echoue';
    default: return status;
  }
};

// ============================================
// LIFECYCLE
// ============================================

onMounted(() => {
  fetchRestaurants();
  fetchBackups();
});
</script>

<template>
  <div class="advanced-tools-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <ToolOutlined class="header-icon" />
          Outils Avances
        </h1>
        <p class="page-subtitle">Operations en masse, impersonation, backups et exports</p>
      </div>
    </div>

    <a-row :gutter="[24, 24]">
      <!-- BULK OPERATIONS -->
      <a-col :span="24">
        <a-card class="tool-card">
          <template #title>
            <div class="card-title">
              <ThunderboltOutlined class="card-icon" />
              <span>Operations en masse</span>
            </div>
          </template>
          <template #extra>
            <a-space>
              <a-button
                type="primary"
                :disabled="selectedRowKeys.length === 0"
                @click="openBulkPreview('activate')"
              >
                <template #icon><CheckCircleOutlined /></template>
                Activer
              </a-button>
              <a-button
                :disabled="selectedRowKeys.length === 0"
                @click="openBulkPreview('suspend')"
              >
                <template #icon><StopOutlined /></template>
                Suspendre
              </a-button>
              <a-button
                :disabled="selectedRowKeys.length === 0"
                @click="openBulkPreview('export')"
              >
                <template #icon><ExportOutlined /></template>
                Exporter
              </a-button>
              <a-button
                danger
                :disabled="selectedRowKeys.length === 0"
                @click="openBulkPreview('delete')"
              >
                <template #icon><DeleteOutlined /></template>
                Supprimer
              </a-button>
            </a-space>
          </template>

          <!-- Filters -->
          <a-row :gutter="16" class="mb-4">
            <a-col :xs="24" :sm="12" :md="8">
              <a-input-search
                v-model:value="restaurantSearch"
                placeholder="Rechercher..."
                allow-clear
                @search="fetchRestaurants"
              >
                <template #prefix><SearchOutlined /></template>
              </a-input-search>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-select
                v-model:value="restaurantStatusFilter"
                style="width: 100%"
                @change="fetchRestaurants"
              >
                <a-select-option value="all">Tous les statuts</a-select-option>
                <a-select-option value="active">Actifs</a-select-option>
                <a-select-option value="inactive">Inactifs</a-select-option>
              </a-select>
            </a-col>
            <a-col :xs="24" :sm="12" :md="4">
              <a-tag v-if="selectedRowKeys.length > 0" color="purple">
                {{ selectedRowKeys.length }} selectionne(s)
              </a-tag>
            </a-col>
          </a-row>

          <!-- Table -->
          <a-table
            :columns="restaurantColumns"
            :data-source="restaurants"
            :loading="restaurantsLoading"
            :row-selection="{
              selectedRowKeys,
              onChange: (keys: string[]) => selectedRowKeys = keys,
            }"
            :pagination="{
              current: restaurantPagination.current,
              pageSize: restaurantPagination.pageSize,
              total: restaurantPagination.total,
              showSizeChanger: true,
              showTotal: (total: number) => `${total} restaurants`,
            }"
            :scroll="{ x: 700 }"
            row-key="_id"
            size="small"
            @change="handleRestaurantTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="restaurant-cell">
                  <ShopOutlined class="restaurant-icon" />
                  <div>
                    <span class="restaurant-name">{{ record.name }}</span>
                    <span class="restaurant-slug">/r/{{ record.slug }}</span>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'owner'">
                <span v-if="record.ownerId">{{ record.ownerId.name }}</span>
                <span v-else class="text-gray">-</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.isActive ? 'green' : 'red'">
                  {{ record.isActive ? 'Actif' : 'Inactif' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>

      <!-- IMPERSONATION -->
      <a-col :xs="24" :lg="12">
        <a-card class="tool-card">
          <template #title>
            <div class="card-title">
              <UserSwitchOutlined class="card-icon" />
              <span>Impersonation</span>
            </div>
          </template>

          <a-alert
            message="Attention"
            description="L'impersonation vous permet de vous connecter en tant que proprietaire d'un restaurant. Toutes les actions seront enregistrees dans l'historique d'audit."
            type="warning"
            show-icon
            class="mb-4"
          />

          <a-input-search
            v-model:value="impersonationSearch"
            placeholder="Rechercher un restaurant..."
            :loading="impersonationLoading"
            @search="searchForImpersonation"
            @input="searchForImpersonation"
            size="large"
            class="mb-4"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input-search>

          <a-list
            :data-source="impersonationResults"
            :loading="impersonationLoading"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #avatar>
                    <a-avatar class="restaurant-avatar">
                      <template #icon><ShopOutlined /></template>
                    </a-avatar>
                  </template>
                  <template #title>
                    <span>{{ item.name }}</span>
                    <a-tag :color="item.isActive ? 'green' : 'red'" class="ml-2">
                      {{ item.isActive ? 'Actif' : 'Inactif' }}
                    </a-tag>
                  </template>
                  <template #description>
                    <span v-if="item.ownerId">{{ item.ownerId.email }}</span>
                    <span v-else>Aucun proprietaire</span>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-button
                    type="primary"
                    :loading="impersonationActionLoading === item._id"
                    :disabled="!item.ownerId"
                    @click="startImpersonation(item)"
                  >
                    <template #icon><UserSwitchOutlined /></template>
                    Se connecter
                  </a-button>
                </template>
              </a-list-item>
            </template>
            <template #empty>
              <a-empty v-if="impersonationSearch" description="Aucun restaurant trouve" />
              <div v-else class="empty-search">
                <SearchOutlined class="empty-icon" />
                <p>Recherchez un restaurant pour demarrer</p>
              </div>
            </template>
          </a-list>
        </a-card>
      </a-col>

      <!-- EXPORTS -->
      <a-col :xs="24" :lg="12">
        <a-card class="tool-card">
          <template #title>
            <div class="card-title">
              <ExportOutlined class="card-icon" />
              <span>Exports</span>
            </div>
          </template>

          <a-form layout="vertical">
            <a-form-item label="Type de donnees">
              <a-select v-model:value="exportType" size="large">
                <a-select-option
                  v-for="type in exportTypes"
                  :key="type.value"
                  :value="type.value"
                >
                  {{ type.label }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="Format">
              <a-radio-group v-model:value="exportFormat" button-style="solid" size="large">
                <a-radio-button value="json">JSON</a-radio-button>
                <a-radio-button value="csv">CSV</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-button
              type="primary"
              size="large"
              block
              :loading="exportLoading"
              @click="handleExport"
            >
              <template #icon><DownloadOutlined /></template>
              Telecharger l'export
            </a-button>
          </a-form>
        </a-card>
      </a-col>

      <!-- BACKUPS -->
      <a-col :span="24">
        <a-card class="tool-card">
          <template #title>
            <div class="card-title">
              <CloudDownloadOutlined class="card-icon" />
              <span>Backups</span>
            </div>
          </template>
          <template #extra>
            <a-space>
              <a-button @click="fetchBackups" :loading="backupsLoading">
                <template #icon><ReloadOutlined /></template>
                Actualiser
              </a-button>
              <a-button type="primary" :loading="createBackupLoading" @click="createFullBackup">
                <template #icon><DatabaseOutlined /></template>
                Creer un backup complet
              </a-button>
            </a-space>
          </template>

          <!-- Stats -->
          <a-row :gutter="16" class="mb-4" v-if="backupStats">
            <a-col :xs="12" :sm="6">
              <a-statistic title="Total backups" :value="backupStats.totalBackups">
                <template #prefix><FileZipOutlined /></template>
              </a-statistic>
            </a-col>
            <a-col :xs="12" :sm="6">
              <a-statistic title="Taille totale" :value="formatSize(backupStats.totalSize)" />
            </a-col>
            <a-col :xs="12" :sm="6">
              <a-statistic
                title="Termines"
                :value="backupStats.completedCount"
                :value-style="{ color: '#52c41a' }"
              />
            </a-col>
            <a-col :xs="12" :sm="6">
              <a-statistic
                title="Dernier backup"
                :value="backupStats.lastBackup ? formatDate(backupStats.lastBackup) : '-'"
              >
                <template #prefix><ClockCircleOutlined /></template>
              </a-statistic>
            </a-col>
          </a-row>

          <a-divider />

          <!-- Backups Table -->
          <a-table
            :columns="backupColumns"
            :data-source="backups"
            :loading="backupsLoading"
            :pagination="{ pageSize: 10 }"
            row-key="_id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'filename'">
                <div class="backup-filename">
                  <FileZipOutlined class="file-icon" />
                  <span>{{ record.filename }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag :color="record.type === 'full' ? 'purple' : 'blue'">
                  {{ record.type === 'full' ? 'Complet' : 'Partiel' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'size'">
                {{ formatSize(record.size) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getStatusColor(record.status)">
                  {{ getStatusLabel(record.status) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-tooltip title="Telecharger">
                    <a-button
                      type="text"
                      size="small"
                      :loading="downloadBackupLoading === record._id"
                      :disabled="record.status !== 'completed'"
                      @click="downloadBackup(record)"
                    >
                      <template #icon><DownloadOutlined /></template>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="Supprimer">
                    <a-button
                      type="text"
                      size="small"
                      danger
                      :loading="deleteBackupLoading === record._id"
                      @click="deleteBackup(record)"
                    >
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- Bulk Action Preview Modal -->
    <a-modal
      v-model:open="bulkPreviewVisible"
      :title="bulkActionDetails.title"
      :width="600"
      :footer="null"
      class="bulk-preview-modal"
    >
      <div class="bulk-preview-content">
        <!-- Action Header -->
        <div class="preview-header" :style="{ borderColor: bulkActionDetails.color }">
          <div class="preview-icon" :style="{ backgroundColor: bulkActionDetails.color + '15', color: bulkActionDetails.color }">
            <component :is="bulkActionDetails.icon" />
          </div>
          <div class="preview-info">
            <p class="preview-count">{{ selectedRowKeys.length }} restaurant(s) selectionne(s)</p>
            <p class="preview-description">{{ bulkActionDetails.description }}</p>
          </div>
        </div>

        <!-- Selected Items List -->
        <div class="preview-list">
          <div class="preview-list-header">
            <span>Elements selectionnes</span>
          </div>
          <div class="preview-list-scroll">
            <div
              v-for="restaurant in selectedRestaurantsDetails"
              :key="restaurant._id"
              class="preview-item"
            >
              <div class="preview-item-icon">
                <ShopOutlined />
              </div>
              <div class="preview-item-info">
                <span class="preview-item-name">{{ restaurant.name }}</span>
                <span class="preview-item-meta">/r/{{ restaurant.slug }}</span>
              </div>
              <a-tag :color="restaurant.isActive ? 'green' : 'red'" size="small">
                {{ restaurant.isActive ? 'Actif' : 'Inactif' }}
              </a-tag>
            </div>
          </div>
        </div>

        <!-- Delete Confirmation (2-step) -->
        <div v-if="bulkPreviewAction === 'delete'" class="delete-confirmation">
          <a-alert
            type="error"
            show-icon
            class="mb-4"
          >
            <template #message>Confirmation requise</template>
            <template #description>
              <p>Cette action supprimera definitivement {{ selectedRowKeys.length }} restaurant(s) et toutes leurs donnees associees (commandes, menus, clients, etc.).</p>
              <p class="mt-2"><strong>Tapez SUPPRIMER pour confirmer:</strong></p>
            </template>
          </a-alert>
          <a-input
            v-model:value="deleteConfirmText"
            placeholder="Tapez SUPPRIMER"
            size="large"
            :status="deleteConfirmText && !isDeleteConfirmValid ? 'error' : ''"
          />
          <p v-if="deleteConfirmText && !isDeleteConfirmValid" class="delete-hint error">
            Le texte ne correspond pas
          </p>
          <p v-else-if="isDeleteConfirmValid && deleteConfirmText" class="delete-hint success">
            <CheckCircleOutlined /> Confirmation validee
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="preview-actions">
          <a-button @click="bulkPreviewVisible = false">
            Annuler
          </a-button>
          <a-button
            :type="bulkActionDetails.buttonType"
            :danger="bulkPreviewAction === 'delete'"
            :loading="bulkActionLoading"
            :disabled="bulkPreviewAction === 'delete' && !isDeleteConfirmValid"
            @click="executeBulkAction"
          >
            <template #icon>
              <component :is="bulkActionDetails.icon" />
            </template>
            {{ bulkActionDetails.buttonText }}
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.advanced-tools-view {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
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

.tool-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.mb-4 {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.restaurant-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.restaurant-icon {
  font-size: 20px;
  color: #8b5cf6;
}

.restaurant-name {
  display: block;
  font-weight: 600;
  color: #1e293b;
}

.restaurant-slug {
  display: block;
  font-size: 12px;
  color: #94a3b8;
}

.text-gray {
  color: #9ca3af;
}

.restaurant-avatar {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
}

.empty-search {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-search p {
  margin: 0;
  font-size: 14px;
}

.backup-filename {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 16px;
  color: #8b5cf6;
}

:deep(.ant-card-head) {
  border-bottom-color: #f1f5f9;
}

:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
}

:deep(.ant-statistic-title) {
  color: #64748b;
  font-size: 12px;
}

:deep(.ant-statistic-content-value) {
  font-size: 20px;
  font-weight: 600;
}

/* Bulk Preview Modal Styles */
.bulk-preview-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid;
}

.preview-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.preview-info {
  flex: 1;
}

.preview-count {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.preview-description {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.preview-list {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.preview-list-header {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-list-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.preview-item-info {
  flex: 1;
  min-width: 0;
}

.preview-item-name {
  display: block;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-item-meta {
  display: block;
  font-size: 12px;
  color: #94a3b8;
}

.delete-confirmation {
  padding: 16px;
  background: #fef2f2;
  border-radius: 12px;
  border: 1px solid #fecaca;
}

.delete-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
}

.delete-hint.error {
  color: #ef4444;
}

.delete-hint.success {
  color: #22c55e;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mt-2 {
  margin-top: 8px;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

:deep(.bulk-preview-modal .ant-modal-header) {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.bulk-preview-modal .ant-modal-body) {
  padding: 24px;
}
</style>
