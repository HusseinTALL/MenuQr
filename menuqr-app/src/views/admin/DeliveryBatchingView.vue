<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '@/services/api';
import { message } from 'ant-design-vue';
import {
  CarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CheckOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  RocketOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';

interface PendingDelivery {
  _id: string;
  deliveryNumber: string;
  orderId: {
    orderNumber: string;
    items: Array<{ name: string; quantity: number }>;
    total: number;
  };
  pickupAddress: {
    street: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  deliveryAddress: {
    street: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  estimatedDistance: number;
  estimatedDuration: number;
  createdAt: string;
  isPriority: boolean;
}

interface AvailableDriver {
  _id: string;
  firstName: string;
  lastName: string;
  vehicleType: string;
  currentLocation?: {
    coordinates: [number, number];
  };
  stats: {
    averageRating: number;
    completedDeliveries: number;
  };
  distance: number;
  eta: number;
  score: number;
}

interface BatchGroup {
  id: string;
  deliveries: PendingDelivery[];
  estimatedDistance: number;
  estimatedDuration: number;
  suggestedDriver?: AvailableDriver;
}

const loading = ref(true);
const pendingDeliveries = ref<PendingDelivery[]>([]);
const availableDrivers = ref<AvailableDriver[]>([]);
const selectedDeliveries = ref<string[]>([]);
const batchGroups = ref<BatchGroup[]>([]);
const showBatchModal = ref(false);
const showAutoAssignModal = ref(false);
const autoAssignLoading = ref(false);
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null);

// Batch settings
const batchSettings = ref({
  maxDeliveriesPerBatch: 3,
  maxDistanceKm: 5,
  priorityFirst: true,
});

// Stats
const stats = computed(() => ({
  pending: pendingDeliveries.value.length,
  selected: selectedDeliveries.value.length,
  batches: batchGroups.value.length,
  drivers: availableDrivers.value.length,
}));

// Fetch pending deliveries
const fetchPendingDeliveries = async () => {
  try {
    const response = await api.get<{ deliveries: PendingDelivery[] }>('/deliveries?status=pending');
    if (response.success && response.data) {
      pendingDeliveries.value = response.data.deliveries || [];
    }
  } catch (error) {
    console.error('Failed to fetch pending deliveries:', error);
    message.error('Erreur lors du chargement des livraisons');
  }
};

// Fetch available drivers
const fetchAvailableDrivers = async () => {
  try {
    const response = await api.getDrivers({ status: 'verified', limit: 50 });
    if (response.success && response.data) {
      const drivers = response.data as unknown as { drivers: AvailableDriver[] };
      // Filter to only online drivers
      availableDrivers.value = (drivers.drivers || []).filter(
        (d: AvailableDriver) => d.currentLocation !== undefined
      );
    }
  } catch (error) {
    console.error('Failed to fetch drivers:', error);
  }
};

// Load data
const loadData = async () => {
  loading.value = true;
  await Promise.all([fetchPendingDeliveries(), fetchAvailableDrivers()]);
  loading.value = false;
};

// Toggle delivery selection
const toggleDeliverySelection = (id: string) => {
  const index = selectedDeliveries.value.indexOf(id);
  if (index === -1) {
    selectedDeliveries.value.push(id);
  } else {
    selectedDeliveries.value.splice(index, 1);
  }
};

// Select all deliveries
const selectAll = () => {
  if (selectedDeliveries.value.length === pendingDeliveries.value.length) {
    selectedDeliveries.value = [];
  } else {
    selectedDeliveries.value = pendingDeliveries.value.map((d) => d._id);
  }
};

// Calculate distance between two points (Haversine)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Generate optimized batches
const generateBatches = () => {
  const selected = pendingDeliveries.value.filter((d) =>
    selectedDeliveries.value.includes(d._id)
  );

  if (selected.length === 0) {
    message.warning('Sélectionnez des livraisons à regrouper');
    return;
  }

  // Sort by priority if enabled
  const sorted = [...selected];
  if (batchSettings.value.priorityFirst) {
    sorted.sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));
  }

  // Group deliveries by proximity
  const batches: BatchGroup[] = [];
  const used = new Set<string>();

  for (const delivery of sorted) {
    if (used.has(delivery._id)) {continue;}

    const batch: BatchGroup = {
      id: `batch-${Date.now()}-${batches.length}`,
      deliveries: [delivery],
      estimatedDistance: delivery.estimatedDistance,
      estimatedDuration: delivery.estimatedDuration,
    };
    used.add(delivery._id);

    // Find nearby deliveries
    for (const other of sorted) {
      if (used.has(other._id)) {continue;}
      if (batch.deliveries.length >= batchSettings.value.maxDeliveriesPerBatch) {break;}

      const distance = calculateDistance(
        delivery.deliveryAddress.coordinates.lat,
        delivery.deliveryAddress.coordinates.lng,
        other.deliveryAddress.coordinates.lat,
        other.deliveryAddress.coordinates.lng
      );

      if (distance <= batchSettings.value.maxDistanceKm) {
        batch.deliveries.push(other);
        batch.estimatedDistance += other.estimatedDistance;
        batch.estimatedDuration += other.estimatedDuration * 0.7; // Efficiency gain
        used.add(other._id);
      }
    }

    // Find suggested driver
    if (availableDrivers.value.length > 0) {
      batch.suggestedDriver = availableDrivers.value[0];
    }

    batches.push(batch);
  }

  batchGroups.value = batches;
  showBatchModal.value = true;
};

