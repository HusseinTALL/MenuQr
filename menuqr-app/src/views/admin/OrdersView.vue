<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import {
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  PrinterOutlined,
  EditOutlined,
  CloseOutlined,
  SoundOutlined,
  SoundFilled,
  AppstoreOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
import api, { type Order, type Restaurant, type Dish } from '@/services/api';
import { formatPrice } from '@/utils/formatters';
import type { ColumnType } from 'ant-design-vue/es/table';

interface EditableOrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  options?: { name: string; price: number }[];
  variant?: { name: string; price: number };
  specialInstructions?: string;
  subtotal: number;
}

const isLoading = ref(true);
const error = ref<string | null>(null);
const orders = ref<Order[]>([]);
const previousOrderIds = ref<Set<string>>(new Set());
const selectedStatus = ref<string>('active');
const searchQuery = ref('');
const showDetailModal = ref(false);
const selectedOrder = ref<Order | null>(null);
const isUpdatingStatus = ref(false);
const restaurant = ref<Restaurant | null>(null);
const lastRefresh = ref<Date>(new Date());
const isRefreshing = ref(false);
const showCancelModal = ref(false);
const cancelReason = ref('');
const orderToCancel = ref<Order | null>(null);
const soundEnabled = ref(true);
const kitchenMode = ref(false);
const selectedRowKeys = ref<string[]>([]);
const dateFilter = ref<'today' | 'week' | 'month' | 'all'>('today');
const paymentFilter = ref<string>('all');

// Edit order modal
const showEditModal = ref(false);
const orderToEdit = ref<Order | null>(null);
const editableItems = ref<EditableOrderItem[]>([]);
const editOrderInstructions = ref('');
const availableDishes = ref<Dish[]>([]);
const isLoadingDishes = ref(false);
const isSavingOrder = ref(false);
const dishSearchQuery = ref('');

let pollInterval: ReturnType<typeof setInterval> | null = null;

// Audio for new order notification
const notificationSound = ref<HTMLAudioElement | null>(null);

const statusTabs = [
  { key: 'active', tab: '🔥 Actives', statuses: ['pending', 'confirmed', 'preparing', 'ready'] },
  { key: 'pending', tab: '⏳ En attente', statuses: ['pending'] },
  { key: 'preparing', tab: '👨‍🍳 En cuisine', statuses: ['confirmed', 'preparing'] },
  { key: 'ready', tab: '✅ Prêtes', statuses: ['ready', 'served'] },
  { key: 'completed', tab: '📦 Terminées', statuses: ['completed'] },
  { key: 'cancelled', tab: '❌ Annulées', statuses: ['cancelled'] },
];

const dateFilterOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'all', label: 'Tout' },
];

const paymentFilterOptions = [
  { value: 'all', label: 'Tous les paiements' },
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payé' },
  { value: 'refunded', label: 'Remboursé' },
];

const statusFlow: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: ['completed'],
  completed: [],
  cancelled: [],
};

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'orange', icon: '⏳' },
  confirmed: { label: 'Confirmée', color: 'blue', icon: '✓' },
  preparing: { label: 'En préparation', color: 'purple', icon: '👨‍🍳' },
  ready: { label: 'Prête', color: 'green', icon: '✅' },
  served: { label: 'Servie', color: 'cyan', icon: '🍽️' },
  completed: { label: 'Terminée', color: 'default', icon: '📦' },
  cancelled: { label: 'Annulée', color: 'red', icon: '❌' },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'orange' },
  paid: { label: 'Payé', color: 'green' },
  refunded: { label: 'Remboursé', color: 'blue' },
  failed: { label: 'Échoué', color: 'red' },
};

const playNotificationSound = () => {
  if (soundEnabled.value && notificationSound.value) {
    notificationSound.value.currentTime = 0;
    notificationSound.value.play().catch(() => {});
  }
};

const fetchOrders = async (showRefreshIndicator = true) => {
  try {
    if (showRefreshIndicator) {isRefreshing.value = true;}

    if (!restaurant.value) {
      const restaurantResponse = await api.getMyRestaurant();
      if (restaurantResponse.success && restaurantResponse.data) {
        restaurant.value = restaurantResponse.data;
      }
    }

    const response = await api.getOrders({ limit: 100 });
    if (response.success && response.data) {
      const newOrders = response.data.orders;

      // Check for new orders
      const newOrderIds = new Set(newOrders.map(o => o._id));
      const hasNewOrders = newOrders.some(o =>
        !previousOrderIds.value.has(o._id) && o.status === 'pending'
      );

      if (hasNewOrders && previousOrderIds.value.size > 0) {
        playNotificationSound();
        message.success('Nouvelle commande reçue!');
      }

      previousOrderIds.value = newOrderIds;
      orders.value = newOrders;
      lastRefresh.value = new Date();
    }
  } catch (err) {
    error.value = 'Erreur lors du chargement des commandes';
    console.error(err);
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
};

// Date filter helper
const isWithinDateFilter = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();

  switch (dateFilter.value) {
    case 'today':
      return date.toDateString() === now.toDateString();
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    }
    default:
      return true;
  }
};

