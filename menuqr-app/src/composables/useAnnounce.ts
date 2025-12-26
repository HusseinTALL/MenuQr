import { onMounted, onUnmounted } from 'vue';

/**
 * Live region element for screen reader announcements
 */
let liveRegion: HTMLElement | null = null;
let politeRegion: HTMLElement | null = null;
let refCount = 0;

/**
 * Create live region elements for screen reader announcements
 */
function createLiveRegions() {
  if (!liveRegion) {
    // Assertive region for important announcements
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'alert');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'aria-live-assertive';
    document.body.appendChild(liveRegion);
  }

  if (!politeRegion) {
    // Polite region for non-urgent announcements
    politeRegion = document.createElement('div');
    politeRegion.setAttribute('role', 'status');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    politeRegion.id = 'aria-live-polite';
    document.body.appendChild(politeRegion);
  }
}

/**
 * Remove live region elements
 */
function removeLiveRegions() {
  if (liveRegion && refCount === 0) {
    liveRegion.remove();
    liveRegion = null;
  }
  if (politeRegion && refCount === 0) {
    politeRegion.remove();
    politeRegion = null;
  }
}

/**
 * Composable for making screen reader announcements
 *
 * @example
 * ```ts
 * const { announce, announcePolite } = useAnnounce();
 *
 * // Important announcement (interrupts current speech)
 * announce('Erreur: Veuillez remplir tous les champs');
 *
 * // Non-urgent announcement (waits for current speech to finish)
 * announcePolite('Article ajouté au panier');
 * ```
 */
export function useAnnounce() {
  onMounted(() => {
    refCount++;
    createLiveRegions();
  });

  onUnmounted(() => {
    refCount--;
    if (refCount === 0) {
      // Delay removal to allow any pending announcements
      setTimeout(removeLiveRegions, 1000);
    }
  });

  /**
   * Make an assertive announcement (interrupts current speech)
   * Use for important messages like errors
   */
  const announce = (message: string) => {
    if (liveRegion) {
      // Clear first to ensure re-announcement of same message
      liveRegion.textContent = '';
      // Use setTimeout to ensure the DOM update is processed
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = message;
        }
      }, 50);
    }
  };

  /**
   * Make a polite announcement (waits for current speech to finish)
   * Use for non-urgent updates like cart additions
   */
  const announcePolite = (message: string) => {
    if (politeRegion) {
      // Clear first to ensure re-announcement of same message
      politeRegion.textContent = '';
      // Use setTimeout to ensure the DOM update is processed
      setTimeout(() => {
        if (politeRegion) {
          politeRegion.textContent = message;
        }
      }, 50);
    }
  };

  /**
   * Clear all announcements
   */
  const clearAnnouncements = () => {
    if (liveRegion) {
      liveRegion.textContent = '';
    }
    if (politeRegion) {
      politeRegion.textContent = '';
    }
  };

  return {
    announce,
    announcePolite,
    clearAnnouncements,
  };
}

/**
 * Standalone function to make an assertive announcement
 * Use when you don't need the composable lifecycle
 */
export function announce(message: string) {
  createLiveRegions();
  if (liveRegion) {
    liveRegion.textContent = '';
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    }, 50);
  }
}

/**
 * Standalone function to make a polite announcement
 * Use when you don't need the composable lifecycle
 */
export function announcePolite(message: string) {
  createLiveRegions();
  if (politeRegion) {
    politeRegion.textContent = '';
    setTimeout(() => {
      if (politeRegion) {
        politeRegion.textContent = message;
      }
    }, 50);
  }
}
