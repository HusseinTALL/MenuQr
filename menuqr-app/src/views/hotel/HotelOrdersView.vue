<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button as AButton, Spin as ASpin } from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  SyncOutlined,
  RightOutlined,
  StarFilled,
} from '@ant-design/icons-vue';
import { useHotelGuestStore, type HotelOrder } from '@/stores/hotelGuestStore';
import { useConfigStore } from '@/stores/configStore';

const route = useRoute();
const router = useRouter();
const hotelGuestStore = useHotelGuestStore();
const configStore = useConfigStore();

// State
const orders = ref<HotelOrder[]>([]);
const isLoading = ref(true);

// Computed
const hotel = computed(() => hotelGuestStore.hotel);

const activeOrders = computed(() => {
  return orders.value.filter(o =>
    ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(o.status)
  );
});

const pastOrders = computed(() => {
  return orders.value.filter(o =>
    ['delivered', 'cancelled', 'rejected'].includes(o.status)
  );
});

// Helpers
function localize(obj: { fr: string; en?: string } | undefined): string {
  if (!obj) {return '';}
  const locale = configStore.locale || 'fr';
  return locale === 'en' && obj.en ? obj.en : obj.fr;
}

function formatPrice(price: number): string {
  const currency = hotel.value?.settings?.currency || 'EUR';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(price);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function t(key: string): string {
  const translations: Record<string, string> = {
    'hotel.myOrders': 'Mes commandes',
    'hotel.noOrders': 'Aucune commande',
    'hotel.noOrdersMessage': 'Vous n\'avez pas encore passé de commande',
    'hotel.orderNow': 'Commander maintenant',
    'hotel.activeOrders': 'Commandes en cours',
    'hotel.pastOrders': 'Historique',
    'hotel.statusPending': 'En attente',
    'hotel.statusConfirmed': 'Confirmée',
    'hotel.statusPreparing': 'En préparation',
    'hotel.statusReady': 'Prête',
    'hotel.statusDelivering': 'En livraison',
    'hotel.statusDelivered': 'Livrée',
    'hotel.statusCancelled': 'Annulée',
    'hotel.statusRejected': 'Refusée',
  };
  return translations[key] || key;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    preparing: 'status-preparing',
    ready: 'status-ready',
    delivering: 'status-delivering',
    delivered: 'status-delivered',
    cancelled: 'status-cancelled',
    rejected: 'status-rejected',
  };
  return classes[status] || 'status-pending';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: t('hotel.statusPending'),
    confirmed: t('hotel.statusConfirmed'),
    preparing: t('hotel.statusPreparing'),
    ready: t('hotel.statusReady'),
    delivering: t('hotel.statusDelivering'),
    delivered: t('hotel.statusDelivered'),
    cancelled: t('hotel.statusCancelled'),
    rejected: t('hotel.statusRejected'),
  };
  return labels[status] || status;
}

function getItemsSummary(order: HotelOrder): string {
  const _count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const names = order.items.slice(0, 2).map(item => localize(item.name)).join(', ');
  if (order.items.length > 2) {
    return `${names}...`;
  }
  return names;
}

