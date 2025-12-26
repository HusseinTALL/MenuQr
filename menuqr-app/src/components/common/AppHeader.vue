<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMenuStore } from '@/stores/menuStore';
import { useCartStore } from '@/stores/cartStore';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import LanguageSelector from './LanguageSelector.vue';

const props = defineProps<{
  showBack?: boolean;
  showCart?: boolean;
  showLang?: boolean;
  showUser?: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  openAuth: [];
}>();

const router = useRouter();
const menuStore = useMenuStore();
const cartStore = useCartStore();
const customerAuthStore = useCustomerAuthStore();

const restaurantName = computed(() => menuStore.restaurant?.name || 'MenuQR');
const cartItemCount = computed(() => cartStore.itemCount);
const displayTitle = computed(() => props.title || restaurantName.value);

const showUserMenu = ref(false);

const goBack = () => {
  router.back();
};

const goToCart = () => {
  router.push('/cart');
};

const handleUserClick = () => {
  if (customerAuthStore.isAuthenticated) {
    showUserMenu.value = !showUserMenu.value;
  } else {
    emit('openAuth');
  }
};

const handleLogout = async () => {
  await customerAuthStore.logout();
  showUserMenu.value = false;
};

const goToOrders = () => {
  showUserMenu.value = false;
  router.push('/orders');
};

const goToFavorites = () => {
  showUserMenu.value = false;
  router.push('/favorites');
};

const goToLoyalty = () => {
  showUserMenu.value = false;
  router.push('/loyalty');
};

const goToReviews = () => {
  showUserMenu.value = false;
  router.push('/reviews');
};
</script>

<template>
  <header
    id="main-nav"
    class="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm safe-area-inset-top"
    role="banner"
  >
    <nav class="flex items-center justify-between h-14 px-4" aria-label="Navigation principale">
      <!-- Left: Back button or Logo -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <button
          v-if="showBack"
          type="button"
          class="tap-target flex items-center justify-center -ml-2 text-gray-600 hover:text-gray-900"
          aria-label="Retour"
          @click="goBack"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h1 class="text-lg font-bold text-gray-900 truncate">
          {{ displayTitle }}
        </h1>
      </div>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2" role="group" aria-label="Actions">
        <!-- Language Selector -->
        <LanguageSelector v-if="showLang" />

        <!-- User Button -->
        <div v-if="showUser" class="relative">
          <button
            type="button"
            class="tap-target flex items-center justify-center text-gray-600 hover:text-gray-900"
            :class="{ 'text-primary-600': customerAuthStore.isAuthenticated }"
            :aria-label="customerAuthStore.isAuthenticated ? 'Mon compte' : 'Se connecter'"
            @click="handleUserClick"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <!-- Authenticated indicator -->
            <span
              v-if="customerAuthStore.isAuthenticated"
              class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"
              aria-hidden="true"
            />
          </button>

          <!-- User Dropdown Menu -->
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="showUserMenu && customerAuthStore.isAuthenticated"
              class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg ring-1 ring-black/5 py-1 z-50"
            >
              <!-- User Info -->
              <div class="px-4 py-3 border-b border-gray-100">
                <p class="text-sm font-semibold text-gray-900 truncate">
                  {{ customerAuthStore.customerName }}
                </p>
                <p class="text-xs text-gray-500 truncate">
                  {{ customerAuthStore.customer?.phone }}
                </p>
              </div>

              <!-- Menu Items -->
              <button
                type="button"
                class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                @click="goToOrders"
              >
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Mes commandes
              </button>

              <button
                type="button"
                class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                @click="goToFavorites"
              >
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Mes favoris
              </button>

              <button
                type="button"
                class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                @click="goToLoyalty"
              >
                <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Ma fidelite
              </button>

              <button
                type="button"
                class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                @click="goToReviews"
              >
                <svg class="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Mes avis
              </button>

              <div class="border-t border-gray-100 mt-1 pt-1">
                <button
                  type="button"
                  class="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                  @click="handleLogout"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Déconnexion
                </button>
              </div>
            </div>
          </Transition>

          <!-- Click outside to close -->
          <div
            v-if="showUserMenu"
            class="fixed inset-0 z-40"
            @click="showUserMenu = false"
          />
        </div>

        <!-- Cart Button -->
        <button
          v-if="showCart"
          type="button"
          class="relative tap-target flex items-center justify-center text-gray-600 hover:text-gray-900"
          :aria-label="`Panier${cartItemCount > 0 ? `, ${cartItemCount} article${cartItemCount > 1 ? 's' : ''}` : ''}`"
          @click="goToCart"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>

          <!-- Cart Badge -->
          <span
            v-if="cartItemCount > 0"
            class="absolute -top-1 -right-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            {{ cartItemCount > 9 ? '9+' : cartItemCount }}
          </span>
        </button>
      </div>
    </nav>
  </header>
</template>
