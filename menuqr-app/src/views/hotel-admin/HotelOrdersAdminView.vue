<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FireOutlined,
  CarOutlined,
  UserOutlined,
  HomeOutlined,
  PhoneOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue';
import api, { type HotelOrderAdmin } from '@/services/api';

// ============ STATE ============
const isLoading = ref(true);
const hotelId = ref<string | null>(null);
const orders = ref<HotelOrderAdmin[]>([]);
const selectedOrder = ref<HotelOrderAdmin | null>(null);
const detailDrawerVisible = ref(false);

const filters = reactive({
  search: '',
  status: null as string | null,
  dateRange: null as [string, string] | null,
});

let pollInterval: ReturnType<typeof setInterval> | null = null;

// ============ CONSTANTS ============
const orderStatuses = [
  { value: 'pending', label: 'En attente', color: 'orange', icon: ClockCircleOutlined },
  { value: 'confirmed', label: 'Confirmee', color: 'blue', icon: CheckCircleOutlined },
  { value: 'preparing', label: 'En preparation', color: 'purple', icon: FireOutlined },
  { value: 'ready', label: 'Prete', color: 'cyan', icon: CheckCircleOutlined },
  { value: 'delivering', label: 'En livraison', color: 'geekblue', icon: CarOutlined },
  { value: 'delivered', label: 'Livree', color: 'green', icon: CheckCircleOutlined },
  { value: 'cancelled', label: 'Annulee', color: 'red', icon: CloseCircleOutlined },
];

const statusTransitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivering', 'delivered'],
  delivering: ['delivered'],
  delivered: [],
  cancelled: [],
};

// ============ COMPUTED ============
const filteredOrders = computed(() => {
  let result = [...orders.value];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(o =>
      o.orderNumber.toLowerCase().includes(search) ||
      o.roomNumber.toLowerCase().includes(search) ||
      o.guestName.toLowerCase().includes(search)
    );
  }

  if (filters.status) {
    result = result.filter(o => o.status === filters.status);
  }

  return result;
});

const pendingOrders = computed(() => orders.value.filter(o => o.status === 'pending'));
const activeOrders = computed(() => orders.value.filter(o =>
  ['confirmed', 'preparing', 'ready', 'delivering'].includes(o.status)
));
const completedToday = computed(() => orders.value.filter(o =>
  o.status === 'delivered' &&
  new Date(o.createdAt).toDateString() === new Date().toDateString()
));

// ============ HELPERS ============
function getStatusInfo(status: string) {
  return orderStatuses.find(s => s.value === status) || { label: status, color: 'default', icon: ClockCircleOutlined };
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function _formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

  if (diff < 1) {return 'A l\'instant';}
  if (diff < 60) {return `Il y a ${diff} min`;}
  if (diff < 1440) {return `Il y a ${Math.floor(diff / 60)}h`;}
  return formatDate(dateStr);
}

function getOrderDuration(order: HotelOrderAdmin): string {
  const start = new Date(order.createdAt);
  const end = order.deliveredAt ? new Date(order.deliveredAt) : new Date();
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
  return `${diff} min`;
}

// ============ DATA LOADING ============
async function loadOrders() {
  try {
    const hotelRes = await api.getMyHotel();
    if (!hotelRes.success || !hotelRes.data) {
      message.error('Impossible de charger l\'hotel');
      return;
    }
    hotelId.value = hotelRes.data.id;

    const res = await api.getHotelOrders(hotelId.value!, {
      status: filters.status || undefined,
    });

    if (res.success && res.data) {
      orders.value = res.data.orders;
    }
  } catch (e) {
    console.error('Error loading orders:', e);
    message.error('Erreur lors du chargement des commandes');
  } finally {
    isLoading.value = false;
  }
}

