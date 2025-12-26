<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { useConfigStore } from '@/stores/configStore';
import { useOffline } from '@/composables/useOffline';
import { usePWA } from '@/composables/usePWA';
import OfflineBanner from '@/components/common/OfflineBanner.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import UpdatePrompt from '@/components/pwa/UpdatePrompt.vue';
import SkipLinks from '@/components/common/SkipLinks.vue';

const configStore = useConfigStore();
const { isOffline, showOnlineMessage, dismissOnlineMessage } = useOffline();
const { needRefresh, offlineReady, acceptUpdate, dismissUpdate, dismissOfflineReady } = usePWA();

onMounted(() => {
  // Initialize config store (sets up event listeners)
  configStore.init();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Skip Links for Keyboard Navigation -->
    <SkipLinks
      :links="[
        { id: 'main-content', label: 'Aller au contenu principal' },
        { id: 'main-nav', label: 'Aller à la navigation' },
      ]"
    />

    <!-- Offline/Online Banner -->
    <OfflineBanner
      :is-offline="isOffline"
      :show-online-message="showOnlineMessage"
      @dismiss="dismissOnlineMessage"
    />

    <!-- Main Router View -->
    <main id="main-content" tabindex="-1" class="outline-none">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- PWA Update Prompt -->
    <UpdatePrompt
      :need-refresh="needRefresh"
      :offline-ready="offlineReady"
      @accept-update="acceptUpdate"
      @dismiss-update="dismissUpdate"
      @dismiss-offline-ready="dismissOfflineReady"
    />

    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<style>
/* Page transitions */
.page-enter-active {
  transition:
    opacity 280ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
}

.page-leave-active {
  transition:
    opacity 180ms cubic-bezier(0.4, 0, 1, 1),
    transform 180ms cubic-bezier(0.4, 0, 1, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity 0.01ms;
  }

  .page-enter-from,
  .page-leave-to {
    transform: none;
  }
}
</style>
