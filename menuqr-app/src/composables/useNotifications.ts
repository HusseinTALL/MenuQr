import { ref, onMounted, onUnmounted, computed } from 'vue';
import api from '@/services/api';
import { useSocket, useNotificationEvents } from '@/composables/useSocket';

export interface Notification {
  id: string;
  type: 'order' | 'reservation' | 'review' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

const POLL_INTERVAL = 60000; // 60 seconds (reduced from 30 since we have real-time now)

// Shared state across components
const notifications = ref<Notification[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeInstances = 0;
let socketListenersSetup = false;

export function useNotifications() {
  const { isConnected } = useSocket();
  const { onNotification } = useNotificationEvents();

  const fetchNotifications = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      // Fetch recent activity to create notifications
      const [ordersRes, reservationsRes, reviewsRes] = await Promise.all([
        api.getActiveOrders().catch(() => ({ success: false, data: [] })),
        api.getReservations({ status: 'pending' }).catch(() => ({ success: false, data: [] })),
        api.getAdminReviewStats().catch(() => ({ success: false, data: null })),
      ]);

      const newNotifications: Notification[] = [];

      // Create notifications from pending orders
      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        const pendingOrders = ordersRes.data.filter((o: any) => o.status === 'pending');
        pendingOrders.slice(0, 5).forEach((order: any) => {
          newNotifications.push({
            id: `order-${order._id}`,
            type: 'order',
            title: 'Nouvelle commande',
            message: `Commande #${order.orderNumber || order._id.slice(-6)} - Table ${order.tableNumber || 'N/A'}`,
            link: '/admin/orders',
            read: false,
            createdAt: new Date(order.createdAt),
          });
        });
      }

      // Create notifications from today's pending reservations
      if (reservationsRes.success && Array.isArray(reservationsRes.data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayReservations = reservationsRes.data.filter((r: any) => {
          const resDate = new Date(r.reservationDate);
          return resDate >= today && resDate < tomorrow && r.status === 'pending';
        });

        todayReservations.slice(0, 3).forEach((res: any) => {
          newNotifications.push({
            id: `reservation-${res._id}`,
            type: 'reservation',
            title: 'Réservation en attente',
            message: `${res.customerName} - ${res.partySize} personnes à ${res.timeSlot}`,
            link: '/admin/reservations',
            read: false,
            createdAt: new Date(res.createdAt),
          });
        });
      }

      // Create notification for pending reviews
      if (reviewsRes.success && reviewsRes.data && reviewsRes.data.pending > 0) {
        newNotifications.push({
          id: 'reviews-pending',
          type: 'review',
          title: 'Avis en attente',
          message: `${reviewsRes.data.pending} avis à modérer`,
          link: '/admin/reviews',
          read: false,
          createdAt: new Date(),
        });
      }

      // Sort by date, most recent first
      newNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      notifications.value = newNotifications;
    } catch (e) {
      error.value = 'Erreur de chargement des notifications';
      console.error('Notifications error:', e);
    } finally {
      isLoading.value = false;
    }
  };

  // Add notification from socket event
  const addSocketNotification = (data: {
    id: string;
    type: 'order' | 'reservation' | 'review' | 'system';
    title: string;
    message: string;
    link?: string;
    createdAt: string;
  }) => {
    // Check if notification already exists
    const exists = notifications.value.some(n => n.id === data.id);
    if (!exists) {
      notifications.value.unshift({
        ...data,
        read: false,
        createdAt: new Date(data.createdAt),
      });
      // Keep only last 100 notifications
      if (notifications.value.length > 100) {
        notifications.value.pop();
      }
    }
  };

  const setupSocketListeners = () => {
    if (socketListenersSetup) {return;}
    socketListenersSetup = true;

    // Listen for real-time notifications via socket
    onNotification((data) => {
      addSocketNotification(data);
    });
  };

  const startPolling = () => {
    activeInstances++;

    if (activeInstances === 1) {
      // Initial fetch
      fetchNotifications();
      // Setup socket listeners
      setupSocketListeners();
      // Setup polling as fallback (reduced frequency)
      pollTimer = setInterval(fetchNotifications, POLL_INTERVAL);
    }
  };

  const stopPolling = () => {
    activeInstances--;

    if (activeInstances === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const markAsRead = (id: string) => {
    const notification = notifications.value.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  };

  const markAllAsRead = () => {
    notifications.value.forEach(n => n.read = true);
  };

  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length;
  });

  const hasUnread = computed(() => unreadCount.value > 0);

  onMounted(() => {
    startPolling();
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    hasUnread,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addSocketNotification,
    startPolling,
    stopPolling,
  };
}
