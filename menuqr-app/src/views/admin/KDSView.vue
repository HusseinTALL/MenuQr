<script setup lang="ts">
/**
 * Kitchen Display System (KDS) View - Mission Control Edition
 * Real-time order display for kitchen staff with enhanced UX
 */
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue';
import { message } from 'ant-design-vue';
import {
  SoundOutlined,
  SoundFilled,
  SettingOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  CompressOutlined,
  ExpandOutlined,
  ShopOutlined,
  CarOutlined,
  CoffeeOutlined,
  QuestionCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue';
import api, { type Order, type Restaurant } from '@/services/api';
import { useSocket } from '@/composables/useSocket';

// Types
interface ExtendedOrder extends Order {
  isPriority?: boolean;
  completedItems?: Set<string>;
  estimatedPrepTime?: number;
}

// Socket connection
const { isConnected, connect } = useSocket();

// Restaurant data
const restaurant = ref<Restaurant | null>(null);
const restaurantId = ref<string>('');

// Order state
const kdsOrders = ref<ExtendedOrder[]>([]);
const recentlyCompleted = ref<ExtendedOrder[]>([]);
const completedItemsMap = reactive<Record<string, Set<string>>>({});
const priorityOrders = reactive<Set<string>>(new Set());

// Audio state
const audioEnabled = ref(true);
const audioContext = ref<AudioContext | null>(null);
const audioInitialized = ref(false);

// UI state
const isLoading = ref(true);
const error = ref<string | null>(null);
const isFullscreen = ref(false);
const lastRefresh = ref<Date>(new Date());
const isUpdatingStatus = ref<string | null>(null);
const showSettingsModal = ref(false);
const showShortcutsModal = ref(false);
const showRecallPanel = ref(false);
const isCompactView = ref(false);
const currentTime = ref(new Date());
const activeFilter = ref<'all' | 'dine_in' | 'pickup' | 'delivery'>('all');

// Stats tracking
const todayStats = reactive({
  completed: 0,
  avgPrepTime: 0,
  totalPrepTime: 0,
});

// Settings
const settings = ref({
  autoRefresh: true,
  refreshInterval: 10,
  soundVolume: 0.8,
  showCompletedOrders: false,
  urgentThreshold: 15,
  warningThreshold: 10,
  displayColumns: 4,
});

// Status configuration with enhanced visuals
const statusConfig: Record<string, {
  label: string;
  shortLabel: string;
  color: string;
  glow: string;
  icon: string;
}> = {
  pending: {
    label: 'En attente',
    shortLabel: 'ATTENTE',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
    icon: 'clock'
  },
  confirmed: {
    label: 'Confirmée',
    shortLabel: 'CONFIRMÉ',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
    icon: 'check'
  },
  preparing: {
    label: 'En cuisine',
    shortLabel: 'CUISINE',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    icon: 'fire'
  },
  ready: {
    label: 'Prête',
    shortLabel: 'PRÊT',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.4)',
    icon: 'ready'
  },
};

const statusOrder = ['pending', 'confirmed', 'preparing', 'ready'];

// Order type icons and colors
const orderTypeConfig: Record<string, { icon: typeof ShopOutlined; label: string; color: string }> = {
  'dine_in': { icon: CoffeeOutlined, label: 'Sur place', color: '#06b6d4' },
  'pickup': { icon: ShopOutlined, label: 'À emporter', color: '#f97316' },
  'delivery': { icon: CarOutlined, label: 'Livraison', color: '#8b5cf6' },
};

// Initialize audio
const initAudio = () => {
  if (!audioContext.value) {
    audioContext.value = new AudioContext();
    audioInitialized.value = true;
  }
  return audioContext.value;
};

