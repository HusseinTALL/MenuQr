<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import { useMenuStore } from '@/stores/menuStore';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import api from '@/services/api';
import AppHeader from '@/components/common/AppHeader.vue';
import DishModal from '@/components/menu/DishModal.vue';
import type { Dish } from '@/types';

const router = useRouter();
const customerAuthStore = useCustomerAuthStore();
const menuStore = useMenuStore();
const { quickAdd } = useCart();
const { localize } = useLocale();
const { formatPrice } = useCurrency();

const favorites = ref<Dish[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Modal
const selectedDish = ref<Dish | null>(null);
const isDishModalOpen = ref(false);

onMounted(async () => {
  // Initialize customer auth for this restaurant
  if (menuStore.restaurant?.id) {
    customerAuthStore.initForRestaurant(menuStore.restaurant.id);
  }

  if (!customerAuthStore.isAuthenticated) {
    router.push('/menu');
    return;
  }

  try {
    const response = await api.customerGetFavorites();
    if (response.success && response.data) {
      // Map API response to Dish type
      favorites.value = (response.data as unknown[]).map((dish: unknown) => dish as Dish);
    }
  } catch (err) {
    error.value = 'Impossible de charger vos favoris';
  } finally {
    isLoading.value = false;
  }
});

const openDishModal = (dish: Dish) => {
  selectedDish.value = dish;
  isDishModalOpen.value = true;
};

const closeDishModal = () => {
  isDishModalOpen.value = false;
  selectedDish.value = null;
};

const handleAddToCart = (dish: Dish) => {
  if (dish.options && dish.options.length > 0) {
    openDishModal(dish);
  } else {
    quickAdd(dish);
  }
};

const handleRemoveFavorite = async (dishId: string) => {
  try {
    await api.customerRemoveFavorite(dishId);
    favorites.value = favorites.value.filter(d => d.id !== dishId);
  } catch {
    // Handle error
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-8">
    <AppHeader :show-back="true" title="Mes favoris" />

    <div class="container max-w-2xl mx-auto px-4 py-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="grid grid-cols-2 gap-4">
        <div v-for="n in 4" :key="n" class="bg-white rounded-2xl overflow-hidden animate-pulse">
          <div class="aspect-[4/3] bg-gray-200" />
          <div class="p-4">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div class="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-16">
        <p class="text-red-600">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="favorites.length === 0" class="text-center py-16">
        <div class="w-20 h-20 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Aucun favori</h2>
        <p class="text-gray-500 mb-6">Ajoutez des plats a vos favoris pour les retrouver ici</p>
        <button
          class="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          @click="router.push('/menu')"
        >
          Voir le menu
        </button>
      </div>

      <!-- Favorites Grid -->
      <div v-else class="grid grid-cols-2 gap-4">
        <div
          v-for="dish in favorites"
          :key="dish.id"
          class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 overflow-hidden"
        >
          <!-- Image -->
          <div class="relative aspect-[4/3] bg-gray-100 cursor-pointer" @click="openDishModal(dish)">
            <img
              v-if="dish.image"
              :src="dish.image"
              :alt="localize(dish.name)"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <!-- Remove Favorite Button -->
            <button
              class="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              @click.stop="handleRemoveFavorite(dish.id)"
            >
              <svg class="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-4">
            <h3 class="font-semibold text-gray-900 truncate mb-1">{{ localize(dish.name) }}</h3>
            <div class="flex items-center justify-between">
              <span class="font-bold text-primary-600">{{ formatPrice(dish.price) }}</span>
              <button
                v-if="dish.isAvailable"
                class="w-9 h-9 bg-primary-600 text-white rounded-lg flex items-center justify-center hover:bg-primary-700 transition-colors"
                @click="handleAddToCart(dish)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
              </button>
              <span v-else class="text-xs text-gray-500">Indisponible</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dish Modal -->
    <DishModal :open="isDishModalOpen" :dish="selectedDish" @close="closeDishModal" />
  </div>
</template>
