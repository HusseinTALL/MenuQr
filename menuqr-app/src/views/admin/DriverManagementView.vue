<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { message, Modal } from 'ant-design-vue';
import api from '@/services/api';
import {
  UserOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  StarOutlined,
  PhoneOutlined,
  MailOutlined,
  FileOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  vehicleType: string;
  vehiclePlate?: string;
  status: 'pending' | 'verified' | 'suspended' | 'deactivated';
  shiftStatus: string;
  isAvailable: boolean;
  documents: {
    idCard?: { url: string; verified: boolean };
    driverLicense?: { url: string; verified: boolean };
    vehicleRegistration?: { url: string; verified: boolean };
    insurance?: { url: string; verified: boolean; expiresAt?: string };
  };
  stats: {
    totalDeliveries: number;
    completedDeliveries: number;
    averageRating: number;
    totalRatings: number;
    completionRate: number;
  };
  createdAt: string;
  lastActivityAt?: string;
}

const loading = ref(true);
const drivers = ref<Driver[]>([]);
const totalDrivers = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// Filters
const searchQuery = ref('');
const statusFilter = ref<string | null>(null);
const vehicleFilter = ref<string | null>(null);

// Selected driver for detail view
const selectedDriver = ref<Driver | null>(null);
const showDetailModal = ref(false);
const actionLoading = ref(false);

// Documents modal
const showDocsModal = ref(false);
const selectedDocDriver = ref<Driver | null>(null);

const vehicleIcons: Record<string, string> = {
  bicycle: '🚲',
  scooter: '🛵',
  motorcycle: '🏍️',
  car: '🚗',
};

const statusConfig: Record<string, { color: string; label: string; icon: typeof CheckCircleOutlined }> = {
  pending: { color: 'orange', label: 'En attente', icon: ClockCircleOutlined },
  verified: { color: 'green', label: 'Verifie', icon: CheckCircleOutlined },
  suspended: { color: 'red', label: 'Suspendu', icon: StopOutlined },
  deactivated: { color: 'default', label: 'Desactive', icon: CloseOutlined },
};

const shiftStatusLabels: Record<string, string> = {
  offline: 'Hors ligne',
  online: 'En ligne',
  on_break: 'En pause',
  on_delivery: 'En livraison',
  returning: 'Retour',
};

// Stats
const stats = computed(() => {
  const driverList = drivers.value || [];
  return {
    total: totalDrivers.value,
    pending: driverList.filter(d => d.status === 'pending').length,
    verified: driverList.filter(d => d.status === 'verified').length,
    online: driverList.filter(d => d.shiftStatus === 'online' || d.shiftStatus === 'on_delivery').length,
  };
});

const fetchDrivers = async () => {
  loading.value = true;
  try {
    const response = await api.getDrivers({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
      vehicleType: vehicleFilter.value || undefined,
    });

    if (response.success && response.data) {
      const data = response.data as { drivers: Driver[]; total: number; page: number; pages: number };
      drivers.value = data.drivers;
      totalDrivers.value = data.total;
    }
  } catch (error) {
    console.error('Failed to fetch drivers:', error);
    message.error('Erreur lors du chargement des livreurs');
  } finally {
    loading.value = false;
  }
};

const handleVerifyDriver = async (driver: Driver) => {
  Modal.confirm({
    title: 'Verifier ce livreur ?',
    content: `Voulez-vous approuver ${driver.firstName} ${driver.lastName} comme livreur partenaire ?`,
    okText: 'Approuver',
    cancelText: 'Annuler',
    onOk: async () => {
      actionLoading.value = true;
      try {
        const response = await api.verifyDriver(driver._id);
        if (response.success) {
          message.success('Livreur verifie avec succes');
          await fetchDrivers();
        } else {
          message.error(response.message || 'Erreur');
        }
      } catch (error) {
        console.error('Failed to verify driver:', error);
        message.error('Erreur lors de la verification');
      } finally {
        actionLoading.value = false;
      }
    },
  });
};

