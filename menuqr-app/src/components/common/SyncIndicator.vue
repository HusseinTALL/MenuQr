<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useOfflineStore } from '@/stores/offlineStore';
import { useConfigStore } from '@/stores/configStore';

const offlineStore = useOfflineStore();
const configStore = useConfigStore();

const locale = computed(() => configStore.locale);

const syncStatus = computed(() => {
  if (offlineStore.isSyncing) {
    return {
      icon: 'sync',
      text: locale.value === 'fr' ? 'Synchronisation...' : 'Syncing...',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    };
  }

  if (offlineStore.syncError) {
    return {
      icon: 'error',
      text: locale.value === 'fr' ? 'Erreur de sync' : 'Sync error',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    };
  }

  if (offlineStore.cachedMenuAvailable) {
    return {
      icon: 'success',
      text: offlineStore.lastSyncFormatted || (locale.value === 'fr' ? 'Synchronisé' : 'Synced'),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  }

  return {
    icon: 'none',
    text: locale.value === 'fr' ? 'Non synchronisé' : 'Not synced',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  };
});

onMounted(async () => {
  if (!offlineStore.isInitialized) {
    await offlineStore.initialize();
  }
});
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
    :class="[syncStatus.bgColor, syncStatus.color]"
  >
    <!-- Sync icon (spinning) -->
    <svg
      v-if="syncStatus.icon === 'sync'"
      class="w-3 h-3 animate-spin"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>

    <!-- Success icon -->
    <svg
      v-else-if="syncStatus.icon === 'success'"
      class="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>

    <!-- Error icon -->
    <svg
      v-else-if="syncStatus.icon === 'error'"
      class="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>

    <!-- Offline icon -->
    <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
      />
    </svg>

    <span>{{ syncStatus.text }}</span>
  </div>
</template>
