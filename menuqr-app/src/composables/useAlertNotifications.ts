import { ref, onMounted, onUnmounted, computed } from 'vue';
import api, { type SystemAlertEntry } from '@/services/api';

// Singleton state for alerts (shared across components)
const alertStats = ref<{
  total: { unresolved: number; resolved: number; critical: number; last24h: number };
  byType: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  byPriority: { _id: string; count: number }[];
  unresolvedByPriority: Record<string, { count: number; unacknowledged: number }>;
} | null>(null);

const recentAlerts = ref<SystemAlertEntry[]>([]);
const isLoading = ref(false);
const lastFetchTime = ref<Date | null>(null);
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null);

// Polling interval in ms (30 seconds)
const POLL_INTERVAL = 30000;

// Track subscribers to manage polling lifecycle
let subscriberCount = 0;

export function useAlertNotifications() {
  const unreadCount = computed(() => {
    if (!alertStats.value) {return 0;}
    // Count unresolved non-acknowledged alerts
    const byPriority = alertStats.value.unresolvedByPriority;
    if (!byPriority) {return alertStats.value.total?.unresolved || 0;}

    let unacknowledged = 0;
    for (const key in byPriority) {
      unacknowledged += byPriority[key]?.unacknowledged || 0;
    }
    return unacknowledged || alertStats.value.total?.unresolved || 0;
  });

  const criticalCount = computed(() => {
    return alertStats.value?.total?.critical || 0;
  });

  const hasCritical = computed(() => criticalCount.value > 0);

  const fetchAlertStats = async () => {
    if (isLoading.value) {return;}

    isLoading.value = true;
    try {
      const response = await api.getSystemAlertStats();
      if (response.success && response.data) {
        alertStats.value = response.data;
        lastFetchTime.value = new Date();
      }
    } catch (_error) {
      console.error('Failed to fetch alert stats:');
    } finally {
      isLoading.value = false;
    }
  };

  const fetchRecentAlerts = async (limit = 5) => {
    try {
      const response = await api.getSystemAlerts({
        limit,
        isResolved: false,
      });
      if (response.success && response.data) {
        // Sort by date descending (most recent first)
        recentAlerts.value = response.data.alerts.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (_error) {
      console.error('Failed to fetch recent alerts:');
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchAlertStats(), fetchRecentAlerts()]);
  };

  const startPolling = () => {
    if (pollInterval.value) {return;} // Already polling

    // Initial fetch
    refreshAll();

    // Start interval
    pollInterval.value = setInterval(() => {
      fetchAlertStats();
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollInterval.value) {
      clearInterval(pollInterval.value);
      pollInterval.value = null;
    }
  };

  // Manage subscriber lifecycle
  onMounted(() => {
    subscriberCount++;
    if (subscriberCount === 1) {
      startPolling();
    }
  });

  onUnmounted(() => {
    subscriberCount--;
    if (subscriberCount === 0) {
      stopPolling();
    }
  });

  return {
    // State
    alertStats,
    recentAlerts,
    isLoading,
    lastFetchTime,

    // Computed
    unreadCount,
    criticalCount,
    hasCritical,

    // Methods
    fetchAlertStats,
    fetchRecentAlerts,
    refreshAll,
    startPolling,
    stopPolling,
  };
}
