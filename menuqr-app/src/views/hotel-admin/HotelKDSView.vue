<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  FireOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  UserOutlined,
  ReloadOutlined,
  SoundOutlined,
  ExpandOutlined,
  CompressOutlined,
  BellOutlined,
} from '@ant-design/icons-vue';
import api, { type HotelOrderAdmin } from '@/services/api';

// ============ STATE ============
const isLoading = ref(true);
const hotelId = ref<string | null>(null);
const orders = ref<HotelOrderAdmin[]>([]);
const isFullscreen = ref(false);
const soundEnabled = ref(true);
const lastOrderCount = ref(0);

let pollInterval: ReturnType<typeof setInterval> | null = null;

// ============ COMPUTED ============
const pendingOrders = computed(() =>
  orders.value.filter(o => o.status === 'pending' || o.status === 'confirmed')
);

const preparingOrders = computed(() =>
  orders.value.filter(o => o.status === 'preparing')
);

const readyOrders = computed(() =>
  orders.value.filter(o => o.status === 'ready')
);

// ============ HELPERS ============
function _formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getWaitTime(dateStr: string): number {
  const now = new Date();
  const orderTime = new Date(dateStr);
  return Math.floor((now.getTime() - orderTime.getTime()) / 1000 / 60);
}

function getWaitClass(minutes: number): string {
  if (minutes < 10) {return 'wait-ok';}
  if (minutes < 20) {return 'wait-warning';}
  return 'wait-critical';
}

function playNotificationSound() {
  if (!soundEnabled.value) {return;}
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // Ignore audio errors
  }
}

// ============ DATA LOADING ============
async function loadOrders() {
  try {
    if (!hotelId.value) {
      const hotelRes = await api.getMyHotel();
      if (!hotelRes.success || !hotelRes.data) {return;}
      hotelId.value = hotelRes.data.id;
    }

    const res = await api.getHotelActiveOrders(hotelId.value!);
    if (res.success && res.data) {
      // Check for new orders
      if (res.data.length > lastOrderCount.value && lastOrderCount.value > 0) {
        playNotificationSound();
      }
      lastOrderCount.value = res.data.length;
      orders.value = res.data;
    }
  } catch (e) {
    console.error('Error loading orders:', e);
  } finally {
    isLoading.value = false;
  }
}

// ============ ORDER ACTIONS ============
async function startPreparing(order: HotelOrderAdmin) {
  if (!hotelId.value) {return;}

  try {
    const res = await api.updateHotelOrderStatus(hotelId.value, order.id, 'preparing');
    if (res.success) {
      order.status = 'preparing';
      order.preparingAt = new Date().toISOString();
      message.success('Preparation commencee');
    }
  } catch {
    message.error('Erreur');
  }
}

async function markReady(order: HotelOrderAdmin) {
  if (!hotelId.value) {return;}

  try {
    const res = await api.updateHotelOrderStatus(hotelId.value, order.id, 'ready');
    if (res.success) {
      order.status = 'ready';
      order.readyAt = new Date().toISOString();
      message.success('Commande prete');
    }
  } catch {
    message.error('Erreur');
  }
}

async function markDelivering(order: HotelOrderAdmin) {
  if (!hotelId.value) {return;}

  try {
    const res = await api.updateHotelOrderStatus(hotelId.value, order.id, 'delivering');
    if (res.success) {
      loadOrders(); // Refresh to remove from list
      message.success('En cours de livraison');
    }
  } catch {
    message.error('Erreur');
  }
}

// ============ FULLSCREEN ============
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
}

// ============ LIFECYCLE ============
onMounted(() => {
  loadOrders();
  pollInterval = setInterval(loadOrders, 10000); // Refresh every 10 seconds

  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});

onUnmounted(() => {
  if (pollInterval) {clearInterval(pollInterval);}
});
</script>