// ============ ORDER ACTIONS ============
async function updateOrderStatus(order: HotelOrderAdmin, newStatus: string) {
  if (!hotelId.value) {return;}

  try {
    const res = await api.updateHotelOrderStatus(hotelId.value, order.id, newStatus);
    if (res.success) {
      message.success('Statut mis a jour');
      order.status = newStatus as HotelOrderAdmin['status'];

      // Update timestamps
      if (newStatus === 'confirmed') {order.confirmedAt = new Date().toISOString();}
      if (newStatus === 'preparing') {order.preparingAt = new Date().toISOString();}
      if (newStatus === 'ready') {order.readyAt = new Date().toISOString();}
      if (newStatus === 'delivered') {order.deliveredAt = new Date().toISOString();}
    }
  } catch (e) {
    console.error('Status update error:', e);
    message.error('Erreur lors de la mise a jour');
  }
}

function confirmCancel(order: HotelOrderAdmin) {
  Modal.confirm({
    title: 'Annuler la commande',
    icon: h(ExclamationCircleOutlined),
    content: `Etes-vous sur de vouloir annuler la commande #${order.orderNumber} ?`,
    okText: 'Annuler la commande',
    okType: 'danger',
    cancelText: 'Retour',
    onOk: async () => {
      if (!hotelId.value) {return;}
      try {
        const res = await api.cancelHotelOrderAdmin(hotelId.value!, order.id, 'Annulee par le personnel');
        if (res.success) {
          message.success('Commande annulee');
          loadOrders();
        }
      } catch {
        message.error('Erreur lors de l\'annulation');
      }
    },
  });
}

function openOrderDetail(order: HotelOrderAdmin) {
  selectedOrder.value = order;
  detailDrawerVisible.value = true;
}

function clearFilters() {
  filters.search = '';
  filters.status = null;
  filters.dateRange = null;
}

// ============ LIFECYCLE ============
onMounted(() => {
  loadOrders();
  pollInterval = setInterval(loadOrders, 30000);
});

onUnmounted(() => {
  if (pollInterval) {clearInterval(pollInterval);}
});
</script>

