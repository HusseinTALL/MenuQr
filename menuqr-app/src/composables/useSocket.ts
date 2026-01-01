/**
 * Socket.io Composable for Real-Time Features
 * Handles WebSocket connections for orders, notifications, and KDS
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAdminAuthStore } from '@/stores/adminAuth';

// Types
interface OrderEventData {
  orderId: string;
  orderNumber: string;
  status: string;
  tableNumber?: number;
  items?: Array<{ name: string; quantity: number }>;
  total?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface NotificationEventData {
  id: string;
  type: 'order' | 'reservation' | 'review' | 'system';
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

interface ReservationEventData {
  reservationId: string;
  customerName: string;
  partySize: number;
  timeSlot: string;
  status: string;
  tableId?: string;
}

interface ReviewEventData {
  reviewId: string;
  rating: number;
  comment?: string;
  customerName?: string;
}

interface OrderReadyEventData {
  orderId: string;
  orderNumber: string;
  message: string;
}

// Singleton socket instance
let socket: Socket | null = null;
const isConnected = ref(false);
const connectionError = ref<string | null>(null);

/**
 * Main socket composable for admin dashboard
 */
export function useSocket() {
  const adminAuth = useAdminAuthStore();

  const connect = () => {
    // If already connected with same token, skip
    if (socket?.connected) {return;}

    // Disconnect existing socket if any (for reconnecting with new token)
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    // In development, connect to same origin (Vite proxies /socket.io to backend)
    // In production, use VITE_API_URL or same origin
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const token = adminAuth.token;

    // Don't connect without a token
    if (!token) {
      console.info('[Socket] No token available, skipping connection');
      return;
    }

    socket = io(apiUrl, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      // For Vite proxy compatibility
      path: '/socket.io',
    });

    socket.on('connect', () => {
      isConnected.value = true;
      connectionError.value = null;
      console.info('[Socket] Connected');
    });

    socket.on('disconnect', (reason) => {
      isConnected.value = false;
      console.info('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      connectionError.value = error.message;
      console.error('[Socket] Connection error:', error.message);

      // If auth error, don't keep retrying with stale token
      if (error.message.includes('auth') || error.message.includes('token') || error.message.includes('unauthorized')) {
        console.info('[Socket] Auth error, stopping reconnection');
        socket?.disconnect();
      }
    });
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected.value = false;
    }
  };

  const reconnect = () => {
    disconnect();
    if (adminAuth.isAuthenticated && adminAuth.token) {
      connect();
    }
  };

  // Auto-connect when authenticated
  watch(
    () => adminAuth.isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        connect();
      } else {
        disconnect();
      }
    },
    { immediate: true }
  );

  // Reconnect when token changes (e.g., after refresh)
  watch(
    () => adminAuth.token,
    (newToken, oldToken) => {
      if (newToken && newToken !== oldToken && adminAuth.isAuthenticated) {
        console.info('[Socket] Token changed, reconnecting...');
        reconnect();
      }
    }
  );

  onUnmounted(() => {
    // Don't disconnect on unmount - keep connection alive for other components
  });

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    reconnect,
    socket: () => socket,
  };
}

/**
 * Hook for order events (admin dashboard)
 */
export function useOrderEvents() {
  const newOrders = ref<OrderEventData[]>([]);
  const orderUpdates = ref<OrderEventData[]>([]);

  const onNewOrder = (callback: (data: OrderEventData) => void) => {
    socket?.on('order:new', callback);
    return () => socket?.off('order:new', callback);
  };

  const onOrderUpdated = (callback: (data: OrderEventData) => void) => {
    socket?.on('order:updated', callback);
    return () => socket?.off('order:updated', callback);
  };

  onMounted(() => {
    socket?.on('order:new', (data: OrderEventData) => {
      newOrders.value.unshift(data);
      // Keep only last 50
      if (newOrders.value.length > 50) {
        newOrders.value.pop();
      }
    });

    socket?.on('order:updated', (data: OrderEventData) => {
      orderUpdates.value.unshift(data);
      if (orderUpdates.value.length > 50) {
        orderUpdates.value.pop();
      }
    });
  });

  onUnmounted(() => {
    socket?.off('order:new');
    socket?.off('order:updated');
  });

  return {
    newOrders,
    orderUpdates,
    onNewOrder,
    onOrderUpdated,
  };
}

/**
 * Hook for notification events (admin dashboard)
 */
