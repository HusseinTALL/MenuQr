import { ref, onMounted, onUnmounted } from 'vue';
import { useConfigStore } from '@/stores/configStore';

/**
 * Composable for offline detection and handling
 */
export function useOffline() {
  const configStore = useConfigStore();

  const isOffline = ref(!navigator.onLine);
  const wasOffline = ref(false);
  const showOnlineMessage = ref(false);

  let onlineMessageTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleOnline = () => {
    isOffline.value = false;
    configStore.setOfflineStatus(false);

    // Show "back online" message if was offline
    if (wasOffline.value) {
      showOnlineMessage.value = true;

      // Hide message after 3 seconds
      onlineMessageTimeout = setTimeout(() => {
        showOnlineMessage.value = false;
      }, 3000);
    }

    wasOffline.value = false;
  };

  const handleOffline = () => {
    isOffline.value = true;
    wasOffline.value = true;
    configStore.setOfflineStatus(true);

    // Clear any pending online message
    if (onlineMessageTimeout) {
      clearTimeout(onlineMessageTimeout);
      onlineMessageTimeout = null;
    }
    showOnlineMessage.value = false;
  };

  onMounted(() => {
    // Set initial state
    isOffline.value = !navigator.onLine;
    configStore.setOfflineStatus(!navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  });

  onUnmounted(() => {
    // Clean up event listeners
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);

    // Clear timeout
    if (onlineMessageTimeout) {
      clearTimeout(onlineMessageTimeout);
    }
  });

  /**
   * Dismiss online message manually
   */
  const dismissOnlineMessage = () => {
    showOnlineMessage.value = false;
    if (onlineMessageTimeout) {
      clearTimeout(onlineMessageTimeout);
      onlineMessageTimeout = null;
    }
  };

  return {
    isOffline,
    showOnlineMessage,
    dismissOnlineMessage,
  };
}
