<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// Map route paths to their parent info
const routeHierarchy: Record<string, { parent: string; parentLabel: string }> = {
  '/admin/orders': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/reservations': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/tables': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/dishes': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/categories': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/settings': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/campaigns': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/loyalty': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/pricing': { parent: '/admin', parentLabel: 'Dashboard' },
  '/admin/reviews': { parent: '/admin', parentLabel: 'Dashboard' },
};

const currentPageTitle = computed(() => {
  return (route.meta.title as string) || 'Dashboard';
});

const isDashboard = computed(() => {
  return route.path === '/admin' || route.path === '/admin/';
});

const parentRoute = computed(() => {
  return routeHierarchy[route.path] || null;
});

const canGoBack = computed(() => {
  return !isDashboard.value && window.history.length > 1;
});

const goBack = () => {
  router.back();
};

const goToParent = () => {
  if (parentRoute.value) {
    router.push(parentRoute.value.parent);
  }
};
</script>

<template>
  <nav class="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
    <!-- Back button -->
    <button
      v-if="canGoBack"
      @click="goBack"
      class="group flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-teal-50 hover:text-teal-600 transition-all duration-200 active:scale-95"
      :title="$t('app.back')"
    >
      <svg
        class="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <!-- Breadcrumb trail -->
    <ol class="flex items-center gap-1">
      <!-- Home/Dashboard -->
      <li>
        <router-link
          to="/admin"
          class="flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          :class="{ 'text-gray-900 font-medium': isDashboard }"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span class="hidden sm:inline">Dashboard</span>
        </router-link>
      </li>

      <!-- Separator + Current page (if not dashboard) -->
      <template v-if="!isDashboard">
        <li class="text-gray-300">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </li>
        <li>
          <span class="px-2 py-1 rounded-md text-gray-900 font-medium bg-gray-100">
            {{ currentPageTitle }}
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>
