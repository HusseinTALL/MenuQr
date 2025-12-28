<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMenu } from '@/composables/useMenu';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useImagePreloader } from '@/composables/useImagePreloader';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import { useMenuStore } from '@/stores/menuStore';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { useCartStore } from '@/stores/cartStore';
import AppHeader from '@/components/common/AppHeader.vue';
import CategoryTabs from '@/components/menu/CategoryTabs.vue';
import SearchBar from '@/components/menu/SearchBar.vue';
import MenuFilters from '@/components/menu/MenuFilters.vue';
import DishCard from '@/components/menu/DishCard.vue';
import DishModal from '@/components/menu/DishModal.vue';
import CartFab from '@/components/cart/CartFab.vue';
import CustomerAuthModal from '@/components/customer/CustomerAuthModal.vue';
import RestaurantHeader from '@/components/restaurant/RestaurantHeader.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import type { Dish } from '@/types';

const route = useRoute();
const router = useRouter();
const { t, localize } = useLocale();
const { preloadImages, preloadNext } = useImagePreloader({ lookahead: 4 });

// Check if reservations are enabled
const reservationsEnabled = computed(() => {
  return menuStore.restaurant?.settings?.reservations?.enabled ?? false;
});

const goToReservation = () => {
  router.push('/reserve');
};

const {
  categories,
  isLoading,
  error,
  activeCategoryId,
  searchQuery,
  filteredDishes,
  hasActiveFilters,
  getDishesByCategory,
  setActiveCategory,
  setSearchQuery,
  clearSearch,
  clearFilters,
  loadMenu,
} = useMenu();

const { setTableNumber, isEmpty } = useCart();

// Customer auth
const customerAuthStore = useCustomerAuthStore();
const menuStore = useMenuStore();
const restaurantStore = useRestaurantStore();
const cartStore = useCartStore();
const showAuthModal = ref(false);

// Confirm dialog for changing restaurant
const showChangeConfirmDialog = ref(false);

// Handle request to change restaurant
const handleChangeRequest = () => {
  showChangeConfirmDialog.value = true;
};

// Confirm change and navigate
const handleConfirmChange = () => {
  cartStore.resetCart();
  restaurantStore.clearSelection();
  router.push('/');
  showChangeConfirmDialog.value = false;
};

// Cancel change
const handleCancelChange = () => {
  showChangeConfirmDialog.value = false;
};

const handleOpenAuth = () => {
  showAuthModal.value = true;
};

const handleAuthSuccess = () => {
  showAuthModal.value = false;
};

// Selected dish for modal
const selectedDish = ref<Dish | null>(null);
const isDishModalOpen = ref(false);

// Determine if we should show filtered view (search or filters active)
const showFilteredView = computed(() => {
  return searchQuery.value.length > 0 || hasActiveFilters.value;
});

// Get all dish images for preloading
const allDishImages = computed(() => {
  const images: string[] = [];
  categories.value.forEach((category) => {
    const dishes = getDishesByCategory(category.id);
    dishes.forEach((dish) => {
      if (dish.image) {
        images.push(dish.image);
      }
    });
  });
  return images;
});

// Preload first batch of images when menu loads
watch(
  () => categories.value.length,
  (newLength) => {
    if (newLength > 0) {
      // Preload first 6 images immediately (visible on first screen)
      const firstImages = allDishImages.value.slice(0, 6);
      preloadImages(firstImages);
    }
  },
  { immediate: true }
);

// Handle route params
onMounted(async () => {
  // Get table number from route if present
  const tableNumber = route.params.tableNumber;
  if (tableNumber) {
    setTableNumber(parseInt(tableNumber as string, 10));
  }

  // Load menu with restaurant slug if present
  const slug = route.params.slug as string | undefined;

  // If no slug, redirect to restaurant list
  if (!slug) {
    router.replace('/');
    return;
  }

  await loadMenu(slug);

  // Store selected restaurant info
  if (menuStore.restaurant) {
    restaurantStore.setSelectedRestaurant({
      id: menuStore.restaurant.id,
      name: menuStore.restaurant.name,
      slug: menuStore.restaurant.slug,
      logo: menuStore.restaurant.logo,
      description: menuStore.restaurant.description?.fr,
      address: {
        street: menuStore.restaurant.address,
        city: menuStore.restaurant.city,
      },
    });

    // Set restaurant ID in cart
    cartStore.setRestaurantId(menuStore.restaurant.id);
  }

  // Initialize customer auth for this restaurant
  if (menuStore.restaurant?.id) {
    customerAuthStore.initForRestaurant(menuStore.restaurant.id);
  }
});

const openDishModal = (dish: Dish) => {
  selectedDish.value = dish;
  isDishModalOpen.value = true;

  // Preload next dishes in the same category when modal opens
  const categoryDishes = getDishesByCategory(dish.categoryId);
  const currentIndex = categoryDishes.findIndex((d) => d.id === dish.id);
  const nextImages = categoryDishes
    .slice(currentIndex + 1, currentIndex + 4)
    .map((d) => d.image)
    .filter(Boolean) as string[];
  if (nextImages.length > 0) {
    preloadNext(nextImages, -1, nextImages.length);
  }
};

const closeDishModal = () => {
  isDishModalOpen.value = false;
  selectedDish.value = null;
};

