<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { Rate, Tag, Skeleton } from 'ant-design-vue';
import {
  HeartOutlined,
  HeartFilled,
  ClockCircleOutlined,
  StarFilled,
  FireFilled,
  PlusOutlined,
} from '@ant-design/icons-vue';
import type { Dish } from '@/types';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import api from '@/services/api';
import LazyImage from '@/components/common/LazyImage.vue';

/**
 * DishCard - Unified dish card component using Ant Design Vue
 * Displays dish info with image, badges, ratings, and quick-add functionality
 */
const props = withDefaults(
  defineProps<{
    dish: Dish;
    showFavorites?: boolean;
    showRating?: boolean;
    loading?: boolean;
  }>(),
  {
    showFavorites: true,
    showRating: true,
    loading: false,
  }
);

const emit = defineEmits<{
  select: [dish: Dish];
  requestAuth: [];
}>();

const { quickAdd, getDishQuantity } = useCart();
const { localize, t } = useLocale();
const { formatPrice } = useCurrency();
const customerAuthStore = useCustomerAuthStore();

// Computed values
const dishName = computed(() => localize(props.dish.name));
const dishDescription = computed(() => localize(props.dish.description));
const quantityInCart = computed(() => getDishQuantity(props.dish.id));

// Favorites state
const isFavorite = ref(false);
const isTogglingFavorite = ref(false);

// Check if dish is in favorites on mount
onMounted(async () => {
  if (props.showFavorites && customerAuthStore.isAuthenticated) {
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

  if (isTogglingFavorite.value) {return;}

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

const handleCardClick = () => {
  if (props.dish.isAvailable) {
    emit('select', props.dish);
  }
};
</script>

<template>
  <!-- Skeleton Loading State -->
  <div v-if="loading" class="dish-card dish-card--skeleton">
    <div class="dish-card__image-skeleton">
      <Skeleton.Image :style="{ width: '100%', height: '100%' }" active />
    </div>
    <div class="dish-card__content">
      <Skeleton active :paragraph="{ rows: 2, width: ['100%', '70%'] }" :title="{ width: '80%' }" />
    </div>
  </div>

  <!-- Main Card -->
  <div
    v-else
    class="dish-card"
    :class="{
      'dish-card--unavailable': !dish.isAvailable,
      'dish-card--in-cart': quantityInCart > 0 && dish.isAvailable,
    }"
    role="button"
    tabindex="0"
    :aria-label="`${dishName}, ${formatPrice(dish.price)}${!dish.isAvailable ? ', non disponible' : ''}${quantityInCart > 0 ? `, ${quantityInCart} dans le panier` : ''}`"
    @click="handleCardClick"
    @keydown.enter="handleCardClick"
    @keydown.space.prevent="handleCardClick"
  >
    <!-- Image Container -->
    <div class="dish-card__image-container">
      <LazyImage :src="dish.image" :alt="dishName" class="dish-card__image" />

      <!-- Gradient Overlay -->
      <div class="dish-card__gradient" />

      <!-- Badges (Top Left) -->
      <div class="dish-card__badges">
        <Tag v-if="dish.isPopular" class="dish-card__badge dish-card__badge--popular">
          <StarFilled /> {{ t('menu.popular') }}
        </Tag>
        <Tag v-if="dish.isNew" class="dish-card__badge dish-card__badge--new">
          <FireFilled /> {{ t('menu.new') }}
        </Tag>
      </div>

      <!-- Estimated Time (Bottom Left) -->
      <div v-if="dish.estimatedTime" class="dish-card__time">
        <ClockCircleOutlined />
        <span>{{ dish.estimatedTime }} min</span>
      </div>

      <!-- Favorite Button (Bottom Right) -->
      <button
        v-if="showFavorites && dish.isAvailable"
        type="button"
        class="dish-card__favorite"
        :class="{
          'dish-card__favorite--active': isFavorite,
          'dish-card__favorite--loading': isTogglingFavorite,
        }"
        :aria-label="isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
        @click="handleFavoriteClick"
      >
        <HeartFilled v-if="isFavorite" />
        <HeartOutlined v-else />
      </button>

      <!-- Cart Quantity Badge (Top Right) -->
      <transition name="badge-pop">
        <div v-if="quantityInCart > 0 && dish.isAvailable" class="dish-card__quantity">
          {{ quantityInCart }}
        </div>
      </transition>

      <!-- Unavailable Overlay -->
      <div v-if="!dish.isAvailable" class="dish-card__unavailable-overlay">
        <Tag class="dish-card__unavailable-tag">{{ t('menu.unavailable') }}</Tag>
      </div>
    </div>

    <!-- Content -->
    <div class="dish-card__content">
      <!-- Title -->
      <h3 class="dish-card__title">{{ dishName }}</h3>

      <!-- Rating -->
      <div v-if="showRating && dish.reviewStats && dish.reviewStats.totalReviews > 0" class="dish-card__rating">
        <Rate :value="dish.reviewStats.averageRating" disabled allow-half :count="1" />
        <span class="dish-card__rating-value">{{ dish.reviewStats.averageRating.toFixed(1) }}</span>
        <span class="dish-card__rating-count">({{ dish.reviewStats.totalReviews }})</span>
      </div>

      <!-- Description -->
      <p v-if="dishDescription" class="dish-card__description">
        {{ dishDescription }}
      </p>

      <!-- Dietary Icons -->
      <div v-if="dish.isVegetarian || dish.isSpicy" class="dish-card__dietary">
        <Tag v-if="dish.isVegetarian" color="green" class="dish-card__dietary-tag" :bordered="false">
          Végé
        </Tag>
        <Tag
          v-if="dish.isSpicy"
          color="red"
          class="dish-card__dietary-tag"
          :bordered="false"
          :title="`Pimenté niveau ${dish.spicyLevel}`"
        >
          {{ '🌶️'.repeat(dish.spicyLevel || 1) }}
        </Tag>
      </div>

      <!-- Spacer -->
      <div class="dish-card__spacer" />

      <!-- Price & Add Button -->
      <div class="dish-card__footer">
        <span class="dish-card__price">{{ formatPrice(dish.price) }}</span>

        <button
          v-if="dish.isAvailable"
          type="button"
          class="dish-card__add-btn"
          :aria-label="`${t('menu.addToCart')}: ${dishName}`"
          @click="handleAddClick"
        >
          <PlusOutlined />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base Card - ensure visibility and override stagger-children opacity */
.dish-card {
  display: block;
  visibility: visible;
  opacity: 1; /* Override stagger-children opacity:0 */
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  cursor: pointer;
  /* Animation for stagger effect */
  animation: dishCardFadeIn 0.3s ease-out forwards;
}

@keyframes dishCardFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dish-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06);
}