<template>
  <div :class="['hotel-kds-view', { fullscreen: isFullscreen }]">
    <!-- Header -->
    <div class="kds-header">
      <div class="header-left">
        <h1>
          <FireOutlined />
          Cuisine - KDS
        </h1>
        <span class="update-time">
          Derniere mise a jour: {{ new Date().toLocaleTimeString('fr-FR') }}
        </span>
      </div>
      <div class="header-actions">
        <a-button
          :type="soundEnabled ? 'primary' : 'default'"
          @click="soundEnabled = !soundEnabled"
        >
          <template #icon><SoundOutlined /></template>
          {{ soundEnabled ? 'Son active' : 'Son desactive' }}
        </a-button>
        <a-button @click="loadOrders">
          <template #icon><ReloadOutlined /></template>
        </a-button>
        <a-button @click="toggleFullscreen">
          <template #icon>
            <CompressOutlined v-if="isFullscreen" />
            <ExpandOutlined v-else />
          </template>
        </a-button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat pending">
        <ClockCircleOutlined />
        <span class="count">{{ pendingOrders.length }}</span>
        <span class="label">En attente</span>
      </div>
      <div class="stat preparing">
        <FireOutlined />
        <span class="count">{{ preparingOrders.length }}</span>
        <span class="label">En preparation</span>
      </div>
      <div class="stat ready">
        <CheckCircleOutlined />
        <span class="count">{{ readyOrders.length }}</span>
        <span class="label">Pretes</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- KDS Columns -->
    <div v-else class="kds-columns">
      <!-- Pending Column -->
      <div class="kds-column pending">
        <div class="column-header">
          <ClockCircleOutlined />
          <span>En attente</span>
          <span class="count">{{ pendingOrders.length }}</span>
        </div>
        <div class="column-content">
          <div v-if="pendingOrders.length === 0" class="empty-column">
            <p>Aucune commande en attente</p>
          </div>
          <div
            v-for="order in pendingOrders"
            :key="order.id"
            :class="['order-ticket', getWaitClass(getWaitTime(order.createdAt))]"
          >
            <div class="ticket-header">
              <span class="order-number">#{{ order.orderNumber }}</span>
              <span class="wait-time">
                <ClockCircleOutlined />
                {{ getWaitTime(order.createdAt) }} min
              </span>
            </div>
            <div class="ticket-room">
              <HomeOutlined />
              Chambre {{ order.roomNumber }}
              <span v-if="order.floor" class="floor">• Etage {{ order.floor }}</span>
            </div>
            <div class="ticket-guest">
              <UserOutlined />
              {{ order.guestName }}
            </div>
            <div class="ticket-items">
              <div v-for="(item, idx) in order.items" :key="idx" class="item">
                <span class="qty">{{ item.quantity }}x</span>
                <span class="name">{{ item.name.fr }}</span>
                <span v-if="item.specialInstructions" class="special">
                  {{ item.specialInstructions }}
                </span>
              </div>
            </div>
            <div v-if="order.specialInstructions" class="ticket-notes">
              <BellOutlined />
              {{ order.specialInstructions }}
            </div>
            <div class="ticket-actions">
              <a-button type="primary" block @click="startPreparing(order)">
                Commencer la preparation
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Preparing Column -->
      <div class="kds-column preparing">
        <div class="column-header">
          <FireOutlined />
          <span>En preparation</span>
          <span class="count">{{ preparingOrders.length }}</span>
        </div>
        <div class="column-content">
          <div v-if="preparingOrders.length === 0" class="empty-column">
            <p>Aucune commande en preparation</p>
          </div>
          <div
            v-for="order in preparingOrders"
            :key="order.id"
            :class="['order-ticket', getWaitClass(getWaitTime(order.preparingAt || order.createdAt))]"
          >
            <div class="ticket-header">
              <span class="order-number">#{{ order.orderNumber }}</span>
              <span class="wait-time">
                <ClockCircleOutlined />
                {{ getWaitTime(order.preparingAt || order.createdAt) }} min
              </span>
            </div>
            <div class="ticket-room">
              <HomeOutlined />
              Chambre {{ order.roomNumber }}
              <span v-if="order.floor" class="floor">• Etage {{ order.floor }}</span>
            </div>
            <div class="ticket-guest">
              <UserOutlined />
              {{ order.guestName }}
            </div>
            <div class="ticket-items">
              <div v-for="(item, idx) in order.items" :key="idx" class="item">
                <span class="qty">{{ item.quantity }}x</span>
                <span class="name">{{ item.name.fr }}</span>
                <span v-if="item.specialInstructions" class="special">
                  {{ item.specialInstructions }}
                </span>
              </div>
            </div>
            <div v-if="order.specialInstructions" class="ticket-notes">
              <BellOutlined />
              {{ order.specialInstructions }}
            </div>
            <div class="ticket-actions">
              <a-button type="primary" block class="ready-btn" @click="markReady(order)">
                <CheckCircleOutlined />
                Marquer pret
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Ready Column -->
      <div class="kds-column ready">
        <div class="column-header">
          <CheckCircleOutlined />
          <span>Pretes a livrer</span>
          <span class="count">{{ readyOrders.length }}</span>
        </div>
        <div class="column-content">
          <div v-if="readyOrders.length === 0" class="empty-column">
            <p>Aucune commande prete</p>
          </div>
          <div
            v-for="order in readyOrders"
            :key="order.id"
            class="order-ticket ready-ticket"
          >
            <div class="ticket-header">
              <span class="order-number">#{{ order.orderNumber }}</span>
              <span class="ready-at">
                Pret depuis {{ getWaitTime(order.readyAt || order.createdAt) }} min
              </span>
            </div>
            <div class="ticket-room">
              <HomeOutlined />
              Chambre {{ order.roomNumber }}
              <span v-if="order.floor" class="floor">• Etage {{ order.floor }}</span>
            </div>
            <div class="ticket-items-summary">
              {{ order.items.reduce((sum, item) => sum + item.quantity, 0) }} articles
            </div>
            <div class="ticket-actions">
              <a-button type="primary" block class="deliver-btn" @click="markDelivering(order)">
                Envoyer en livraison
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotel-kds-view {
  min-height: 100vh;
  background: #0f172a;
  padding: 16px;
}