// Enhanced sound system
const playSound = async (type: 'new-order' | 'order-ready' | 'urgent' | 'bump' = 'new-order') => {
  if (!audioEnabled.value || !audioInitialized.value) {return;}

  try {
    const ctx = initAudio();
    const now = ctx.currentTime;

    if (type === 'new-order') {
      // Ascending chime
      [880, 1108.73, 1318.51].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(settings.value.soundVolume * 0.3, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
    } else if (type === 'urgent') {
      // Alert sound
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1200;
        osc.type = 'square';
        gain.gain.setValueAtTime(settings.value.soundVolume * 0.2, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.1);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.1);
      }
    } else if (type === 'bump') {
      // Satisfying bump sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      osc.type = 'sine';
      gain.gain.setValueAtTime(settings.value.soundVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Ready chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 523.25;
      osc.type = 'sine';
      gain.gain.setValueAtTime(settings.value.soundVolume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {
    console.warn('[KDS] Audio failed:', err);
  }
};

// Fetch restaurant
const fetchRestaurant = async () => {
  try {
    const response = await api.getMyRestaurant();
    if (response.success && response.data) {
      restaurant.value = response.data;
      restaurantId.value = response.data._id;
    }
  } catch {
    console.error('Error fetching restaurant:', err);
  }
};

// Fetch orders
const fetchOrders = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    const response = await api.getActiveOrders();
    if (response.success && response.data) {
      const previousIds = new Set(kdsOrders.value.map(o => o._id));
      const newOrders = response.data as ExtendedOrder[];

      // Check for new orders
      const brandNewOrders = newOrders.filter(
        (o) => !previousIds.has(o._id) && o.status === 'pending'
      );

      if (brandNewOrders.length > 0 && previousIds.size > 0) {
        playSound('new-order');
        message.success({
          content: `${brandNewOrders.length} nouvelle${brandNewOrders.length > 1 ? 's' : ''} commande${brandNewOrders.length > 1 ? 's' : ''}!`,
          duration: 3,
        });
      }

      // Preserve priority and completed items state
      newOrders.forEach(order => {
        order.isPriority = priorityOrders.has(order._id);
        order.completedItems = completedItemsMap[order._id] || new Set();
        order.estimatedPrepTime = calculateEstimatedPrepTime(order);
      });

      kdsOrders.value = newOrders;
      lastRefresh.value = new Date();
    }
  } catch {
    error.value = 'Erreur de chargement';
    console.error('Error fetching orders:', err);
  } finally {
    isLoading.value = false;
  }
};

// Calculate estimated prep time based on items
const calculateEstimatedPrepTime = (order: Order): number => {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // Base 5 min + 2 min per item
  return Math.min(5 + itemCount * 2, 30);
};

// Update order status with animation
const updateOrderStatus = async (order: ExtendedOrder, newStatus: string) => {
  isUpdatingStatus.value = order._id;

  try {
    const response = await api.updateOrderStatus(order._id, newStatus);
    if (response.success && response.data) {
      const index = kdsOrders.value.findIndex(o => o._id === order._id);

      if (newStatus === 'ready') {
        playSound('order-ready');
      } else if (newStatus === 'completed') {
        playSound('bump');
        // Move to recently completed
        const orderToComplete = kdsOrders.value[index];
        if (index !== -1 && orderToComplete) {
          const completed = {
            ...orderToComplete,
            status: 'completed' as const,
            isPriority: orderToComplete.isPriority,
            completedItems: orderToComplete.completedItems,
            estimatedPrepTime: orderToComplete.estimatedPrepTime,
          } as ExtendedOrder;
          recentlyCompleted.value.unshift(completed);
          if (recentlyCompleted.value.length > 10) {
            recentlyCompleted.value.pop();
          }
          // Update stats
          const prepTime = getMinutesSince(order.createdAt);
          todayStats.completed++;
          todayStats.totalPrepTime += prepTime;
          todayStats.avgPrepTime = Math.round(todayStats.totalPrepTime / todayStats.completed);
        }
      }

      if (index !== -1) {
        kdsOrders.value[index] = {
          ...response.data,
          isPriority: order.isPriority,
          completedItems: order.completedItems,
          estimatedPrepTime: order.estimatedPrepTime,
        };
      }

      message.success(`#${order.orderNumber.slice(-4)} → ${statusConfig[newStatus]?.label || 'Terminée'}`);
    }
  } catch {
    message.error('Erreur de mise à jour');
    console.error(err);
  } finally {
    isUpdatingStatus.value = null;
  }
};

// Bump order (complete and remove)
const bumpOrder = async (order: ExtendedOrder) => {
  await updateOrderStatus(order, 'completed');
};

// Toggle item completion
const toggleItemComplete = (orderId: string, itemId: string) => {
  if (!completedItemsMap[orderId]) {
    completedItemsMap[orderId] = new Set();
  }

  if (completedItemsMap[orderId].has(itemId)) {
    completedItemsMap[orderId].delete(itemId);
  } else {
    completedItemsMap[orderId].add(itemId);
  }

  // Update order reference
  const order = kdsOrders.value.find(o => o._id === orderId);
  if (order) {
    order.completedItems = completedItemsMap[orderId];
  }
};

// Toggle priority
const togglePriority = (orderId: string) => {
  if (priorityOrders.has(orderId)) {
    priorityOrders.delete(orderId);
  } else {
    priorityOrders.add(orderId);
    playSound('urgent');
  }

  const order = kdsOrders.value.find(o => o._id === orderId);
  if (order) {
    order.isPriority = priorityOrders.has(orderId);
  }
};

// Recall order
const recallOrder = async (order: ExtendedOrder) => {
  try {
    const response = await api.updateOrderStatus(order._id, 'preparing');
    if (response.success) {
      const index = recentlyCompleted.value.findIndex(o => o._id === order._id);
      if (index !== -1) {
        recentlyCompleted.value.splice(index, 1);
      }
      await fetchOrders();
      message.info(`#${order.orderNumber.slice(-4)} rappelée en cuisine`);
    }
  } catch {
    message.error('Erreur lors du rappel');
  }
};

// Time calculations
const getMinutesSince = (dateString: string): number => {
  return Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
};

const getTimeSince = (dateString: string): string => {
  const mins = getMinutesSince(dateString);
  if (mins < 1) {return '< 1m';}
  if (mins < 60) {return `${mins}m`;}
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
};

const getUrgencyLevel = (order: Order): 'normal' | 'warning' | 'urgent' => {
  if (!['pending', 'confirmed', 'preparing'].includes(order.status)) {return 'normal';}
  const mins = getMinutesSince(order.createdAt);
  if (mins >= settings.value.urgentThreshold) {return 'urgent';}
  if (mins >= settings.value.warningThreshold) {return 'warning';}
  return 'normal';
};

const getUrgencyColor = (order: Order): string => {
  const level = getUrgencyLevel(order);
  if (level === 'urgent') {return '#ef4444';}
  if (level === 'warning') {return '#f59e0b';}
  return '#22c55e';
};

// Get next status
const getNextStatus = (currentStatus: string): string | undefined => {
  const idx = statusOrder.indexOf(currentStatus);
  return idx >= 0 && idx < statusOrder.length - 1 ? statusOrder[idx + 1] : undefined;
};

const getNextStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'CONFIRMER',
    confirmed: 'CUISINE',
    preparing: 'PRÊT',
  };
  return labels[status] || '';
};