// Assign batch to driver
const assignBatch = async (batch: BatchGroup, driver: AvailableDriver) => {
  try {
    for (const delivery of batch.deliveries) {
      await api.post(`/deliveries/${delivery._id}/assign`, { driverId: driver._id });
    }
    message.success(`${batch.deliveries.length} livraisons assignées à ${driver.firstName}`);

    // Remove assigned deliveries from pending
    const assignedIds = batch.deliveries.map((d) => d._id);
    pendingDeliveries.value = pendingDeliveries.value.filter(
      (d) => !assignedIds.includes(d._id)
    );
    selectedDeliveries.value = selectedDeliveries.value.filter(
      (id) => !assignedIds.includes(id)
    );

    // Remove batch
    batchGroups.value = batchGroups.value.filter((b) => b.id !== batch.id);

    if (batchGroups.value.length === 0) {
      showBatchModal.value = false;
    }
  } catch (error) {
    console.error('Failed to assign batch:', error);
    message.error('Erreur lors de l\'assignation');
  }
};

// Auto-assign all pending deliveries
const autoAssignAll = async () => {
  if (pendingDeliveries.value.length === 0) {
    message.info('Aucune livraison en attente');
    return;
  }

  autoAssignLoading.value = true;
  let assigned = 0;
  let failed = 0;

  try {
    for (const delivery of pendingDeliveries.value) {
      try {
        await api.post(`/deliveries/${delivery._id}/assign`, { auto: true });
        assigned++;
      } catch {
        failed++;
      }
    }

    if (assigned > 0) {
      message.success(`${assigned} livraisons assignées automatiquement`);
    }
    if (failed > 0) {
      message.warning(`${failed} livraisons n'ont pas pu être assignées`);
    }

    await loadData();
    showAutoAssignModal.value = false;
  } catch (error) {
    console.error('Auto-assign failed:', error);
    message.error('Erreur lors de l\'assignation automatique');
  } finally {
    autoAssignLoading.value = false;
  }
};

// Format date - kept for future use
const _formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

// Time ago
const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {return 'À l\'instant';}
  if (diffMins < 60) {return `Il y a ${diffMins} min`;}
  const diffHours = Math.floor(diffMins / 60);
  return `Il y a ${diffHours}h`;
};

