import { ref, onUnmounted } from 'vue';

interface PreloadOptions {
  // Number of images to preload ahead
  lookahead?: number;
  // Priority for preload links
  priority?: 'high' | 'low' | 'auto';
  // Enable WebP format optimization
  useWebP?: boolean;
}

interface PreloadState {
  loading: Set<string>;
  loaded: Set<string>;
  failed: Set<string>;
}

/**
 * Composable for preloading images to improve perceived performance
 * Supports Unsplash and Cloudinary URL optimization
 */
export function useImagePreloader(options: PreloadOptions = {}) {
  const { lookahead = 3, priority = 'low', useWebP = true } = options;

  const state = ref<PreloadState>({
    loading: new Set(),
    loaded: new Set(),
    failed: new Set(),
  });

  const preloadLinks = new Map<string, HTMLLinkElement>();

  /**
   * Optimize image URL for preloading
   */
  const optimizeUrl = (src: string): string => {
    if (!src) {
      return '';
    }

    // Cloudinary optimization
    if (src.includes('cloudinary.com')) {
      return src.replace('/upload/', '/upload/q_auto,f_auto/');
    }

    // Unsplash optimization
    if (src.includes('unsplash.com')) {
      try {
        const url = new URL(src);
        url.searchParams.set('auto', 'format');
        url.searchParams.set('q', '80');
        if (useWebP) {
          url.searchParams.set('fm', 'webp');
        }
        return url.toString();
      } catch {
        return src;
      }
    }

    return src;
  };

  /**
   * Generate srcset for responsive preloading
   */
  const generateSrcset = (src: string): string => {
    if (!src) {
      return '';
    }

    const widths = [320, 480, 640, 768];

    if (src.includes('cloudinary.com')) {
      return widths
        .map((w) => {
          const optimizedUrl = src.replace('/upload/', `/upload/w_${w},q_auto,f_auto/`);
          return `${optimizedUrl} ${w}w`;
        })
        .join(', ');
    }

    if (src.includes('unsplash.com')) {
      return widths
        .map((w) => {
          try {
            const url = new URL(src);
            url.searchParams.set('w', String(w));
            url.searchParams.set('q', '80');
            url.searchParams.set('auto', 'format');
            return `${url.toString()} ${w}w`;
          } catch {
            return '';
          }
        })
        .filter(Boolean)
        .join(', ');
    }

    return '';
  };

  /**
   * Preload a single image using link preload
   */
  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, _reject) => {
      if (!src) {
        resolve();
        return;
      }

      const optimizedSrc = optimizeUrl(src);

      // Already loaded or loading
      if (state.value.loaded.has(optimizedSrc) || state.value.loading.has(optimizedSrc)) {
        resolve();
        return;
      }

      state.value.loading.add(optimizedSrc);

      // Use link preload for better browser optimization
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;

      // Add srcset for responsive images
      const srcset = generateSrcset(src);
      if (srcset) {
        link.setAttribute('imagesrcset', srcset);
        link.setAttribute('imagesizes', '(max-width: 640px) 50vw, 33vw');
      }

      // Set fetch priority
      if (priority !== 'auto') {
        link.setAttribute('fetchpriority', priority);
      }

      link.onload = () => {
        state.value.loading.delete(optimizedSrc);
        state.value.loaded.add(optimizedSrc);
        resolve();
      };

      link.onerror = () => {
        state.value.loading.delete(optimizedSrc);
        state.value.failed.add(optimizedSrc);
        // Still resolve to not block other preloads
        resolve();
      };

      document.head.appendChild(link);
      preloadLinks.set(optimizedSrc, link);
    });
  };

  /**
   * Preload images using Image object (fallback method)
   */
  const preloadImageFallback = (src: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!src) {
        resolve();
        return;
      }

      const optimizedSrc = optimizeUrl(src);

      if (state.value.loaded.has(optimizedSrc) || state.value.loading.has(optimizedSrc)) {
        resolve();
        return;
      }

      state.value.loading.add(optimizedSrc);

      const img = new Image();
      img.onload = () => {
        state.value.loading.delete(optimizedSrc);
        state.value.loaded.add(optimizedSrc);
        resolve();
      };
      img.onerror = () => {
        state.value.loading.delete(optimizedSrc);
        state.value.failed.add(optimizedSrc);
        resolve();
      };
      img.src = optimizedSrc;
    });
  };

  /**
   * Preload multiple images
   */
  const preloadImages = async (urls: string[]): Promise<void> => {
    const uniqueUrls = [...new Set(urls.filter(Boolean))];
    await Promise.all(uniqueUrls.map((url) => preloadImage(url)));
  };

  /**
   * Preload next N images from a list based on current index
   */
  const preloadNext = (images: string[], currentIndex: number, count: number = lookahead): void => {
    const nextImages = images.slice(currentIndex + 1, currentIndex + 1 + count);
    if (nextImages.length > 0) {
      // Use requestIdleCallback for non-blocking preload
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(
          () => {
            preloadImages(nextImages);
          },
          { timeout: 2000 }
        );
      } else {
        // Fallback to setTimeout
        setTimeout(() => {
          preloadImages(nextImages);
        }, 100);
      }
    }
  };

  /**
   * Preload images that are about to enter viewport
   * Uses IntersectionObserver internally
   */
  const createViewportPreloader = (
    images: string[],
    containerSelector?: string
  ): IntersectionObserver | null => {
    if (!('IntersectionObserver' in window)) {
      return null;
    }

    const imageMap = new Map<Element, string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const src = imageMap.get(entry.target);
            if (src) {
              preloadImage(src);
            }
          }
        });
      },
      {
        rootMargin: '300px 0px', // Preload 300px before entering viewport
        threshold: 0,
      }
    );

    // Observe placeholder elements or create virtual ones
    const container = containerSelector ? document.querySelector(containerSelector) : document.body;

    if (container) {
      images.forEach((src, index) => {
        const el = container.querySelector(`[data-image-index="${index}"]`);
        if (el) {
          imageMap.set(el, src);
          observer.observe(el);
        }
      });
    }

    return observer;
  };

  /**
   * Check if an image is already loaded
   */
  const isLoaded = (src: string): boolean => {
    const optimizedSrc = optimizeUrl(src);
    return state.value.loaded.has(optimizedSrc);
  };

  /**
   * Check if an image is currently loading
   */
  const isLoading = (src: string): boolean => {
    const optimizedSrc = optimizeUrl(src);
    return state.value.loading.has(optimizedSrc);
  };

  /**
   * Clear all preload links from DOM
   */
  const cleanup = (): void => {
    preloadLinks.forEach((link) => {
      link.remove();
    });
    preloadLinks.clear();
    state.value.loading.clear();
    state.value.loaded.clear();
    state.value.failed.clear();
  };

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    // State
    state,

    // Methods
    preloadImage,
    preloadImageFallback,
    preloadImages,
    preloadNext,
    createViewportPreloader,

    // Utilities
    optimizeUrl,
    generateSrcset,
    isLoaded,
    isLoading,
    cleanup,
  };
}

export type UseImagePreloader = ReturnType<typeof useImagePreloader>;
