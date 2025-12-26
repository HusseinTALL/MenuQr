<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { Dish } from '@/types';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import api from '@/services/api';
import LazyImage from '@/components/common/LazyImage.vue';

const props = defineProps<{
  dish: Dish;
}>();

const emit = defineEmits<{
  select: [dish: Dish];
  requestAuth: [];
}>();

const { quickAdd, getDishQuantity } = useCart();
const { localize, t } = useLocale();
const { formatPrice } = useCurrency();
const customerAuthStore = useCustomerAuthStore();

const dishName = computed(() => localize(props.dish.name));
const dishDescription = computed(() => localize(props.dish.description));
const quantityInCart = computed(() => getDishQuantity(props.dish.id));

// Favorites
const isFavorite = ref(false);
const isTogglingFavorite = ref(false);

// Check if dish is in favorites on mount
onMounted(async () => {
  if (customerAuthStore.isAuthenticated) {
    try {
      const response = await api.customerCheckFavorite(props.dish.id);
      if (response.success && response.data) {
        isFavorite.value = response.data.isFavorite;
      }
    } catch {
      // Ignore errors
    }
  }
});

const handleFavoriteClick = async (event: Event) => {
  event.stopPropagation();

  if (!customerAuthStore.isAuthenticated) {
    emit('requestAuth');
    return;
  }

  if (isTogglingFavorite.value) return;

  isTogglingFavorite.value = true;
  const wasInFavorites = isFavorite.value;

  // Optimistic update
  isFavorite.value = !wasInFavorites;

  try {
    if (wasInFavorites) {
      await api.customerRemoveFavorite(props.dish.id);
    } else {
      await api.customerAddFavorite(props.dish.id);
    }
  } catch {
    // Revert on error
    isFavorite.value = wasInFavorites;
  } finally {
    isTogglingFavorite.value = false;
  }
};

const handleAddClick = (event: Event) => {
  event.stopPropagation();

  // If dish has options, open modal
  if (props.dish.options && props.dish.options.length > 0) {
    emit('select', props.dish);
  } else {
    // Quick add without options
    quickAdd(props.dish);
  }
};
</script>