onMounted(() => {
  loadData();
  // Refresh every 30 seconds
  refreshInterval.value = setInterval(loadData, 30000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<template>
  <div class="batching-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>
          <ThunderboltOutlined />
          Gestion des Livraisons
        </h1>
        <p>Regroupez et assignez les livraisons en attente</p>
      </div>
      <div class="header-actions">
        <a-button @click="loadData" :loading="loading">
          <ReloadOutlined /> Actualiser
        </a-button>
        <a-button type="primary" danger @click="showAutoAssignModal = true">
          <RocketOutlined /> Auto-assigner tout
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
      <div class="stat-card selected">
        <div class="stat-icon">
          <CheckOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.selected }}</div>
          <div class="stat-label">Sélectionnées</div>
        </div>
      </div>
      <div class="stat-card drivers">
        <div class="stat-icon">
          <TeamOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.drivers }}</div>
          <div class="stat-label">Livreurs disponibles</div>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div v-if="pendingDeliveries.length > 0" class="actions-bar">
      <a-checkbox
        :checked="selectedDeliveries.length === pendingDeliveries.length"
        :indeterminate="selectedDeliveries.length > 0 && selectedDeliveries.length < pendingDeliveries.length"
        @change="selectAll"
      >
        Tout sélectionner ({{ pendingDeliveries.length }})
      </a-checkbox>

      <div class="actions-right">
        <a-button
          type="primary"
          :disabled="selectedDeliveries.length === 0"
          @click="generateBatches"
        >
          <ThunderboltOutlined /> Créer des lots ({{ selectedDeliveries.length }})
        </a-button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <a-spin size="large" />
      <p>Chargement des livraisons...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="pendingDeliveries.length === 0" class="empty-state">
      <CarOutlined style="font-size: 64px; color: #52c41a" />
      <h3>Aucune livraison en attente</h3>
      <p>Toutes les livraisons ont été assignées</p>
    </div>

    <!-- Deliveries List -->
    <div v-else class="deliveries-grid">
      <div
        v-for="delivery in pendingDeliveries"
        :key="delivery._id"
        :class="['delivery-card', { selected: selectedDeliveries.includes(delivery._id), priority: delivery.isPriority }]"
        @click="toggleDeliverySelection(delivery._id)"
      >
        <div class="card-header">
          <div class="delivery-number">
            <span class="number">#{{ delivery.deliveryNumber?.slice(-6) || delivery._id.slice(-6) }}</span>
            <a-tag v-if="delivery.isPriority" color="red">Prioritaire</a-tag>
          </div>
          <div class="delivery-time">
            <ClockCircleOutlined />
            {{ timeAgo(delivery.createdAt) }}
          </div>
        </div>

        <div class="card-body">
          <div class="address-info">
            <div class="address pickup">
              <EnvironmentOutlined class="icon pickup" />
              <span>{{ delivery.pickupAddress.street }}</span>
            </div>
            <div class="address-arrow">↓</div>
            <div class="address delivery">
              <EnvironmentOutlined class="icon delivery" />
              <span>{{ delivery.deliveryAddress.street }}, {{ delivery.deliveryAddress.city }}</span>
            </div>
          </div>

          <div class="delivery-meta">
            <span class="meta-item">
              <CarOutlined /> {{ delivery.estimatedDistance.toFixed(1) }} km
            </span>
            <span class="meta-item">
              <ClockCircleOutlined /> ~{{ delivery.estimatedDuration }} min
            </span>
          </div>
        </div>

        <div class="card-footer">
          <div class="order-info">
            {{ delivery.orderId?.items?.length || 0 }} articles •
            {{ (delivery.orderId?.total || 0).toFixed(2) }}€
          </div>
          <div class="selection-indicator">
            <CheckOutlined v-if="selectedDeliveries.includes(delivery._id)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Creation Modal -->
    <a-modal
      v-model:open="showBatchModal"
      title="Lots de livraison"
      :footer="null"
      width="700px"
      :bodyStyle="{ maxHeight: '60vh', overflowY: 'auto' }"
    >
      <div class="batch-settings">
        <h4><SettingOutlined /> Paramètres</h4>
        <div class="settings-row">
          <span>Max livraisons par lot:</span>
          <a-input-number
            v-model:value="batchSettings.maxDeliveriesPerBatch"
            :min="2"
            :max="5"
          />
        </div>
        <div class="settings-row">
          <span>Distance max entre livraisons:</span>
          <a-input-number
            v-model:value="batchSettings.maxDistanceKm"
            :min="1"
            :max="10"
            addon-after="km"
          />
        </div>
        <a-button size="small" @click="generateBatches">
          <ReloadOutlined /> Recalculer
        </a-button>
      </div>

      <a-divider />

      <div v-if="batchGroups.length === 0" class="empty-batches">
        <p>Aucun lot généré. Ajustez les paramètres.</p>
      </div>

      <div v-else class="batch-list">
        <div v-for="batch in batchGroups" :key="batch.id" class="batch-item">
          <div class="batch-header">
            <h4>Lot de {{ batch.deliveries.length }} livraisons</h4>
            <div class="batch-stats">
              <span><CarOutlined /> {{ batch.estimatedDistance.toFixed(1) }} km</span>
              <span><ClockCircleOutlined /> ~{{ Math.round(batch.estimatedDuration) }} min</span>
            </div>
          </div>

          <div class="batch-deliveries">
            <div
              v-for="delivery in batch.deliveries"
              :key="delivery._id"
              class="batch-delivery"
            >
              <span class="delivery-num">#{{ delivery.deliveryNumber?.slice(-6) || delivery._id.slice(-6) }}</span>
              <span class="delivery-addr">{{ delivery.deliveryAddress.street }}</span>
            </div>
          </div>

          <div class="batch-assign">
            <a-select
              v-if="availableDrivers.length > 0"
              placeholder="Assigner à un livreur"
              style="width: 200px"
              @change="(driverId: string) => {
                const driver = availableDrivers.find(d => d._id === driverId);
                if (driver) assignBatch(batch, driver);
              }"
            >
              <a-select-option
                v-for="driver in availableDrivers"
                :key="driver._id"
                :value="driver._id"
              >
                <UserOutlined /> {{ driver.firstName }} {{ driver.lastName }}
                <a-tag size="small">{{ driver.vehicleType }}</a-tag>
              </a-select-option>
            </a-select>
            <span v-else class="no-drivers">Aucun livreur disponible</span>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- Auto-Assign Confirmation Modal -->
    <a-modal
      v-model:open="showAutoAssignModal"
      title="Assignation automatique"
      :confirm-loading="autoAssignLoading"
      @ok="autoAssignAll"
    >
      <p>
        <RocketOutlined style="color: #1890ff; font-size: 24px" />
      </p>
      <p>
        Cette action va assigner automatiquement <strong>{{ pendingDeliveries.length }}</strong>
        livraisons aux livreurs disponibles en utilisant l'algorithme d'optimisation.
      </p>
      <p class="warning-text">
        Les livraisons prioritaires seront traitées en premier.
      </p>
    </a-modal>
  </div>
