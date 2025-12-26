<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCart } from '@/composables/useCart';
import { useCartStore } from '@/stores/cartStore';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import AppHeader from '@/components/common/AppHeader.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import CartItem from '@/components/cart/CartItem.vue';
import EmptyCart from '@/components/cart/EmptyCart.vue';
import TableNumberInput from '@/components/cart/TableNumberInput.vue';
import OrderTypeSelector from '@/components/checkout/OrderTypeSelector.vue';

const router = useRouter();
const cartStore = useCartStore();
const {
  items,
  itemCount,
  subtotal,
  isEmpty,
  tableNumber,
  setTableNumber,
  orderNotes,
  setOrderNotes,
  clearCart,
} = useCart();
const { t } = useLocale();
const { formatPrice } = useCurrency();

// Check if scheduled orders are enabled
const scheduledOrdersEnabled = computed(() => true);
const isScheduled = computed(() => cartStore.isScheduled);

const notes = ref(orderNotes.value);
const table = ref(tableNumber.value?.toString() || '');
const showClearConfirm = ref(false);

// Calculate estimated preparation time
const estimatedTime = computed(() => {
  let maxTime = 0;
  for (const item of items.value) {
    const itemTime = (item.dish.estimatedTime || 10) * item.quantity;
    if (itemTime > maxTime) {
      maxTime = itemTime;
    }
  }
  return Math.ceil(maxTime + 5);
});

const handleTableChange = (value: string) => {
  table.value = value;
  const num = parseInt(value, 10);
  setTableNumber(isNaN(num) ? null : num);
};

const handleNotesChange = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  notes.value = target.value;
  setOrderNotes(target.value);
};

const handleClearCart = () => {
  clearCart();
  showClearConfirm.value = false;
};

const proceedToCheckout = () => {
  router.push('/checkout');
};

// Sync with store changes
watch(
  () => orderNotes.value,
  (newVal) => {
    notes.value = newVal;
  }
);
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-32">
    <AppHeader :show-back="true" :title="t('cart.title')" show-lang />

    <div class="container max-w-2xl mx-auto px-4 py-6">
      <!-- Empty State -->
      <EmptyCart v-if="isEmpty" />

      <!-- Cart Content -->
      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <svg
                class="w-6 h-6 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <span class="text-xl font-bold text-gray-900">
              {{ itemCount }} {{ itemCount === 1 ? t('cart.item') : t('cart.items') }}
            </span>
          </div>
          <button
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            @click="showClearConfirm = true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {{ t('cart.clear') }}
          </button>
        </div>

        <!-- Table Number - Only show for immediate dine-in orders -->
        <div v-if="!isScheduled" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6">
          <TableNumberInput :model-value="table" @update:model-value="handleTableChange" />
        </div>

        <!-- Order Type Selection (Immediate vs Scheduled) -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6">
          <OrderTypeSelector
            :model-value="cartStore.orderType"
            :scheduled-orders-enabled="scheduledOrdersEnabled"
            @update:model-value="cartStore.setOrderType"
          />
        </div>

        <!-- Scheduled Order Info -->
        <div
          v-if="isScheduled"
          class="bg-teal-50 rounded-2xl shadow-sm ring-1 ring-teal-200/60 p-5"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-2xl">
              📅
            </div>
            <div class="flex-1">
              <p class="font-semibold text-teal-900">Commande planifiée</p>
              <p class="text-sm text-teal-700">
                Vous pourrez choisir la date, l'heure et le mode de réception à l'étape suivante
              </p>
            </div>
          </div>
        </div>

        <!-- Items List -->
        <div class="space-y-4">
          <CartItem v-for="item in items" :key="item.id" :item="item" />
        </div>

        <!-- Order Notes -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6">
          <label class="flex items-center gap-3 text-base font-semibold text-gray-900 mb-3">
            <svg
              class="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {{ t('cart.orderNotes') }}
            <span class="font-normal text-gray-500">{{ t('cart.optional') }}</span>
          </label>
          <textarea
            :value="notes"
            :placeholder="t('cart.orderNotesPlaceholder')"
            rows="4"
            class="w-full px-5 py-4 rounded-2xl bg-gray-50 text-base text-gray-900 placeholder-gray-500 border border-transparent focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 resize-none transition-all duration-300"
            @input="handleNotesChange"
          />
        </div>

        <!-- Summary Card -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6 space-y-5">
          <!-- Estimated Time - Only for immediate orders -->
          <div v-if="!isScheduled" class="flex items-center justify-between">
            <div class="flex items-center gap-3 text-gray-700">
              <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <svg
                  class="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span class="font-medium">{{ t('order.estimatedTime') }}</span>
            </div>
            <span class="text-xl font-bold text-gray-900">~{{ estimatedTime }} min</span>
          </div>

          <!-- Subtotal -->
          <div class="flex justify-between items-center py-4 border-t border-gray-100">
            <span class="text-base text-gray-600">{{ t('cart.subtotal') }}</span>
            <span class="text-lg font-semibold text-gray-900">{{ formatPrice(subtotal) }}</span>
          </div>

          <!-- Total -->
          <div class="flex justify-between items-center pt-4 border-t border-gray-200">
            <span class="text-xl font-bold text-gray-900">{{ t('cart.total') }}</span>
            <span class="text-2xl font-bold text-primary-600">{{ formatPrice(subtotal) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Clear Cart Confirmation Modal -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showClearConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showClearConfirm = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
          <h3 class="text-xl font-bold text-gray-900 mb-3">{{ t('cart.clear') }}</h3>
          <p class="text-base text-gray-600 mb-8">{{ t('cart.clearConfirm') }}</p>
          <div class="flex gap-4">
            <BaseButton variant="outline" class="flex-1 py-3" @click="showClearConfirm = false">
              {{ t('app.cancel') }}
            </BaseButton>
            <BaseButton variant="danger" class="flex-1 py-3 font-semibold" @click="handleClearCart">
              {{ t('app.confirm') }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Checkout Button -->
    <div
      v-if="!isEmpty"
      class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 px-4 py-4 shadow-2xl"
    >
      <div class="container max-w-2xl mx-auto">
        <BaseButton
          variant="primary"
          size="lg"
          full-width
          class="py-5 text-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200"
          @click="proceedToCheckout"
        >
          {{ t('cart.checkout') }} — {{ formatPrice(subtotal) }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