// Calculate progress
const getOrderProgress = (order: ExtendedOrder): number => {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const completedCount = order.completedItems?.size || 0;
  return Math.round((completedCount / totalItems) * 100);
};

// Filtering
const filteredOrders = computed(() => {
  let filtered = kdsOrders.value.filter(o =>
    settings.value.showCompletedOrders
      ? ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
      : ['pending', 'confirmed', 'preparing'].includes(o.status)
  );

  // Filter by type
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(o => o.fulfillmentType === activeFilter.value);
  }

  // Sort: priority first, then by urgency, then by time
  return filtered.sort((a, b) => {
    if (a.isPriority !== b.isPriority) {return a.isPriority ? -1 : 1;}

    const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusDiff !== 0) {return statusDiff;}

    const urgencyOrder = { urgent: 0, warning: 1, normal: 2 };
    const urgencyDiff = urgencyOrder[getUrgencyLevel(a)] - urgencyOrder[getUrgencyLevel(b)];
    if (urgencyDiff !== 0) {return urgencyDiff;}

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
});

// Group by status
const ordersByStatus = computed(() => {
  const groups: Record<string, ExtendedOrder[]> = {
    pending: [],
    confirmed: [],
    preparing: [],
    ready: [],
  };

  filteredOrders.value.forEach(order => {
    const group = groups[order.status];
    if (group) {
      group.push(order);
    }
  });

  return groups;
});

// Stats
const stats = computed(() => ({
  total: filteredOrders.value.length,
  pending: ordersByStatus.value.pending?.length ?? 0,
  inProgress: (ordersByStatus.value.confirmed?.length ?? 0) + (ordersByStatus.value.preparing?.length ?? 0),
  ready: ordersByStatus.value.ready?.length ?? 0,
  urgent: filteredOrders.value.filter(o => getUrgencyLevel(o) === 'urgent').length,
  priority: filteredOrders.value.filter(o => o.isPriority).length,
}));

// Type counts
const typeCounts = computed(() => ({
  'dine_in': kdsOrders.value.filter(o => o.fulfillmentType === 'dine_in').length,
  'pickup': kdsOrders.value.filter(o => o.fulfillmentType === 'pickup').length,
  'delivery': kdsOrders.value.filter(o => o.fulfillmentType === 'delivery').length,
}));

// Fullscreen
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      isFullscreen.value = true;
    } else {
      await document.exitFullscreen();
      isFullscreen.value = false;
    }
  } catch {
    console.error('Fullscreen error:', err);
  }
};

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.target instanceof HTMLInputElement) {return;}

  switch (event.key.toLowerCase()) {
    case 'f11':
      event.preventDefault();
      toggleFullscreen();
      break;
    case 'r':
      if (!event.ctrlKey && !event.metaKey) {fetchOrders();}
      break;
    case 's':
      if (!event.ctrlKey && !event.metaKey) {audioEnabled.value = !audioEnabled.value;}
      break;
    case 'c':
      if (!event.ctrlKey && !event.metaKey) {isCompactView.value = !isCompactView.value;}
      break;
    case 'h':
      if (!event.ctrlKey && !event.metaKey) {showRecallPanel.value = !showRecallPanel.value;}
      break;
    case '?':
      showShortcutsModal.value = true;
      break;
    case 'escape':
      showSettingsModal.value = false;
      showShortcutsModal.value = false;
      showRecallPanel.value = false;
      break;
  }
};

// Timers
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let timeInterval: ReturnType<typeof setInterval> | null = null;
let urgentCheckInterval: ReturnType<typeof setInterval> | null = null;

const startAutoRefresh = () => {
  if (refreshInterval) {clearInterval(refreshInterval);}
  if (settings.value.autoRefresh) {
    refreshInterval = setInterval(fetchOrders, settings.value.refreshInterval * 1000);
  }
};

watch(() => settings.value.autoRefresh, startAutoRefresh);
watch(() => settings.value.refreshInterval, startAutoRefresh);

// Check urgent orders
const checkUrgentOrders = () => {
  const urgent = filteredOrders.value.filter(o => getUrgencyLevel(o) === 'urgent');
  if (urgent.length > 0 && audioEnabled.value) {
    playSound('urgent');
  }
};

onMounted(async () => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  document.addEventListener('keydown', handleKeydown);

  await fetchRestaurant();
  await fetchOrders();
  connect();

  startAutoRefresh();
  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  urgentCheckInterval = setInterval(checkUrgentOrders, 120000);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (refreshInterval) {clearInterval(refreshInterval);}
  if (timeInterval) {clearInterval(timeInterval);}
  if (urgentCheckInterval) {clearInterval(urgentCheckInterval);}
  if (audioContext.value) {audioContext.value.close();}
});
</script>