<template>
  <div class="hotel-orders-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>
          <ShoppingCartOutlined class="header-icon" />
          Gestion des commandes
        </h1>
        <p class="header-subtitle">Gerez les commandes room service</p>
      </div>
      <div class="header-actions">
        <a-button @click="loadOrders" :loading="isLoading">
          <template #icon><ReloadOutlined /></template>
          Actualiser
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card pending">
        <ClockCircleOutlined />
        <div class="stat-content">
          <span class="stat-value">{{ pendingOrders.length }}</span>
          <span class="stat-label">En attente</span>
        </div>
      </div>
      <div class="stat-card active">
        <FireOutlined />
        <div class="stat-content">
          <span class="stat-value">{{ activeOrders.length }}</span>
          <span class="stat-label">En cours</span>
        </div>
      </div>
      <div class="stat-card completed">
        <CheckCircleOutlined />
        <div class="stat-content">
          <span class="stat-value">{{ completedToday.length }}</span>
          <span class="stat-label">Livrees aujourd'hui</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <a-input-search
        v-model:value="filters.search"
        placeholder="Rechercher..."
        style="width: 250px"
        allow-clear
      >
        <template #prefix><SearchOutlined /></template>
      </a-input-search>

      <a-select
        v-model:value="filters.status"
        placeholder="Statut"
        style="width: 180px"
        allow-clear
      >
        <a-select-option v-for="s in orderStatuses" :key="s.value" :value="s.value">
          <a-tag :color="s.color" size="small">{{ s.label }}</a-tag>
        </a-select-option>
      </a-select>

      <a-button @click="clearFilters">
        <template #icon><ClearOutlined /></template>
        Effacer
      </a-button>
    </div>

    <!-- Orders Grid -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <div v-else-if="filteredOrders.length === 0" class="empty-state">
      <ShoppingCartOutlined />
      <p>Aucune commande</p>
    </div>

    <div v-else class="orders-grid">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        :class="['order-card', `status-${order.status}`]"
        @click="openOrderDetail(order)"
      >
        <!-- Card Header -->
        <div class="order-header">
          <div class="order-number">
            <span class="number">#{{ order.orderNumber }}</span>
            <a-tag :color="getStatusInfo(order.status).color">
              {{ getStatusInfo(order.status).label }}
            </a-tag>
          </div>
          <span class="order-time">{{ getTimeAgo(order.createdAt) }}</span>
        </div>

        <!-- Room & Guest Info -->
        <div class="order-info">
          <div class="info-row">
            <HomeOutlined />
            <span class="room-number">Chambre {{ order.roomNumber }}</span>
            <span v-if="order.floor" class="floor">Etage {{ order.floor }}</span>
          </div>
          <div class="info-row">
            <UserOutlined />
            <span class="guest-name">{{ order.guestName }}</span>
          </div>
        </div>

        <!-- Items Preview -->
        <div class="order-items">
          <div v-for="(item, idx) in order.items.slice(0, 3)" :key="idx" class="item">
            <span class="item-qty">{{ item.quantity }}x</span>
            <span class="item-name">{{ item.name.fr }}</span>
          </div>
          <div v-if="order.items.length > 3" class="more-items">
            +{{ order.items.length - 3 }} autres
          </div>
        </div>

        <!-- Card Footer -->
        <div class="order-footer">
          <span class="order-total">{{ formatPrice(order.total) }}</span>
          <div class="order-actions" @click.stop>
            <template v-if="statusTransitions[order.status]?.length">
              <a-button
                v-for="nextStatus in statusTransitions[order.status]"
                :key="nextStatus"
                size="small"
                :type="nextStatus === 'cancelled' ? 'default' : 'primary'"
                :danger="nextStatus === 'cancelled'"
                @click="nextStatus === 'cancelled' ? confirmCancel(order) : updateOrderStatus(order, nextStatus)"
              >
                {{ getStatusInfo(nextStatus).label }}
              </a-button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Detail Drawer -->
    <a-drawer
      v-model:open="detailDrawerVisible"
      :title="`Commande #${selectedOrder?.orderNumber}`"
      width="480px"
      placement="right"
    >
      <template v-if="selectedOrder">
        <!-- Status Timeline -->
        <div class="detail-section">
          <h4>Statut</h4>
          <a-tag :color="getStatusInfo(selectedOrder.status).color" size="large">
            {{ getStatusInfo(selectedOrder.status).label }}
          </a-tag>
          <p class="duration">Duree: {{ getOrderDuration(selectedOrder) }}</p>
        </div>

        <a-divider />

        <!-- Room & Guest -->
        <div class="detail-section">
          <h4>Client</h4>
          <div class="detail-row">
            <HomeOutlined />
            <span>Chambre {{ selectedOrder.roomNumber }}</span>
            <span v-if="selectedOrder.floor" class="muted">(Etage {{ selectedOrder.floor }})</span>
          </div>
          <div class="detail-row">
            <UserOutlined />
            <span>{{ selectedOrder.guestName }}</span>
          </div>
          <div v-if="selectedOrder.guestPhone" class="detail-row">
            <PhoneOutlined />
            <span>{{ selectedOrder.guestPhone }}</span>
          </div>
        </div>

        <a-divider />

        <!-- Items -->
        <div class="detail-section">
          <h4>Articles</h4>
          <div class="items-list">
            <div v-for="(item, idx) in selectedOrder.items" :key="idx" class="item-row">
              <div class="item-info">
                <span class="item-qty">{{ item.quantity }}x</span>
                <span class="item-name">{{ item.name.fr }}</span>
              </div>
              <span class="item-price">{{ formatPrice(item.subtotal) }}</span>
            </div>
          </div>
        </div>

        <a-divider />

        <!-- Totals -->
        <div class="detail-section">
          <div class="total-row">
            <span>Sous-total</span>
            <span>{{ formatPrice(selectedOrder.subtotal) }}</span>
          </div>
          <div v-if="selectedOrder.serviceCharge" class="total-row">
            <span>Service</span>
            <span>{{ formatPrice(selectedOrder.serviceCharge) }}</span>
          </div>
          <div v-if="selectedOrder.deliveryFee" class="total-row">
            <span>Livraison</span>
            <span>{{ formatPrice(selectedOrder.deliveryFee) }}</span>
          </div>
          <div v-if="selectedOrder.tax" class="total-row">
            <span>TVA</span>
            <span>{{ formatPrice(selectedOrder.tax) }}</span>
          </div>
          <div class="total-row final">
            <span>Total</span>
            <span>{{ formatPrice(selectedOrder.total) }}</span>
          </div>
        </div>

        <!-- Special Instructions -->
        <template v-if="selectedOrder.specialInstructions || selectedOrder.deliveryInstructions">
          <a-divider />
          <div class="detail-section">
            <h4>Instructions</h4>
            <p v-if="selectedOrder.specialInstructions" class="instructions">
              {{ selectedOrder.specialInstructions }}
            </p>
            <p v-if="selectedOrder.deliveryInstructions" class="instructions">
              <strong>Livraison:</strong> {{ selectedOrder.deliveryInstructions }}
            </p>
          </div>
        </template>

        <!-- Actions -->
        <div class="drawer-actions">
          <template v-if="statusTransitions[selectedOrder.status]?.length">
            <a-button
              v-for="nextStatus in statusTransitions[selectedOrder.status]"
              :key="nextStatus"
              :type="nextStatus === 'cancelled' ? 'default' : 'primary'"
              :danger="nextStatus === 'cancelled'"
              block
              size="large"
              @click="nextStatus === 'cancelled' ? confirmCancel(selectedOrder) : updateOrderStatus(selectedOrder, nextStatus)"
            >
              {{ nextStatus === 'cancelled' ? 'Annuler' : getStatusInfo(nextStatus).label }}
            </a-button>
          </template>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.hotel-orders-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #6366f1;
}

