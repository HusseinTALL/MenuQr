<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import api from '@/services/api';
import {
  CarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  TeamOutlined,
  DashboardOutlined,
} from '@ant-design/icons-vue';

interface DeliveryAddress {
  street: string;
  city: string;
  postalCode?: string;
  coordinates?: { lat: number; lng: number };
}

interface DriverInfo {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  profilePhoto?: string;
  stats?: { averageRating: number };
}

interface Delivery {
  _id: string;
  orderId: string;
  status: string;
  pickupAddress: DeliveryAddress;
  deliveryAddress: DeliveryAddress;
  driverId?: DriverInfo;
  customerId?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  estimatedDuration: number;
  estimatedDistance: number;
  earnings: {
    total: number;
    baseFee: number;
    distanceBonus: number;
    tip: number;
  };
  isPriority: boolean;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  issues: Array<{
    type: string;
    description: string;
    reportedAt: string;
  }>;
}

interface DeliveryStats {
  pending: number;
  assigned: number;
  inProgress: number;
  delivered: number;
  cancelled: number;
  avgDeliveryTime: number;
  totalToday: number;
}

interface AvailableDriver {
  driverId: string;
  driver: DriverInfo;
  score: number;
  distance: number;
  eta: number;
}

const loading = ref(true);
const deliveries = ref<Delivery[]>([]);
const stats = ref<DeliveryStats>({
  pending: 0,
  assigned: 0,
  inProgress: 0,
  delivered: 0,
  cancelled: 0,
  avgDeliveryTime: 0,
  totalToday: 0,
});

// Filters
const searchQuery = ref('');
const statusFilter = ref<string>('all');
const dateFilter = ref<string>('today');

// Modal states
const detailModalVisible = ref(false);
const assignModalVisible = ref(false);
const selectedDelivery = ref<Delivery | null>(null);
const availableDrivers = ref<AvailableDriver[]>([]);
const loadingDrivers = ref(false);

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'assigned', label: 'Assignée' },
  { value: 'accepted', label: 'Acceptée' },
  { value: 'picked_up', label: 'Récupérée' },
  { value: 'in_transit', label: 'En route' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' },
];

const dateOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'all', label: 'Tout' },
];

const columns = [
  {
    title: 'Commande',
    dataIndex: 'orderId',
    key: 'orderId',
    width: 120,
  },
  {
    title: 'Statut',
    dataIndex: 'status',
    key: 'status',
    width: 130,
  },
  {
    title: 'Client',
    dataIndex: 'customerId',
    key: 'customer',
    width: 150,
  },
  {
    title: 'Adresse',
    dataIndex: 'deliveryAddress',
    key: 'address',
    ellipsis: true,
  },
  {
    title: 'Livreur',
    dataIndex: 'driverId',
    key: 'driver',
    width: 150,
  },
  {
    title: 'Durée Est.',
    dataIndex: 'estimatedDuration',
    key: 'duration',
    width: 100,
  },
  {
    title: 'Gains',
    dataIndex: 'earnings',
    key: 'earnings',
    width: 90,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
  },
];

