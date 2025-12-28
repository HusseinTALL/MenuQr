import { ref, onMounted, onUnmounted, computed } from 'vue';
import api from '@/services/api';
import { useSocket, useOrderEvents, useReservationEvents, useReviewEvents } from '@/composables/useSocket';

interface SidebarBadges {
  pendingOrders: number;
  todayReservations: number;
  pendingReviews: number;
}

const POLL_INTERVAL = 60000; // 60 seconds (reduced since we have real-time updates)

// Shared state
const badges = ref<SidebarBadges>({
  pendingOrders: 0,
  todayReservations: 0,
  pendingReviews: 0,
});
let socketListenersSetup = false;

export function useSidebarBadges() {
  const { isConnected } = useSocket();
  const { onNewOrder, onOrderUpdated } = useOrderEvents();
  const { onNewReservation, onReservationUpdated } = useReservationEvents();
  const { onNewReview } = useReviewEvents();

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const fetchBadges = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      // Fetch all badge data in parallel
      const [ordersRes, reservationsRes, reviewsRes] = await Promise.all([
        api.getActiveOrders().catch(() => ({ success: false, data: [] })),
        api.getReservations({ status: 'pending' }).catch(() => ({ success: false, data: [] })),
        api.getAdminReviewStats().catch(() => ({ success: false, data: null })),
      ]);

      // Count pending orders
      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        badges.value.pendingOrders = ordersRes.data.filter(
          (o: any) => o.status === 'pending'
        ).length;
      }

      // Count today's pending reservations
      if (reservationsRes.success && Array.isArray(reservationsRes.data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        badges.value.todayReservations = reservationsRes.data.filter((r: any) => {
          const resDate = new Date(r.reservationDate);
          return resDate >= today && resDate < tomorrow && r.status === 'pending';
        }).length;
      }

      // Count pending reviews
      if (reviewsRes.success && reviewsRes.data) {
        badges.value.pendingReviews = reviewsRes.data.pending || 0;
      }
    } catch (e) {
      error.value = 'Failed to fetch badges';
      console.error('Sidebar badges error:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const setupSocketListeners = () => {
    if (socketListenersSetup) {return;}
    socketListenersSetup = true;

    // Listen for new orders
    onNewOrder((data) => {
      if (data.status === 'pending') {
        badges.value.pendingOrders++;
      }
    });

    // Listen for order updates
    onOrderUpdated((data) => {
      // If order was pending and is now something else, decrement
      if (data.status !== 'pending') {
        badges.value.pendingOrders = Math.max(0, badges.value.pendingOrders - 1);
      }
    });

    // Listen for new reservations
    onNewReservation((data) => {
      if (data.status === 'pending') {
        badges.value.todayReservations++;
      }
    });

    // Listen for reservation updates
    onReservationUpdated((data) => {
      if (data.status !== 'pending') {
        badges.value.todayReservations = Math.max(0, badges.value.todayReservations - 1);
      }
    });

    // Listen for new reviews
    onNewReview(() => {
      badges.value.pendingReviews++;
    });
  };

  const startPolling = () => {
    // Initial fetch
    fetchBadges();

    // Setup socket listeners for real-time updates
    setupSocketListeners();

    // Setup polling as fallback (reduced frequency)
    pollTimer = setInterval(fetchBadges, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  // Computed for total badges (useful for mobile indicator)
  const totalBadges = computed(() => {
    return badges.value.pendingOrders +
           badges.value.todayReservations +
           badges.value.pendingReviews;
  });

  onMounted(() => {
    startPolling();
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    badges,
    isLoading,
    error,
    totalBadges,
    isConnected,
    fetchBadges,
    startPolling,
    stopPolling,
  };
}