// Stats calculations
const stats = computed(() => {
  const todayOrders = orders.value.filter(o => {
    const date = new Date(o.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  });

  const completedToday = todayOrders.filter(o => o.status === 'completed');
  const pendingOrders = orders.value.filter(o => o.status === 'pending');

  // Calculate average wait time for active orders (realistic calculation)
  // Only consider orders from last 2 hours, cap individual wait to 60 min max
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const activeOrders = orders.value.filter(o =>
    ['pending', 'confirmed', 'preparing'].includes(o.status) &&
    new Date(o.createdAt) >= twoHoursAgo
  );
  let avgWaitTime = 0;
  if (activeOrders.length > 0) {
    const totalWait = activeOrders.reduce((sum, o) => {
      const created = new Date(o.createdAt);
      const waitMinutes = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
      return sum + Math.min(waitMinutes, 60); // Cap at 60 min per order
    }, 0);
    avgWaitTime = Math.round(totalWait / activeOrders.length);
  }

  // Revenue
  const revenueToday = completedToday.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = completedToday.length > 0 ? revenueToday / completedToday.length : 0;

  return {
    ordersToday: todayOrders.length,
    pendingCount: pendingOrders.length,
    revenueToday,
    avgOrderValue,
    avgWaitTime,
    completedToday: completedToday.length,
  };
});

const getStatusCounts = computed(() => {
  const counts: Record<string, number> = {};
  const filtered = orders.value.filter(o => isWithinDateFilter(o.createdAt));
  statusTabs.forEach(tab => {
    counts[tab.key] = filtered.filter(o => tab.statuses.includes(o.status)).length;
  });
  return counts;
});

const filteredOrders = computed(() => {
  let filtered = orders.value;

  // Filter by date
  filtered = filtered.filter(o => isWithinDateFilter(o.createdAt));

  // Filter by payment status
  if (paymentFilter.value !== 'all') {
    filtered = filtered.filter(o => o.paymentStatus === paymentFilter.value);
  }

  // Filter by status tab
  const currentTab = statusTabs.find(t => t.key === selectedStatus.value);
  if (currentTab) {
    filtered = filtered.filter(o => currentTab.statuses.includes(o.status));
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.tableNumber?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query)
    );
  }

  // Sort: pending first, then by creation time
  return filtered.sort((a, b) => {
    const statusPriority: Record<string, number> = { pending: 0, confirmed: 1, preparing: 2, ready: 3, served: 4, completed: 5, cancelled: 6 };
    const aPriority = statusPriority[a.status] ?? 99;
    const bPriority = statusPriority[b.status] ?? 99;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

const formatCurrency = (value: number) => {
  const currency = restaurant.value?.settings?.currency || 'XOF';
  return formatPrice(value, currency);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeSinceCreation = (dateString: string) => {
  const created = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);

  if (diff < 1) {return "À l'instant";}
  if (diff < 60) {return `${diff} min`;}
  if (diff < 1440) {return `${Math.floor(diff / 60)}h ${diff % 60}min`;}
  return `${Math.floor(diff / 1440)}j`;
};

const getUrgencyLevel = (order: Order): 'normal' | 'warning' | 'danger' => {
  if (!['pending', 'confirmed', 'preparing'].includes(order.status)) {return 'normal';}

  const created = new Date(order.createdAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);

  if (diffMinutes >= 20) {return 'danger';}
  if (diffMinutes >= 10) {return 'warning';}
  return 'normal';
};

// Table columns
const columns = computed<ColumnType<Order>[]>(() => [
  {
    title: 'Commande',
    dataIndex: 'orderNumber',
    key: 'orderNumber',
    width: 120,
    fixed: 'left',
  },
  {
    title: 'Statut',
    dataIndex: 'status',
    key: 'status',
    width: 140,
  },
  {
    title: 'Table',
    dataIndex: 'tableNumber',
    key: 'tableNumber',
    width: 100,
  },
  {
    title: 'Client',
    dataIndex: 'customerName',
    key: 'customerName',
    width: 150,
  },
  {
    title: 'Articles',
    dataIndex: 'items',
    key: 'items',
    width: 250,
  },
  {
    title: 'Total',
    dataIndex: 'total',
    key: 'total',
    width: 120,
    sorter: (a: Order, b: Order) => a.total - b.total,
  },
  {
    title: 'Paiement',
    dataIndex: 'paymentStatus',
    key: 'paymentStatus',
    width: 120,
  },
  {
    title: 'Heure',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 100,
    sorter: (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 200,
    fixed: 'right',
  },
]);

const openDetailModal = (order: Order) => {
  selectedOrder.value = order;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedOrder.value = null;
};

 
const _openCancelModal = (_order: Order) => {
  orderToCancel.value = _order;
  cancelReason.value = '';
  showCancelModal.value = true;
};

const closeCancelModal = () => {
  showCancelModal.value = false;
  orderToCancel.value = null;
  cancelReason.value = '';
};

const confirmCancelOrder = async () => {
  if (!orderToCancel.value) {return;}
  await updateOrderStatus(orderToCancel.value, 'cancelled', cancelReason.value || undefined);
  closeCancelModal();
};

const updateOrderStatus = async (order: Order, newStatus: string, cancelReasonText?: string) => {
  isUpdatingStatus.value = true;

  try {
    const response = await api.updateOrderStatus(order._id, newStatus, cancelReasonText);
    if (response.success && response.data) {
      const index = orders.value.findIndex((o) => o._id === order._id);
      if (index !== -1) {
        orders.value[index] = response.data;
      }
      if (selectedOrder.value?._id === order._id) {
        selectedOrder.value = response.data;
      }
      message.success(`Commande #${order.orderNumber} ${statusConfig[newStatus]?.label?.toLowerCase() ?? 'mise à jour'}`);
    }
  } catch (err) {
    error.value = 'Erreur lors de la mise à jour du statut';
    message.error('Erreur lors de la mise à jour');
    console.error(err);
  } finally {
    isUpdatingStatus.value = false;
  }
};

const handleQuickStatusUpdate = async (order: Order) => {
  const nextStatuses = statusFlow[order.status];
  const nextStatus = nextStatuses?.[0];
  if (nextStatus && nextStatus !== 'cancelled') {
    await updateOrderStatus(order, nextStatus);
  }
};

// Bulk actions
const bulkAdvanceStatus = async () => {
  if (selectedRowKeys.value.length === 0) {return;}

  const ordersToUpdate = orders.value.filter(o => selectedRowKeys.value.includes(o._id));
  let successCount = 0;

  for (const order of ordersToUpdate) {
    const nextStatus = statusFlow[order.status]?.[0];
    if (nextStatus && nextStatus !== 'cancelled') {
      try {
        await api.updateOrderStatus(order._id, nextStatus);
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }
  }

  selectedRowKeys.value = [];
  await fetchOrders(false);
  message.success(`${successCount} commande(s) mise(s) à jour`);
};

// Export to CSV
const exportToCSV = () => {
  const ordersToExport = filteredOrders.value;
  if (ordersToExport.length === 0) {
    message.error('Aucune commande à exporter');
    return;
  }

  const headers = ['Numéro', 'Date', 'Table', 'Client', 'Articles', 'Total', 'Statut', 'Paiement'];
  const rows = ordersToExport.map(order => [
    order.orderNumber,
    formatDate(order.createdAt),
    order.tableNumber || '-',
    order.customerName || '-',
    order.items.map(i => `${i.quantity}x ${i.name}`).join('; '),
    order.total,
    statusConfig[order.status]?.label ?? order.status,
    paymentStatusConfig[order.paymentStatus]?.label ?? order.paymentStatus,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  message.success(`${ordersToExport.length} commandes exportées`);
};

// Edit order functions
const canEditOrder = (status: string) => {
  return !['completed', 'cancelled'].includes(status);
};

const openEditModal = async (order: Order) => {
  orderToEdit.value = order;
  editOrderInstructions.value = order.specialInstructions || '';

  // Clone items for editing
  editableItems.value = order.items.map(item => ({
    dishId: item.dishId as string,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    options: item.options ? [...item.options] : undefined,
    variant: item.variant ? { ...item.variant } : undefined,
    specialInstructions: item.specialInstructions,
    subtotal: item.subtotal,
  }));

  showEditModal.value = true;

  // Load available dishes
  await loadAvailableDishes();
};

const closeEditModal = () => {
  showEditModal.value = false;
  orderToEdit.value = null;
  editableItems.value = [];
  editOrderInstructions.value = '';
  dishSearchQuery.value = '';
};

const loadAvailableDishes = async () => {
  isLoadingDishes.value = true;
  try {
    const response = await api.getMyDishes({ isAvailable: true });
    if (response.success && response.data) {
      availableDishes.value = response.data;
    }
  } catch (err) {
    console.error('Error loading dishes:', err);
  } finally {
    isLoadingDishes.value = false;
  }
};

const filteredDishes = computed(() => {
  if (!dishSearchQuery.value) {return availableDishes.value;}
  const query = dishSearchQuery.value.toLowerCase();
  return availableDishes.value.filter(dish =>
    dish.name.fr.toLowerCase().includes(query) ||
    (dish.name.en && dish.name.en.toLowerCase().includes(query))
  );
});

const updateItemQuantity = (index: number, delta: number) => {
  const item = editableItems.value[index];
  if (!item) {return;}
  const newQuantity = item.quantity + delta;
  if (newQuantity >= 1 && newQuantity <= 99) {
    item.quantity = newQuantity;
    recalculateItemSubtotal(index);
  }
};

const recalculateItemSubtotal = (index: number) => {
  const item = editableItems.value[index];
  if (!item) {return;}
  const optionsTotal = item.options?.reduce((sum, opt) => sum + (opt.price || 0), 0) || 0;
  const basePrice = item.variant?.price || item.price;
  item.subtotal = (basePrice + optionsTotal) * item.quantity;
};

const removeItem = (index: number) => {
  if (editableItems.value.length > 1) {
    editableItems.value.splice(index, 1);
  } else {
    message.error('La commande doit contenir au moins un article');
  }
};

const addDishToOrder = (dish: Dish) => {
  const existingIndex = editableItems.value.findIndex(item => item.dishId === dish._id);

  if (existingIndex >= 0) {
    updateItemQuantity(existingIndex, 1);
  } else {
    editableItems.value.push({
      dishId: dish._id,
      name: dish.name.fr,
      price: dish.price,
      quantity: 1,
      options: undefined,
      variant: undefined,
      specialInstructions: undefined,
      subtotal: dish.price,
    });
  }
  dishSearchQuery.value = '';
};

const editTotal = computed(() => {
  return editableItems.value.reduce((sum, item) => sum + item.subtotal, 0);
});

const saveOrderChanges = async () => {
  if (!orderToEdit.value) {return;}
  if (editableItems.value.length === 0) {
    message.error('La commande doit contenir au moins un article');
    return;
  }

  isSavingOrder.value = true;

  try {
    const response = await api.updateOrderItems(orderToEdit.value._id, {
      items: editableItems.value.map(item => ({
        dishId: item.dishId,
        quantity: item.quantity,
        options: item.options,
        variant: item.variant,
        specialInstructions: item.specialInstructions,
      })),
      specialInstructions: editOrderInstructions.value || undefined,
    });

    if (response.success && response.data) {
      const index = orders.value.findIndex(o => o._id === orderToEdit.value!._id);
      if (index !== -1) {
        orders.value[index] = response.data;
      }

      if (selectedOrder.value?._id === orderToEdit.value._id) {
        selectedOrder.value = response.data;
      }

      message.success('Commande modifiée avec succès');
      closeEditModal();
    }
  } catch (err) {
    console.error('Error saving order:', err);
    message.error('Erreur lors de la modification');
  } finally {
    isSavingOrder.value = false;
  }
};

const getNextStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Confirmer',
    confirmed: 'En cuisine',
    preparing: 'Prête',
    ready: 'Servie',
    served: 'Terminer',
  };
  return labels[status] || '';
};

const canAdvanceStatus = (status: string) => {
  const nextStatuses = statusFlow[status];
  return nextStatuses && nextStatuses.length > 0 && nextStatuses[0] !== 'cancelled';
};

const canCancelStatus = (status: string) => {
  return statusFlow[status]?.includes('cancelled') ?? false;
};

const printOrder = (order: Order) => {
  const printContent = `
    <html>
      <head>
        <title>Commande #${order.orderNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          h1 { font-size: 18px; text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
          .info { margin: 10px 0; font-size: 14px; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
          .notes { background: #f5f5f5; padding: 10px; margin-top: 10px; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>COMMANDE #${order.orderNumber}</h1>
        <div class="info">
          <strong>Date:</strong> ${formatDate(order.createdAt)}<br>
          ${order.tableNumber ? `<strong>Table:</strong> ${order.tableNumber}<br>` : ''}
          ${order.customerName ? `<strong>Client:</strong> ${order.customerName}<br>` : ''}
        </div>
        <div class="items">
          ${order.items.map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.name}</span>
              <span>${formatCurrency(item.subtotal)}</span>
            </div>
            ${item.specialInstructions ? `<div style="font-size:12px;color:#666;margin-left:20px;">→ ${item.specialInstructions}</div>` : ''}
          `).join('')}
        </div>
        <div class="total">TOTAL: ${formatCurrency(order.total)}</div>
        ${order.specialInstructions ? `<div class="notes"><strong>Note:</strong> ${order.specialInstructions}</div>` : ''}
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};

const timeSinceRefresh = computed(() => {
  const diff = Math.floor((new Date().getTime() - lastRefresh.value.getTime()) / 1000);
  if (diff < 60) {return "À l'instant";}
  return `Il y a ${Math.floor(diff / 60)} min`;
});

// Row selection
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys;
  },
  getCheckboxProps: (record: Order) => ({
    disabled: !canAdvanceStatus(record.status),
  }),
}));