const handleSuspendDriver = async (driver: Driver) => {
  Modal.confirm({
    title: 'Suspendre ce livreur ?',
    content: `Voulez-vous suspendre ${driver.firstName} ${driver.lastName} ?`,
    okText: 'Suspendre',
    okType: 'danger',
    cancelText: 'Annuler',
    onOk: async () => {
      actionLoading.value = true;
      try {
        const response = await api.suspendDriver(driver._id, 'Suspension par admin');
        if (response.success) {
          message.success('Livreur suspendu');
          await fetchDrivers();
          showDetailModal.value = false;
        } else {
          message.error(response.message || 'Erreur');
        }
      } catch (error) {
        console.error('Failed to suspend driver:', error);
        message.error('Erreur lors de la suspension');
      } finally {
        actionLoading.value = false;
      }
    },
  });
};

const handleReactivateDriver = async (driver: Driver) => {
  actionLoading.value = true;
  try {
    const response = await api.reactivateDriver(driver._id);
    if (response.success) {
      message.success('Livreur reactive');
      await fetchDrivers();
      showDetailModal.value = false;
    } else {
      message.error(response.message || 'Erreur');
    }
  } catch (error) {
    console.error('Failed to reactivate driver:', error);
    message.error('Erreur lors de la reactivation');
  } finally {
    actionLoading.value = false;
  }
};

const handleVerifyDocument = async (driverId: string, docType: string) => {
  try {
    const response = await api.verifyDriverDocument(driverId, docType);
    if (response.success) {
      message.success('Document verifie');
      await fetchDrivers();
      // Update selected driver in modal
      if (selectedDocDriver.value) {
        const updated = drivers.value.find(d => d._id === driverId);
        if (updated) {selectedDocDriver.value = updated;}
      }
    } else {
      message.error(response.message || 'Erreur');
    }
  } catch (error) {
    console.error('Failed to verify document:', error);
    message.error('Erreur');
  }
};

const openDriverDetail = (driver: Driver) => {
  selectedDriver.value = driver;
  showDetailModal.value = true;
};

const openDocsModal = (driver: Driver) => {
  selectedDocDriver.value = driver;
  showDocsModal.value = true;
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchDrivers();
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchDrivers();
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  fetchDrivers();
});
</script>

<script lang="ts">
import { h } from 'vue';
export default {
  name: 'DriverManagementView',
};
</script>

