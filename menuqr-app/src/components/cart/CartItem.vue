<script setup lang="ts">
import { ref } from 'vue';
import type { CartItem } from '@/types/cart';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import LazyImage from '@/components/common/LazyImage.vue';

const props = defineProps<{
  item: CartItem;
}>();

defineEmits<{
  remove: [itemId: string];
}>();

const { updateQuantity, removeItem } = useCart();
const { localize, t } = useLocale();
const { formatPrice } = useCurrency();

const showConfirmDelete = ref(false);

const increment = () => {
  updateQuantity(props.item.id, props.item.quantity + 1);
};

const decrement = () => {
  if (props.item.quantity > 1) {
    updateQuantity(props.item.id, props.item.quantity - 1);
  }
};

const confirmRemove = () => {
  showConfirmDelete.value = true;
};

const cancelRemove = () => {
  showConfirmDelete.value = false;
};

const remove = () => {
  removeItem(props.item.id);
  showConfirmDelete.value = false;
};
</script>

<template>
  <div class="relative">
    <!-- Main Card -->
    <div
      class="flex gap-4 p-4 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 transition-all duration-200"
    >
      <!-- Dish Image -->
      <div class="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-sm">
        <LazyImage
          :src="item.dish.image"
          :alt="localize(item.dish.name)"
          class="h-full w-full object-cover"
        />
      </div>

      <!-- Item Details -->
      <div class="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-base font-semibold text-gray-900 line-clamp-2">
              {{ localize(item.dish.name) }}
            </h3>
            <button
              class="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all duration-200"
              @click.stop="confirmRemove"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          <!-- Selected Options -->
          <div
            v-if="item.selectedOptions && item.selectedOptions.length > 0"
            class="mt-2 space-y-1"
          >
            <p
              v-for="option in item.selectedOptions"
              :key="option.optionId"
              class="text-sm text-gray-600 truncate"
            >
              <span class="text-gray-500">{{ option.optionName }}:</span>
              {{ option.choices.map((c) => localize(c.name)).join(', ') }}
              <span v-if="option.priceModifier > 0" class="font-medium text-primary-600">
                (+{{ formatPrice(option.priceModifier) }})
              </span>
            </p>
          </div>

          <!-- Item Notes -->
          <p v-if="item.notes" class="mt-2 text-sm italic text-gray-500 truncate">
            "{{ item.notes }}"
          </p>
        </div>

        <!-- Price and Quantity -->
        <div class="flex items-center justify-between mt-4">
          <div class="text-lg font-bold text-gray-900">
            {{ formatPrice(item.totalPrice) }}
          </div>

          <!-- Quantity Controls -->
          <div class="inline-flex items-center rounded-2xl bg-gray-100 p-1.5 shadow-inner">
            <button
              class="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-40"
              :disabled="item.quantity <= 1"
              @click.stop="decrement"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 12H4"
                />
              </svg>
            </button>
            <span class="w-12 text-center text-base font-bold text-gray-900">{{
              item.quantity
            }}</span>
            <button
              class="w-10 h-10 rounded-full flex items-center justify-center bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all shadow-md"
              @click.stop="increment"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Overlay -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showConfirmDelete"
        class="absolute inset-0 z-10 rounded-2xl bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 px-6 shadow-2xl"
      >
        <p class="text-base font-medium text-gray-800 text-center">
          {{ t('cart.removeConfirm') }}
        </p>
        <div class="flex gap-3">
          <button
            class="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
            @click="cancelRemove"
          >
            {{ t('app.no') }}
          </button>
          <button
            class="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md"
            @click="remove"
          >
            {{ t('app.yes') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