<template>
  <div class="kds" :class="{ 'kds--fullscreen': isFullscreen, 'kds--compact': isCompactView }">
    <!-- Ambient background -->
    <div class="kds__bg">
      <div class="kds__bg-grid"></div>
      <div class="kds__bg-glow kds__bg-glow--1"></div>
      <div class="kds__bg-glow kds__bg-glow--2"></div>
    </div>

    <!-- Header -->
    <header class="kds__header">
      <div class="kds__header-left">
        <div class="kds__logo">
          <div class="kds__logo-icon">
            <FireOutlined />
          </div>
          <div class="kds__logo-text">
            <span class="kds__logo-title">CUISINE</span>
            <span class="kds__logo-subtitle">Kitchen Display</span>
          </div>
        </div>

        <!-- Connection indicator -->
        <div :class="['kds__connection', { 'kds__connection--live': isConnected }]">
          <span class="kds__connection-dot"></span>
          <span class="kds__connection-text">{{ isConnected ? 'LIVE' : 'OFFLINE' }}</span>
        </div>

        <!-- Clock -->
        <div class="kds__clock">
          {{ currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}
        </div>
      </div>

      <!-- Stats -->
      <div class="kds__stats">
        <div class="kds__stat kds__stat--pending">
          <span class="kds__stat-value">{{ stats.pending }}</span>
          <span class="kds__stat-label">ATTENTE</span>
        </div>
        <div class="kds__stat kds__stat--progress">
          <span class="kds__stat-value">{{ stats.inProgress }}</span>
          <span class="kds__stat-label">EN COURS</span>
        </div>
        <div class="kds__stat kds__stat--ready">
          <span class="kds__stat-value">{{ stats.ready }}</span>
          <span class="kds__stat-label">PRÊT</span>
        </div>
        <div v-if="stats.urgent > 0" class="kds__stat kds__stat--urgent">
          <span class="kds__stat-value">{{ stats.urgent }}</span>
          <span class="kds__stat-label">URGENT</span>
        </div>
        <div class="kds__stat kds__stat--avg">
          <span class="kds__stat-value">{{ todayStats.avgPrepTime || '--' }}<small>m</small></span>
          <span class="kds__stat-label">MOY.</span>
        </div>
        <div class="kds__stat kds__stat--completed">
          <span class="kds__stat-value">{{ todayStats.completed }}</span>
          <span class="kds__stat-label">TERMINÉ</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="kds__controls">
        <!-- Type filter -->
        <div class="kds__filter">
          <button
            v-for="(config, type) in { all: { label: 'Tout', color: '#64748b' }, ...orderTypeConfig }"
            :key="type"
            :class="['kds__filter-btn', { 'kds__filter-btn--active': activeFilter === type }]"
            :style="activeFilter === type ? { '--filter-color': config.color } : {}"
            @click="activeFilter = type as typeof activeFilter"
          >
            <component v-if="type !== 'all'" :is="(config as any).icon" />
            <span>{{ (config as any).label }}</span>
            <span v-if="type !== 'all'" class="kds__filter-count">{{ typeCounts[type as keyof typeof typeCounts] }}</span>
          </button>
        </div>

        <div class="kds__control-group">
          <button
            v-if="!audioInitialized"
            class="kds__btn kds__btn--primary"
            @click="initAudio"
          >
            <SoundOutlined /> Activer le son
          </button>

          <button
            :class="['kds__btn', { 'kds__btn--active': audioEnabled }]"
            @click="audioEnabled = !audioEnabled"
            title="Son (S)"
          >
            <SoundFilled v-if="audioEnabled" />
            <SoundOutlined v-else />
          </button>

          <button
            class="kds__btn"
            :class="{ 'kds__btn--loading': isLoading }"
            @click="fetchOrders"
            title="Actualiser (R)"
          >
            <ReloadOutlined :class="{ 'spin': isLoading }" />
          </button>

          <button
            :class="['kds__btn', { 'kds__btn--active': isCompactView }]"
            @click="isCompactView = !isCompactView"
            title="Vue compacte (C)"
          >
            <CompressOutlined v-if="!isCompactView" />
            <ExpandOutlined v-else />
          </button>

          <button
            :class="['kds__btn', { 'kds__btn--active': showRecallPanel }]"
            @click="showRecallPanel = !showRecallPanel"
            title="Historique (H)"
          >
            <HistoryOutlined />
            <span v-if="recentlyCompleted.length" class="kds__btn-badge">{{ recentlyCompleted.length }}</span>
          </button>

          <button
            class="kds__btn"
            @click="toggleFullscreen"
            title="Plein écran (F11)"
          >
            <FullscreenExitOutlined v-if="isFullscreen" />
            <FullscreenOutlined v-else />
          </button>

          <button
            class="kds__btn"
            @click="showShortcutsModal = true"
            title="Raccourcis (?)"
          >
            <QuestionCircleOutlined />
          </button>

          <button
            class="kds__btn"
            @click="showSettingsModal = true"
            title="Paramètres"
          >
            <SettingOutlined />
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="kds__main">
      <!-- Loading -->
      <div v-if="isLoading && kdsOrders.length === 0" class="kds__empty">
        <div class="kds__empty-icon kds__empty-icon--loading">
          <ReloadOutlined class="spin" />
        </div>
        <p>Chargement des commandes...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="kds__empty">
        <div class="kds__empty-icon kds__empty-icon--error">!</div>
        <p>{{ error }}</p>
        <button class="kds__btn kds__btn--primary" @click="fetchOrders">Réessayer</button>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredOrders.length === 0" class="kds__empty">
        <div class="kds__empty-icon">
          <span>👨‍🍳</span>
        </div>
        <h2>Aucune commande active</h2>
        <p>Les nouvelles commandes apparaîtront ici</p>
      </div>

      <!-- Orders grid -->
      <div v-else class="kds__grid" :style="{ '--columns': settings.displayColumns }">
        <div
          v-for="status in ['pending', 'confirmed', 'preparing', 'ready']"
          :key="status"
          class="kds__column"
        >
          <div
            class="kds__column-header"
            :style="{ '--status-color': statusConfig[status]?.color ?? '#6366f1' }"
          >
            <span class="kds__column-title">{{ statusConfig[status]?.shortLabel ?? status }}</span>
            <span class="kds__column-count">{{ (ordersByStatus[status] ?? []).length }}</span>
          </div>

          <div class="kds__column-content">
            <TransitionGroup name="order">
              <article
                v-for="order in (ordersByStatus[status] ?? [])"
                :key="order._id"
                :class="[
                  'kds__order',
                  `kds__order--${getUrgencyLevel(order)}`,
                  { 'kds__order--priority': order.isPriority },
                  { 'kds__order--updating': isUpdatingStatus === order._id }
                ]"
                :style="{ '--urgency-color': getUrgencyColor(order) }"
              >
                <!-- Priority indicator -->
                <div v-if="order.isPriority" class="kds__order-priority">
                  <ThunderboltOutlined /> PRIORITÉ
                </div>

                <!-- Header -->
                <div class="kds__order-header">
                  <div class="kds__order-number">
                    #{{ order.orderNumber.slice(-4) }}
                  </div>
                  <div class="kds__order-meta">
                    <div
                      class="kds__order-time"
                      :style="{ color: getUrgencyColor(order) }"
                    >
                      <ClockCircleOutlined />
                      {{ getTimeSince(order.createdAt) }}
                    </div>
                    <button
                      class="kds__order-priority-btn"
                      :class="{ 'kds__order-priority-btn--active': order.isPriority }"
                      @click.stop="togglePriority(order._id)"
                      title="Marquer prioritaire"
                    >
                      <ThunderboltOutlined />
                    </button>
                  </div>
                </div>

                <!-- Type & Table -->
                <div class="kds__order-info">
                  <div
                    v-if="order.fulfillmentType"
                    class="kds__order-type"
                    :style="{ '--type-color': orderTypeConfig[order.fulfillmentType]?.color || '#64748b' }"
                  >
                    <component :is="orderTypeConfig[order.fulfillmentType]?.icon || ShopOutlined" />
                    {{ orderTypeConfig[order.fulfillmentType]?.label || order.fulfillmentType }}
                  </div>
                  <div v-if="order.tableNumber" class="kds__order-table">
                    TABLE {{ order.tableNumber }}
                  </div>
                </div>

                <!-- Progress bar -->
                <div v-if="order.status === 'preparing'" class="kds__order-progress">
                  <div
                    class="kds__order-progress-bar"
                    :style="{ width: `${getOrderProgress(order)}%` }"
                  ></div>
                  <span class="kds__order-progress-text">{{ getOrderProgress(order) }}%</span>
                </div>

                <!-- Items -->
                <div class="kds__order-items">
                  <div
                    v-for="(item, idx) in order.items"
                    :key="item.dishId + '-' + idx"
                    :class="[
                      'kds__item',
                      { 'kds__item--done': order.completedItems?.has(item.dishId + '-' + idx) }
                    ]"
                    @click="order.status === 'preparing' && toggleItemComplete(order._id, item.dishId + '-' + idx)"
                  >
                    <div class="kds__item-check" v-if="order.status === 'preparing'">
                      <CheckOutlined v-if="order.completedItems?.has(item.dishId + '-' + idx)" />
                    </div>
                    <div class="kds__item-qty">{{ item.quantity }}</div>
                    <div class="kds__item-info">
                      <span class="kds__item-name">{{ item.name }}</span>
                      <span v-if="item.specialInstructions" class="kds__item-note">
                        {{ item.specialInstructions }}
                      </span>
                      <div v-if="item.options?.length" class="kds__item-options">
                        <span v-for="opt in item.options" :key="opt.name">+ {{ opt.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Notes -->
                <div v-if="order.specialInstructions" class="kds__order-notes">
                  {{ order.specialInstructions }}
                </div>

                <!-- Actions -->
                <div class="kds__order-actions">
                  <button
                    v-if="getNextStatus(order.status)"
                    class="kds__order-btn kds__order-btn--next"
                    :disabled="isUpdatingStatus === order._id"
                    @click="updateOrderStatus(order, getNextStatus(order.status)!)"
                  >
                    <CheckOutlined />
                    {{ getNextStatusLabel(order.status) }}
                  </button>
                  <button
                    v-if="order.status === 'ready'"
                    class="kds__order-btn kds__order-btn--bump"
                    :disabled="isUpdatingStatus === order._id"
                    @click="bumpOrder(order)"
                  >
                    <CheckOutlined />
                    TERMINÉ
                  </button>
                </div>
              </article>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </main>

    <!-- Recall panel -->
    <Transition name="slide">
      <aside v-if="showRecallPanel" class="kds__recall">
        <div class="kds__recall-header">
          <h3><HistoryOutlined /> Récemment terminées</h3>
          <button class="kds__btn" @click="showRecallPanel = false">
            <CloseOutlined />
          </button>
        </div>
        <div class="kds__recall-list">
          <div v-if="recentlyCompleted.length === 0" class="kds__recall-empty">
            Aucune commande récente
          </div>
          <div
            v-for="order in recentlyCompleted"
            :key="order._id"
            class="kds__recall-item"
          >
            <div class="kds__recall-info">
              <span class="kds__recall-number">#{{ order.orderNumber.slice(-4) }}</span>
              <span class="kds__recall-items">{{ order.items.length }} article(s)</span>
            </div>
            <button class="kds__btn kds__btn--small" @click="recallOrder(order)">
              Rappeler
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Settings Modal -->
    <a-modal
      v-model:open="showSettingsModal"
      title="Paramètres KDS"
      :footer="null"
      width="480px"
      class="kds-modal"
    >
      <a-form layout="vertical">
        <a-form-item label="Actualisation automatique">
          <a-switch v-model:checked="settings.autoRefresh" />
        </a-form-item>

        <a-form-item v-if="settings.autoRefresh" label="Intervalle (secondes)">
          <a-slider
            v-model:value="settings.refreshInterval"
            :min="5"
            :max="60"
            :step="5"
            :marks="{ 5: '5s', 15: '15s', 30: '30s', 60: '60s' }"
          />
        </a-form-item>

        <a-form-item label="Nombre de colonnes">
          <a-slider
            v-model:value="settings.displayColumns"
            :min="2"
            :max="5"
            :marks="{ 2: '2', 3: '3', 4: '4', 5: '5' }"
          />
        </a-form-item>

        <a-form-item label="Volume sonore">
          <a-slider
            v-model:value="settings.soundVolume"
            :min="0"
            :max="1"
            :step="0.1"
          />
        </a-form-item>

        <a-form-item label="Seuil avertissement (min)">
          <a-input-number v-model:value="settings.warningThreshold" :min="5" :max="30" />
        </a-form-item>

        <a-form-item label="Seuil urgent (min)">
          <a-input-number v-model:value="settings.urgentThreshold" :min="10" :max="60" />
        </a-form-item>

        <a-form-item label="Afficher commandes prêtes">
          <a-switch v-model:checked="settings.showCompletedOrders" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Shortcuts Modal -->
    <a-modal
      v-model:open="showShortcutsModal"
      title="Raccourcis clavier"
      :footer="null"
      width="400px"
      class="kds-modal"
    >
      <div class="kds__shortcuts">
        <div class="kds__shortcut">
          <kbd>F11</kbd>
          <span>Plein écran</span>
        </div>
        <div class="kds__shortcut">
          <kbd>R</kbd>
          <span>Actualiser</span>
        </div>
        <div class="kds__shortcut">
          <kbd>S</kbd>
          <span>Activer/désactiver le son</span>
        </div>
        <div class="kds__shortcut">
          <kbd>C</kbd>
          <span>Vue compacte</span>
        </div>
        <div class="kds__shortcut">
          <kbd>H</kbd>
          <span>Historique/Rappel</span>
        </div>
        <div class="kds__shortcut">
          <kbd>?</kbd>
          <span>Afficher les raccourcis</span>
        </div>
        <div class="kds__shortcut">
          <kbd>Esc</kbd>
          <span>Fermer les panneaux</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
/* ================================================
   KDS - MISSION CONTROL THEME
   A dark, professional kitchen display system
   ================================================ */

@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@400;500;600;700;800&display=swap');

/* CSS Variables */
.kds {
  --kds-bg-primary: #0a0e1a;
  --kds-bg-secondary: #111827;
  --kds-bg-card: #1a1f2e;
  --kds-bg-hover: #252b3d;
  --kds-text-primary: #f8fafc;
  --kds-text-secondary: #94a3b8;
  --kds-text-muted: #64748b;
  --kds-border: rgba(148, 163, 184, 0.1);
  --kds-accent: #3b82f6;
  --kds-success: #22c55e;
  --kds-warning: #f59e0b;
  --kds-danger: #ef4444;
  --kds-font-display: 'JetBrains Mono', monospace;
  --kds-font-body: 'Outfit', sans-serif;
  --kds-radius: 12px;
  --kds-radius-sm: 8px;
  --kds-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

/* Base */
.kds {
  position: relative;
  min-height: 100vh;
  background: var(--kds-bg-primary);
  font-family: var(--kds-font-body);
  color: var(--kds-text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kds--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* Background effects */
.kds__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.kds__bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.kds__bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
}

.kds__bg-glow--1 {
  top: -200px;
  left: -200px;
  background: var(--kds-accent);
}

.kds__bg-glow--2 {
  bottom: -200px;
  right: -200px;
  background: #a855f7;
}

/* Header */
.kds__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--kds-border);
  gap: 24px;
  flex-wrap: wrap;
}

.kds__header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.kds__logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kds__logo-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f97316, #ea580c);
  border-radius: var(--kds-radius-sm);
  font-size: 24px;
  color: white;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.kds__logo-text {
  display: flex;
  flex-direction: column;
}

.kds__logo-title {
  font-family: var(--kds-font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}

.kds__logo-subtitle {
  font-size: 11px;
  color: var(--kds-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.kds__connection {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 20px;
  font-family: var(--kds-font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #ef4444;
}

.kds__connection--live {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.kds__connection-dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.kds__clock {
  font-family: var(--kds-font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--kds-text-primary);
  letter-spacing: 2px;
}

/* Stats */
.kds__stats {
  display: flex;
  gap: 24px;
}

.kds__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: var(--kds-bg-card);
  border-radius: var(--kds-radius-sm);
  border: 1px solid var(--kds-border);
  min-width: 80px;
}

.kds__stat-value {
  font-family: var(--kds-font-display);
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.kds__stat-value small {
  font-size: 16px;
  opacity: 0.7;
}

.kds__stat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--kds-text-muted);
  letter-spacing: 1px;
  margin-top: 4px;
}

.kds__stat--pending .kds__stat-value { color: var(--kds-warning); }
.kds__stat--progress .kds__stat-value { color: #a855f7; }
.kds__stat--ready .kds__stat-value { color: var(--kds-success); }
.kds__stat--urgent .kds__stat-value { color: var(--kds-danger); animation: pulse 1s infinite; }
.kds__stat--avg .kds__stat-value { color: var(--kds-accent); }
.kds__stat--completed .kds__stat-value { color: var(--kds-text-secondary); }

/* Controls */
.kds__controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.kds__filter {
  display: flex;
  background: var(--kds-bg-card);
  border-radius: var(--kds-radius-sm);
  padding: 4px;
  gap: 4px;
}

.kds__filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--kds-text-secondary);
  font-family: var(--kds-font-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.kds__filter-btn:hover {
  background: var(--kds-bg-hover);
  color: var(--kds-text-primary);
}

.kds__filter-btn--active {
  background: var(--filter-color, var(--kds-accent));
  color: white;
}

.kds__filter-count {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.kds__control-group {
  display: flex;
  gap: 8px;
}

.kds__btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--kds-bg-card);
  border: 1px solid var(--kds-border);
  border-radius: var(--kds-radius-sm);
  color: var(--kds-text-secondary);
  font-family: var(--kds-font-body);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.kds__btn:hover {
  background: var(--kds-bg-hover);
  color: var(--kds-text-primary);
  border-color: rgba(148, 163, 184, 0.2);
}

.kds__btn--active {
  background: var(--kds-accent);
  border-color: var(--kds-accent);
  color: white;
}

.kds__btn--primary {
  background: var(--kds-accent);
  border-color: var(--kds-accent);
  color: white;
}

.kds__btn--small {
  padding: 6px 10px;
  font-size: 12px;
}

.kds__btn-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--kds-danger);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Main content */
.kds__main {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  position: relative;
}

/* Empty states */
.kds__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 16px;
}

.kds__empty-icon {
  font-size: 80px;
  line-height: 1;
}

.kds__empty-icon--loading {
  font-size: 48px;
  color: var(--kds-accent);
}

.kds__empty-icon--error {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 50%;
  font-size: 40px;
  color: var(--kds-danger);
}

.kds__empty h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--kds-text-primary);
  margin: 0;
}

.kds__empty p {
  color: var(--kds-text-muted);
  margin: 0;
}

/* Grid */
.kds__grid {
  display: grid;
  grid-template-columns: repeat(var(--columns, 4), 1fr);
  gap: 16px;
  height: 100%;
}

@media (max-width: 1400px) {
  .kds__grid { --columns: 3 !important; }
}

@media (max-width: 1000px) {
  .kds__grid { --columns: 2 !important; }
}

@media (max-width: 600px) {
  .kds__grid { --columns: 1 !important; }
}

/* Columns */
.kds__column {
  display: flex;
  flex-direction: column;
  background: rgba(26, 31, 46, 0.6);
  border-radius: var(--kds-radius);
  border: 1px solid var(--kds-border);
  overflow: hidden;
}

.kds__column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--status-color) 20%, transparent),
    color-mix(in srgb, var(--status-color) 10%, transparent)
  );
  border-bottom: 2px solid var(--status-color);
}