export function useNotificationEvents() {
  const notifications = ref<NotificationEventData[]>([]);

  const onNotification = (callback: (data: NotificationEventData) => void) => {
    socket?.on('notification:new', callback);
    return () => socket?.off('notification:new', callback);
  };

  const clearNotification = (id: string) => {
    notifications.value = notifications.value.filter((n) => n.id !== id);
  };

  const clearAll = () => {
    notifications.value = [];
  };

  onMounted(() => {
    socket?.on('notification:new', (data: NotificationEventData) => {
      notifications.value.unshift(data);
      // Keep only last 100
      if (notifications.value.length > 100) {
        notifications.value.pop();
      }
    });
  });

  onUnmounted(() => {
    socket?.off('notification:new');
  });

  return {
    notifications,
    onNotification,
    clearNotification,
    clearAll,
  };
}

/**
 * Hook for reservation events (admin dashboard)
 */
export function useReservationEvents() {
  const onNewReservation = (callback: (data: ReservationEventData) => void) => {
    socket?.on('reservation:new', callback);
    return () => socket?.off('reservation:new', callback);
  };

  const onReservationUpdated = (callback: (data: ReservationEventData) => void) => {
    socket?.on('reservation:updated', callback);
    return () => socket?.off('reservation:updated', callback);
  };

  return {
    onNewReservation,
    onReservationUpdated,
  };
}

/**
 * Hook for review events (admin dashboard)
 */
export function useReviewEvents() {
  const onNewReview = (callback: (data: ReviewEventData) => void) => {
    socket?.on('review:new', callback);
    return () => socket?.off('review:new', callback);
  };

  return {
    onNewReview,
  };
}

/**
 * Hook for KDS (Kitchen Display System)
 */
export function useKDS(restaurantId: string) {
  const orders = ref<OrderEventData[]>([]);
  const audioEnabled = ref(true);
  const audioContext = ref<AudioContext | null>(null);

  // Initialize audio context on user interaction
  const initAudio = () => {
    if (!audioContext.value) {
      audioContext.value = new AudioContext();
    }
    return audioContext.value;
  };

  // Play notification sound
  const playSound = async (type: 'new-order' | 'order-ready' = 'new-order') => {
    if (!audioEnabled.value) {return;}

    try {
      const ctx = initAudio();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'new-order') {
        // Double beep for new orders
        oscillator.frequency.value = 880; // A5
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1046.5; // C6
          gain2.gain.value = 0.3;
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 200);
      } else {
        // Single tone for ready
        oscillator.frequency.value = 523.25; // C5
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (_error) {
      console.warn('[KDS] Audio playback failed:', _error);
    }
  };

  // Join KDS room
  const joinKDS = () => {
    socket?.emit('join:kds', restaurantId);
  };

  // Acknowledge order
  const acknowledgeOrder = (orderId: string) => {
    socket?.emit('order:acknowledge', { orderId, restaurantId });
  };

  onMounted(() => {
    joinKDS();

    // Handle new orders for KDS
    socket?.on('kds:new-order', (data: OrderEventData & { sound?: string }) => {
      orders.value.unshift(data);
      if (data.sound === 'new-order') {
        playSound('new-order');
      }
    });

    // Handle order updates
    socket?.on('kds:order-updated', (data: OrderEventData) => {
      const index = orders.value.findIndex((o) => o.orderId === data.orderId);
      if (index !== -1) {
        orders.value[index] = data;
      }
    });

    // Handle order ready
    socket?.on('kds:order-ready', (data: OrderEventData) => {
      const index = orders.value.findIndex((o) => o.orderId === data.orderId);
      if (index !== -1) {
        orders.value.splice(index, 1);
      }
      playSound('order-ready');
    });

    // Handle acknowledgment
    socket?.on('order:acknowledged', (data: { orderId: string; acknowledgedBy: string }) => {
      const index = orders.value.findIndex((o) => o.orderId === data.orderId);
      if (index !== -1) {
        const currentOrder = orders.value[index];
        if (currentOrder) {
          orders.value[index] = {
            ...currentOrder,
            status: 'acknowledged',
          };
        }
      }
    });
  });

  onUnmounted(() => {
    socket?.off('kds:new-order');
    socket?.off('kds:order-updated');
    socket?.off('kds:order-ready');
    socket?.off('order:acknowledged');
    audioContext.value?.close();
  });

  return {
    orders,
    audioEnabled,
    playSound,
    acknowledgeOrder,
    initAudio,
  };
}

/**
 * Hook for customer order tracking
 */
export function useOrderTracking(orderId: string) {
  const status = ref<string>('pending');
  const isReady = ref(false);
  const readyMessage = ref<string>('');

  const joinOrder = () => {
    socket?.emit('join:order', orderId);
  };

  const leaveOrder = () => {
    socket?.emit('leave:order', orderId);
  };

  onMounted(() => {
    joinOrder();

    socket?.on('order:status', (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId) {
        status.value = data.status;
      }
    });

    socket?.on('order:ready', (data: OrderReadyEventData) => {
      if (data.orderId === orderId) {
        isReady.value = true;
        readyMessage.value = data.message;
        status.value = 'ready';
      }
    });
  });

  onUnmounted(() => {
    leaveOrder();
    socket?.off('order:status');
    socket?.off('order:ready');
  });

  return {
    status,
    isReady,
    readyMessage,
  };
}