.dish-card:active {
  transform: scale(0.985);
  transition-duration: 100ms;
}

.dish-card--in-cart {
  box-shadow: 0 0 0 2px #14b8a6, 0 4px 12px rgba(20, 184, 166, 0.2);
}

.dish-card--unavailable {
  opacity: 0.7;
  pointer-events: none;
  filter: grayscale(0.6);
}

/* Image Container */
.dish-card__image-container {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #f5f5f5;
}

.dish-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.dish-card:hover .dish-card__image {
  transform: scale(1.03);
}

.dish-card__gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent 50%);
  opacity: 0.6;
  transition: opacity 0.3s;
}

.dish-card:hover .dish-card__gradient {
  opacity: 0.8;
}

/* Badges */
.dish-card__badges {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dish-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.dish-card__badge--popular {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #b45309;
}

.dish-card__badge--new {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #7c3aed;
}

/* Time Badge */
.dish-card__time {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* Favorite Button */
.dish-card__favorite {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #9ca3af;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.dish-card__favorite:hover {
  background: #fff;
  color: #ef4444;
  transform: scale(1.1);
}

.dish-card__favorite--active {
  background: #ef4444;
  color: #fff;
}

.dish-card__favorite--active:hover {
  background: #dc2626;
  color: #fff;
}

.dish-card__favorite--loading {
  animation: pulse 1s infinite;
}

/* Cart Quantity Badge */
.dish-card__quantity {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 14px;
  background: #14b8a6;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.4), 0 0 0 2px #fff;
}

/* Unavailable Overlay */
.dish-card__unavailable-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(2px);
}

.dish-card__unavailable-tag {
  padding: 8px 20px;
  border-radius: 20px;
  background: #1f2937;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
}

/* Content */
.dish-card__content {
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-height: 140px;
}

.dish-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Rating */
.dish-card__rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

.dish-card__rating :deep(.ant-rate) {
  font-size: 14px;
}

.dish-card__rating :deep(.ant-rate-star-full .anticon) {
  color: #f59e0b;
}

.dish-card__rating-value {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.dish-card__rating-count {
  font-size: 12px;
  color: #9ca3af;
}

/* Description */
.dish-card__description {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Dietary Tags */
.dish-card__dietary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.dish-card__dietary-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

/* Spacer */
.dish-card__spacer {
  flex: 1;
  min-height: 12px;
}

/* Footer */
.dish-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
}

.dish-card__price {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.dish-card__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.35);
}

.dish-card__add-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(20, 184, 166, 0.45);
}

.dish-card__add-btn:active {
  transform: scale(0.92);
  transition-duration: 100ms;
}

/* Skeleton */
.dish-card--skeleton {
  pointer-events: none;
}

.dish-card__image-skeleton {
  aspect-ratio: 4 / 3;
  background: #f5f5f5;
}

.dish-card__image-skeleton :deep(.ant-skeleton-image) {
  width: 100% !important;
  height: 100% !important;
}

/* Animations */
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

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Touch Device Optimizations */
@media (hover: none) or (pointer: coarse) {
  .dish-card:hover {
    transform: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .dish-card:hover .dish-card__image {
    transform: none;
  }

  .dish-card:active {
    transform: scale(0.98);
  }

  .dish-card__add-btn:hover {
    transform: none;
  }

  .dish-card__add-btn:active {
    transform: scale(0.9);
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .dish-card,
  .dish-card__image,
  .dish-card__add-btn,
  .dish-card__favorite {
    transition: none !important;
    animation: none !important;
  }

  .badge-pop-enter-active,
  .badge-pop-leave-active {
    animation: none;
  }
}
</style>
