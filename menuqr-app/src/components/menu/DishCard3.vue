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
    class="dish-card group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 ease-out"
    :class="{
      'is-unavailable': !dish.isAvailable,
      'has-items': quantityInCart > 0 && dish.isAvailable,
    }"
    role="button"
    tabindex="0"
    :aria-label="`${dishName}, ${formatPrice(dish.price)}${!dish.isAvailable ? ', non disponible' : ''}${quantityInCart > 0 ? `, ${quantityInCart} dans le panier` : ''}`"
    @click="emit('select', dish)"
    @keydown.enter="emit('select', dish)"
    @keydown.space.prevent="emit('select', dish)"
  >
    <!-- Image Container -->
    <div class="relative aspect-[4/3] overflow-hidden bg-neutral-100">
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
        <span v-if="dish.isPopular" class="badge badge--popular" role="status">
          <svg class="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path
              d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.3l-4.2 2.2.8-4.7L1.2 6.5l4.7-.7L8 1.5z"
            />
          </svg>
          {{ t('menu.popular') }}
        </span>
        <span v-if="dish.isNew" class="badge badge--new" role="status">
          <svg class="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0l1.5 5.5H15l-4.5 3.3 1.7 5.2L8 10.7 3.8 14l1.7-5.2L1 5.5h5.5L8 0z" />
          </svg>
          {{ t('menu.new') }}
        </span>
      </div>

      <!-- Estimated Time (Bottom Left) -->
      <div
        v-if="dish.estimatedTime"
        class="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur-sm"
        :aria-label="`Temps de préparation: ${dish.estimatedTime} minutes`"
      >
        <svg
          class="h-3.5 w-3.5 text-neutral-500"
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
          class="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          {{ t('menu.unavailable') }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 flex-col p-4">
      <!-- Title -->
      <h3 class="truncate text-[15px] font-semibold leading-tight text-neutral-900">
        {{ dishName }}
      </h3>

      <!-- Description -->
      <p
        v-if="dishDescription"
        class="mt-1.5 line-clamp-2 text-[13px] leading-snug text-neutral-500"
      >
        {{ dishDescription }}
      </p>

      <!-- Dietary Icons -->
      <div v-if="dish.isVegetarian || dish.isSpicy" class="mt-2.5 flex items-center gap-1.5">
        <span v-if="dish.isVegetarian" class="dietary-tag dietary-tag--veg" title="Végétarien">
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
          <span v-for="n in dish.spicyLevel || 1" :key="n" class="dietary-tag dietary-tag--spicy">
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
          <span class="text-base font-bold tracking-tight text-neutral-900">
            {{ formatPrice(dish.price) }}
          </span>
        </div>

        <button
          v-if="dish.isAvailable"
          type="button"
          class="add-button"
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
/* Base Card */
.dish-card {
  background-color: white;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.dish-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
  pointer-events: none;
}

.dish-card:hover {
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.dish-card:active {
  transform: translateY(0) scale(0.985);
  transition-duration: 100ms;
}

.dish-card.has-items::after {
  box-shadow: inset 0 0 0 2px var(--color-primary-500, #22c55e);
}

.dish-card.is-unavailable {
  opacity: 0.7;
  pointer-events: none;
  filter: saturate(0.3);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.badge--popular {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #b45309;
}

.badge--new {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #7c3aed;
}

/* Dietary Tags */
.dietary-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
}

.dietary-tag--veg {
  background: #dcfce7;
  color: #16a34a;
}

.dietary-tag--spicy {
  background: #fee2e2;
  color: #dc2626;
}

/* Add Button */
.add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    var(--color-primary-500, #22c55e) 0%,
    var(--color-primary-600, #16a34a) 100%
  );
  color: white;
  box-shadow:
    0 2px 8px rgba(34, 197, 94, 0.35),
    0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 200ms ease-out;
}

/* Only apply hover effects on devices that support hover */
@media (hover: hover) and (pointer: fine) {
  .add-button:hover {
    transform: scale(1.05);
    box-shadow:
      0 4px 12px rgba(34, 197, 94, 0.45),
      0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

.add-button:active {
  transform: scale(0.92);
  transition-duration: 100ms;
}

/* Desktop enhancements */
@media (min-width: 1024px) {
  .dish-card:hover {
    transform: translateY(-4px);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.1),
      0 16px 48px rgba(0, 0, 0, 0.08);
  }
}

/* Touch device optimizations */
@media (hover: none) or (pointer: coarse) {
  .dish-card:hover {
    transform: none;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.04),
      0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .dish-card:active {
    transform: scale(0.98);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .dish-card,
  .dish-card img,
  .add-button {
    transition: none !important;
    animation: none !important;
  }

  .dish-card:hover {
    transform: none;
  }
}

/* Badge Pop Animation */
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
</style>