/**
 * Hook for menu updates (public)
 */
export function useMenuUpdates(restaurantId: string) {
  const hasUpdates = ref(false);
  const lastUpdate = ref<Date | null>(null);

  const joinRestaurant = () => {
    socket?.emit('join:restaurant', restaurantId);
  };

  const leaveRestaurant = () => {
    socket?.emit('leave:restaurant', restaurantId);
  };

  const acknowledgeUpdate = () => {
    hasUpdates.value = false;
  };

  onMounted(() => {
    joinRestaurant();

    socket?.on('menu:updated', (data: { type: string; timestamp: string }) => {
      hasUpdates.value = true;
      lastUpdate.value = new Date(data.timestamp);
    });
  });

  onUnmounted(() => {
    leaveRestaurant();
    socket?.off('menu:updated');
  });

  return {
    hasUpdates,
    lastUpdate,
    acknowledgeUpdate,
  };
}

/**
 * Hook for driver socket connection
 */
export function useDriverSocket() {
  const isConnected = ref(false);
  let driverSocket: Socket | null = null;

  const connect = (token: string) => {
    if (driverSocket?.connected) {return;}

    if (driverSocket) {
      driverSocket.disconnect();
      driverSocket = null;
    }

    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

    driverSocket = io(apiUrl, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });

    driverSocket.on('connect', () => {
      isConnected.value = true;
      console.info('[DriverSocket] Connected');
    });

    driverSocket.on('disconnect', (reason) => {
      isConnected.value = false;
      console.info('[DriverSocket] Disconnected:', reason);
    });

    driverSocket.on('connect_error', (error) => {
      console.error('[DriverSocket] Connection error:', error.message);
    });
  };

  const disconnect = () => {
    if (driverSocket) {
      driverSocket.disconnect();
      driverSocket = null;
      isConnected.value = false;
    }
  };

  const sendLocation = (data: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }) => {
    if (driverSocket?.connected) {
      driverSocket.emit('driver:location:update', data);
    }
  };

  const onDeliveryAssigned = (callback: (data: {
    deliveryId: string;
    orderId: string;
    pickupAddress: { street: string; city: string };
    deliveryAddress: { street: string; city: string };
    estimatedEarnings: number;
    restaurantName: string;
  }) => void) => {
    driverSocket?.on('delivery:assigned', callback);
    return () => driverSocket?.off('delivery:assigned', callback);
  };

  onUnmounted(() => {
    // Keep connection alive, don't disconnect on unmount
  });

  return {
    isConnected,
    connect,
    disconnect,
    sendLocation,
    onDeliveryAssigned,
    socket: () => driverSocket,
  };
}

/**
 * Hook for delivery tracking (customer view)
 */
export function useDeliveryTracking(deliveryId: string) {
  const driverLocation = ref<{
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp: number;
  } | null>(null);

  const eta = ref<{
    minutes: number;
    distanceMeters: number;
    updatedAt: number;
  } | null>(null);

  const deliveryStatus = ref<string>('pending');
  const isCompleted = ref(false);

  const joinDelivery = () => {
    socket?.emit('join:delivery', deliveryId);
  };

  const leaveDelivery = () => {
    socket?.emit('leave:delivery', deliveryId);
  };

  onMounted(() => {
    joinDelivery();

    // Listen for driver location updates
    socket?.on('driver:location', (data: {
      deliveryId: string;
      location: {
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
        timestamp: number;
      };
      eta?: {
        minutes: number;
        distanceMeters: number;
        updatedAt: number;
      } | null;
    }) => {
      if (data.deliveryId === deliveryId) {
        driverLocation.value = data.location;
        if (data.eta) {
          eta.value = data.eta;
        }
      }
    });

    // Listen for delivery status updates
    socket?.on('delivery:status', (data: {
      status: string;
      driverName?: string;
      eta?: number;
      updatedAt: Date;
    }) => {
      deliveryStatus.value = data.status;
      if (data.eta && eta.value) {
        eta.value.minutes = data.eta;
      }
    });

    // Listen for delivery completed
    socket?.on('delivery:completed', (_data: {
      orderId: string;
      completedAt: Date;
      podType?: string;
    }) => {
      isCompleted.value = true;
      deliveryStatus.value = 'delivered';
    });
  });

  onUnmounted(() => {
    leaveDelivery();
    socket?.off('driver:location');
    socket?.off('delivery:status');
    socket?.off('delivery:completed');
  });

  return {
    driverLocation,
    eta,
    deliveryStatus,
    isCompleted,
  };
}

export default useSocket;
