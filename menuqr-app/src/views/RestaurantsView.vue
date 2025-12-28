<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRestaurantStore, type RestaurantListItem } from '@/stores/restaurantStore';
import { useCartStore } from '@/stores/cartStore';
import AppHeader from '@/components/common/AppHeader.vue';
import RestaurantCard from '@/components/restaurant/RestaurantCard.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import SkeletonLoader from '@/components/common/SkeletonLoader.vue';
import QRScanner from '@/components/restaurant/QRScanner.vue';

const router = useRouter();
const restaurantStore = useRestaurantStore();
const cartStore = useCartStore();

// Search
const searchQuery = ref('');
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

// QR Scanner
const showScanner = ref(false);
const scannerError = ref<string | null>(null);

// Confirm dialog for cart clearing
const showConfirmDialog = ref(false);
const pendingRestaurant = ref<RestaurantListItem | null>(null);

// Computed
const restaurants = computed(() => restaurantStore.restaurants);
const isLoading = computed(() => restaurantStore.isLoading);
const error = computed(() => restaurantStore.error);
const hasMore = computed(() => restaurantStore.hasMorePages);

// Load restaurants on mount
onMounted(async () => {
  await restaurantStore.fetchRestaurants();
});

// Handle search with debounce
const handleSearch = (query: string) => {
  searchQuery.value = query;

  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  searchTimeout.value = setTimeout(async () => {
    await restaurantStore.search(query);
  }, 300);
};

// Clear search
const clearSearch = async () => {
  searchQuery.value = '';
  await restaurantStore.clearSearch();
};

// Handle restaurant selection
const handleSelectRestaurant = (restaurant: RestaurantListItem) => {
  // If cart has items from a different restaurant
  if (cartStore.itemCount > 0 && cartStore.restaurantId !== restaurant.id) {
    pendingRestaurant.value = restaurant;
    showConfirmDialog.value = true;
  } else {
    navigateToRestaurant(restaurant);
  }
};

// Navigate to restaurant menu
const navigateToRestaurant = (restaurant: RestaurantListItem) => {
  restaurantStore.setSelectedRestaurant(restaurant);
  router.push(`/r/${restaurant.slug}`);
};

// Confirm cart clear and navigate
const handleConfirmChange = () => {
  if (pendingRestaurant.value) {
    cartStore.resetCart();
    navigateToRestaurant(pendingRestaurant.value);
  }
  showConfirmDialog.value = false;
  pendingRestaurant.value = null;
};

// Cancel cart clear
const handleCancelChange = () => {
  showConfirmDialog.value = false;
  pendingRestaurant.value = null;
};

// Load more (infinite scroll)
const loadMore = async () => {
  if (!isLoading.value && hasMore.value) {
    await restaurantStore.loadMore();
  }
};

// Handle scroll for infinite loading
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const scrolledToBottom =
    target.scrollHeight - target.scrollTop <= target.clientHeight + 200;

  if (scrolledToBottom) {
    loadMore();
  }
};

// Open QR Scanner
const openScanner = () => {
  showScanner.value = true;
  scannerError.value = null;
};

// Handle QR scan result
const handleScanResult = (result: string) => {
  showScanner.value = false;

  // Try to extract slug from URL
  const urlMatch = result.match(/\/r\/([^/?]+)/);
  if (urlMatch && urlMatch[1]) {
    router.push(`/r/${urlMatch[1]}`);
  } else {
    // Try as plain slug
    router.push(`/r/${result}`);
  }
};

// Handle scanner error
const handleScanError = (err: Error) => {
  scannerError.value = err.message;
};

// Close scanner
const closeScanner = () => {
  showScanner.value = false;
  scannerError.value = null;
};

// Retry loading
const retryLoad = async () => {
  await restaurantStore.fetchRestaurants();
};
</script>

<template>
  <div class="min-h-screen bg-gray-50" @scroll="handleScroll">
    <!-- Header -->
    <AppHeader show-lang />

    <!-- Hero Section -->
    <div class="bg-gradient-to-br from-primary-600 to-primary-700 px-4 pb-8 pt-6">
      <h1 class="text-2xl font-bold text-white mb-2">
        Trouvez votre restaurant
      </h1>
      <p class="text-primary-100 text-sm mb-6">
        Scannez un QR code ou choisissez dans la liste
      </p>

      <!-- Search Bar -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un restaurant..."
          class="w-full rounded-xl bg-white/95 px-4 py-3 pl-10 text-gray-900 placeholder-gray-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
          @input="handleSearch(($event.target as HTMLInputElement).value)"
        />
        <svg
          class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          @click="clearSearch"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- QR Scanner Button -->
    <div class="px-4 -mt-4 mb-4">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-gray-900 shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        @click="openScanner"
      >
        <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        Scanner un QR code
      </button>
    </div>

    <!-- Content -->
    <div class="px-4 pb-8">
      <!-- Loading State -->
      <div v-if="isLoading && restaurants.length === 0" class="space-y-3">
        <div
          v-for="n in 5"
          :key="n"
          class="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <SkeletonLoader class="h-16 w-16 rounded-lg" />
          <div class="flex-1 space-y-2">
            <SkeletonLoader class="h-5 w-3/4" />
            <SkeletonLoader class="h-4 w-full" />
            <SkeletonLoader class="h-3 w-1/2" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error && restaurants.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <svg
          class="mb-4 h-16 w-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p class="mb-4 text-gray-500">{{ error }}</p>
        <button
          type="button"
          class="rounded-xl bg-primary-600 px-6 py-2 font-medium text-white hover:bg-primary-700"
          @click="retryLoad"
        >
          Réessayer
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!isLoading && restaurants.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <svg
          class="mb-4 h-16 w-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 class="mb-1 text-lg font-medium text-gray-900">
          Aucun restaurant trouvé
        </h3>
        <p class="text-gray-500">
          {{ searchQuery ? 'Essayez une autre recherche' : 'Aucun restaurant disponible' }}
        </p>
      </div>

      <!-- Restaurant List -->
      <div v-else class="space-y-3">
        <RestaurantCard
          v-for="restaurant in restaurants"
          :key="restaurant.id"
          :restaurant="restaurant"
          @select="handleSelectRestaurant"
        />

        <!-- Load More -->
        <div v-if="isLoading && restaurants.length > 0" class="py-4 text-center">
          <div class="inline-flex items-center gap-2 text-gray-500">
            <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Chargement...
          </div>
        </div>
      </div>
    </div>

    <!-- QR Scanner Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <QRScanner
          v-if="showScanner"
          @result="handleScanResult"
          @error="handleScanError"
          @close="closeScanner"
        />
      </Transition>
    </Teleport>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :open="showConfirmDialog"
      title="Changer de restaurant ?"
      :message="`Votre panier contient ${cartStore.itemCount} article${cartStore.itemCount > 1 ? 's' : ''}. Changer de restaurant videra votre panier.`"
      confirm-text="Continuer"
      cancel-text="Annuler"
      @confirm="handleConfirmChange"
      @cancel="handleCancelChange"
      @close="handleCancelChange"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
