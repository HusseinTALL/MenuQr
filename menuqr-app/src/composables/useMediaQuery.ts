import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue';

/**
 * Breakpoint values matching Tailwind defaults
 */
export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Device type based on pointer and hover capabilities
 */
export type DeviceType = 'touch' | 'mouse' | 'hybrid';

/**
 * Orientation type
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Composable for responsive media query handling
 * Provides reactive breakpoint detection and device capabilities
 */
export function useMediaQuery() {
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
  const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0);

  // Device capabilities
  const isTouchDevice = ref(false);
  const hasHover = ref(true);
  const isStandalone = ref(false);

  // Update dimensions
  const updateDimensions = () => {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
  };

  // Check device capabilities
  const checkDeviceCapabilities = () => {
    isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    hasHover.value = window.matchMedia('(hover: hover)').matches;
    isStandalone.value = window.matchMedia('(display-mode: standalone)').matches;
  };

  onMounted(() => {
    updateDimensions();
    checkDeviceCapabilities();

    window.addEventListener('resize', updateDimensions);

    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      // Small delay to get accurate dimensions after rotation
      setTimeout(updateDimensions, 100);
    });
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateDimensions);
  });

  // Breakpoint checks
  const isXs = computed(() => windowWidth.value < breakpoints.sm);
  const isSm = computed(
    () => windowWidth.value >= breakpoints.sm && windowWidth.value < breakpoints.md
  );
  const isMd = computed(
    () => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg
  );
  const isLg = computed(
    () => windowWidth.value >= breakpoints.lg && windowWidth.value < breakpoints.xl
  );
  const isXl = computed(
    () => windowWidth.value >= breakpoints.xl && windowWidth.value < breakpoints['2xl']
  );
  const is2xl = computed(() => windowWidth.value >= breakpoints['2xl']);

  // Min-width breakpoint checks (mobile-first)
  const smAndUp = computed(() => windowWidth.value >= breakpoints.sm);
  const mdAndUp = computed(() => windowWidth.value >= breakpoints.md);
  const lgAndUp = computed(() => windowWidth.value >= breakpoints.lg);
  const xlAndUp = computed(() => windowWidth.value >= breakpoints.xl);

  // Max-width breakpoint checks
  const smAndDown = computed(() => windowWidth.value < breakpoints.md);
  const mdAndDown = computed(() => windowWidth.value < breakpoints.lg);
  const lgAndDown = computed(() => windowWidth.value < breakpoints.xl);

  // Device type detection
  const isMobile = computed(() => windowWidth.value < breakpoints.md);
  const isTablet = computed(
    () => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg
  );
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg);

  // Orientation
  const orientation = computed<Orientation>(() =>
    windowWidth.value > windowHeight.value ? 'landscape' : 'portrait'
  );
  const isPortrait = computed(() => orientation.value === 'portrait');
  const isLandscape = computed(() => orientation.value === 'landscape');

  // Device type based on capabilities
  const deviceType = computed<DeviceType>(() => {
    if (isTouchDevice.value && hasHover.value) {
      return 'hybrid';
    }
    if (isTouchDevice.value) {
      return 'touch';
    }
    return 'mouse';
  });

  // Current breakpoint name
  const currentBreakpoint = computed<Breakpoint>(() => {
    if (windowWidth.value < breakpoints.sm) {
      return 'xs';
    }
    if (windowWidth.value < breakpoints.md) {
      return 'sm';
    }
    if (windowWidth.value < breakpoints.lg) {
      return 'md';
    }
    if (windowWidth.value < breakpoints.xl) {
      return 'lg';
    }
    if (windowWidth.value < breakpoints['2xl']) {
      return 'xl';
    }
    return '2xl';
  });

  /**
   * Check if viewport matches a custom media query
   */
  const matches = (query: string): Ref<boolean> => {
    const result = ref(false);

    onMounted(() => {
      const mediaQuery = window.matchMedia(query);
      result.value = mediaQuery.matches;

      const handler = (e: MediaQueryListEvent) => {
        result.value = e.matches;
      };

      mediaQuery.addEventListener('change', handler);

      onUnmounted(() => {
        mediaQuery.removeEventListener('change', handler);
      });
    });

    return result;
  };

  /**
   * Check if current width is between two breakpoints
   */
  const between = (min: Breakpoint, max: Breakpoint) => {
    return computed(
      () => windowWidth.value >= breakpoints[min] && windowWidth.value < breakpoints[max]
    );
  };

  return {
    // Dimensions
    windowWidth,
    windowHeight,

    // Exact breakpoints
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,

    // Mobile-first (min-width)
    smAndUp,
    mdAndUp,
    lgAndUp,
    xlAndUp,

    // Max-width
    smAndDown,
    mdAndDown,
    lgAndDown,

    // Device categories
    isMobile,
    isTablet,
    isDesktop,

    // Orientation
    orientation,
    isPortrait,
    isLandscape,

    // Device capabilities
    isTouchDevice,
    hasHover,
    isStandalone,
    deviceType,

    // Current state
    currentBreakpoint,

    // Utilities
    matches,
    between,
    breakpoints,
  };
}

/**
 * Simple hook for a single media query
 */
export function useMatchMedia(query: string): Ref<boolean> {
  const matches = ref(false);

  onMounted(() => {
    const mediaQuery = window.matchMedia(query);
    matches.value = mediaQuery.matches;

    const handler = (e: MediaQueryListEvent) => {
      matches.value = e.matches;
    };

    mediaQuery.addEventListener('change', handler);

    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handler);
    });
  });

  return matches;
}

/**
 * Hook for preferred color scheme
 */
export function usePrefersDark(): Ref<boolean> {
  return useMatchMedia('(prefers-color-scheme: dark)');
}

/**
 * Hook for reduced motion preference
 */
export function usePrefersReducedMotion(): Ref<boolean> {
  return useMatchMedia('(prefers-reduced-motion: reduce)');
}