.hotel-kds-view.fullscreen {
  padding: 24px;
}

.kds-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left .anticon {
  color: #f59e0b;
}

.update-time {
  margin-left: 16px;
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.stat .anticon {
  font-size: 24px;
}

.stat.pending .anticon { color: #f59e0b; }
.stat.preparing .anticon { color: #8b5cf6; }
.stat.ready .anticon { color: #10b981; }

.stat .count {
  font-size: 28px;
  font-weight: 700;
  color: white;
}

.stat .label {
  font-size: 13px;
  color: #94a3b8;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.kds-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  height: calc(100vh - 180px);
}

.kds-column {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.kds-column.pending .column-header { background: rgba(245, 158, 11, 0.2); }
.kds-column.preparing .column-header { background: rgba(139, 92, 246, 0.2); }
.kds-column.ready .column-header { background: rgba(16, 185, 129, 0.2); }

.column-header .anticon {
  font-size: 20px;
}

.kds-column.pending .column-header .anticon { color: #f59e0b; }
.kds-column.preparing .column-header .anticon { color: #8b5cf6; }
.kds-column.ready .column-header .anticon { color: #10b981; }

.column-header .count {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 14px;
}

.column-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-column {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 14px;
}

.order-ticket {
  background: white;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid #64748b;
}

.order-ticket.wait-ok { border-left-color: #10b981; }
.order-ticket.wait-warning { border-left-color: #f59e0b; }
.order-ticket.wait-critical { border-left-color: #ef4444; }
.order-ticket.ready-ticket { border-left-color: #10b981; }

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-number {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.wait-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
}

.wait-ok .wait-time { background: #d1fae5; color: #059669; }
.wait-warning .wait-time { background: #fef3c7; color: #d97706; }
.wait-critical .wait-time { background: #fee2e2; color: #dc2626; }

.ready-at {
  font-size: 12px;
  color: #10b981;
}

.ticket-room {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.ticket-room .anticon {
  color: #6366f1;
}

.floor {
  color: #64748b;
  font-weight: 400;
}

.ticket-guest {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}

.ticket-items {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.item:last-child {
  margin-bottom: 0;
}

.qty {
  font-weight: 700;
  color: #6366f1;
  min-width: 28px;
}

.name {
  flex: 1;
  color: #1e293b;
  font-weight: 500;
}

.special {
  display: block;
  width: 100%;
  font-size: 12px;
  color: #ef4444;
  font-style: italic;
  margin-top: 2px;
  padding-left: 28px;
}

.ticket-notes {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  margin-bottom: 12px;
}

.ticket-notes .anticon {
  color: #d97706;
  flex-shrink: 0;
  margin-top: 2px;
}

.ticket-actions :deep(.ant-btn) {
  height: 44px;
  font-weight: 600;
  font-size: 14px;
}

.ready-btn {
  background: #10b981 !important;
  border-color: #10b981 !important;
}

.deliver-btn {
  background: #6366f1 !important;
  border-color: #6366f1 !important;
}

.ticket-items-summary {
  text-align: center;
  padding: 12px;
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
}

/* Scrollbar for dark theme */
.column-content::-webkit-scrollbar {
  width: 6px;
}

.column-content::-webkit-scrollbar-track {
  background: transparent;
}

.column-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
</style>
