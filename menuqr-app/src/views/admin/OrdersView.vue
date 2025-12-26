<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import api, { type Order, type Restaurant, type Dish } from '@/services/api';
import { formatPrice } from '@/utils/formatters';

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
const selectedOrders = ref<Set<string>>(new Set());
const dateFilter = ref<'today' | 'week' | 'month' | 'all'>('today');
const paymentFilter = ref<string>('all');
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
const showToast = ref(false);

// Edit order modal
const showEditModal = ref(false);
const orderToEdit = ref<Order | null>(null);
const editableItems = ref<EditableOrderItem[]>([]);
const editOrderInstructions = ref('');
const availableDishes = ref<Dish[]>([]);
const isLoadingDishes = ref(false);
const isSavingOrder = ref(false);
const showAddDishDropdown = ref(false);
const dishSearchQuery = ref('');

let pollInterval: ReturnType<typeof setInterval> | null = null;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// Audio for new order notification
const notificationSound = ref<HTMLAudioElement | null>(null);

const statusTabs = [
  { value: 'active', label: 'Actives', icon: '🔥', statuses: ['pending', 'confirmed', 'preparing', 'ready'] },
  { value: 'pending', label: 'En attente', icon: '⏳', statuses: ['pending'] },
  { value: 'preparing', label: 'En cuisine', icon: '👨‍🍳', statuses: ['confirmed', 'preparing'] },
  { value: 'ready', label: 'Prêtes', icon: '✅', statuses: ['ready', 'served'] },
  { value: 'completed', label: 'Terminées', icon: '📦', statuses: ['completed'] },
  { value: 'cancelled', label: 'Annulées', icon: '❌', statuses: ['cancelled'] },
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

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  pending: { label: 'En attente', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: '⏳' },
  confirmed: { label: 'Confirmée', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: '✓' },
  preparing: { label: 'En préparation', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', icon: '👨‍🍳' },
  ready: { label: 'Prête', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: '✅' },
  served: { label: 'Servie', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', icon: '🍽️' },
  completed: { label: 'Terminée', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', icon: '📦' },
  cancelled: { label: 'Annulée', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: '❌' },
};

const paymentStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  paid: { label: 'Payé', color: 'text-green-700', bgColor: 'bg-green-50' },
  refunded: { label: 'Remboursé', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  failed: { label: 'Échoué', color: 'text-red-700', bgColor: 'bg-red-50' },
};

// Toast notification
const displayToast = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    showToast.value = false;
  }, 3000);
};

const playNotificationSound = () => {
  if (soundEnabled.value && notificationSound.value) {
    notificationSound.value.currentTime = 0;
    notificationSound.value.play().catch(() => {});
  }
};