<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all duration-300 ease-out cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.985] active:duration-100"
    :class="{
      'opacity-60 grayscale pointer-events-none': !dish.isAvailable,
      'ring-2 ring-primary-500': quantityInCart > 0 && dish.isAvailable,
    }"
    role="button"
    tabindex="0"
    :aria-label="`${dishName}, ${formatPrice(dish.price)}${!dish.isAvailable ? ', non disponible' : ''}${quantityInCart > 0 ? `, ${quantityInCart} dans le panier` : ''}`"
    @click="emit('select', dish)"
    @keydown.enter="emit('select', dish)"
    @keydown.space.prevent="emit('select', dish)"
  >
    <!-- Image Container -->
    <div class="relative aspect-[4/3] overflow-hidden bg-gray-100">
      <LazyImage
        :src="dish.image"
        :alt="dishName"
        class="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03]"
      />

      <!-- Ambient gradient overlay -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80"
      />

      <!-- Badges Container (Top Left) -->
      <div class="absolute left-3 top-3 flex flex-col items-start gap-1.5">
        <span
          v-if="dish.isPopular"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm shadow-md bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700"
          role="status"
        >
          <svg class="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path
              d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.3l-4.2 2.2.8-4.7L1.2 6.5l4.7-.7L8 1.5z"
            />
          </svg>
          {{ t('menu.popular') }}
        </span>
        <span
          v-if="dish.isNew"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm shadow-md bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700"
          role="status"
        >
          <svg class="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0l1.5 5.5H15l-4.5 3.3 1.7 5.2L8 10.7 3.8 14l1.7-5.2L1 5.5h5.5L8 0z" />
          </svg>
          {{ t('menu.new') }}
        </span>
      </div>

      <!-- Estimated Time (Bottom Left) -->
      <div
        v-if="dish.estimatedTime"
        class="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm"
        :aria-label="`Temps de préparation: ${dish.estimatedTime} minutes`"
      >
        <svg
          class="h-3.5 w-3.5 text-gray-500"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span aria-hidden="true">{{ dish.estimatedTime }} min</span>
      </div>

      <!-- Favorite Button (Bottom Right) -->
      <button
        v-if="dish.isAvailable"
        type="button"
        class="absolute bottom-3 right-3 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 shadow-sm backdrop-blur-sm"
        :class="[
          isFavorite
            ? 'bg-red-500 text-white'
            : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white',
          isTogglingFavorite ? 'animate-pulse' : ''
        ]"
        :aria-label="isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
        @click="handleFavoriteClick"
      >
        <svg
          class="w-4 h-4 transition-transform duration-200"
          :class="{ 'scale-110': isFavorite }"
          :fill="isFavorite ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      <!-- Cart Quantity Badge (Top Right) -->
      <transition name="badge-pop">
        <div
          v-if="quantityInCart > 0 && dish.isAvailable"
          class="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-600 px-2 text-sm font-bold text-white shadow-lg ring-2 ring-white"
        >
          {{ quantityInCart }}
        </div>
      </transition>

      <!-- Unavailable Overlay -->
      <div
        v-if="!dish.isAvailable"
        class="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-[2px]"
      >
        <span
          class="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          {{ t('menu.unavailable') }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 flex-col p-4">
      <!-- Title -->
      <h3 class="truncate text-[15px] font-semibold leading-tight text-gray-900">
        {{ dishName }}
      </h3>

      <!-- Rating -->
      <div
        v-if="dish.reviewStats && dish.reviewStats.totalReviews > 0"
        class="flex items-center gap-1.5 mt-1"
      >
        <div class="flex items-center gap-0.5">
          <svg
            class="w-3.5 h-3.5 text-amber-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span class="text-xs font-medium text-gray-700">
            {{ dish.reviewStats.averageRating.toFixed(1) }}
          </span>
        </div>
        <span class="text-xs text-gray-400">
          ({{ dish.reviewStats.totalReviews }})
        </span>
      </div>

      <!-- Description -->
      <p
        v-if="dishDescription"
        class="mt-1.5 line-clamp-2 text-[13px] leading-snug text-gray-500"
      >
        {{ dishDescription }}
      </p>

      <!-- Dietary Icons -->
      <div v-if="dish.isVegetarian || dish.isSpicy" class="mt-2.5 flex items-center gap-1.5">
        <span
          v-if="dish.isVegetarian"
          class="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md bg-green-100 text-green-600"
          title="Végétarien"
        >
          <svg class="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 1c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7 3.1-7 7-7zm0 2C5.2 3 3 5.2 3 8s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 1.5c.4 0 .8.3.8.8v2h2c.4 0 .8.3.8.7 0 .4-.3.8-.8.8h-2v2c0 .4-.3.8-.8.8-.4 0-.7-.4-.7-.8v-2h-2c-.5 0-.8-.4-.8-.8s.3-.7.8-.7h2v-2c0-.5.3-.8.7-.8z"
            />
          </svg>
        </span>
        <div
          v-if="dish.isSpicy"
          class="flex items-center gap-0.5"
          :title="`Pimenté niveau ${dish.spicyLevel}`"
        >
          <span
            v-for="n in dish.spicyLevel || 1"
            :key="n"
            class="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md bg-red-100 text-red-600"
          >
            <svg class="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8.5 1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5S8 2.8 8 2.5v-1c0-.3.2-.5.5-.5zM5 3.5c0-.3.2-.5.5-.5s.5.2.5.5v2c0 .3-.2.5-.5.5S5 5.8 5 5.5v-2zm6 0c0-.3.2-.5.5-.5s.5.2.5.5v2c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-2zM8.5 5C10.4 5 12 6.6 12 8.5c0 2.5-1.5 5-3.5 6.5-2-1.5-3.5-4-3.5-6.5C5 6.6 6.6 5 8.5 5z"
              />
            </svg>
          </span>
        </div>
      </div>

      <!-- Spacer -->
      <div class="flex-1 min-h-3" />

      <!-- Price & Add Button -->
      <div class="flex items-center justify-between pt-2">
        <div class="flex flex-col">
          <span class="text-base font-bold tracking-tight text-gray-900">
            {{ formatPrice(dish.price) }}
          </span>
        </div>

        <button
          v-if="dish.isAvailable"
          type="button"
          class="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/35 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-primary-500/45 active:scale-90 active:duration-100"
          @click.stop="handleAddClick"
          :aria-label="`${t('menu.addToCart')}: ${dishName}`"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Badge Pop Animation - only keeping animations that can't be done with Tailwind */
.badge-pop-enter-active {
  animation: badge-pop-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.badge-pop-leave-active {
  animation: badge-pop-out 200ms ease-in forwards;
}

@keyframes badge-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes badge-pop-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .badge-pop-enter-active,
  .badge-pop-leave-active {
    animation: none;
  }
}
</style>