.kds__column-title {
  font-family: var(--kds-font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--status-color);
}

.kds__column-count {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--status-color);
  border-radius: 50%;
  font-family: var(--kds-font-display);
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.kds__column-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Scrollbar */
.kds__column-content::-webkit-scrollbar {
  width: 6px;
}

.kds__column-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.kds__column-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.kds__column-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Order cards */
.kds__order {
  position: relative;
  background: var(--kds-bg-card);
  border-radius: var(--kds-radius);
  border: 1px solid var(--kds-border);
  padding: 16px;
  transition: all 0.3s ease;
}

.kds__order::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--urgency-color);
  border-radius: var(--kds-radius) 0 0 var(--kds-radius);
}

.kds__order--warning {
  animation: glow-warning 2s infinite;
}

.kds__order--urgent {
  animation: glow-urgent 1s infinite;
}

.kds__order--priority {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
}

.kds__order--updating {
  opacity: 0.6;
  pointer-events: none;
}

@keyframes glow-warning {
  0%, 100% { box-shadow: 0 0 0 rgba(245, 158, 11, 0); }
  50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
}

@keyframes glow-urgent {
  0%, 100% { box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
  50% { box-shadow: 0 0 24px rgba(239, 68, 68, 0.4); }
}

.kds__order-priority {
  position: absolute;
  top: -1px;
  right: 16px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-radius: 0 0 8px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: white;
  display: flex;
  align-items: center;
  gap: 4px;
}

.kds__order-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.kds__order-number {
  font-family: var(--kds-font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--kds-text-primary);
  line-height: 1;
}

.kds--compact .kds__order-number {
  font-size: 22px;
}

.kds__order-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kds__order-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--kds-font-display);
  font-size: 14px;
  font-weight: 600;
}

