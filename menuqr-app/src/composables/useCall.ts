/**
 * Composable for masked calling functionality
 * Handles call initiation and status tracking
 */

import { ref, computed, onUnmounted } from 'vue';
import { api } from '@/services/api';

export type CallStatus = 'idle' | 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy';

export function useCall() {
  const isCallingEnabled = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const callSessionId = ref<string | null>(null);
  const callStatus = ref<CallStatus>('idle');
  const callDuration = ref<number | null>(null);

  let statusPollInterval: ReturnType<typeof setInterval> | null = null;

  const isCallActive = computed(() => {
    return ['initiating', 'ringing', 'in-progress'].includes(callStatus.value);
  });

  const callStatusText = computed(() => {
    switch (callStatus.value) {
      case 'idle':
        return 'Prêt à appeler';
      case 'initiating':
        return 'Connexion...';
      case 'ringing':
        return 'Appel en cours...';
      case 'in-progress':
        return 'En communication';
      case 'completed':
        return 'Appel terminé';
      case 'failed':
        return 'Appel échoué';
      case 'no-answer':
        return 'Pas de réponse';
      case 'busy':
        return 'Ligne occupée';
      default:
        return '';
    }
  });

  /**
   * Check if calling feature is enabled
   */
  const checkCallingEnabled = async () => {
    try {
      const response = await api.isCallingEnabled();
      isCallingEnabled.value = response.data?.enabled ?? false;
    } catch {
      isCallingEnabled.value = false;
    }
  };

  /**
   * Start polling for call status updates
   */
  const startStatusPolling = () => {
    if (statusPollInterval) {
      clearInterval(statusPollInterval);
    }

    statusPollInterval = setInterval(async () => {
      if (!callSessionId.value || !isCallActive.value) {
        stopStatusPolling();
        return;
      }

      try {
        const response = await api.getCallStatus(callSessionId.value);
        if (response.success && response.data) {
          callStatus.value = response.data.status;
          callDuration.value = response.data.duration ?? null;

          // Stop polling if call ended
          if (!['initiating', 'ringing', 'in-progress'].includes(response.data.status)) {
            stopStatusPolling();
          }
        }
      } catch (err) {
        console.error('Error polling call status:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  /**
   * Stop status polling
   */
  const stopStatusPolling = () => {
    if (statusPollInterval) {
      clearInterval(statusPollInterval);
      statusPollInterval = null;
    }
  };

  /**
   * Customer: Initiate call to driver
   */
  const callDriver = async (deliveryId: string) => {
    if (isCallActive.value) {
      error.value = 'Un appel est déjà en cours';
      return false;
    }

    isLoading.value = true;
    error.value = null;
    callStatus.value = 'initiating';

    try {
      const response = await api.customerInitiateCall(deliveryId);

      if (response.success && response.data) {
        callSessionId.value = response.data.callSessionId;
        callStatus.value = 'ringing';
        startStatusPolling();
        return true;
      } else {
        error.value = response.message || 'Erreur lors de l\'appel';
        callStatus.value = 'failed';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de l\'appel';
      callStatus.value = 'failed';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Driver: Initiate call to customer
   */
  const callCustomer = async (deliveryId: string) => {
    if (isCallActive.value) {
      error.value = 'Un appel est déjà en cours';
      return false;
    }

    isLoading.value = true;
    error.value = null;
    callStatus.value = 'initiating';

    try {
      const response = await api.driverInitiateCall(deliveryId);

      if (response.success && response.data) {
        callSessionId.value = response.data.callSessionId;
        callStatus.value = 'ringing';
        startStatusPolling();
        return true;
      } else {
        error.value = response.message || 'Erreur lors de l\'appel';
        callStatus.value = 'failed';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de l\'appel';
      callStatus.value = 'failed';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * End the current call
   */
  const endCall = async () => {
    if (!callSessionId.value) {
      return false;
    }

    try {
      await api.endCall(callSessionId.value);
      callStatus.value = 'completed';
      stopStatusPolling();
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la terminaison';
      return false;
    }
  };

  /**
   * Reset call state
   */
  const resetCall = () => {
    stopStatusPolling();
    callSessionId.value = null;
    callStatus.value = 'idle';
    callDuration.value = null;
    error.value = null;
  };

  /**
   * Get call history for a delivery
   */
  const getCallHistory = async (deliveryId: string) => {
    try {
      const response = await api.getDeliveryCallHistory(deliveryId);
      return response.data || [];
    } catch {
      return [];
    }
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopStatusPolling();
  });

  return {
    // State
    isCallingEnabled,
    isLoading,
    error,
    callSessionId,
    callStatus,
    callDuration,
    isCallActive,
    callStatusText,

    // Methods
    checkCallingEnabled,
    callDriver,
    callCustomer,
    endCall,
    resetCall,
    getCallHistory,
  };
}

export default useCall;
