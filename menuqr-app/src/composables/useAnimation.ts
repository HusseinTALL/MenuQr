import { ref, onMounted, type Ref } from 'vue';

/**
 * Animation easing functions
 */
export const easings = {
  // Standard easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom cubic-bezier easings
  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',

  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',

  easeInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  easeInOutExpo: 'cubic-bezier(1, 0, 0, 1)',

  easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Spring-like
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springLight: 'cubic-bezier(0.22, 1.4, 0.36, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export type EasingName = keyof typeof easings;

/**
 * Animation durations in milliseconds
 */
export const durations = {
  instant: 0,
  fastest: 75,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
  slowest: 700,
} as const;

export type DurationName = keyof typeof durations;

/**
 * Check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): Ref<boolean> {
  const prefersReducedMotion = ref(false);

  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.value = mediaQuery.matches;

    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches;
    };

    mediaQuery.addEventListener('change', handler);
  });

  return prefersReducedMotion;
}

/**
 * Composable for managing animations with reduced motion support
 */
export function useAnimation() {
  const prefersReducedMotion = usePrefersReducedMotion();

  /**
   * Get animation duration respecting reduced motion preference
   */
  const getDuration = (duration: number | DurationName): number => {
    if (prefersReducedMotion.value) {
      return 0;
    }
    return typeof duration === 'string' ? durations[duration] : duration;
  };

  /**
   * Get easing function
   */
  const getEasing = (easing: EasingName = 'easeOutCubic'): string => {
    return easings[easing];
  };

  /**
   * Create stagger delay for list items
   */
  const getStaggerDelay = (index: number, baseDelay = 50, maxDelay = 500): number => {
    if (prefersReducedMotion.value) {
      return 0;
    }
    return Math.min(index * baseDelay, maxDelay);
  };

  /**
   * CSS transition string builder
   */
  const buildTransition = (
    properties: string | string[],
    duration: number | DurationName = 'normal',
    easing: EasingName = 'easeOutCubic',
    delay = 0
  ): string => {
    const props = Array.isArray(properties) ? properties : [properties];
    const dur = getDuration(duration);
    const eas = getEasing(easing);

    return props.map((prop) => `${prop} ${dur}ms ${eas} ${delay}ms`).join(', ');
  };

  /**
   * Animate element with Web Animations API
   */
  const animate = (
    element: HTMLElement,
    keyframes: Keyframe[],
    options: {
      duration?: number | DurationName;
      easing?: EasingName;
      delay?: number;
      fill?: FillMode;
    } = {}
  ): Animation | null => {
    if (prefersReducedMotion.value) {
      return null;
    }

    const { duration = 'normal', easing = 'easeOutCubic', delay = 0, fill = 'forwards' } = options;

    return element.animate(keyframes, {
      duration: getDuration(duration),
      easing: getEasing(easing),
      delay,
      fill,
    });
  };

  /**
   * Fade in animation
   */
  const fadeIn = (element: HTMLElement, duration: number | DurationName = 'normal') => {
    return animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration });
  };

  /**
   * Fade out animation
   */
  const fadeOut = (element: HTMLElement, duration: number | DurationName = 'fast') => {
    return animate(element, [{ opacity: 1 }, { opacity: 0 }], { duration });
  };

  /**
   * Slide up animation
   */
  const slideUp = (
    element: HTMLElement,
    distance = 20,
    duration: number | DurationName = 'normal'
  ) => {
    return animate(
      element,
      [
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration, easing: 'easeOutCubic' }
    );
  };

  /**
   * Slide down animation
   */
  const slideDown = (
    element: HTMLElement,
    distance = 20,
    duration: number | DurationName = 'normal'
  ) => {
    return animate(
      element,
      [
        { opacity: 0, transform: `translateY(-${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration, easing: 'easeOutCubic' }
    );
  };

  /**
   * Scale in animation
   */
  const scaleIn = (
    element: HTMLElement,
    fromScale = 0.9,
    duration: number | DurationName = 'normal'
  ) => {
    return animate(
      element,
      [
        { opacity: 0, transform: `scale(${fromScale})` },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration, easing: 'spring' }
    );
  };

  /**
   * Pop animation (scale bounce)
   */
  const pop = (element: HTMLElement, duration: number | DurationName = 'fast') => {
    return animate(
      element,
      [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }],
      { duration, easing: 'spring' }
    );
  };

  /**
   * Shake animation (for errors)
   */
  const shake = (element: HTMLElement, intensity = 4) => {
    return animate(
      element,
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(-${intensity}px)` },
        { transform: `translateX(${intensity}px)` },
        { transform: `translateX(-${intensity}px)` },
        { transform: `translateX(${intensity}px)` },
        { transform: 'translateX(0)' },
      ],
      { duration: 'slow', easing: 'easeOutCubic' }
    );
  };

  return {
    // State
    prefersReducedMotion,

    // Utilities
    getDuration,
    getEasing,
    getStaggerDelay,
    buildTransition,
    animate,

    // Preset animations
    fadeIn,
    fadeOut,
    slideUp,
    slideDown,
    scaleIn,
    pop,
    shake,

    // Constants
    easings,
    durations,
  };
}

/**
 * Composable for staggered list animations
 */
export function useStaggeredList(
  options: {
    baseDelay?: number;
    duration?: number;
    maxDelay?: number;
  } = {}
) {
  const { baseDelay = 50, duration = 300, maxDelay = 500 } = options;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isAnimating = ref(false);

  const getItemStyle = (index: number) => {
    if (prefersReducedMotion.value) {
      return {};
    }

    const delay = Math.min(index * baseDelay, maxDelay);

    return {
      animationDelay: `${delay}ms`,
      animationDuration: `${duration}ms`,
    };
  };

  const getItemClass = () => {
    if (prefersReducedMotion.value) {
      return '';
    }
    return 'animate-stagger-item';
  };

  return {
    isAnimating,
    getItemStyle,
    getItemClass,
  };
}

/**
 * Composable for intersection observer based animations
 */
export function useScrollAnimation(
  options: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
  } = {}
) {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options;

  const isVisible = ref(false);
  const elementRef = ref<HTMLElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  onMounted(() => {
    if (!elementRef.value || prefersReducedMotion.value) {
      isVisible.value = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true;
            if (once) {
              observer.disconnect();
            }
          } else if (!once) {
            isVisible.value = false;
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(elementRef.value);
  });

  return {
    elementRef,
    isVisible,
  };
}
