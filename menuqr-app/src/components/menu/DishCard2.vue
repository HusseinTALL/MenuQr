<script setup lang="ts">
import { computed } from 'vue';
import type { Dish } from '@/types';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import LazyImage from '@/components/common/LazyImage.vue';

const props = defineProps<{
  dish: Dish;
}>();

const emit = defineEmits<{
  select: [dish: Dish];
}>();

const { quickAdd, getDishQuantity } = useCart();
const { localize, t } = useLocale();
const { formatPrice } = useCurrency();

const dishName = computed(() => localize(props.dish.name));
const dishDescription = computed(() => localize(props.dish.description));
const quantityInCart = computed(() => getDishQuantity(props.dish.id));

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
    class="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/50 transition-all duration-300 hover:shadow-lg hover:ring-primary-300 active:scale-[0.98] cursor-pointer"
    :class="{ 'opacity-60 grayscale pointer-events-none': !dish.isAvailable }"
    @click="emit('select', dish)"
  >
    <!-- Image Container -->
    <div class="relative aspect-[4/3] overflow-hidden bg-gray-50">
      <LazyImage
        :src="dish.image"
        :alt="dishName"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <!-- Gradient Overlay for Better Text Readability (subtle) -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      ></div>

      <!-- Badges (Top Left) -->
      <div class="absolute top-3 left-3 flex flex-col gap-2">
        <span
          v-if="dish.isPopular"
          class="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200"
        >
          <span class="text-base">🔥</span> {{ t('menu.popular') }}
        </span>
        <span
          v-if="dish.isNew"
          class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-200"
        >
          <span class="text-base">✨</span> {{ t('menu.new') }}
        </span>
      </div>

      <!-- Estimated Time (Bottom Right) -->
      <div
        v-if="dish.estimatedTime"
        class="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
      >
        ⏱️ {{ dish.estimatedTime }} min
      </div>

      <!-- Cart Quantity Badge (Top Right) -->
      <transition name="fade-scale">
        <div
          v-if="quantityInCart > 0 && dish.isAvailable"
          class="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white shadow-md ring-4 ring-white"
        >
          {{ quantityInCart }}
        </div>
      </transition>

      <!-- Unavailable Overlay -->
      <div
        v-if="!dish.isAvailable"
        class="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      >
        <span class="rounded-full bg-gray-800/90 px-5 py-2.5 text-sm font-semibold text-white">
          {{ t('menu.unavailable') }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <h3 class="truncate text-base font-semibold text-gray-900">
        {{ dishName }}
      </h3>

      <p v-if="dishDescription" class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-600">
        {{ dishDescription }}
      </p>

      <!-- Dietary Icons -->
      <div class="mt-3 flex items-center gap-2.5">
        <span v-if="dish.isVegetarian" class="text-lg" title="Végétarien">🥬</span>
        <div
          v-if="dish.isSpicy"
          class="flex items-center"
          :title="`Pimenté niveau ${dish.spicyLevel}`"
        >
          <span class="text-lg">🌶️</span>
          <span v-if="dish.spicyLevel && dish.spicyLevel > 1" class="text-lg -ml-1">🌶️</span>
          <span v-if="dish.spicyLevel && dish.spicyLevel > 2" class="text-lg -ml-1">🌶️</span>
        </div>
      </div>

      <!-- Price & Add Button -->
      <div class="mt-4 flex items-center justify-between">
        <span class="text-lg font-bold text-gray-900">
          {{ formatPrice(dish.price) }}
        </span>

        <button
          v-if="dish.isAvailable"
          class="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-3xl font-thin text-white shadow-lg transition-all duration-200 hover:bg-primary-700 hover:shadow-xl active:scale-90"
          @click.stop="handleAddClick"
        >
          <span class="mb-1">+</span>
          <!-- Ripple effect on interaction (visual polish) -->
          <span
            class="absolute inset-0 rounded-full bg-white/20 scale-0 transition-transform duration-300 active:scale-150"
          ></span>
        </button>
      </div>
    </div>
  </article>
</template>