.kds__order-priority-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--kds-bg-hover);
  border: 1px solid var(--kds-border);
  border-radius: 6px;
  color: var(--kds-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.kds__order-priority-btn:hover {
  color: var(--kds-danger);
  border-color: var(--kds-danger);
}

.kds__order-priority-btn--active {
  background: var(--kds-danger);
  border-color: var(--kds-danger);
  color: white;
}

.kds__order-info {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.kds__order-type {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--type-color) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--type-color) 30%, transparent);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--type-color);
}

.kds__order-table {
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 6px;
  font-family: var(--kds-font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  color: white;
}

.kds__order-progress {
  position: relative;
  height: 6px;
  background: var(--kds-bg-hover);
  border-radius: 3px;
  margin-bottom: 12px;
  overflow: hidden;
}

.kds__order-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #a855f7, #8b5cf6);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.kds__order-progress-text {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 11px;
  font-weight: 600;
  color: #a855f7;
}

/* Items */
.kds__order-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.kds__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--kds-bg-hover);
  border-radius: var(--kds-radius-sm);
  cursor: default;
  transition: all 0.2s;
}

.kds__item--done {
  opacity: 0.5;
  text-decoration: line-through;
}

.kds__item-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--kds-bg-card);
  border: 2px solid var(--kds-border);
  border-radius: 4px;
  color: var(--kds-success);
  cursor: pointer;
  flex-shrink: 0;
}

