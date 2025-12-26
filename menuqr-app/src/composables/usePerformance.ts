import { ref, watch, onUnmounted, type Ref, type UnwrapRef } from 'vue';

/**
 * Debounce a value - waits for changes to stop before updating
 * Useful for search inputs, resize handlers, etc.
 *
 * @example
 * ```ts
 * const searchQuery = ref('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 *
 * // debouncedQuery will only update 300ms after searchQuery stops changing
 * ```
 */
export function useDebounce<T>(value: Ref<T>, delay = 300): Ref<T> {
  const debouncedValue = ref(value.value) as Ref<UnwrapRef<T>>;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  watch(value, (newValue) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue as UnwrapRef<T>;
    }, delay);
  });

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return debouncedValue as Ref<T>;
}

/**
 * Create a debounced function
 *
 * @example
 * ```ts
 * const { debounced, cancel } = useDebounceFn(() => {
 *   console.log('Debounced!');
 * }, 300);
 *
 * debounced(); // Will only execute 300ms after the last call
 * ```
 */
export function useDebounceFn<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = 300
): { debounced: (...args: Parameters<T>) => void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const debounced = (...args: Parameters<T>) => {
    cancel();
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };

  onUnmounted(cancel);

  return { debounced, cancel };
}

/**
 * Throttle a value - updates at most once per interval
 * Useful for scroll handlers, mousemove, etc.
 *
 * @example
 * ```ts
 * const scrollY = ref(0);
 * const throttledScrollY = useThrottle(scrollY, 100);
 *
 * // throttledScrollY will only update at most every 100ms
 * ```
 */
export function useThrottle<T>(value: Ref<T>, interval = 100): Ref<T> {
  const throttledValue = ref(value.value) as Ref<UnwrapRef<T>>;
  let lastUpdateTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  watch(value, (newValue) => {
    const now = Date.now();

    if (now - lastUpdateTime >= interval) {
      throttledValue.value = newValue as UnwrapRef<T>;
      lastUpdateTime = now;
    } else {
      // Schedule an update for the end of the interval
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(
        () => {
          throttledValue.value = value.value as UnwrapRef<T>;
          lastUpdateTime = Date.now();
        },
        interval - (now - lastUpdateTime)
      );
    }
  });

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return throttledValue as Ref<T>;
}

/**
 * Create a throttled function
 *
 * @example
 * ```ts
 * const { throttled, cancel } = useThrottleFn(() => {
 *   console.log('Throttled!');
 * }, 100);
 *
 * throttled(); // Will execute at most once per 100ms
 * ```
 */
export function useThrottleFn<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval = 100,
  options: { leading?: boolean; trailing?: boolean } = {}
): { throttled: (...args: Parameters<T>) => void; cancel: () => void } {
  const { leading = true, trailing = true } = options;
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    lastArgs = args;

    if (timeSinceLastCall >= interval) {
      if (leading) {
        fn(...args);
        lastCallTime = now;
      }
    }

    if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs);
          lastCallTime = Date.now();
        }
        timeoutId = null;
      }, interval - timeSinceLastCall);
    }
  };

  onUnmounted(cancel);

  return { throttled, cancel };
}

/**
 * RequestAnimationFrame-based throttle for smooth animations
 *
 * @example
 * ```ts
 * const { rafThrottled, cancel } = useRAFThrottle((e: MouseEvent) => {
 *   updatePosition(e.clientX, e.clientY);
 * });
 *
 * element.addEventListener('mousemove', rafThrottled);
 * ```
 */
export function useRAFThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T
): { rafThrottled: (...args: Parameters<T>) => void; cancel: () => void } {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const rafThrottled = (...args: Parameters<T>) => {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        rafId = null;
      });
    }
  };

  onUnmounted(cancel);

  return { rafThrottled, cancel };
}

/**
 * Memoize expensive computed values
 *
 * @example
 * ```ts
 * const expensiveResult = useMemo(
 *   () => computeExpensiveValue(data.value),
 *   [data]
 * );
 * ```
 */
export function useMemo<T>(factory: () => T, deps: Ref<unknown>[]): Ref<T> {
  const result = ref<T>(factory()) as Ref<T>;

  deps.forEach((dep) => {
    watch(dep, () => {
      result.value = factory();
    });
  });

  return result;
}

/**
 * Defer non-critical updates to idle time
 *
 * @example
 * ```ts
 * const { defer, cancel } = useIdleCallback();
 *
 * defer(() => {
 *   // This will run when browser is idle
 *   analytics.track('page_view');
 * });
 * ```
 */
export function useIdleCallback() {
  const callbacks: Set<number> = new Set();

  const defer = (callback: () => void, options: { timeout?: number } = {}): number => {
    if ('requestIdleCallback' in window) {
      const id = (window as Window).requestIdleCallback(callback, options);
      callbacks.add(id);
      return id;
    } else {
      // Fallback for Safari
      const id = setTimeout(callback, 1) as unknown as number;
      callbacks.add(id);
      return id;
    }
  };

  const cancel = (id?: number) => {
    if (id !== undefined) {
      if ('cancelIdleCallback' in window) {
        (window as Window).cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
      callbacks.delete(id);
    } else {
      // Cancel all
      callbacks.forEach((cbId) => {
        if ('cancelIdleCallback' in window) {
          (window as Window).cancelIdleCallback(cbId);
        } else {
          clearTimeout(cbId);
        }
      });
      callbacks.clear();
    }
  };

  onUnmounted(() => cancel());

  return { defer, cancel };
}

/**
 * Check if an element is in viewport
 */
export function useElementVisibility(
  element: Ref<HTMLElement | null>,
  options: IntersectionObserverInit = {}
): Ref<boolean> {
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  watch(
    element,
    (el) => {
      cleanup();

      if (!el) {
        return;
      }

      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          isVisible.value = entry.isIntersecting;
        }
      }, options);

      observer.observe(el);
    },
    { immediate: true }
  );

  onUnmounted(cleanup);

  return isVisible;
}