// Order timeline helper
const getOrderTimeline = (order: Order) => {
  const timeline = [
    { status: 'created', time: order.createdAt, label: 'Commande créée', icon: '📝' },
  ];

  if (order.confirmedAt) {
    timeline.push({ status: 'confirmed', time: order.confirmedAt, label: 'Confirmée', icon: '✓' });
  }
  if (order.preparedAt) {
    timeline.push({ status: 'prepared', time: order.preparedAt, label: 'Préparée', icon: '👨‍🍳' });
  }
  if (order.servedAt) {
    timeline.push({ status: 'served', time: order.servedAt, label: 'Servie', icon: '🍽️' });
  }
  if (order.completedAt) {
    timeline.push({ status: 'completed', time: order.completedAt, label: 'Terminée', icon: '📦' });
  }
  if (order.cancelledAt) {
    timeline.push({ status: 'cancelled', time: order.cancelledAt, label: 'Annulée', icon: '❌' });
  }

  return timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
};

let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  notificationSound.value = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Coverage1+g4ODg4SEhIOCgoKBgYGBgH9/f39+fn59fX19fHx8fHt7e3p6enl5eXh4eHd3d3Z2dnV1dXR0dHNzc3JycnFxcXBwcG9vb25ubm1tbWxsbGtra2pqamlpaWhnaGdnZ2ZmZmVlZWRkZGNjY2JiYmFhYWBgYF9fX15eXl1dXVxcXFtbW1paWllZWVhYWFdXV1ZWVlVVVVRUVFNTU1JSUlFRUVBQUE9PT05OTk1NTUxMTEtLS0pKSklJSUhISEdHR0ZGRkVFRURERENDQ0JCQkFBQUBAQD8/Pz4+Pj09PTw8PDs7Ozo6Ojk5OTg4ODc3NzY2NjU1NTQ0NDMzMzIyMjExMTAwMC8vLy4uLi0tLSwsLCsrKyoqKikpKSgoKCcnJyYmJiUlJSQkJCMjIyIiIiEhISAgIB8fHx4eHh0dHRwcHBsbGxoaGhkZGRgYGBcXFxYWFhUVFRQUFBMTExISEhERERAQEA8PDw4ODg0NDQwMDAsLCwoKCgkJCQgICAcHBwYGBgUFBQQEBAMDAwICAg==');

  fetchOrders();
  pollInterval = setInterval(() => fetchOrders(false), 15000);
  timeUpdateInterval = setInterval(() => {
    lastRefresh.value = new Date(lastRefresh.value);
  }, 30000);
});

