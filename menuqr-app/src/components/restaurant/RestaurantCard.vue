<script setup lang="ts">
import type { RestaurantListItem } from '@/stores/restaurantStore';

interface Props {
  restaurant: RestaurantListItem;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [restaurant: RestaurantListItem];
}>();

const handleClick = () => {
  emit('select', props.restaurant);
};

// Compute full address
const fullAddress = () => {
  if (!props.restaurant.address) {return null;}
  const parts = [];
  if (props.restaurant.address.street) {parts.push(props.restaurant.address.street);}
  if (props.restaurant.address.city) {parts.push(props.restaurant.address.city);}
  return parts.length > 0 ? parts.join(', ') : null;
};
</script>

<template>
  <button
    type="button"
    class="group relative flex w-full items-start gap-4 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:shadow-md hover:ring-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-[0.98]"
    @click="handleClick"
  >
    <!-- Logo -->
    <div class="flex-shrink-0">
      <div
        v-if="restaurant.logo"
        class="h-16 w-16 overflow-hidden rounded-lg bg-gray-100"
      >
        <img
          :src="restaurant.logo"
          :alt="restaurant.name"
          class="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div
        v-else
        class="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-white"
      >
        {{ restaurant.name.charAt(0).toUpperCase() }}
      </div>
    </div>

    <!-- Content -->
    <div class="min-w-0 flex-1">
      <h3 class="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
        {{ restaurant.name }}
      </h3>

      <p
        v-if="restaurant.description"
        class="mt-1 line-clamp-2 text-sm text-gray-500"
      >
        {{ restaurant.description }}
      </p>

      <div
        v-if="fullAddress()"
        class="mt-2 flex items-center gap-1.5 text-xs text-gray-400"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span class="truncate">{{ fullAddress() }}</span>
      </div>
    </div>

    <!-- Arrow -->
    <div class="flex-shrink-0 self-center">
      <svg
        class="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </div>
  </button>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
