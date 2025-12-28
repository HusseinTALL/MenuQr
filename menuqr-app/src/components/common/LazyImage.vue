<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    src: string;
    alt: string;
    placeholderColor?: string;
    sizes?: string;
    aspectRatio?: string;
    eager?: boolean;
    blurHash?: string;
    // Enable tiny blur placeholder (LQIP)
    useLqip?: boolean;
    // Priority loading for above-the-fold images
    priority?: boolean;
  }>(),
  {
    placeholderColor: '#e5e7eb',
    sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
    aspectRatio: '4/3',
    eager: false,
    useLqip: true,
    priority: false,
  }
);

const imageRef = ref<HTMLImageElement | null>(null);
const isLoaded = ref(false);
const isInView = ref(false);
const hasError = ref(false);
const lqipLoaded = ref(false);

let observer: IntersectionObserver | null = null;

// Generate tiny blur placeholder URL (LQIP - Low Quality Image Placeholder)
const lqipSrc = computed(() => {
  if (!props.src || !props.useLqip) {
    return '';
  }

  // For Cloudinary - get tiny blurred version
  if (props.src.includes('cloudinary.com')) {
    return props.src.replace('/upload/', '/upload/w_20,h_20,c_fill,q_10,e_blur:1000,f_auto/');
  }

  // For Unsplash - get tiny blurred version
  if (props.src.includes('unsplash.com')) {
    try {
      const url = new URL(props.src);
      url.searchParams.set('w', '50');
      url.searchParams.set('q', '20');
      // Note: Unsplash uses fm=webp and fit=crop, not blur parameter
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('auto', 'format');
      return url.toString();
    } catch {
      return '';
    }
  }

  return '';
});

// Generate srcset for responsive images (if using Cloudinary or similar)
const srcset = computed(() => {
  if (!props.src) {
    return '';
  }

  // Check if it's a Cloudinary URL
  if (props.src.includes('cloudinary.com')) {
    const widths = [320, 480, 640, 768, 1024, 1280];
    return widths
      .map((w) => {
        const optimizedUrl = props.src.replace('/upload/', `/upload/w_${w},q_auto,f_auto/`);
        return `${optimizedUrl} ${w}w`;
      })
      .join(', ');
  }

  // Check if it's an Unsplash URL
  if (props.src.includes('unsplash.com')) {
    const widths = [320, 480, 640, 768, 1024, 1280];
    return widths
      .map((w) => {
        try {
          const url = new URL(props.src);
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
});

// Optimized src with auto format and WebP support
const optimizedSrc = computed(() => {
  if (!props.src) {
    return '';
  }

  if (props.src.includes('cloudinary.com')) {
    return props.src.replace('/upload/', '/upload/q_auto,f_auto/');
  }

  if (props.src.includes('unsplash.com')) {
    try {
      const url = new URL(props.src);
      url.searchParams.set('auto', 'format');
      url.searchParams.set('q', '80');
      // Force WebP if supported (Unsplash auto-detects)
      url.searchParams.set('fm', 'webp');
      return url.toString();
    } catch {
      return props.src;
    }
  }

  return props.src;
});

// Preload LQIP for blur effect
const preloadLqip = () => {
  if (!lqipSrc.value || lqipLoaded.value) {
    return;
  }

  const img = new Image();
  img.onload = () => {
    lqipLoaded.value = true;
  };
  img.src = lqipSrc.value;
};

const handleLoad = () => {
  isLoaded.value = true;
};

const handleError = () => {
  hasError.value = true;
  isLoaded.value = true;
};

const loadImage = () => {
  if (imageRef.value && !isInView.value) {
    isInView.value = true;
    imageRef.value.src = optimizedSrc.value;
    if (srcset.value) {
      imageRef.value.srcset = srcset.value;
    }
  }
};

// Preload next image for smoother UX (called externally)
const preload = () => {
  if (!props.src) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizedSrc.value;
  if (srcset.value) {
    link.setAttribute('imagesrcset', srcset.value);
    link.setAttribute('imagesizes', props.sizes);
  }
  document.head.appendChild(link);
};

// Expose preload method
defineExpose({ preload });

// Watch for src changes
watch(
  () => props.src,
  () => {
    isLoaded.value = false;
    isInView.value = false;
    hasError.value = false;
    lqipLoaded.value = false;
    preloadLqip();
  }
);

onMounted(() => {
  // Preload LQIP immediately
  preloadLqip();

  if (!imageRef.value) {
    return;
  }

  // If priority or eager loading, load immediately with preload
  if (props.priority || props.eager) {
    if (props.priority) {
      preload();
    }
    loadImage();
    return;
  }

  // Use Intersection Observer for lazy loading
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '200px 0px', // Start loading 200px before entering viewport
        threshold: 0,
      }
    );
    observer.observe(imageRef.value);
  } else {
    // Fallback for browsers without IntersectionObserver
    loadImage();
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<template>
  <div
    class="lazy-image-container"
    :style="{ aspectRatio: aspectRatio }"
  >
    <!-- LQIP Blur Placeholder -->
    <img
      v-if="lqipSrc && lqipLoaded && !isLoaded"
      :src="lqipSrc"
      alt=""
      aria-hidden="true"
      class="lazy-image-lqip"
    />

    <!-- Fallback Shimmer Placeholder (when no LQIP or image not yet loaded) -->
    <div
      v-show="!isLoaded"
      class="lazy-image-placeholder"
      :style="{ backgroundColor: placeholderColor }"
      aria-hidden="true"
    />

    <!-- Error state with fallback placeholder -->
    <div
      v-if="hasError"
      class="lazy-image-error"
      role="img"
      :aria-label="`Image non disponible: ${alt}`"
    >
      <img
        src="/images/dish-placeholder.svg"
        :alt="alt"
        class="lazy-image-fallback"
        loading="lazy"
      />
    </div>

    <!-- Main Image -->
    <img
      v-if="!hasError"
      ref="imageRef"
      :alt="alt"
      :sizes="sizes"
      :loading="priority ? 'eager' : eager ? 'eager' : 'lazy'"
      decoding="async"
      :fetchpriority="priority ? 'high' : 'auto'"
      class="lazy-image"
      :class="{ 'is-loaded': isLoaded }"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>

<style scoped>
/* Container - replaces Tailwind relative w-full h-full overflow-hidden */
.lazy-image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  contain: layout style paint;
  isolation: isolate;
  min-height: 100px; /* Ensure container has height for IntersectionObserver */
}

/* LQIP Blur Placeholder - replaces absolute inset-0 w-full h-full object-cover */
.lazy-image-lqip {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.1); /* Prevent blur edges from showing */
}

/* Shimmer placeholder effect - replaces absolute inset-0 */
.lazy-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    var(--placeholder-color, #e5e7eb) 0%,
    #f3f4f6 50%,
    var(--placeholder-color, #e5e7eb) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Error state - replaces absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 */
.lazy-image-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom right, #f3f4f6, #e5e7eb);
}

/* Fallback image - replaces w-full h-full object-cover opacity-60 */
.lazy-image-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.6;
}

/* Main image - replaces w-full h-full object-cover */
.lazy-image {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 400ms ease-out;
  will-change: opacity;
}

.lazy-image.is-loaded {
  opacity: 1;
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  .lazy-image-placeholder {
    animation: none;
  }

  .lazy-image {
    transition: none;
  }

  .lazy-image.is-loaded {
    opacity: 1;
  }

  .lazy-image-lqip {
    filter: none;
    transform: none;
  }
}
</style>