onUnmounted(() => {
  if (pollInterval) {clearInterval(pollInterval);}
  if (timeUpdateInterval) {clearInterval(timeUpdateInterval);}
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Card -->
    <a-card class="overflow-hidden" :body-style="{ padding: 0 }">
      <div class="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-6 text-white">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-2xl font-bold">Gestion des commandes</h2>
            <p class="mt-1 text-orange-100">Gérez vos commandes en temps réel</p>
          </div>

          <a-space wrap>
            <a-button
              type="primary"
              class="bg-gradient-to-r from-purple-500 to-indigo-500 border-none hover:from-purple-600 hover:to-indigo-600"
              @click="router.push('/admin/kds')"
            >
              <template #icon><AppstoreOutlined /></template>
              Vue Kanban (KDS)
            </a-button>

            <a-button
              :type="kitchenMode ? 'primary' : 'default'"
              ghost
              @click="kitchenMode = !kitchenMode"
            >
              👨‍🍳 {{ kitchenMode ? 'Mode Cuisine' : 'Mode Normal' }}
            </a-button>

            <a-tooltip :title="soundEnabled ? 'Son activé' : 'Son désactivé'">
              <a-button ghost @click="soundEnabled = !soundEnabled">
                <template #icon>
                  <SoundFilled v-if="soundEnabled" />
                  <SoundOutlined v-else />
                </template>
              </a-button>
            </a-tooltip>

            <a-button ghost @click="exportToCSV">
              <template #icon><ExportOutlined /></template>
              Exporter
            </a-button>

            <a-button type="primary" :loading="isRefreshing" @click="fetchOrders()">
              <template #icon><ReloadOutlined /></template>
              Actualiser
            </a-button>
          </a-space>
        </div>

        <div class="mt-4 flex items-center gap-3 text-sm text-orange-100">
          <a-badge status="processing" />
          <span>En direct - {{ timeSinceRefresh }}</span>
        </div>
      </div>
    </a-card>

    <!-- Stats Cards -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :md="12" :lg="6">
        <a-card>
          <a-statistic
            title="Commandes aujourd'hui"
            :value="stats.ordersToday"
            :value-style="{ color: '#f97316' }"
          >
            <template #prefix>📋</template>
          </a-statistic>
          <div class="mt-2">
            <a-tag v-if="stats.pendingCount > 0" color="orange">
              {{ stats.pendingCount }} en attente
            </a-tag>
            <span v-else class="text-gray-400 text-sm">Aucune en attente</span>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="12" :lg="6">
        <a-card>
          <a-statistic
            title="Revenus du jour"
            :value="formatCurrency(stats.revenueToday ?? 0)"
            :value-style="{ color: '#22c55e' }"
          >
            <template #prefix>💰</template>
          </a-statistic>
          <div class="mt-2 text-gray-500 text-sm">
            {{ stats.completedToday }} commande(s) complétée(s)
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="12" :lg="6">
        <a-card>
          <a-statistic
            title="Panier moyen"
            :value="formatCurrency(stats.avgOrderValue ?? 0)"
            :value-style="{ color: '#3b82f6' }"
          >
            <template #prefix>📊</template>
          </a-statistic>
          <div class="mt-2 text-gray-500 text-sm">
            Moyenne par commande
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="12" :lg="6">
        <a-card>
          <a-statistic
            title="Temps d'attente moyen"
            :value="stats.avgWaitTime"
            suffix="min"
            :value-style="{ color: stats.avgWaitTime > 15 ? '#ef4444' : stats.avgWaitTime > 10 ? '#f59e0b' : '#8b5cf6' }"
          >
            <template #prefix>⏱️</template>
          </a-statistic>
          <div class="mt-2 text-sm" :class="stats.avgWaitTime > 15 ? 'text-red-500' : stats.avgWaitTime > 10 ? 'text-amber-500' : 'text-gray-500'">
            {{ stats.avgWaitTime > 15 ? 'Attention: délai élevé' : stats.avgWaitTime > 10 ? 'Temps acceptable' : 'Excellent tempo' }}
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card>
      <div class="admin-filters-row">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-gray-600">Période:</span>
          <a-radio-group v-model:value="dateFilter" button-style="solid" size="small">
            <a-radio-button v-for="opt in dateFilterOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-radio-button>
          </a-radio-group>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-gray-600">Paiement:</span>
          <a-select v-model:value="paymentFilter" class="min-w-[140px]">
            <a-select-option v-for="opt in paymentFilterOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </div>
      </div>
    </a-card>

    <!-- Status Tabs + Search + Table -->
    <a-card>
      <a-tabs v-model:activeKey="selectedStatus">
        <a-tab-pane v-for="tab in statusTabs" :key="tab.key">
          <template #tab>
            <a-badge :count="getStatusCounts[tab.key]" :offset="[10, 0]" :show-zero="false">
              {{ tab.tab }}
            </a-badge>
          </template>
        </a-tab-pane>
      </a-tabs>

      <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center">
        <a-input-search
          v-model:value="searchQuery"
          placeholder="Rechercher par numéro, table ou client..."
          style="max-width: 400px"
          allow-clear
        />

        <a-space v-if="selectedRowKeys.length > 0">
          <span class="text-gray-600">{{ selectedRowKeys.length }} sélectionnée(s)</span>
          <a-button type="primary" @click="bulkAdvanceStatus">Avancer le statut</a-button>
          <a-button @click="selectedRowKeys = []">Annuler</a-button>
        </a-space>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="py-16 text-center">
        <a-spin size="large" />
        <p class="mt-4 text-gray-500">Chargement des commandes...</p>
      </div>

      <!-- Error -->
      <a-result
        v-else-if="error"
        status="error"
        title="Erreur"
        :sub-title="error"
      >
        <template #extra>
          <a-button type="primary" @click="fetchOrders">Réessayer</a-button>
        </template>
      </a-result>

      <!-- Kitchen Mode -->
      <div v-else-if="kitchenMode && filteredOrders.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <a-card
          v-for="order in filteredOrders"
          :key="order._id"
          size="small"
          :class="[
            order.status === 'pending' ? 'border-orange-400 border-2' :
            order.status === 'confirmed' ? 'border-blue-400 border-2' :
            order.status === 'preparing' ? 'border-purple-400 border-2' :
            order.status === 'ready' ? 'border-green-400 border-2' : ''
          ]"
        >
          <template #title>
            <div class="flex items-center justify-between">
              <span class="text-xl font-bold">#{{ order.orderNumber }}</span>
              <a-tag>{{ getTimeSinceCreation(order.createdAt) }}</a-tag>
            </div>
          </template>

          <div v-if="order.tableNumber" class="mb-3 text-lg font-semibold text-blue-600">
            🪑 Table {{ order.tableNumber }}
          </div>

          <div class="space-y-2 mb-4">
            <div v-for="item in order.items" :key="item.dishId" class="flex items-start gap-2 bg-gray-50 rounded p-2">
              <span class="text-lg font-bold text-orange-600">{{ item.quantity }}×</span>
              <div class="flex-1">
                <span class="font-medium">{{ item.name }}</span>
                <div v-if="item.specialInstructions" class="text-sm italic text-orange-600">
                  📝 {{ item.specialInstructions }}
                </div>
              </div>
            </div>
          </div>

          <a-button
            v-if="canAdvanceStatus(order.status)"
            type="primary"
            block
            size="large"
            @click="handleQuickStatusUpdate(order)"
          >
            {{ statusConfig[order.status]?.icon }} {{ getNextStatusLabel(order.status) }}
          </a-button>
        </a-card>
      </div>

      <!-- Table Mode -->
      <a-table
        v-else-if="filteredOrders.length > 0"
        :columns="columns"
        :data-source="filteredOrders"
        :row-selection="rowSelection"
        :row-key="(record: Order) => record._id"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total: number) => `${total} commandes` }"
        :scroll="{ x: 1200 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderNumber'">
            <span class="font-semibold">#{{ record.orderNumber }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusConfig[record.status]?.color">
              {{ statusConfig[record.status]?.icon }} {{ statusConfig[record.status]?.label }}
            </a-tag>
            <a-tag v-if="getUrgencyLevel(record) === 'danger'" color="red">🚨 Urgent</a-tag>
            <a-tag v-else-if="getUrgencyLevel(record) === 'warning'" color="orange">⚠️ +10min</a-tag>
          </template>

          <template v-else-if="column.key === 'tableNumber'">
            <span v-if="record.tableNumber">🪑 {{ record.tableNumber }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'items'">
            <a-space wrap size="small">
              <a-tag v-for="item in record.items.slice(0, 3)" :key="item.dishId">
                {{ item.quantity }}× {{ item.name }}
              </a-tag>
              <a-tag v-if="record.items.length > 3">+{{ record.items.length - 3 }}</a-tag>
            </a-space>
          </template>

          <template v-else-if="column.key === 'total'">
            <span class="font-semibold">{{ formatCurrency(record.total) }}</span>
          </template>

          <template v-else-if="column.key === 'paymentStatus'">
            <a-tag :color="paymentStatusConfig[record.paymentStatus]?.color || 'default'">
              {{ paymentStatusConfig[record.paymentStatus]?.label || record.paymentStatus }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            <a-tooltip :title="formatDate(record.createdAt)">
              {{ formatTime(record.createdAt) }}
            </a-tooltip>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Détails">
                <a-button size="small" @click="openDetailModal(record)">
                  <template #icon><EyeOutlined /></template>
                </a-button>
              </a-tooltip>

              <a-tooltip title="Imprimer">
                <a-button size="small" @click="printOrder(record)">
                  <template #icon><PrinterOutlined /></template>
                </a-button>
              </a-tooltip>

              <a-tooltip v-if="canEditOrder(record.status)" title="Modifier">
                <a-button size="small" type="primary" ghost @click="openEditModal(record)">
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>

              <a-button
                v-if="canAdvanceStatus(record.status)"
                size="small"
                type="primary"
                :loading="isUpdatingStatus"
                @click="handleQuickStatusUpdate(record)"
              >
                {{ getNextStatusLabel(record.status) }}
              </a-button>

              <a-popconfirm
                v-if="canCancelStatus(record.status)"
                title="Annuler cette commande?"
                ok-text="Oui"
                cancel-text="Non"
                @confirm="updateOrderStatus(record, 'cancelled')"
              >
                <a-button size="small" danger>
                  <template #icon><CloseOutlined /></template>
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>

      <!-- Empty -->
      <a-empty v-else description="Aucune commande">
        <template #image>
          <span class="text-6xl">📋</span>
        </template>
      </a-empty>
    </a-card>

    <!-- Detail Modal -->
    <a-modal
      v-model:open="showDetailModal"
      :title="`Commande #${selectedOrder?.orderNumber}`"
      :width="720"
      :footer="null"
    >
      <template v-if="selectedOrder">
        <a-descriptions bordered :column="2" size="small" class="mb-4">
          <a-descriptions-item label="Statut">
            <a-tag :color="statusConfig[selectedOrder.status]?.color">
              {{ statusConfig[selectedOrder.status]?.icon }} {{ statusConfig[selectedOrder.status]?.label }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Paiement">
            <a-tag :color="paymentStatusConfig[selectedOrder.paymentStatus]?.color">
              {{ paymentStatusConfig[selectedOrder.paymentStatus]?.label }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Date">{{ formatDate(selectedOrder.createdAt) }}</a-descriptions-item>
          <a-descriptions-item label="Table">{{ selectedOrder.tableNumber || '-' }}</a-descriptions-item>
          <a-descriptions-item label="Client">{{ selectedOrder.customerName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="Total">
            <span class="font-bold text-lg">{{ formatCurrency(selectedOrder.total) }}</span>
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>Articles</a-divider>

        <a-list :data-source="selectedOrder.items" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>
                  <span class="font-medium">{{ item.quantity }}× {{ item.name }}</span>
                </template>
                <template #description>
                  <div v-if="item.specialInstructions" class="text-orange-600">
                    📝 {{ item.specialInstructions }}
                  </div>
                </template>
              </a-list-item-meta>
              <div class="font-semibold">{{ formatCurrency(item.subtotal) }}</div>
            </a-list-item>
          </template>
        </a-list>

        <a-alert
          v-if="selectedOrder.specialInstructions"
          type="info"
          class="mt-4"
          :message="selectedOrder.specialInstructions"
          show-icon
        >
          <template #icon>📝</template>
        </a-alert>

        <a-divider>Historique</a-divider>

        <a-timeline>
          <a-timeline-item v-for="event in getOrderTimeline(selectedOrder)" :key="event.status" :color="event.status === 'cancelled' ? 'red' : 'green'">
            <p class="font-medium">{{ event.icon }} {{ event.label }}</p>
            <p class="text-gray-500 text-sm">{{ formatDate(event.time) }}</p>
          </a-timeline-item>
        </a-timeline>

        <div class="mt-4 flex justify-end gap-2">
          <a-button @click="printOrder(selectedOrder)">
            <template #icon><PrinterOutlined /></template>
            Imprimer
          </a-button>
          <a-button v-if="canEditOrder(selectedOrder.status)" type="primary" ghost @click="openEditModal(selectedOrder); closeDetailModal()">
            <template #icon><EditOutlined /></template>
            Modifier
          </a-button>
          <a-button v-if="canAdvanceStatus(selectedOrder.status)" type="primary" :loading="isUpdatingStatus" @click="handleQuickStatusUpdate(selectedOrder)">
            {{ getNextStatusLabel(selectedOrder.status) }}
          </a-button>
        </div>
      </template>
    </a-modal>

    <!-- Edit Modal -->
    <a-modal
      v-model:open="showEditModal"
      :title="`Modifier commande #${orderToEdit?.orderNumber}`"
      :width="640"
      :confirm-loading="isSavingOrder"
      @ok="saveOrderChanges"
      @cancel="closeEditModal"
    >
      <a-spin :spinning="isLoadingDishes">
        <div class="space-y-4">
          <!-- Add dish -->
          <a-auto-complete
            v-model:value="dishSearchQuery"
            :options="filteredDishes.map(d => ({ value: d._id, label: d.name.fr }))"
            placeholder="Ajouter un plat..."
            style="width: 100%"
            @select="(val: string) => addDishToOrder(availableDishes.find(d => d._id === val)!)"
          />

          <!-- Items list -->
          <a-list :data-source="editableItems" bordered size="small">
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="flex items-center justify-between w-full">
                  <div>
                    <span class="font-medium">{{ item.name }}</span>
                    <div class="text-gray-500 text-sm">{{ formatCurrency(item.price) }} / unité</div>
                  </div>
                  <a-space>
                    <a-input-number
                      :value="item.quantity"
                      :min="1"
                      :max="99"
                      size="small"
                      @change="(val: number) => { item.quantity = val; recalculateItemSubtotal(index); }"
                    />
                    <span class="font-semibold w-20 text-right">{{ formatCurrency(item.subtotal) }}</span>
                    <a-button size="small" danger @click="removeItem(index)">
                      <template #icon><CloseOutlined /></template>
                    </a-button>
                  </a-space>
                </div>
              </a-list-item>
            </template>
          </a-list>

          <!-- Instructions -->
          <a-textarea
            v-model:value="editOrderInstructions"
            placeholder="Instructions spéciales..."
            :rows="2"
          />

          <!-- Total -->
          <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span class="text-lg font-medium">Total</span>
            <span class="text-xl font-bold text-orange-600">{{ formatCurrency(editTotal) }}</span>
          </div>
        </div>
      </a-spin>
    </a-modal>

    <!-- Cancel Modal -->
    <a-modal
      v-model:open="showCancelModal"
      title="Annuler la commande"
      @ok="confirmCancelOrder"
      @cancel="closeCancelModal"
    >
      <p class="mb-4">Êtes-vous sûr de vouloir annuler la commande <strong>#{{ orderToCancel?.orderNumber }}</strong>?</p>
      <a-textarea
        v-model:value="cancelReason"
        placeholder="Raison de l'annulation (optionnel)..."
        :rows="3"
      />
    </a-modal>
  </div>
</template>

<style scoped>
:deep(.ant-card-head) {
  border-bottom: none;
}

:deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

:deep(.ant-table-row:hover) {
  cursor: pointer;
}
</style>
