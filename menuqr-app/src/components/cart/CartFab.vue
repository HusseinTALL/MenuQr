<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCart } from '@/composables/useCart';
import { useI18n } from 'vue-i18n';
import { useCurrency } from '@/composables/useCurrency';
import BaseIcon from '@/components/common/BaseIcon.vue';
import BaseBadge from '@/components/common/BaseBadge.vue';

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
    <button
      v-if="showFab"
      class="cart-fab fixed z-40 flex items-center justify-between gap-3 bg-primary-600 text-white rounded-2xl shadow-2xl hover:bg-primary-700 active:scale-[0.97] transition-all duration-300 tap-target"
      @click="goToCart"
    >
      <!-- Left: Cart Icon + Badge -->
      <div class="relative flex-shrink-0">
        <BaseIcon name="cart" size="lg" class="drop-shadow-md" />
        <BaseBadge
          variant="danger"
          size="sm"
          rounded
          class="absolute -top-2 -right-2 min-w-5 h-5 text-xs font-bold flex items-center justify-center shadow-md"
        >
          {{ itemCount }}
        </BaseBadge>
      </div>

      <!-- Center/Right: Text Info -->
      <div class="flex flex-col items-start flex-1 min-w-0">
        <span class="text-xs opacity-90 truncate">
          {{ itemCount }} {{ itemCount > 1 ? t('cart.items') : t('cart.item') }}
        </span>
        <span class="text-base font-bold truncate">{{ formatPrice(subtotal) }}</span>
      </div>

      <!-- Right: Arrow Icon -->
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  </Transition>
</template>

<style scoped>
/* Base FAB positioning with safe area support */
.cart-fab {
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  max-width: 24rem;
  padding: 0.875rem 1rem;
}

/* Safe area support for devices with bottom bars */
@supports (padding: max(0px)) {
  .cart-fab {
    bottom: max(1.5rem, calc(1rem + env(safe-area-inset-bottom)));
  }
}

/* Larger screens - wider FAB */
@media (min-width: 640px) {
  .cart-fab {
    width: auto;
    min-width: 16rem;
    max-width: 20rem;
    padding: 1rem 1.25rem;
  }
}

/* Landscape mobile - compact FAB on the right */
@media (orientation: landscape) and (max-height: 500px) {
  .cart-fab {
    left: auto;
    right: 1rem;
    bottom: 1rem;
    transform: none;
    width: auto;
    min-width: 12rem;
    max-width: 14rem;
    padding: 0.75rem 1rem;
  }

  @supports (padding: max(0px)) {
    .cart-fab {
      right: max(1rem, env(safe-area-inset-right));
      bottom: max(0.75rem, env(safe-area-inset-bottom));
    }
  }
}

/* Desktop - hover effect */
@media (min-width: 1024px) {
  .cart-fab {
    right: 2rem;
    left: auto;
    transform: none;
    transition:
      transform 0.2s ease-out,
      box-shadow 0.2s ease-out,
      background-color 0.15s ease;
  }

  .cart-fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px -10px rgba(22, 163, 74, 0.4);
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

/* Fix transform for landscape/desktop when animating */
@media (orientation: landscape) and (max-height: 500px), (min-width: 1024px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(120%);
  }
}
</style>
