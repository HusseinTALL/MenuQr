import { ref } from 'vue';

/**
 * Toast notification interface
 */
interface ToastNotification {
  id: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration: number;
}

/**
 * Global toast notifications state
 */
const toasts = ref<ToastNotification[]>([]);
let toastIdCounter = 0;

/**
 * Composable for toast notifications
 * Provides a global notification system
 */
export function useToast() {
  /**
   * Show a toast notification
   */
  const showToast = (
    message: string,
    variant: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration = 3000
  ) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: ToastNotification = {
      id,
      variant,
      message,
      duration,
    };

    toasts.value.push(toast);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  /**
   * Remove a toast notification
   */
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  /**
   * Show success toast
   */
  const success = (message: string, duration?: number) => {
    return showToast(message, 'success', duration);
  };

  /**
   * Show error toast
   */
  const error = (message: string, duration?: number) => {
    return showToast(message, 'error', duration);
  };

  /**
   * Show warning toast
   */
  const warning = (message: string, duration?: number) => {
    return showToast(message, 'warning', duration);
  };

  /**
   * Show info toast
   */
  const info = (message: string, duration?: number) => {
    return showToast(message, 'info', duration);
  };

  /**
   * Clear all toasts
   */
  const clearAll = () => {
    toasts.value = [];
  };

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll,
  };
}
