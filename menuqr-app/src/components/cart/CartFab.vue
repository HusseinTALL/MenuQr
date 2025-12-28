<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Badge } from 'ant-design-vue';
import { ShoppingCartOutlined, RightOutlined } from '@ant-design/icons-vue';
import { useCart } from '@/composables/useCart';
import { useI18n } from 'vue-i18n';
import { useCurrency } from '@/composables/useCurrency';

/**
 * CartFab - Floating action button for cart navigation
 * Shows cart item count and subtotal, fixed at bottom of screen
 */
const router = useRouter();
const { itemCount, subtotal } = useCart();
const { t } = useI18n();
const { formatPrice } = useCurrency();

const showFab = computed(() => itemCount.value > 0);

const goToCart = () => {
  router.push('/cart');
};
</script>

<template>
  <Transition name="slide-up">
    <button v-if="showFab" class="cart-fab" @click="goToCart">
      <!-- Left: Cart Icon + Badge -->
      <div class="cart-fab__icon">
        <Badge :count="itemCount" :offset="[-2, 2]" color="#ef4444">
          <ShoppingCartOutlined class="cart-fab__cart-icon" />
        </Badge>
      </div>

      <!-- Center: Text Info -->
      <div class="cart-fab__info">
        <span class="cart-fab__count">
          {{ itemCount }} {{ itemCount > 1 ? t('cart.items') : t('cart.item') }}
        </span>
        <span class="cart-fab__total">{{ formatPrice(subtotal) }}</span>
      </div>

      <!-- Right: Arrow Icon -->
      <div class="cart-fab__arrow">
        <RightOutlined />
      </div>
    </button>
  </Transition>
</template>

<style scoped>
/* Base FAB */
.cart-fab {
  position: fixed;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  max-width: 24rem;
  padding: 14px 16px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 10px 40px -10px rgba(20, 184, 166, 0.5),
              0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.cart-fab:hover {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
}

.cart-fab:active {
  transform: translateX(-50%) scale(0.97);
}

/* Safe area support */
@supports (padding: max(0px)) {
  .cart-fab {
    bottom: max(1.5rem, calc(1rem + env(safe-area-inset-bottom)));
  }
}

/* Icon */
.cart-fab__icon {
  position: relative;
  flex-shrink: 0;
}

.cart-fab__cart-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.cart-fab__icon :deep(.ant-badge-count) {
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
}

/* Info */
.cart-fab__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.cart-fab__count {
  font-size: 12px;
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-fab__total {
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Arrow */
.cart-fab__arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  font-size: 14px;
}

/* Larger screens */
@media (min-width: 640px) {
  .cart-fab {
    width: auto;
    min-width: 16rem;
    max-width: 20rem;
    padding: 16px 20px;
  }
}

/* Landscape mobile */
@media (orientation: landscape) and (max-height: 500px) {
  .cart-fab {
    left: auto;
    right: 1rem;
    bottom: 1rem;
    transform: none;
    width: auto;
    min-width: 12rem;
    max-width: 14rem;
    padding: 12px 16px;
  }

  .cart-fab:active {
    transform: scale(0.97);
  }

  @supports (padding: max(0px)) {
    .cart-fab {
      right: max(1rem, env(safe-area-inset-right));
      bottom: max(0.75rem, env(safe-area-inset-bottom));
    }
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .cart-fab {
    right: 2rem;
    left: auto;
    transform: none;
  }

  .cart-fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 50px -10px rgba(20, 184, 166, 0.5);
  }

  .cart-fab:active {
    transform: translateY(0) scale(0.98);
  }
}

/* Slide-up animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(120%);
  opacity: 0;
}

@media (orientation: landscape) and (max-height: 500px), (min-width: 1024px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(120%);
  }
}
</style>
