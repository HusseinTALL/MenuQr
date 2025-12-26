<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { useCartStore } from '@/stores/cartStore';

const router = useRouter();
const restaurantStore = useRestaurantStore();
const cartStore = useCartStore();

const emit = defineEmits<{
  'change-request': [];
}>();

const restaurant = computed(() => restaurantStore.selectedRestaurant);

const handleChangeRestaurant = () => {
  // If cart has items, emit event for parent to handle confirmation
  if (cartStore.itemCount > 0) {
    emit('change-request');
  } else {
    // No items in cart, navigate directly
    navigateToList();
  }
};

const navigateToList = () => {
  restaurantStore.clearSelection();
  router.push('/');
};

// Expose for parent components
defineExpose({
  navigateToList,
});
</script>

<template>
  <div
    v-if="restaurant"
    class="flex items-center justify-between bg-white px-4 py-2 border-b border-gray-100"
  >
    <!-- Restaurant Info -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Logo -->
      <div v-if="restaurant.logo" class="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg">
        <img
          :src="restaurant.logo"
          :alt="restaurant.name"
          class="h-full w-full object-cover"
        />
      </div>
      <div
        v-else
        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-white"
      >
        {{ restaurant.name.charAt(0).toUpperCase() }}
      </div>

      <!-- Name -->
      <span class="truncate text-sm font-medium text-gray-900">
        {{ restaurant.name }}
      </span>
    </div>

    <!-- Change Button -->
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
      @click="handleChangeRestaurant"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
      <span>Changer</span>
    </button>
  </div>
</template>