<template>
  <div class="driver-management">
    <div class="page-header">
      <div class="header-content">
        <h1>Gestion des livreurs</h1>
        <p>Gerez les livreurs partenaires et leurs documents</p>
      </div>
      <a-button type="primary" @click="fetchDrivers">
        <ReloadOutlined /> Actualiser
      </a-button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <UserOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">Total livreurs</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending">
          <ClockCircleOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pending }}</span>
          <span class="stat-label">En attente</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon verified">
          <CheckCircleOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.verified }}</span>
          <span class="stat-label">Verifies</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon online">
          <CarOutlined />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.online }}</span>
          <span class="stat-label">En ligne</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <a-input
        v-model:value="searchQuery"
        placeholder="Rechercher par nom, email..."
        :prefix="h(SearchOutlined)"
        allow-clear
        @pressEnter="handleSearch"
        @change="(e: Event) => { if (!(e.target as HTMLInputElement).value) handleSearch() }"
        style="width: 300px"
      />
      <a-select
        v-model:value="statusFilter"
        placeholder="Statut"
        allow-clear
        style="width: 150px"
        @change="handleSearch"
      >
        <a-select-option value="pending">En attente</a-select-option>
        <a-select-option value="verified">Verifie</a-select-option>
        <a-select-option value="suspended">Suspendu</a-select-option>
        <a-select-option value="deactivated">Desactive</a-select-option>
      </a-select>
      <a-select
        v-model:value="vehicleFilter"
        placeholder="Vehicule"
        allow-clear
        style="width: 150px"
        @change="handleSearch"
      >
        <a-select-option value="bicycle">Velo</a-select-option>
        <a-select-option value="scooter">Scooter</a-select-option>
        <a-select-option value="motorcycle">Moto</a-select-option>
        <a-select-option value="car">Voiture</a-select-option>
      </a-select>
    </div>

    <!-- Drivers Table -->
    <div class="table-container">
      <a-table
        :dataSource="drivers"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: totalDrivers,
          showSizeChanger: false,
          onChange: handlePageChange,
        }"
        row-key="_id"
      >
        <a-table-column title="Livreur" key="driver">
          <template #default="{ record }">
            <div class="driver-cell">
              <a-avatar :src="record.profilePhoto" :size="40">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <div class="driver-info">
                <span class="driver-name">{{ record.firstName }} {{ record.lastName }}</span>
                <span class="driver-email">{{ record.email }}</span>
              </div>
            </div>
          </template>
        </a-table-column>

        <a-table-column title="Vehicule" key="vehicle" width="120">
          <template #default="{ record }">
            <span class="vehicle-badge">
              {{ vehicleIcons[record.vehicleType] }} {{ record.vehiclePlate || 'Velo' }}
            </span>
          </template>
        </a-table-column>

        <a-table-column title="Statut" key="status" width="130">
          <template #default="{ record }">
            <a-tag :color="statusConfig[record.status]?.color">
              {{ statusConfig[record.status]?.label }}
            </a-tag>
          </template>
        </a-table-column>

        <a-table-column title="Disponibilite" key="availability" width="130">
          <template #default="{ record }">
            <a-badge
              :status="record.shiftStatus === 'online' || record.shiftStatus === 'on_delivery' ? 'success' : 'default'"
              :text="shiftStatusLabels[record.shiftStatus] || record.shiftStatus"
            />
          </template>
        </a-table-column>

        <a-table-column title="Stats" key="stats" width="150">
          <template #default="{ record }">
            <div class="stats-cell">
              <span><CarOutlined /> {{ record.stats.completedDeliveries }}</span>
              <span><StarOutlined /> {{ record.stats.averageRating.toFixed(1) }}</span>
            </div>
          </template>
        </a-table-column>

        <a-table-column title="Inscription" key="createdAt" width="110">
          <template #default="{ record }">
            {{ formatDate(record.createdAt) }}
          </template>
        </a-table-column>

        <a-table-column title="Actions" key="actions" width="150" fixed="right">
          <template #default="{ record }">
            <a-space>
              <a-tooltip title="Voir details">
                <a-button type="text" size="small" @click="openDriverDetail(record)">
                  <EyeOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Documents">
                <a-button type="text" size="small" @click="openDocsModal(record)">
                  <FileOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip v-if="record.status === 'pending'" title="Approuver">
                <a-button type="text" size="small" @click="handleVerifyDriver(record)">
                  <CheckOutlined style="color: #52c41a" />
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </div>

    <!-- Driver Detail Modal -->
    <a-modal
      v-model:open="showDetailModal"
      :title="`${selectedDriver?.firstName} ${selectedDriver?.lastName}`"
      width="600px"
      :footer="null"
    >
      <template v-if="selectedDriver">
        <div class="detail-modal">
          <!-- Header -->
          <div class="detail-header">
            <a-avatar :src="selectedDriver.profilePhoto" :size="64">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <div class="detail-header-info">
              <h3>{{ selectedDriver.firstName }} {{ selectedDriver.lastName }}</h3>
              <div class="detail-badges">
                <a-tag :color="statusConfig[selectedDriver.status]?.color">
                  {{ statusConfig[selectedDriver.status]?.label }}
                </a-tag>
                <span class="vehicle-badge">
                  {{ vehicleIcons[selectedDriver.vehicleType] }} {{ selectedDriver.vehiclePlate || 'Velo' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Contact Info -->
          <div class="detail-section">
            <h4>Contact</h4>
            <div class="info-grid">
              <div class="info-item">
                <MailOutlined />
                <span>{{ selectedDriver.email }}</span>
              </div>
              <div class="info-item">
                <PhoneOutlined />
                <span>{{ selectedDriver.phone }}</span>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="detail-section">
            <h4>Statistiques</h4>
            <div class="stats-detail-grid">
              <div class="stat-detail">
                <span class="stat-detail-value">{{ selectedDriver.stats.completedDeliveries }}</span>
                <span class="stat-detail-label">Livraisons</span>
              </div>
              <div class="stat-detail">
                <span class="stat-detail-value">{{ selectedDriver.stats.averageRating.toFixed(1) }}</span>
                <span class="stat-detail-label">Note moyenne</span>
              </div>
              <div class="stat-detail">
                <span class="stat-detail-value">{{ selectedDriver.stats.completionRate.toFixed(0) }}%</span>
                <span class="stat-detail-label">Taux completion</span>
              </div>
              <div class="stat-detail">
                <span class="stat-detail-value">{{ selectedDriver.stats.totalRatings }}</span>
                <span class="stat-detail-label">Avis recus</span>
              </div>
            </div>
          </div>

          <!-- Dates -->
          <div class="detail-section">
            <h4>Historique</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Inscription:</span>
                <span>{{ formatDateTime(selectedDriver.createdAt) }}</span>
              </div>
              <div v-if="selectedDriver.lastActivityAt" class="info-item">
                <span class="label">Derniere activite:</span>
                <span>{{ formatDateTime(selectedDriver.lastActivityAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="detail-actions">
            <a-button
              v-if="selectedDriver.status === 'pending'"
              type="primary"
              :loading="actionLoading"
              @click="handleVerifyDriver(selectedDriver)"
            >
              <CheckOutlined /> Approuver
            </a-button>
            <a-button
              v-if="selectedDriver.status === 'verified'"
              danger
              :loading="actionLoading"
              @click="handleSuspendDriver(selectedDriver)"
            >
              <StopOutlined /> Suspendre
            </a-button>
            <a-button
              v-if="selectedDriver.status === 'suspended'"
              type="primary"
              :loading="actionLoading"
              @click="handleReactivateDriver(selectedDriver)"
            >
              <CheckOutlined /> Reactiver
            </a-button>
            <a-button @click="openDocsModal(selectedDriver)">
              <FileOutlined /> Voir documents
            </a-button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- Documents Modal -->
    <a-modal
      v-model:open="showDocsModal"
      :title="`Documents - ${selectedDocDriver?.firstName} ${selectedDocDriver?.lastName}`"
      width="500px"
      :footer="null"
    >
      <template v-if="selectedDocDriver">
        <div class="docs-modal">
          <div
            v-for="(doc, key) in selectedDocDriver.documents"
            :key="key"
            class="doc-item"
          >
            <div class="doc-info">
              <FileOutlined />
              <span class="doc-name">
                {{ key === 'idCard' ? 'Piece d\'identite' :
                   key === 'driverLicense' ? 'Permis de conduire' :
                   key === 'vehicleRegistration' ? 'Carte grise' :
                   key === 'insurance' ? 'Assurance' : key }}
              </span>
            </div>
            <div class="doc-actions">
              <template v-if="doc">
                <a-tag v-if="doc.verified" color="green">
                  <CheckCircleOutlined /> Verifie
                </a-tag>
                <template v-else>
                  <a-tag color="orange">En attente</a-tag>
                  <a-button
                    type="primary"
                    size="small"
                    @click="handleVerifyDocument(selectedDocDriver._id, key)"
                  >
                    Verifier
                  </a-button>
                </template>
                <a-button
                  type="link"
                  size="small"
                  :href="doc.url"
                  target="_blank"
                >
                  Voir
                </a-button>
              </template>
              <a-tag v-else color="default">Non fourni</a-tag>
            </div>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.driver-management {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h1 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
}

.header-content p {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
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
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.stat-icon.total {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.stat-icon.pending {
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
}

.stat-icon.verified {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.stat-icon.online {
  background: rgba(114, 46, 209, 0.1);
  color: #722ed1;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  display: block;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

/* Filters */
.filters-section {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* Table */
.table-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.driver-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.driver-info {
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-weight: 500;
}

.driver-email {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.vehicle-badge {
  font-size: 13px;
}

.stats-cell {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

/* Detail Modal */
.detail-modal {
  padding: 8px 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-header-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.detail-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
}

.info-item .label {
  color: rgba(0, 0, 0, 0.45);
  min-width: 120px;
}

.stats-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-detail {
  text-align: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.stat-detail-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1890ff;
}

.stat-detail-label {
  display: block;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
}

.detail-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* Documents Modal */
.docs-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
}

.doc-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.doc-name {
  font-weight: 500;
}

.doc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