const fetchOrders = async (showRefreshIndicator = true) => {
  try {
    if (showRefreshIndicator) isRefreshing.value = true;

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
        displayToast('Nouvelle commande reçue!', 'success');
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

  // Calculate average wait time for active orders
  const activeOrders = orders.value.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
  let avgWaitTime = 0;
  if (activeOrders.length > 0) {
    const totalWait = activeOrders.reduce((sum, o) => {
      const created = new Date(o.createdAt);
      const now = new Date();
      return sum + Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
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
    counts[tab.value] = filtered.filter(o => tab.statuses.includes(o.status)).length;
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
  const currentTab = statusTabs.find(t => t.value === selectedStatus.value);
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
    if (statusPriority[a.status] !== statusPriority[b.status]) {
      return statusPriority[a.status] - statusPriority[b.status];
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

  if (diff < 1) return "À l'instant";
  if (diff < 60) return `${diff} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  return `${Math.floor(diff / 1440)}j`;
};

const getUrgencyLevel = (order: Order): 'normal' | 'warning' | 'danger' => {
  if (!['pending', 'confirmed', 'preparing'].includes(order.status)) return 'normal';

  const created = new Date(order.createdAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);

  if (diffMinutes >= 20) return 'danger';
  if (diffMinutes >= 10) return 'warning';
  return 'normal';
};

const getUrgencyStyles = (urgency: 'normal' | 'warning' | 'danger') => {
  switch (urgency) {
    case 'danger': return 'ring-2 ring-red-400 bg-red-50/50';
    case 'warning': return 'ring-2 ring-amber-400 bg-amber-50/50';
    default: return 'bg-white';
  }
};

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

const openDetailModal = (order: Order) => {
  selectedOrder.value = order;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedOrder.value = null;
};

const openCancelModal = (order: Order) => {
  orderToCancel.value = order;
  cancelReason.value = '';
  showCancelModal.value = true;
};

const closeCancelModal = () => {
  showCancelModal.value = false;
  orderToCancel.value = null;
  cancelReason.value = '';
};

const confirmCancelOrder = async () => {
  if (!orderToCancel.value) return;
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
      displayToast(`Commande #${order.orderNumber} ${statusConfig[newStatus].label.toLowerCase()}`, 'success');
    }
  } catch (err) {
    error.value = 'Erreur lors de la mise à jour du statut';
    displayToast('Erreur lors de la mise à jour', 'error');
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
const toggleOrderSelection = (orderId: string) => {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId);
  } else {
    selectedOrders.value.add(orderId);
  }
  selectedOrders.value = new Set(selectedOrders.value);
};

const selectAllOrders = () => {
  const selectableOrders = filteredOrders.value.filter(o => canAdvanceStatus(o.status));
  if (selectedOrders.value.size === selectableOrders.length) {
    selectedOrders.value.clear();
  } else {
    selectableOrders.forEach(o => selectedOrders.value.add(o._id));
  }
  selectedOrders.value = new Set(selectedOrders.value);
};

const bulkAdvanceStatus = async () => {
  if (selectedOrders.value.size === 0) return;

  const ordersToUpdate = orders.value.filter(o => selectedOrders.value.has(o._id));
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

  selectedOrders.value.clear();
  await fetchOrders(false);
  displayToast(`${successCount} commande(s) mise(s) à jour`, 'success');
};

// Export to CSV
const exportToCSV = () => {
  const ordersToExport = filteredOrders.value;
  if (ordersToExport.length === 0) {
    displayToast('Aucune commande à exporter', 'error');
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
    statusConfig[order.status].label,
    paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus,
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

  displayToast(`${ordersToExport.length} commandes exportées`, 'success');
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
  showAddDishDropdown.value = false;
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
  if (!dishSearchQuery.value) return availableDishes.value;
  const query = dishSearchQuery.value.toLowerCase();
  return availableDishes.value.filter(dish =>
    dish.name.fr.toLowerCase().includes(query) ||
    (dish.name.en && dish.name.en.toLowerCase().includes(query))
  );
});

const updateItemQuantity = (index: number, delta: number) => {
  const item = editableItems.value[index];
  const newQuantity = item.quantity + delta;
  if (newQuantity >= 1 && newQuantity <= 99) {
    item.quantity = newQuantity;
    recalculateItemSubtotal(index);
  }
};

const recalculateItemSubtotal = (index: number) => {
  const item = editableItems.value[index];
  const optionsTotal = item.options?.reduce((sum, opt) => sum + (opt.price || 0), 0) || 0;
  const basePrice = item.variant?.price || item.price;
  item.subtotal = (basePrice + optionsTotal) * item.quantity;
};

const removeItem = (index: number) => {
  if (editableItems.value.length > 1) {
    editableItems.value.splice(index, 1);
  } else {
    displayToast('La commande doit contenir au moins un article', 'error');
  }
};

const addDishToOrder = (dish: Dish) => {
  // Check if dish already exists
  const existingIndex = editableItems.value.findIndex(item => item.dishId === dish._id);

  if (existingIndex >= 0) {
    // Increment quantity
    updateItemQuantity(existingIndex, 1);
  } else {
    // Add new item
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

  showAddDishDropdown.value = false;
  dishSearchQuery.value = '';
};

const editTotal = computed(() => {
  return editableItems.value.reduce((sum, item) => sum + item.subtotal, 0);
});

const saveOrderChanges = async () => {
  if (!orderToEdit.value) return;
  if (editableItems.value.length === 0) {
    displayToast('La commande doit contenir au moins un article', 'error');
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
      // Update order in list
      const index = orders.value.findIndex(o => o._id === orderToEdit.value!._id);
      if (index !== -1) {
        orders.value[index] = response.data;
      }

      // Update selected order if viewing details
      if (selectedOrder.value?._id === orderToEdit.value._id) {
        selectedOrder.value = response.data;
      }

      displayToast('Commande modifiée avec succès', 'success');
      closeEditModal();
    }
  } catch (err) {
    console.error('Error saving order:', err);
    displayToast('Erreur lors de la modification', 'error');
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

const getNextStatusIcon = (status: string) => {
  const icons: Record<string, string> = {
    pending: '✓',
    confirmed: '👨‍🍳',
    preparing: '✅',
    ready: '🍽️',
    served: '📦',
  };
  return icons[status] || '→';
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
  if (diff < 60) return "À l'instant";
  return `Il y a ${Math.floor(diff / 60)} min`;
});

// Update time since refresh every 30 seconds
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  // Create notification sound (base64 encoded short beep)
  notificationSound.value = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Coverage1+g4ODg4SEhIOCgoKBgYGBgH9/f39+fn59fX19fHx8fHt7e3p6enl5eXh4eHd3d3Z2dnV1dXR0dHNzc3JycnFxcXBwcG9vb25ubm1tbWxsbGtra2pqamlpaWhnaGdnZ2ZmZmVlZWRkZGNjY2JiYmFhYWBgYF9fX15eXl1dXVxcXFtbW1paWllZWVhYWFdXV1ZWVlVVVVRUVFNTU1JSUlFRUVBQUE9PT05OTk1NTUxMTEtLS0pKSklJSUhISEdHR0ZGRkVFRURERENDQ0JCQkFBQUBAQD8/Pz4+Pj09PTw8PDs7Ozo6Ojk5OTg4ODc3NzY2NjU1NTQ0NDMzMzIyMjExMTAwMC8vLy4uLi0tLSwsLCsrKyoqKikpKSgoKCcnJyYmJiUlJSQkJCMjIyIiIiEhISAgIB8fHx4eHh0dHRwcHBsbGxoaGhkZGRgYGBcXFxYWFhUVFRQUFBMTExISEhERERAQEA8PDw4ODg0NDQwMDAsLCwoKCgkJCQgICAcHBwYGBgUFBQQEBAMDAwICAg==');

  fetchOrders();
  pollInterval = setInterval(() => fetchOrders(false), 15000);
  timeUpdateInterval = setInterval(() => {
    lastRefresh.value = new Date(lastRefresh.value);
  }, 30000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
  if (toastTimeout) clearTimeout(toastTimeout);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header with gradient -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 p-6 text-white shadow-lg">
      <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"></div>
      <div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10"></div>

      <div class="relative">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-2xl font-bold">Gestion des commandes</h2>
            <p class="mt-1 text-orange-100">
              Gérez vos commandes en temps réel
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Kitchen mode toggle -->
            <button
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="kitchenMode ? 'bg-white text-orange-600' : 'bg-white/20 text-white hover:bg-white/30'"
              @click="kitchenMode = !kitchenMode"
            >
              <span>👨‍🍳</span>
              <span class="hidden sm:inline">{{ kitchenMode ? 'Mode Cuisine' : 'Mode Normal' }}</span>
            </button>

            <!-- Sound toggle -->
            <button
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="soundEnabled ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'"
              @click="soundEnabled = !soundEnabled"
              :title="soundEnabled ? 'Notifications sonores activées' : 'Notifications sonores désactivées'"
            >
              <span v-if="soundEnabled">🔔</span>
              <span v-else>🔕</span>
            </button>

            <!-- Export button -->
            <button
              class="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/30"
              @click="exportToCSV"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="hidden sm:inline">Exporter</span>
            </button>

            <!-- Refresh button -->
            <button
              class="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-orange-600 shadow-sm hover:bg-orange-50 disabled:opacity-50"
              :disabled="isRefreshing"
              @click="fetchOrders()"
            >
              <svg
                class="h-4 w-4 transition-transform"
                :class="{ 'animate-spin': isRefreshing }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span class="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        <!-- Live indicator -->
        <div class="mt-4 flex items-center gap-3 text-sm text-orange-100">
          <span class="flex items-center gap-1">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
            </span>
            En direct - {{ timeSinceRefresh }}
          </span>
          <span v-if="isRefreshing" class="flex items-center gap-1">
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Actualisation...
          </span>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Orders Today -->
      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Commandes aujourd'hui</p>
            <p class="mt-1 text-2xl font-bold text-gray-900">{{ stats.ordersToday }}</p>
          </div>
          <div class="rounded-xl bg-orange-100 p-3">
            <span class="text-2xl">📋</span>
          </div>
        </div>
        <div class="mt-3 flex items-center gap-2 text-sm">
          <span v-if="stats.pendingCount > 0" class="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
            {{ stats.pendingCount }} en attente
          </span>
          <span v-else class="text-gray-500">Aucune en attente</span>
        </div>
      </div>

      <!-- Revenue Today -->
      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Revenus du jour</p>
            <p class="mt-1 text-2xl font-bold text-green-600">{{ formatCurrency(stats.revenueToday) }}</p>
          </div>
          <div class="rounded-xl bg-green-100 p-3">
            <span class="text-2xl">💰</span>
          </div>
        </div>
        <div class="mt-3 text-sm text-gray-500">
          {{ stats.completedToday }} commande(s) complétée(s)
        </div>
      </div>

      <!-- Average Order Value -->
      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Panier moyen</p>
            <p class="mt-1 text-2xl font-bold text-blue-600">{{ formatCurrency(stats.avgOrderValue) }}</p>
          </div>
          <div class="rounded-xl bg-blue-100 p-3">
            <span class="text-2xl">📊</span>
          </div>
        </div>
        <div class="mt-3 text-sm text-gray-500">
          Moyenne par commande
        </div>
      </div>

      <!-- Average Wait Time -->
      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Temps d'attente moyen</p>
            <p class="mt-1 text-2xl font-bold" :class="stats.avgWaitTime > 15 ? 'text-red-600' : stats.avgWaitTime > 10 ? 'text-amber-600' : 'text-purple-600'">
              {{ stats.avgWaitTime }} min
            </p>
          </div>
          <div class="rounded-xl p-3" :class="stats.avgWaitTime > 15 ? 'bg-red-100' : stats.avgWaitTime > 10 ? 'bg-amber-100' : 'bg-purple-100'">
            <span class="text-2xl">⏱️</span>
          </div>
        </div>
        <div class="mt-3 text-sm" :class="stats.avgWaitTime > 15 ? 'text-red-600' : stats.avgWaitTime > 10 ? 'text-amber-600' : 'text-gray-500'">
          {{ stats.avgWaitTime > 15 ? 'Attention: délai élevé' : stats.avgWaitTime > 10 ? 'Temps acceptable' : 'Excellent tempo' }}
        </div>
      </div>
    </div>

    <!-- Filters Row -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <!-- Date Filter -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-gray-600">Période:</span>
        <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            v-for="option in dateFilterOptions"
            :key="option.value"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="dateFilter === option.value ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="dateFilter = option.value as typeof dateFilter"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Payment Filter -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-600">Paiement:</span>
        <select
          v-model="paymentFilter"
          class="rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-8 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-orange-500"
        >
          <option v-for="option in paymentFilterOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Status Tabs -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        class="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all"
        :class="[
          selectedStatus === tab.value
            ? 'bg-orange-600 text-white shadow-md'
            : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
        ]"
        @click="selectedStatus = tab.value"
      >
        <span>{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span
          v-if="getStatusCounts[tab.value] > 0"
          class="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
          :class="selectedStatus === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'"
        >
          {{ getStatusCounts[tab.value] }}
        </span>
        <!-- Pulse for pending orders -->
        <span
          v-if="tab.value === 'pending' && getStatusCounts['pending'] > 0"
          class="absolute -right-1 -top-1 flex h-3 w-3"
        >
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
        </span>
      </button>
    </div>

    <!-- Search and Bulk Actions -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
      <!-- Search -->
      <div class="relative flex-1">
        <svg class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par numéro, table ou client..."
          class="w-full rounded-xl border-0 bg-white py-3 pl-12 pr-4 shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <!-- Bulk Actions -->
      <div v-if="selectedOrders.size > 0" class="flex items-center gap-3">
        <span class="text-sm text-gray-600">{{ selectedOrders.size }} sélectionnée(s)</span>
        <button
          class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500"
          @click="bulkAdvanceStatus"
        >
          Avancer le statut
        </button>
        <button
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="selectedOrders.clear(); selectedOrders = new Set(selectedOrders)"
        >
          Annuler
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-16 w-16 rounded-full border-4 border-orange-200"></div>
        <div class="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </div>
      <p class="mt-4 text-gray-500">Chargement des commandes...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-6 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p class="text-red-700">{{ error }}</p>
      <button class="mt-4 font-medium text-red-600 underline" @click="fetchOrders">Réessayer</button>
    </div>

    <!-- Kitchen Mode View -->
    <div v-else-if="kitchenMode && filteredOrders.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="order in filteredOrders"
        :key="order._id"
        class="relative overflow-hidden rounded-2xl p-4 shadow-md transition-all duration-300"
        :class="[
          order.status === 'pending' ? 'bg-amber-50 ring-2 ring-amber-400' :
          order.status === 'confirmed' ? 'bg-blue-50 ring-2 ring-blue-400' :
          order.status === 'preparing' ? 'bg-purple-50 ring-2 ring-purple-400' :
          order.status === 'ready' ? 'bg-green-50 ring-2 ring-green-400' : 'bg-white'
        ]"
      >
        <!-- Urgency indicator -->
        <div
          v-if="getUrgencyLevel(order) !== 'normal'"
          class="absolute right-2 top-2 animate-pulse text-2xl"
        >
          {{ getUrgencyLevel(order) === 'danger' ? '🚨' : '⚠️' }}
        </div>

        <!-- Order number and time -->
        <div class="mb-3 flex items-center justify-between">
          <span class="text-2xl font-bold text-gray-900">#{{ order.orderNumber }}</span>
          <span class="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
            {{ getTimeSinceCreation(order.createdAt) }}
          </span>
        </div>

        <!-- Table -->
        <div v-if="order.tableNumber" class="mb-3 text-lg font-semibold text-blue-700">
          🪑 Table {{ order.tableNumber }}
        </div>

        <!-- Items - Large and clear -->
        <div class="mb-4 space-y-2">
          <div
            v-for="item in order.items"
            :key="item.dishId"
            class="flex items-start gap-2 rounded-lg bg-white/70 p-2"
          >
            <span class="text-xl font-bold text-orange-600">{{ item.quantity }}×</span>
            <div class="flex-1">
              <span class="font-medium text-gray-900">{{ item.name }}</span>
              <div v-if="item.specialInstructions" class="mt-1 text-sm italic text-orange-600">
                📝 {{ item.specialInstructions }}
              </div>
            </div>
          </div>
        </div>

        <!-- Special instructions -->
        <div v-if="order.specialInstructions" class="mb-4 rounded-lg bg-orange-100 p-2">
          <p class="text-sm font-medium text-orange-800">📝 {{ order.specialInstructions }}</p>
        </div>

        <!-- Quick action button -->
        <button
          v-if="canAdvanceStatus(order.status)"
          class="w-full rounded-xl py-3 text-center text-lg font-bold text-white shadow-md transition-colors"
          :class="[
            order.status === 'pending' ? 'bg-blue-600 hover:bg-blue-500' :
            order.status === 'confirmed' ? 'bg-purple-600 hover:bg-purple-500' :
            order.status === 'preparing' ? 'bg-green-600 hover:bg-green-500' :
            'bg-orange-600 hover:bg-orange-500'
          ]"
          @click="handleQuickStatusUpdate(order)"
        >
          <span class="mr-2">{{ getNextStatusIcon(order.status) }}</span>
          {{ getNextStatusLabel(order.status) }}
        </button>
      </div>
    </div>

    <!-- Orders list (Normal Mode) -->
    <div v-else-if="filteredOrders.length > 0" class="space-y-4">
      <!-- Select all checkbox -->
      <div v-if="selectedStatus === 'active' || selectedStatus === 'pending' || selectedStatus === 'preparing'" class="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2">
        <label class="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            :checked="selectedOrders.size === filteredOrders.filter(o => canAdvanceStatus(o.status)).length && selectedOrders.size > 0"
            @change="selectAllOrders"
          />
          Tout sélectionner
        </label>
      </div>

      <TransitionGroup name="order-list">
        <div
          v-for="order in filteredOrders"
          :key="order._id"
          class="overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md"
          :class="[getUrgencyStyles(getUrgencyLevel(order)), selectedOrders.has(order._id) ? 'ring-2 ring-orange-500' : '']"
        >
          <div class="flex flex-col lg:flex-row">
            <!-- Selection checkbox -->
            <div v-if="canAdvanceStatus(order.status)" class="flex items-center pl-4 pt-4 lg:pt-0">
              <input
                type="checkbox"
                class="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                :checked="selectedOrders.has(order._id)"
                @change="toggleOrderSelection(order._id)"
              />
            </div>

            <!-- Order info -->
            <div class="flex-1 p-5">
              <!-- Header row -->
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex flex-wrap items-center gap-3">
                  <!-- Status badge -->
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
                    :class="[statusConfig[order.status].bgColor, statusConfig[order.status].color, statusConfig[order.status].borderColor]"
                  >
                    <span>{{ statusConfig[order.status].icon }}</span>
                    {{ statusConfig[order.status].label }}
                  </span>

                  <!-- Payment status badge -->
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="[paymentStatusConfig[order.paymentStatus]?.bgColor || 'bg-gray-50', paymentStatusConfig[order.paymentStatus]?.color || 'text-gray-700']"
                  >
                    {{ order.paymentStatus === 'paid' ? '💳' : '⏳' }}
                    {{ paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus }}
                  </span>

                  <!-- Urgency badge -->
                  <span
                    v-if="getUrgencyLevel(order) !== 'normal'"
                    class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
                    :class="getUrgencyLevel(order) === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'"
                  >
                    {{ getUrgencyLevel(order) === 'danger' ? '🚨 Urgent!' : '⚠️ +10min' }}
                  </span>
                </div>

                <div class="text-right">
                  <p class="text-xl font-bold text-gray-900">{{ formatCurrency(order.total) }}</p>
                </div>
              </div>

              <!-- Order details -->
              <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span class="text-lg font-semibold text-gray-900">#{{ order.orderNumber }}</span>
                <span v-if="order.tableNumber" class="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700">
                  🪑 Table {{ order.tableNumber }}
                </span>
                <span v-if="order.customerName" class="text-gray-600">{{ order.customerName }}</span>
                <span class="text-gray-400">{{ formatTime(order.createdAt) }}</span>
                <span
                  v-if="['pending', 'confirmed', 'preparing'].includes(order.status)"
                  class="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                >
                  ⏱️ {{ getTimeSinceCreation(order.createdAt) }}
                </span>
              </div>

              <!-- Items preview -->
              <div class="mt-4 rounded-xl bg-gray-50 p-3">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="item in order.items.slice(0, 4)"
                    :key="item.dishId"
                    class="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 text-sm shadow-sm ring-1 ring-gray-100"
                  >
                    <span class="font-medium text-orange-600">{{ item.quantity }}×</span>
                    <span class="ml-1.5 text-gray-700">{{ item.name }}</span>
                  </span>
                  <span v-if="order.items.length > 4" class="inline-flex items-center rounded-lg bg-gray-200 px-2.5 py-1.5 text-sm text-gray-600">
                    +{{ order.items.length - 4 }} autre(s)
                  </span>
                </div>
              </div>

              <!-- Special instructions -->
              <div v-if="order.specialInstructions" class="mt-3 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <span class="text-lg">📝</span>
                <p class="text-sm text-orange-800">{{ order.specialInstructions }}</p>
              </div>
            </div>

            <!-- Actions sidebar -->
            <div class="flex flex-row border-t border-gray-100 bg-gray-50/80 lg:w-48 lg:flex-col lg:border-l lg:border-t-0">
              <!-- View details -->
              <button
                class="flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                @click="openDetailModal(order)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Détails</span>
              </button>

              <!-- Print -->
              <button
                class="flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                @click="printOrder(order)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimer</span>
              </button>

              <!-- Edit -->
              <button
                v-if="canEditOrder(order.status)"
                class="flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                @click="openEditModal(order)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Modifier</span>
              </button>

              <!-- Advance status -->
              <button
                v-if="canAdvanceStatus(order.status)"
                class="flex flex-1 items-center justify-center gap-2 bg-orange-600 px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
                :disabled="isUpdatingStatus"
                @click="handleQuickStatusUpdate(order)"
              >
                <span class="text-lg">{{ getNextStatusIcon(order.status) }}</span>
                <span>{{ getNextStatusLabel(order.status) }}</span>
              </button>

              <!-- Cancel -->
              <button
                v-if="canCancelStatus(order.status)"
                class="flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                @click="openCancelModal(order)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Annuler</span>
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Empty state -->
    <div v-else class="rounded-2xl bg-white p-16 text-center shadow-sm">
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <span class="text-4xl">📋</span>
      </div>
      <h3 class="text-xl font-semibold text-gray-900">Aucune commande</h3>
      <p class="mt-2 text-gray-500">
        {{ selectedStatus === 'active' ? 'Les nouvelles commandes apparaîtront ici.' : `Aucune commande ${statusTabs.find(t => t.value === selectedStatus)?.label.toLowerCase()}.` }}
      </p>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetailModal && selectedOrder"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closeDetailModal"
        >
          <div class="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <!-- Header -->
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h3 class="text-xl font-bold text-gray-900">
                  Commande #{{ selectedOrder.orderNumber }}
                </h3>
                <p class="mt-0.5 text-sm text-gray-500">{{ formatDate(selectedOrder.createdAt) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <!-- Edit button -->
                <button
                  v-if="canEditOrder(selectedOrder.status)"
                  class="rounded-lg p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                  @click="closeDetailModal(); openEditModal(selectedOrder)"
                  title="Modifier la commande"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  @click="printOrder(selectedOrder)"
                  title="Imprimer"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                <button
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  @click="closeDetailModal"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
              <!-- Status and Payment -->
              <div class="mb-6 flex flex-wrap items-center gap-3">
                <span
                  class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                  :class="[statusConfig[selectedOrder.status].bgColor, statusConfig[selectedOrder.status].color, statusConfig[selectedOrder.status].borderColor]"
                >
                  <span class="text-lg">{{ statusConfig[selectedOrder.status].icon }}</span>
                  {{ statusConfig[selectedOrder.status].label }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
                  :class="[paymentStatusConfig[selectedOrder.paymentStatus]?.bgColor || 'bg-gray-50', paymentStatusConfig[selectedOrder.paymentStatus]?.color || 'text-gray-700']"
                >
                  {{ selectedOrder.paymentStatus === 'paid' ? '💳' : '⏳' }}
                  {{ paymentStatusConfig[selectedOrder.paymentStatus]?.label || selectedOrder.paymentStatus }}
                </span>
              </div>

              <!-- Order Timeline -->
              <div class="mb-6 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 p-4">
                <h4 class="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <span>📅</span> Historique
                </h4>
                <div class="relative">
                  <div class="absolute left-3 top-0 h-full w-0.5 bg-gray-300"></div>
                  <div class="space-y-3">
                    <div
                      v-for="(event, index) in getOrderTimeline(selectedOrder)"
                      :key="index"
                      class="relative flex items-center gap-3 pl-8"
                    >
                      <div class="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm shadow-sm ring-2 ring-gray-300">
                        {{ event.icon }}
                      </div>
                      <div class="flex flex-1 items-center justify-between">
                        <span class="text-sm font-medium text-gray-900">{{ event.label }}</span>
                        <span class="text-xs text-gray-500">{{ formatTime(event.time) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Customer info -->
              <div class="mb-6 rounded-xl bg-gray-50 p-4">
                <h4 class="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <span>👤</span> Informations client
                </h4>
                <div class="grid gap-3 text-sm sm:grid-cols-2">
                  <div v-if="selectedOrder.tableNumber" class="flex items-center gap-2">
                    <span class="text-gray-400">🪑</span>
                    <span class="text-gray-500">Table:</span>
                    <span class="font-medium text-gray-900">{{ selectedOrder.tableNumber }}</span>
                  </div>
                  <div v-if="selectedOrder.customerName" class="flex items-center gap-2">
                    <span class="text-gray-400">👤</span>
                    <span class="text-gray-500">Nom:</span>
                    <span class="font-medium text-gray-900">{{ selectedOrder.customerName }}</span>
                  </div>
                  <div v-if="selectedOrder.customerPhone" class="flex items-center gap-2">
                    <span class="text-gray-400">📞</span>
                    <span class="text-gray-500">Téléphone:</span>
                    <a :href="`tel:${selectedOrder.customerPhone}`" class="font-medium text-orange-600 hover:underline">
                      {{ selectedOrder.customerPhone }}
                    </a>
                  </div>
                  <div v-if="selectedOrder.customerEmail" class="flex items-center gap-2">
                    <span class="text-gray-400">✉️</span>
                    <span class="text-gray-500">Email:</span>
                    <a :href="`mailto:${selectedOrder.customerEmail}`" class="font-medium text-orange-600 hover:underline">
                      {{ selectedOrder.customerEmail }}
                    </a>
                  </div>
                </div>
              </div>

              <!-- Order items -->
              <div class="mb-6">
                <h4 class="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <span>🍽️</span> Articles commandés
                </h4>
                <div class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                  <div
                    v-for="(item, index) in selectedOrder.items"
                    :key="index"
                    class="flex items-start justify-between p-4"
                  >
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="rounded-lg bg-orange-100 px-2 py-1 text-sm font-bold text-orange-600">
                          {{ item.quantity }}×
                        </span>
                        <span class="font-medium text-gray-900">{{ item.name }}</span>
                      </div>
                      <div v-if="item.options?.length" class="mt-2 text-sm text-gray-500">
                        Options: {{ item.options.map(o => o.name).join(', ') }}
                      </div>
                      <div v-if="item.variant" class="mt-1 text-sm text-gray-500">
                        Variante: {{ item.variant.name }}
                      </div>
                      <div v-if="item.specialInstructions" class="mt-2 flex items-start gap-1.5 text-sm italic text-orange-600">
                        <span>📝</span>
                        {{ item.specialInstructions }}
                      </div>
                    </div>
                    <span class="font-semibold text-gray-900">{{ formatCurrency(item.subtotal) }}</span>
                  </div>
                </div>
              </div>

              <!-- Special instructions -->
              <div v-if="selectedOrder.specialInstructions" class="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <h4 class="mb-2 flex items-center gap-2 font-semibold text-orange-800">
                  <span>📝</span> Instructions spéciales
                </h4>
                <p class="text-orange-700">{{ selectedOrder.specialInstructions }}</p>
              </div>

              <!-- Totals -->
              <div class="rounded-xl bg-gray-50 p-4">
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Sous-total</span>
                    <span class="text-gray-700">{{ formatCurrency(selectedOrder.subtotal) }}</span>
                  </div>
                  <div v-if="selectedOrder.tax" class="flex justify-between text-sm">
                    <span class="text-gray-500">TVA</span>
                    <span class="text-gray-700">{{ formatCurrency(selectedOrder.tax) }}</span>
                  </div>
                  <div class="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                    <span class="text-gray-900">Total</span>
                    <span class="text-orange-600">{{ formatCurrency(selectedOrder.total) }}</span>
                  </div>
                </div>
              </div>

              <!-- Cancel reason -->
              <div v-if="selectedOrder.status === 'cancelled' && selectedOrder.cancelReason" class="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <h4 class="mb-2 flex items-center gap-2 font-semibold text-red-800">
                  <span>❌</span> Raison de l'annulation
                </h4>
                <p class="text-red-700">{{ selectedOrder.cancelReason }}</p>
              </div>
            </div>

            <!-- Actions footer -->
            <div class="sticky bottom-0 flex flex-wrap gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <template v-if="statusFlow[selectedOrder.status]?.length">
                <button
                  v-for="nextStatus in statusFlow[selectedOrder.status]"
                  :key="nextStatus"
                  class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors"
                  :class="[
                    nextStatus === 'cancelled'
                      ? 'border-2 border-red-200 text-red-700 hover:bg-red-50'
                      : 'bg-orange-600 text-white shadow-md hover:bg-orange-500',
                  ]"
                  :disabled="isUpdatingStatus"
                  @click="nextStatus === 'cancelled' ? openCancelModal(selectedOrder) : updateOrderStatus(selectedOrder, nextStatus)"
                >
                  <svg
                    v-if="isUpdatingStatus"
                    class="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{{ statusConfig[nextStatus].icon }}</span>
                  {{ statusConfig[nextStatus].label }}
                </button>
              </template>
              <button
                class="ml-auto rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="closeDetailModal"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCancelModal && orderToCancel"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closeCancelModal"
        >
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div class="mb-6 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <span class="text-3xl">❌</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Annuler la commande ?</h3>
              <p class="mt-2 text-gray-500">
                Commande #{{ orderToCancel.orderNumber }}
              </p>
            </div>

            <div class="mb-6">
              <label class="mb-2 block text-sm font-medium text-gray-700">
                Raison de l'annulation (optionnel)
              </label>
              <textarea
                v-model="cancelReason"
                rows="3"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="Ex: Client a changé d'avis, rupture de stock..."
              ></textarea>
            </div>

            <div class="flex gap-3">
              <button
                class="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="closeCancelModal"
              >
                Retour
              </button>
              <button
                class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
                :disabled="isUpdatingStatus"
                @click="confirmCancelOrder"
              >
                <span v-if="isUpdatingStatus">Annulation...</span>
                <span v-else>Confirmer l'annulation</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Order Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showEditModal && orderToEdit"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          @click.self="closeEditModal"
        >
          <div class="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <!-- Header -->
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
              <div>
                <h3 class="text-xl font-bold">
                  Modifier la commande #{{ orderToEdit.orderNumber }}
                </h3>
                <p class="mt-0.5 text-sm text-blue-100">Ajoutez, modifiez ou supprimez des articles</p>
              </div>
              <button
                class="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white"
                @click="closeEditModal"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
              <!-- Add dish section -->
              <div class="mb-6">
                <label class="mb-2 block text-sm font-medium text-gray-700">
                  Ajouter un plat
                </label>
                <div class="relative">
                  <input
                    v-model="dishSearchQuery"
                    type="text"
                    class="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Rechercher un plat à ajouter..."
                    @focus="showAddDishDropdown = true"
                  />
                  <svg class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>

                  <!-- Dropdown -->
                  <div
                    v-if="showAddDishDropdown && (dishSearchQuery || filteredDishes.length > 0)"
                    class="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                  >
                    <div v-if="isLoadingDishes" class="px-4 py-3 text-center text-sm text-gray-500">
                      Chargement...
                    </div>
                    <div v-else-if="filteredDishes.length === 0" class="px-4 py-3 text-center text-sm text-gray-500">
                      Aucun plat trouvé
                    </div>
                    <button
                      v-else
                      v-for="dish in filteredDishes.slice(0, 10)"
                      :key="dish._id"
                      class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                      @click="addDishToOrder(dish)"
                    >
                      <div>
                        <p class="font-medium text-gray-900">{{ dish.name.fr }}</p>
                        <p v-if="dish.name.en" class="text-xs text-gray-500">{{ dish.name.en }}</p>
                      </div>
                      <span class="font-semibold text-blue-600">{{ formatCurrency(dish.price) }}</span>
                    </button>
                  </div>
                </div>
                <button
                  v-if="showAddDishDropdown"
                  class="mt-2 text-sm text-gray-500 hover:text-gray-700"
                  @click="showAddDishDropdown = false; dishSearchQuery = ''"
                >
                  Fermer la recherche
                </button>
              </div>

              <!-- Current items -->
              <div class="mb-6">
                <h4 class="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <span>🍽️</span> Articles de la commande
                </h4>
                <div class="space-y-3">
                  <div
                    v-for="(item, index) in editableItems"
                    :key="index"
                    class="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <!-- Item info -->
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">{{ item.name }}</p>
                      <p class="text-sm text-gray-500">{{ formatCurrency(item.price) }} / unité</p>
                      <div v-if="item.options?.length" class="mt-1 text-xs text-gray-500">
                        Options: {{ item.options.map(o => o.name).join(', ') }}
                      </div>
                      <!-- Item special instructions -->
                      <input
                        v-model="item.specialInstructions"
                        type="text"
                        class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                        placeholder="Instructions spéciales pour cet article..."
                      />
                    </div>

                    <!-- Quantity controls -->
                    <div class="flex items-center gap-2">
                      <button
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                        @click="updateItemQuantity(index, -1)"
                        :disabled="item.quantity <= 1"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                        </svg>
                      </button>
                      <span class="w-8 text-center font-bold text-gray-900">{{ item.quantity }}</span>
                      <button
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                        @click="updateItemQuantity(index, 1)"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    <!-- Subtotal -->
                    <div class="w-24 text-right">
                      <p class="font-bold text-gray-900">{{ formatCurrency(item.subtotal) }}</p>
                    </div>

                    <!-- Remove button -->
                    <button
                      class="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      @click="removeItem(index)"
                      title="Supprimer cet article"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Order special instructions -->
              <div class="mb-6">
                <label class="mb-2 block text-sm font-medium text-gray-700">
                  Instructions générales de la commande
                </label>
                <textarea
                  v-model="editOrderInstructions"
                  rows="2"
                  class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Allergies, préférences de cuisson..."
                ></textarea>
              </div>

              <!-- Total -->
              <div class="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <div class="flex items-center justify-between text-lg font-bold">
                  <span class="text-gray-900">Nouveau total</span>
                  <span class="text-blue-600">{{ formatCurrency(editTotal) }}</span>
                </div>
                <p v-if="orderToEdit && editTotal !== orderToEdit.total" class="mt-1 text-sm text-gray-500">
                  Ancien total: {{ formatCurrency(orderToEdit.total) }}
                  <span :class="editTotal > orderToEdit.total ? 'text-green-600' : 'text-red-600'">
                    ({{ editTotal > orderToEdit.total ? '+' : '' }}{{ formatCurrency(editTotal - orderToEdit.total) }})
                  </span>
                </p>
              </div>
            </div>

            <!-- Actions footer -->
            <div class="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <button
                class="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="closeEditModal"
              >
                Annuler
              </button>
              <button
                class="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                :disabled="isSavingOrder || editableItems.length === 0"
                @click="saveOrderChanges"
              >
                <span v-if="isSavingOrder" class="flex items-center justify-center gap-2">
                  <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enregistrement...
                </span>
                <span v-else>Enregistrer les modifications</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast Notification -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="showToast"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-4 shadow-lg"
          :class="toastType === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
        >
          <span v-if="toastType === 'success'" class="text-xl">✓</span>
          <span v-else class="text-xl">✕</span>
          <span class="font-medium">{{ toastMessage }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}

/* Order list transitions */
.order-list-enter-active,
.order-list-leave-active {
  transition: all 0.4s ease;
}

.order-list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.order-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.order-list-move {
  transition: transform 0.4s ease;
}

/* Toast transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