.kds__item--done .kds__item-check {
  background: var(--kds-success);
  border-color: var(--kds-success);
  color: white;
}

.kds__item-qty {
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f97316, #ea580c);
  border-radius: 6px;
  font-family: var(--kds-font-display);
  font-size: 14px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.kds__item-info {
  flex: 1;
  min-width: 0;
}

.kds__item-name {
  display: block;
  font-weight: 600;
  color: var(--kds-text-primary);
  line-height: 1.3;
}

.kds--compact .kds__item-name {
  font-size: 13px;
}

.kds__item-note {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-style: italic;
  color: var(--kds-warning);
}

.kds__item-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.kds__item-options span {
  padding: 2px 6px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  font-size: 11px;
  color: var(--kds-accent);
}

.kds__order-notes {
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--kds-radius-sm);
  font-size: 13px;
  color: var(--kds-warning);
  margin-bottom: 12px;
}

/* Action buttons */
.kds__order-actions {
  display: flex;
  gap: 8px;
}

.kds__order-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: none;
  border-radius: var(--kds-radius-sm);
  font-family: var(--kds-font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.kds__order-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kds__order-btn--next {
  background: linear-gradient(135deg, var(--kds-accent), #2563eb);
  color: white;
}

.kds__order-btn--next:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.kds__order-btn--bump {
  background: linear-gradient(135deg, var(--kds-success), #16a34a);
  color: white;
}

.kds__order-btn--bump:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

/* Recall panel */
.kds__recall {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  background: var(--kds-bg-secondary);
  border-left: 1px solid var(--kds-border);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.kds__recall-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--kds-border);
}

.kds__recall-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.kds__recall-list {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kds__recall-empty {
  text-align: center;
  color: var(--kds-text-muted);
  padding: 24px;
}

.kds__recall-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--kds-bg-card);
  border-radius: var(--kds-radius-sm);
  border: 1px solid var(--kds-border);
}

.kds__recall-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kds__recall-number {
  font-family: var(--kds-font-display);
  font-size: 16px;
  font-weight: 700;
}

.kds__recall-items {
  font-size: 12px;
  color: var(--kds-text-muted);
}

/* Shortcuts modal */
.kds__shortcuts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kds__shortcut {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.kds__shortcut kbd {
  padding: 4px 10px;
  background: #e2e8f0;
  border-radius: 4px;
  font-family: var(--kds-font-display);
  font-size: 13px;
  font-weight: 600;
}

.kds__shortcut span {
  color: #64748b;
  font-size: 14px;
}

/* Animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Order transitions */
.order-enter-active {
  animation: order-in 0.4s ease-out;
}

.order-leave-active {
  animation: order-out 0.3s ease-in;
}

.order-move {
  transition: transform 0.4s ease;
}

@keyframes order-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes order-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .kds__header {
    flex-wrap: wrap;
    gap: 16px;
  }

  .kds__stats {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .kds__header {
    padding: 12px 16px;
  }

  .kds__logo-text {
    display: none;
  }

  .kds__clock {
    font-size: 20px;
  }

  .kds__stat {
    min-width: 60px;
    padding: 6px 10px;
  }

  .kds__stat-value {
    font-size: 24px;
  }

  .kds__filter {
    display: none;
  }

  .kds__recall {
    width: 100%;
  }
}
</style>
