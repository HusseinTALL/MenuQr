import { ref, computed } from 'vue';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
  permissionState: PermissionState | null;
}

/**
 * Composable for handling browser geolocation
 * Gets user's current position for delivery/location sharing
 */
export function useGeolocation() {
  const position = ref<GeolocationPosition | null>(null);
  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const permissionState = ref<PermissionState | null>(null);

  const isSupported = 'geolocation' in navigator;

  /**
   * Detect if running on iOS
   */
  const isIOS = (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  /**
   * Check geolocation permission status
   * Note: Permissions API is not supported on iOS Safari
   */
  const checkPermission = async (): Promise<PermissionState | null> => {
    if (!isSupported) {
      return null;
    }

    try {
      // Permissions API is NOT supported on iOS Safari - skip it
      if (isIOS()) {
        // On iOS, we can't check permission ahead of time
        // It will be requested when getCurrentPosition is called
        permissionState.value = 'prompt';
        return 'prompt';
      }

      // Check if Permissions API is available (desktop browsers)
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        permissionState.value = result.state;

        // Listen for permission changes
        result.addEventListener('change', () => {
          permissionState.value = result.state;
        });

        return result.state;
      }
      return null;
    } catch {
      // Permissions API not available or error
      return null;
    }
  };

  /**
   * Get current position
   * @param options - Geolocation options
   * @returns Promise with position or null if denied/error
   */
  const getCurrentPosition = async (
    options: PositionOptions = {}
  ): Promise<GeolocationPosition | null> => {
    if (!isSupported) {
      error.value = 'geolocation_not_supported';
      return null;
    }

    // iOS needs longer timeout and may not work well with high accuracy initially
    const isiOSDevice = isIOS();

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: !isiOSDevice, // Start with low accuracy on iOS for faster response
      timeout: isiOSDevice ? 15000 : 10000, // Longer timeout for iOS
      maximumAge: 60000, // Cache for 1 minute
      ...options,
    };

    isLoading.value = true;
    error.value = null;

    // Helper function to get position with given options
    const tryGetPosition = (opts: PositionOptions): Promise<GeolocationPosition | null> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const geoPosition: GeolocationPosition = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            };

            position.value = geoPosition;
            permissionState.value = 'granted';
            resolve(geoPosition);
          },
          (err) => {
            switch (err.code) {
              case err.PERMISSION_DENIED:
                error.value = 'permission_denied';
                permissionState.value = 'denied';
                break;
              case err.POSITION_UNAVAILABLE:
                error.value = 'position_unavailable';
                break;
              case err.TIMEOUT:
                error.value = 'timeout';
                break;
              default:
                error.value = 'unknown_error';
            }

            resolve(null);
          },
          opts
        );
      });
    };

    // Try to get position
    let result = await tryGetPosition(defaultOptions);

    // On iOS, if first attempt failed with timeout, try with high accuracy
    // (user may have granted permission in the meantime)
    if (!result && isiOSDevice && error.value === 'timeout') {
      error.value = null;
      result = await tryGetPosition({
        ...defaultOptions,
        enableHighAccuracy: true,
        timeout: 20000, // Even longer timeout for high accuracy
      });
    }

    // Fallback: if timeout on any device, try without high accuracy
    if (!result && error.value === 'timeout') {
      error.value = null;
      result = await tryGetPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Accept 5-minute-old position
      });
    }

    isLoading.value = false;
    return result;
  };

  /**
   * Generate Google Maps link from coordinates
   */
  const getGoogleMapsLink = (coords: GeolocationPosition): string => {
    return `https://maps.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  };

  /**
   * Generate a short Google Maps link
   */
  const getGoogleMapsShortLink = (coords: GeolocationPosition): string => {
    return `https://maps.app.goo.gl/?link=https://www.google.com/maps/@${coords.latitude},${coords.longitude},17z`;
  };

  /**
   * Format coordinates for display
   */
  const formatCoordinates = (coords: GeolocationPosition): string => {
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  };

  /**
   * Check if position is still fresh (within maxAge)
   */
  const isPositionFresh = computed(() => {
    if (!position.value) {
      return false;
    }
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - position.value.timestamp < maxAge;
  });

  /**
   * Clear stored position and error
   */
  const clearPosition = () => {
    position.value = null;
    error.value = null;
  };

  return {
    // State
    position,
    error,
    isLoading,
    isSupported,
    permissionState,
    isPositionFresh,

    // Actions
    checkPermission,
    getCurrentPosition,
    clearPosition,

    // Utilities
    getGoogleMapsLink,
    getGoogleMapsShortLink,
    formatCoordinates,
  };
}