.header-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-card .anticon {
  font-size: 28px;
}

.stat-card.pending .anticon { color: #f59e0b; }
.stat-card.active .anticon { color: #6366f1; }
.stat-card.completed .anticon { color: #10b981; }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.filters-bar {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #94a3b8;
}

.empty-state .anticon {
  font-size: 48px;
  margin-bottom: 12px;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border-left: 4px solid transparent;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.order-card.status-pending { border-left-color: #f59e0b; }
.order-card.status-confirmed { border-left-color: #3b82f6; }
.order-card.status-preparing { border-left-color: #8b5cf6; }
.order-card.status-ready { border-left-color: #06b6d4; }
.order-card.status-delivering { border-left-color: #6366f1; }
.order-card.status-delivered { border-left-color: #10b981; }
.order-card.status-cancelled { border-left-color: #ef4444; }

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.order-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-number .number {
  font-weight: 700;
  font-size: 16px;
  color: #1e293b;
}

.order-time {
  font-size: 12px;
  color: #94a3b8;
}

.order-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  margin-bottom: 4px;
}

.info-row .anticon {
  color: #94a3b8;
}

.room-number {
  font-weight: 600;
}

.floor {
  color: #94a3b8;
  font-size: 12px;
}

.order-items {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.item {
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 4px;
}

.item:last-child {
  margin-bottom: 0;
}

.item-qty {
  font-weight: 600;
  color: #6366f1;
  min-width: 24px;
}

.item-name {
  color: #475569;
}

.more-items {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-total {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.order-actions {
  display: flex;
  gap: 8px;
}

/* Drawer Styles */
.detail-section {
  margin-bottom: 16px;
}

.detail-section h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.duration {
  margin: 8px 0 0;
  font-size: 13px;
  color: #64748b;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-row .anticon {
  color: #94a3b8;
}

.muted {
  color: #94a3b8;
}

.items-list {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  gap: 8px;
}

.item-price {
  font-weight: 500;
  color: #1e293b;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.total-row.final {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  border-top: 2px solid #e2e8f0;
  padding-top: 12px;
  margin-top: 8px;
}

.instructions {
  font-size: 14px;
  color: #475569;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  margin: 0;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}
</style>