</template>

<style scoped>
.batching-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.header-content p {
  color: #8c8c8c;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-card.pending .stat-icon {
  background: #fff7e6;
  color: #fa8c16;
}

.stat-card.selected .stat-icon {
  background: #e6f7ff;
  color: #1890ff;
}

.stat-card.drivers .stat-icon {
  background: #f6ffed;
  color: #52c41a;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  color: #8c8c8c;
  font-size: 14px;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: #fff;
  border-radius: 16px;
  text-align: center;
}

.empty-state h3 {
  margin: 20px 0 8px;
  font-size: 20px;
}

.empty-state p {
  color: #8c8c8c;
}

.deliveries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.delivery-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.delivery-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.delivery-card.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.delivery-card.priority {
  border-left: 4px solid #ff4d4f;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.delivery-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delivery-number .number {
  font-weight: 600;
  font-family: monospace;
}

.delivery-time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.address-info {
  margin-bottom: 12px;
}

.address {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
}

.address .icon.pickup {
  color: #52c41a;
}

.address .icon.delivery {
  color: #1890ff;
}

.address-arrow {
  color: #bfbfbf;
  padding-left: 8px;
  font-size: 12px;
}

.delivery-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #8c8c8c;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.order-info {
  font-size: 12px;
  color: #8c8c8c;
}

.selection-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1890ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.delivery-card:not(.selected) .selection-indicator {
  background: #f0f0f0;
  color: transparent;
}

/* Batch Modal Styles */
.batch-settings {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.batch-settings h4 {
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-item {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.batch-header h4 {
  margin: 0;
}

.batch-stats {
  display: flex;
  gap: 16px;
  color: #8c8c8c;
  font-size: 13px;
}

.batch-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.batch-deliveries {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.batch-delivery {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
}

.delivery-num {
  font-family: monospace;
  font-weight: 600;
  color: #1890ff;
}

.delivery-addr {
  color: #595959;
}

.batch-assign {
  display: flex;
  justify-content: flex-end;
}

.no-drivers {
  color: #ff4d4f;
  font-size: 13px;
}

.empty-batches {
  text-align: center;
  padding: 40px;
  color: #8c8c8c;
}

.warning-text {
  color: #faad14;
  font-size: 13px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions button {
    flex: 1;
  }
}
</style>
