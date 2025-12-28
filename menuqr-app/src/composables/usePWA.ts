import { ref, onMounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

/**
 * Composable for PWA functionality including service worker updates
 */
export function usePWA() {
  const offlineReady = ref(false);
  const needRefresh = ref(false);
  const updateError = ref<Error | null>(null);

  const {
    offlineReady: swOfflineReady,
    needRefresh: swNeedRefresh,
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.info('[PWA] Service Worker registered:', swUrl);

      // Check for updates periodically (every hour)
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
      updateError.value = error;
    },
    onOfflineReady() {
      console.info('[PWA] App ready to work offline');
      offlineReady.value = true;
    },
    onNeedRefresh() {
      console.info('[PWA] New content available, please refresh');
      needRefresh.value = true;
    },
  });

  // Sync with the useRegisterSW refs
  onMounted(() => {
    offlineReady.value = swOfflineReady.value;
    needRefresh.value = swNeedRefresh.value;
  });

  /**
   * Accept the update and reload the page
   */
  const acceptUpdate = async () => {
    try {
      await updateServiceWorker(true);
    } catch (_error) {
      console.error('[PWA] Failed to update:', error);
      updateError.value = error as Error;
    }
  };

  /**
   * Dismiss the update notification
   */
  const dismissUpdate = () => {
    needRefresh.value = false;
  };

  /**
   * Dismiss the offline ready notification
   */
  const dismissOfflineReady = () => {
    offlineReady.value = false;
  };

  /**
   * Check if PWA is installed
   */
  const isInstalled = ref(false);

  onMounted(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    isInstalled.value = isStandalone || isIOSStandalone;

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      isInstalled.value = e.matches;
    });
  });

  return {
    offlineReady,
    needRefresh,
    updateError,
    isInstalled,
    acceptUpdate,
    dismissUpdate,
    dismissOfflineReady,
  };
}