const handleClearAll = () => {
  clearSearch();
  clearFilters();
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <!-- Header -->
    <AppHeader show-cart show-lang show-user @open-auth="handleOpenAuth" />

    <!-- Restaurant Header (Change button) -->
    <RestaurantHeader @change-request="handleChangeRequest" />

    <!-- Loading State with Skeletons -->
    <template v-if="isLoading">
      <div class="sticky top-14 z-30 bg-gray-50 pt-3 pb-2 px-4">
        <div class="h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div class="px-4 py-4">
        <div class="grid-responsive-cards">
          <DishCard v-for="n in 6" :key="n" :dish="{} as any" loading />
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 px-4 text-center">
      <svg
        class="w-16 h-16 text-gray-300 mb-4"
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
      <p class="text-gray-500 mb-4">{{ error }}</p>
      <button class="btn-primary" @click="loadMenu(route.params.slug as string)">
        {{ t('app.retry') }}
      </button>
    </div>

    <!-- Menu Content -->
    <template v-else>
      <!-- Search Bar -->
      <div class="sticky top-14 z-30 bg-gray-50 pt-3 pb-2 px-4">
        <SearchBar
          :model-value="searchQuery"
          @update:model-value="setSearchQuery"
          @clear="clearSearch"
        />
      </div>

      <!-- Filters & Sort -->
      <MenuFilters />

      <!-- Filtered View (Search or Filters Active) -->
      <div v-if="showFilteredView" class="px-4 pb-4">
        <!-- Results Count -->
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm text-gray-500">
            {{ t('menu.resultsCount', { count: filteredDishes.length }) }}
            <span v-if="searchQuery" class="font-medium"> - "{{ searchQuery }}" </span>
          </p>
          <button
            v-if="hasActiveFilters || searchQuery"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium"
            @click="handleClearAll"
          >
            {{ t('menu.clearFilters') }}
          </button>
        </div>

        <!-- Filtered Results Grid -->
        <TransitionGroup
          v-if="filteredDishes.length > 0"
          tag="div"
          name="card-list"
          class="grid grid-cols-2 gap-3"
        >
          <DishCard
            v-for="(dish, index) in filteredDishes"
            :key="dish.id"
            :dish="dish"
            :style="{ '--stagger-delay': `${Math.min(index * 50, 400)}ms` }"
            @select="openDishModal"
            @request-auth="handleOpenAuth"
          />
        </TransitionGroup>

        <!-- Empty State -->
        <div v-else class="text-center py-16">
          <svg
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
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
          <h3 class="text-lg font-medium text-gray-900 mb-1">
            {{ t('menu.noMatchingDishes') }}
          </h3>
          <p class="text-gray-500 mb-4">{{ t('menu.adjustFilters') }}</p>
          <button
            class="text-primary-600 hover:text-primary-700 font-medium"
            @click="handleClearAll"
          >
            {{ t('menu.clearFilters') }}
          </button>
        </div>
      </div>

      <!-- Categories & Menu (Normal View) -->
      <template v-else>
        <!-- Category Tabs -->
        <CategoryTabs
          :categories="categories"
          :active-id="activeCategoryId"
          @select="setActiveCategory"
        />

        <!-- Dishes Grid by Category -->
        <div class="px-4 space-y-6 pb-8" role="feed" aria-label="Liste des plats par catégorie">
          <section
            v-for="category in categories"
            :key="category.id"
            :id="`category-${category.id}`"
            :aria-labelledby="`category-title-${category.id}`"
          >
            <h2
              :id="`category-title-${category.id}`"
              class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"
            >
              <span v-if="category.icon" aria-hidden="true">{{ category.icon }}</span>
              {{ localize(category.name) }}
            </h2>

            <div class="grid-responsive-cards stagger-children" role="list">
              <DishCard
                v-for="dish in getDishesByCategory(category.id)"
                :key="dish.id"
                :dish="dish"
                @select="openDishModal"
                @request-auth="handleOpenAuth"
              />
            </div>
          </section>
        </div>
      </template>
    </template>

    <!-- Reservation Banner -->
    <div
      v-if="reservationsEnabled && !isLoading"
      class="fixed bottom-20 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:w-auto"
    >
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-100 sm:w-auto"
        @click="goToReservation"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Réserver une table
      </button>
    </div>

    <!-- Cart FAB -->
    <CartFab v-if="!isEmpty" />

    <!-- Dish Modal -->
    <DishModal :open="isDishModalOpen" :dish="selectedDish" @close="closeDishModal" />

    <!-- Customer Auth Modal -->
    <CustomerAuthModal
      v-if="menuStore.restaurant?.id"
      :show="showAuthModal"
      :restaurant-id="menuStore.restaurant.id"
      :restaurant-name="menuStore.restaurant.name"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
    />

    <!-- Confirm Dialog for changing restaurant -->
    <ConfirmDialog
      :open="showChangeConfirmDialog"
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
/* TransitionGroup animations for filtered cards */
.card-list-enter-active {
  transition:
    opacity 350ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--stagger-delay, 0ms);
}

.card-list-leave-active {
  transition:
    opacity 200ms cubic-bezier(0.4, 0, 1, 1),
    transform 200ms cubic-bezier(0.4, 0, 1, 1);
  position: absolute;
}

.card-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.card-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.card-list-move {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .card-list-enter-active,
  .card-list-leave-active,
  .card-list-move {
    transition: opacity 0.01ms;
  }

  .card-list-enter-from,
  .card-list-leave-to {
    transform: none;
  }
}
</style>