// Actions
function goBack() {
  if (hotel.value) {
    router.push({
      name: 'hotel-landing',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

function goToMenu() {
  if (hotel.value) {
    router.push({
      name: 'hotel-menu',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

function viewOrder(order: HotelOrder) {
  if (hotel.value) {
    router.push({
      name: 'hotel-order-tracking',
      params: {
        hotelSlug: hotel.value.slug,
        orderId: order.id,
      },
    });
  }
}

async function loadOrders() {
  isLoading.value = true;
  try {
    orders.value = await hotelGuestStore.getOrderHistory();
  } catch {
    orders.value = [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  const hotelSlug = route.params.hotelSlug as string;

  // Load hotel data if not already loaded
  if (!hotel.value && hotelSlug) {
    await hotelGuestStore.getHotelBySlug(hotelSlug);
  }

  // Load orders
  await loadOrders();
});
</script>

<template>
  <div class="hotel-orders">
    <!-- Header -->
    <div class="orders-header">
      <a-button type="text" @click="goBack">
        <template #icon><ArrowLeftOutlined /></template>
      </a-button>
      <h1>{{ t('hotel.myOrders') }}</h1>
      <div style="width: 32px" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="empty-state">
      <HistoryOutlined />
      <h2>{{ t('hotel.noOrders') }}</h2>
      <p>{{ t('hotel.noOrdersMessage') }}</p>
      <a-button type="primary" @click="goToMenu">
        {{ t('hotel.orderNow') }}
      </a-button>
    </div>

    <!-- Orders List -->
    <div v-else class="orders-content">
      <!-- Active Orders Section -->
      <div v-if="activeOrders.length > 0" class="orders-section">
        <h2 class="section-title">
          <SyncOutlined spin />
          {{ t('hotel.activeOrders') }}
        </h2>
        <div class="orders-list">
          <div
            v-for="order in activeOrders"
            :key="order.id"
            class="order-card active"
            @click="viewOrder(order)"
          >
            <div class="order-status">
              <span :class="['status-badge', getStatusClass(order.status)]">
                {{ getStatusLabel(order.status) }}
              </span>
              <span class="order-time">{{ formatTime(order.createdAt) }}</span>
            </div>
            <div class="order-info">
              <span class="order-number">#{{ order.orderNumber }}</span>
              <span class="order-items">{{ getItemsSummary(order) }}</span>
            </div>
            <div class="order-footer">
              <span class="order-total">{{ formatPrice(order.total) }}</span>
              <RightOutlined />
            </div>
          </div>
        </div>
      </div>

      <!-- Past Orders Section -->
      <div v-if="pastOrders.length > 0" class="orders-section">
        <h2 class="section-title">
          <HistoryOutlined />
          {{ t('hotel.pastOrders') }}
        </h2>
        <div class="orders-list">
          <div
            v-for="order in pastOrders"
            :key="order.id"
            class="order-card"
            @click="viewOrder(order)"
          >
            <div class="order-status">
              <span :class="['status-badge', getStatusClass(order.status)]">
                {{ getStatusLabel(order.status) }}
              </span>
              <span class="order-time">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="order-info">
              <span class="order-number">#{{ order.orderNumber }}</span>
              <span class="order-items">{{ getItemsSummary(order) }}</span>
            </div>
            <div class="order-footer">
              <span class="order-total">{{ formatPrice(order.total) }}</span>
              <div class="order-rating" v-if="order.rating">
                <StarFilled />
                <span>{{ order.rating }}</span>
              </div>
              <RightOutlined />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotel-orders {
  min-height: 100vh;
  background: #f5f7fa;
}

.orders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.orders-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 64px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state .anticon {
  font-size: 64px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.empty-state h2 {
  margin: 0 0 8px;
  color: #1a1a1a;
}

.empty-state p {
  margin: 0 0 24px;
  color: #888;
}

.empty-state .ant-btn {
  border-radius: 24px;
  height: 44px;
  padding: 0 32px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
}

.orders-content {
  padding: 16px;
}

.orders-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.order-card.active {
  border-left: 4px solid #14b8a6;
}

.order-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.status-pending { background: #fff7e6; color: #fa8c16; }
.status-badge.status-confirmed { background: #e6f7ff; color: #1890ff; }
.status-badge.status-preparing { background: #f0f5ff; color: #2f54eb; }
.status-badge.status-ready { background: #e6fffb; color: #13c2c2; }
.status-badge.status-delivering { background: #e6fffb; color: #14b8a6; }
.status-badge.status-delivered { background: #f6ffed; color: #52c41a; }
.status-badge.status-cancelled { background: #fff2f0; color: #ff4d4f; }
.status-badge.status-rejected { background: #fff2f0; color: #ff4d4f; }

.order-time {
  font-size: 13px;
  color: #888;
}

.order-info {
  margin-bottom: 12px;
}

.order-number {
  display: block;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.order-items {
  font-size: 13px;
  color: #666;
}

.order-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-total {
  font-size: 16px;
  font-weight: 700;
  color: #14b8a6;
}

.order-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #faad14;
  font-size: 14px;
}

.order-footer .anticon-right {
  color: #d9d9d9;
}
</style>