const filteredDeliveries = computed(() => {
  let result = deliveries.value;

  // Status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(d => d.status === statusFilter.value);
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(d =>
      d.orderId?.toLowerCase().includes(query) ||
      d.deliveryAddress.street.toLowerCase().includes(query) ||
      d.customerId?.firstName?.toLowerCase().includes(query) ||
      d.customerId?.lastName?.toLowerCase().includes(query) ||
      d.driverId?.firstName?.toLowerCase().includes(query) ||
      d.driverId?.lastName?.toLowerCase().includes(query)
    );
  }

  return result;
});

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'orange',
    assigned: 'blue',
    accepted: 'cyan',
    picked_up: 'geekblue',
    in_transit: 'purple',
    arrived: 'lime',
    delivered: 'success',
    cancelled: 'error',
  };
  return colors[status] || 'default';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    assigned: 'Assignée',
    accepted: 'Acceptée',
    picked_up: 'Récupérée',
    in_transit: 'En route',
    arrived: 'Arrivée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };
  return labels[status] || status;
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins > 0 ? mins : ''}`;
};

const fetchDeliveries = async () => {
  try {
    loading.value = true;
    const params: Record<string, string> = {};

    if (dateFilter.value !== 'all') {
      const now = new Date();
      if (dateFilter.value === 'today') {
        params.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (dateFilter.value === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.startDate = weekAgo.toISOString();
      } else if (dateFilter.value === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        params.startDate = monthAgo.toISOString();
      }
    }

    const response = await api.get<{ deliveries: Delivery[]; stats: DeliveryStats }>(
      '/deliveries',
      params
    );

    if (response.success && response.data) {
      deliveries.value = response.data.deliveries || [];
      if (response.data.stats) {
        stats.value = response.data.stats;
      }
    }
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
    message.error('Erreur lors du chargement des livraisons');
  } finally {
    loading.value = false;
  }
};

const fetchAvailableDrivers = async (deliveryId: string) => {
  try {
    loadingDrivers.value = true;
    const response = await api.get<{ drivers: AvailableDriver[] }>(
      `/deliveries/${deliveryId}/available-drivers`
    );

    if (response.success && response.data) {
      availableDrivers.value = response.data.drivers || [];
    }
  } catch (error) {
    console.error('Failed to fetch available drivers:', error);
    message.error('Erreur lors du chargement des livreurs');
  } finally {
    loadingDrivers.value = false;
  }
};

const openDetailModal = (delivery: Delivery) => {
  selectedDelivery.value = delivery;
  detailModalVisible.value = true;
};

const openAssignModal = async (delivery: Delivery) => {
  selectedDelivery.value = delivery;
  assignModalVisible.value = true;
  await fetchAvailableDrivers(delivery._id);
};

const assignDriver = async (driverId: string) => {
  if (!selectedDelivery.value) return;

  try {
    const response = await api.post(`/deliveries/${selectedDelivery.value._id}/assign`, {
      driverId,
    });

    if (response.success) {
      message.success('Livreur assigné avec succès');
      assignModalVisible.value = false;
      await fetchDeliveries();
    } else {
      message.error(response.message || 'Erreur lors de l\'assignation');
    }
  } catch (error) {
    console.error('Failed to assign driver:', error);
    message.error('Erreur lors de l\'assignation du livreur');
  }
};

const autoAssignDelivery = async (deliveryId: string) => {
  try {
    const response = await api.post(`/deliveries/${deliveryId}/auto-assign`);

    if (response.success) {
      message.success('Livraison assignée automatiquement');
      await fetchDeliveries();
    } else {
      message.error(response.message || 'Aucun livreur disponible');
    }
  } catch (error) {
    console.error('Failed to auto-assign:', error);
    message.error('Erreur lors de l\'assignation automatique');
  }
};

const cancelDelivery = async (deliveryId: string) => {
  try {
    const response = await api.post(`/deliveries/${deliveryId}/cancel`);

    if (response.success) {
      message.success('Livraison annulée');
      await fetchDeliveries();
    } else {
      message.error(response.message || 'Erreur lors de l\'annulation');
    }
  } catch (error) {
    console.error('Failed to cancel delivery:', error);
    message.error('Erreur lors de l\'annulation');
  }
};

const markAsPriority = async (deliveryId: string, isPriority: boolean) => {
  try {
    const response = await api.put(`/deliveries/${deliveryId}`, { isPriority });

    if (response.success) {
      message.success(isPriority ? 'Marquée comme prioritaire' : 'Priorité retirée');
      await fetchDeliveries();
    }
  } catch (error) {
    console.error('Failed to update priority:', error);
  }
};

const startAutoRefresh = () => {
  refreshInterval = setInterval(() => {
    fetchDeliveries();
  }, 30000); // Refresh every 30 seconds
};

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

onMounted(() => {
  fetchDeliveries();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div class="delivery-management">
    <!-- Header -->
    <div class="page-header">
      <div class="header-title">
        <h1>
          <CarOutlined />
          Gestion des Livraisons
        </h1>
        <p>Suivez et gérez les livraisons en temps réel</p>
      </div>
      <div class="header-actions">
        <a-button @click="fetchDeliveries" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card pending">
        <div class="stat-icon">
          <ClockCircleOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">En attente</div>
        </div>
      </div>

      <div class="stat-card assigned">
        <div class="stat-icon">
          <UserOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.assigned }}</div>
          <div class="stat-label">Assignées</div>
        </div>
      </div>

      <div class="stat-card in-progress">
        <div class="stat-icon">
          <CarOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.inProgress }}</div>
          <div class="stat-label">En cours</div>
        </div>
      </div>

      <div class="stat-card delivered">
        <div class="stat-icon">
          <CheckCircleOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.delivered }}</div>
          <div class="stat-label">Livrées</div>
        </div>
      </div>

      <div class="stat-card avg-time">
        <div class="stat-icon">
          <DashboardOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatDuration(stats.avgDeliveryTime) }}</div>
          <div class="stat-label">Temps moyen</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <a-input
        v-model:value="searchQuery"
        placeholder="Rechercher par commande, client, livreur..."
        style="width: 300px"
        allow-clear
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>

      <a-select
        v-model:value="statusFilter"
        :options="statusOptions"
        style="width: 180px"
        placeholder="Filtrer par statut"
      >
        <template #suffixIcon><FilterOutlined /></template>
      </a-select>

      <a-select
        v-model:value="dateFilter"
        :options="dateOptions"
        style="width: 160px"
        @change="fetchDeliveries"
      />
    </div>

    <!-- Deliveries Table -->
    <a-table
      :columns="columns"
      :data-source="filteredDeliveries"
      :loading="loading"
      :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total: number) => `${total} livraisons` }"
      :scroll="{ x: 1100 }"
      row-key="_id"
      class="deliveries-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'orderId'">
          <div class="order-cell">
            <span class="order-id">#{{ record.orderId?.slice(-6) || record._id.slice(-6) }}</span>
            <a-tag v-if="record.isPriority" color="red" size="small">URGENT</a-tag>
          </div>
          <div class="order-time">{{ formatTime(record.createdAt) }}</div>
        </template>

        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(record.status)">
            {{ getStatusLabel(record.status) }}
          </a-tag>
          <div v-if="record.issues?.length" class="issue-badge">
            <a-tooltip title="Problème signalé">
              <ExclamationCircleOutlined style="color: #ff4d4f" />
            </a-tooltip>
          </div>
        </template>

        <template v-else-if="column.key === 'customer'">
          <div v-if="record.customerId" class="customer-cell">
            <span class="customer-name">
              {{ record.customerId.firstName }} {{ record.customerId.lastName }}
            </span>
            <a :href="'tel:' + record.customerId.phone" class="customer-phone">
              <PhoneOutlined /> {{ record.customerId.phone }}
            </a>
          </div>
          <span v-else class="text-muted">-</span>
        </template>

        <template v-else-if="column.key === 'address'">
          <div class="address-cell">
            <EnvironmentOutlined />
            <span>{{ record.deliveryAddress.street }}, {{ record.deliveryAddress.city }}</span>
          </div>
        </template>

        <template v-else-if="column.key === 'driver'">
          <div v-if="record.driverId" class="driver-cell">
            <a-avatar :src="record.driverId.profilePhoto" size="small">
              {{ record.driverId.firstName?.charAt(0) }}
            </a-avatar>
            <span>{{ record.driverId.firstName }} {{ record.driverId.lastName?.charAt(0) }}.</span>
          </div>
          <a-button
            v-else-if="record.status === 'pending'"
            type="link"
            size="small"
            @click="openAssignModal(record)"
          >
            <TeamOutlined /> Assigner
          </a-button>
          <span v-else class="text-muted">Non assigné</span>
        </template>

        <template v-else-if="column.key === 'duration'">
          <span>~{{ record.estimatedDuration }} min</span>
        </template>

        <template v-else-if="column.key === 'earnings'">
          <span class="earnings">{{ record.earnings?.total?.toFixed(2) || '0.00' }}€</span>
        </template>

        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-tooltip title="Détails">
              <a-button type="text" size="small" @click="openDetailModal(record)">
                <EyeOutlined />
              </a-button>
            </a-tooltip>

            <a-dropdown v-if="['pending', 'assigned'].includes(record.status)">
              <a-button type="text" size="small">
                <span>•••</span>
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item
                    v-if="record.status === 'pending'"
                    @click="autoAssignDelivery(record._id)"
                  >
                    <CarOutlined /> Auto-assigner
                  </a-menu-item>
                  <a-menu-item
                    v-if="record.status === 'pending'"
                    @click="openAssignModal(record)"
                  >
                    <TeamOutlined /> Choisir livreur
                  </a-menu-item>
                  <a-menu-item @click="markAsPriority(record._id, !record.isPriority)">
                    <ExclamationCircleOutlined />
                    {{ record.isPriority ? 'Retirer priorité' : 'Marquer prioritaire' }}
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item danger @click="cancelDelivery(record._id)">
                    <CloseCircleOutlined /> Annuler
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- Detail Modal -->
    <a-modal
      v-model:open="detailModalVisible"
      title="Détails de la livraison"
      width="700px"
      :footer="null"
    >
      <template v-if="selectedDelivery">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="ID Commande" :span="1">
            #{{ selectedDelivery.orderId?.slice(-6) || selectedDelivery._id.slice(-6) }}
          </a-descriptions-item>
          <a-descriptions-item label="Statut" :span="1">
            <a-tag :color="getStatusColor(selectedDelivery.status)">
              {{ getStatusLabel(selectedDelivery.status) }}
            </a-tag>
          </a-descriptions-item>

          <a-descriptions-item label="Adresse de récupération" :span="2">
            {{ selectedDelivery.pickupAddress.street }}, {{ selectedDelivery.pickupAddress.city }}
          </a-descriptions-item>

          <a-descriptions-item label="Adresse de livraison" :span="2">
            {{ selectedDelivery.deliveryAddress.street }}, {{ selectedDelivery.deliveryAddress.city }}
          </a-descriptions-item>

          <a-descriptions-item label="Client" :span="1">
            <template v-if="selectedDelivery.customerId">
              {{ selectedDelivery.customerId.firstName }} {{ selectedDelivery.customerId.lastName }}
              <br />
              <a :href="'tel:' + selectedDelivery.customerId.phone">
                {{ selectedDelivery.customerId.phone }}
              </a>
            </template>
            <span v-else>-</span>
          </a-descriptions-item>

          <a-descriptions-item label="Livreur" :span="1">
            <template v-if="selectedDelivery.driverId">
              {{ selectedDelivery.driverId.firstName }} {{ selectedDelivery.driverId.lastName }}
              <br />
              <a :href="'tel:' + selectedDelivery.driverId.phone">
                {{ selectedDelivery.driverId.phone }}
              </a>
            </template>
            <span v-else>Non assigné</span>
          </a-descriptions-item>

          <a-descriptions-item label="Distance estimée" :span="1">
            {{ selectedDelivery.estimatedDistance?.toFixed(1) || '-' }} km
          </a-descriptions-item>

          <a-descriptions-item label="Durée estimée" :span="1">
            {{ selectedDelivery.estimatedDuration || '-' }} min
          </a-descriptions-item>

          <a-descriptions-item label="Gains livreur" :span="2">
            <div class="earnings-breakdown">
              <span>Base: {{ selectedDelivery.earnings?.baseFee?.toFixed(2) || '0.00' }}€</span>
              <span>Distance: +{{ selectedDelivery.earnings?.distanceBonus?.toFixed(2) || '0.00' }}€</span>
              <span>Pourboire: +{{ selectedDelivery.earnings?.tip?.toFixed(2) || '0.00' }}€</span>
              <strong>Total: {{ selectedDelivery.earnings?.total?.toFixed(2) || '0.00' }}€</strong>
            </div>
          </a-descriptions-item>

          <a-descriptions-item label="Créée" :span="1">
            {{ new Date(selectedDelivery.createdAt).toLocaleString('fr-FR') }}
          </a-descriptions-item>

          <a-descriptions-item label="Livrée" :span="1">
            {{ selectedDelivery.deliveredAt ? new Date(selectedDelivery.deliveredAt).toLocaleString('fr-FR') : '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- Issues -->
        <div v-if="selectedDelivery.issues?.length" class="issues-section">
          <h4>Problèmes signalés</h4>
          <a-list :data-source="selectedDelivery.issues" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="item.type"
                  :description="item.description"
                />
                <template #extra>
                  {{ new Date(item.reportedAt).toLocaleString('fr-FR') }}
                </template>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </template>
    </a-modal>

    <!-- Assign Driver Modal -->
    <a-modal
      v-model:open="assignModalVisible"
      title="Assigner un livreur"
      width="600px"
      :footer="null"
    >
      <div v-if="loadingDrivers" class="loading-drivers">
        <a-spin />
        <span>Recherche des livreurs disponibles...</span>
      </div>

      <div v-else-if="availableDrivers.length === 0" class="no-drivers">
        <TeamOutlined style="font-size: 48px; color: #ccc" />
        <p>Aucun livreur disponible à proximité</p>
      </div>

      <a-list v-else :data-source="availableDrivers" class="drivers-list">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #avatar>
                <a-avatar :src="item.driver.profilePhoto" size="large">
                  {{ item.driver.firstName?.charAt(0) }}
                </a-avatar>
              </template>
              <template #title>
                {{ item.driver.firstName }} {{ item.driver.lastName }}
              </template>
              <template #description>
                <div class="driver-info">
                  <span>
                    <CarOutlined /> {{ item.driver.vehicleType }}
                  </span>
                  <span>
                    <EnvironmentOutlined /> {{ item.distance.toFixed(1) }} km
                  </span>
                  <span>
                    <ClockCircleOutlined /> ~{{ item.eta }} min
                  </span>
                  <span v-if="item.driver.stats?.averageRating">
                    ⭐ {{ item.driver.stats.averageRating.toFixed(1) }}
                  </span>
                </div>
              </template>
            </a-list-item-meta>
            <template #extra>
              <a-button type="primary" @click="assignDriver(item.driverId)">
                Assigner
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-modal>
  </div>
</template>

<style scoped>
.delivery-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-title h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.header-title p {
  color: #8c8c8c;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
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

.stat-card.pending .stat-icon {
  background: #fff7e6;
  color: #fa8c16;
}

.stat-card.assigned .stat-icon {
  background: #e6f7ff;
  color: #1890ff;
}

.stat-card.in-progress .stat-icon {
  background: #f9f0ff;
  color: #722ed1;
}

.stat-card.delivered .stat-icon {
  background: #f6ffed;
  color: #52c41a;
}

.stat-card.avg-time .stat-icon {
  background: #e6fffb;
  color: #13c2c2;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: #8c8c8c;
  font-size: 13px;
}

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.deliveries-table {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.order-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-id {
  font-weight: 600;
  font-family: monospace;
}

.order-time {
  font-size: 12px;
  color: #8c8c8c;
}

.issue-badge {
  display: inline-block;
  margin-left: 8px;
}

.customer-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-name {
  font-weight: 500;
}

.customer-phone {
  font-size: 12px;
  color: #1890ff;
}

.address-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #595959;
}

.driver-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.earnings {
  font-weight: 600;
  color: #52c41a;
}

.text-muted {
  color: #bfbfbf;
}

.earnings-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.issues-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.issues-section h4 {
  margin: 0 0 12px 0;
  color: #ff4d4f;
}

.loading-drivers,
.no-drivers {
  text-align: center;
  padding: 40px;
  color: #8c8c8c;
}

.loading-drivers {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.no-drivers {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.drivers-list .driver-info {
  display: flex;
  gap: 16px;
  color: #8c8c8c;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-bar {
    flex-direction: column;
  }

  .filters-bar > * {
    width: 100% !important;
  }
}
</style>
