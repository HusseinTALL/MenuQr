<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Dish, DishOption } from '@/types';
import type { SelectedOption } from '@/types/cart';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import BaseModal from '@/components/common/BaseModal.vue';
import LazyImage from '@/components/common/LazyImage.vue';
import StarRating from '@/components/review/StarRating.vue';

const props = defineProps<{
  dish: Dish | null;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();

const { addItem } = useCart();
const { localize, t } = useLocale();
const { formatPrice } = useCurrency();

const quantity = ref(1);
// Map of optionId -> selected choiceIds
const selectedChoices = ref<Record<string, string[]>>({});

// Initialize options with defaults when modal opens
const initializeOptions = () => {
  if (!props.dish?.options) {
    return;
  }

  const defaults: Record<string, string[]> = {};
  for (const option of props.dish.options) {
    const defaultChoiceIds: string[] = [];
    for (const choice of option.choices) {
      if (choice.isDefault && choice.isAvailable) {
        defaultChoiceIds.push(choice.id);
      }
    }

    if (defaultChoiceIds.length > 0) {
      const firstChoice = defaultChoiceIds[0];
      defaults[option.id] =
        option.type === 'single' && firstChoice ? [firstChoice] : [...defaultChoiceIds];
    } else {
      defaults[option.id] = [];
    }
  }
  selectedChoices.value = defaults;
};

// Calculate options price modifier
const optionsPriceModifier = computed(() => {
  if (!props.dish?.options) {
    return 0;
  }

  let modifier = 0;
  for (const option of props.dish.options) {
    const selected = selectedChoices.value[option.id] || [];
    for (const choiceId of selected) {
      const choice = option.choices.find((c) => c.id === choiceId);
      if (choice) {
        modifier += choice.priceModifier;
      }
    }
  }
  return modifier;
});

// Unit price (base + options)
const unitPrice = computed(() => {
  if (!props.dish) {
    return 0;
  }
  return props.dish.price + optionsPriceModifier.value;
});

// Total price
const totalPrice = computed(() => {
  return unitPrice.value * quantity.value;
});

// Check if all required options are selected
const missingRequiredOptions = computed(() => {
  if (!props.dish?.options) {
    return [];
  }

  const missing: string[] = [];
  for (const option of props.dish.options) {
    if (option.required) {
      const selected = selectedChoices.value[option.id] || [];
      if (selected.length === 0) {
        missing.push(option.id);
      }
      // Check min selections for multiple type
      if (option.type === 'multiple' && option.minSelections) {
        if (selected.length < option.minSelections) {
          missing.push(option.id);
        }
      }
    }
  }
  return [...new Set(missing)];
});

const canAddToCart = computed(() => {
  return props.dish && missingRequiredOptions.value.length === 0;
});

// Handle single option selection (radio)
const selectSingleOption = (optionId: string, choiceId: string) => {
  selectedChoices.value[optionId] = [choiceId];
};

// Handle multiple option selection (checkbox)
const toggleMultipleOption = (optionId: string, choiceId: string, option: DishOption) => {
  const current = selectedChoices.value[optionId] || [];
  const index = current.indexOf(choiceId);

  if (index === -1) {
    // Check max selections
    if (option.maxSelections && current.length >= option.maxSelections) {
      return; // Don't add if at max
    }
    selectedChoices.value[optionId] = [...current, choiceId];
  } else {
    selectedChoices.value[optionId] = current.filter((id) => id !== choiceId);
  }
};

// Check if choice is selected
const isChoiceSelected = (optionId: string, choiceId: string) => {
  return (selectedChoices.value[optionId] || []).includes(choiceId);
};

// Build SelectedOption array for cart
const buildSelectedOptions = (): SelectedOption[] => {
  if (!props.dish?.options) {
    return [];
  }

  const result: SelectedOption[] = [];
  for (const option of props.dish.options) {
    const choiceIds = selectedChoices.value[option.id] || [];
    if (choiceIds.length === 0) {
      continue;
    }

    const choices = option.choices.filter((c) => choiceIds.includes(c.id));
    const priceModifier = choices.reduce((sum, c) => sum + c.priceModifier, 0);

    result.push({
      optionId: option.id,
      optionName: localize(option.name),
      choiceIds,
      choices,
      priceModifier,
    });
  }
  return result;
};

const addToCartHandler = () => {
  if (!props.dish || !canAddToCart.value) {
    return;
  }

  const options = buildSelectedOptions();
  addItem(props.dish, quantity.value, options);
  emit('close');
};

// Navigate to review page for this dish
const goToReviews = () => {
  if (!props.dish) return;
  emit('close');
  router.push({
    path: '/reviews',
    query: {
      dishId: props.dish.id,
      dishName: localize(props.dish.name),
    },
  });
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      quantity.value = 1;
      initializeOptions();
    }
  }
);
</script>

<template>
  <BaseModal :open="open" :title="dish ? localize(dish.name) : ''" size="md" @close="emit('close')">
    <div v-if="dish" class="modal-content">
      <!-- Hero Image with lazy loading and blur placeholder -->
      <div class="hero-image">
        <LazyImage
          v-if="dish.image"
          :src="dish.image"
          :alt="localize(dish.name)"
          aspect-ratio="16/10"
          :priority="true"
          :use-lqip="true"
          sizes="(max-width: 640px) 100vw, 600px"
          class="h-full w-full"
        />
        <div v-else class="flex h-full w-full items-center justify-center bg-neutral-100">
          <svg
            class="h-16 w-16 text-neutral-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <!-- Gradient overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        <!-- Floating badges on image -->
        <div class="absolute bottom-4 left-4 flex flex-wrap gap-2">
          <span v-if="dish.estimatedTime" class="badge badge--time">
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {{ dish.estimatedTime }} min
          </span>
        </div>
      </div>

      <!-- Badges Row -->
      <div class="badges-row">
        <span v-if="dish.isPopular" class="badge badge--popular">
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.3l-4.2 2.2.8-4.7L1.2 6.5l4.7-.7L8 1.5z"
            />
          </svg>
          {{ t('menu.popular') }}
        </span>
        <span v-if="dish.isNew" class="badge badge--new">
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0l1.5 5.5H15l-4.5 3.3 1.7 5.2L8 10.7 3.8 14l1.7-5.2L1 5.5h5.5L8 0z" />
          </svg>
          {{ t('menu.new') }}
        </span>
        <span v-if="dish.isVegetarian" class="badge badge--veg">
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 1c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7 3.1-7 7-7zm0 2C5.2 3 3 5.2 3 8s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5z"
            />
          </svg>
          {{ t('menu.vegetarian') }}
        </span>
        <span v-if="dish.isSpicy" class="badge badge--spicy">
          <span class="flex">
            <svg
              v-for="n in dish.spicyLevel || 1"
              :key="n"
              class="h-3.5 w-3.5 -ml-0.5 first:ml-0"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                d="M8.5 1c.3 0 .5.2.5.5v1c0 .3-.2.5-.5.5S8 2.8 8 2.5v-1c0-.3.2-.5.5-.5zM5 3.5c0-.3.2-.5.5-.5s.5.2.5.5v2c0 .3-.2.5-.5.5S5 5.8 5 5.5v-2zm6 0c0-.3.2-.5.5-.5s.5.2.5.5v2c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-2zM8.5 5C10.4 5 12 6.6 12 8.5c0 2.5-1.5 5-3.5 6.5-2-1.5-3.5-4-3.5-6.5C5 6.6 6.6 5 8.5 5z"
              />
            </svg>
          </span>
        </span>
      </div>

      <!-- Description -->
      <p class="description">
        {{ localize(dish.description) }}
      </p>

      <!-- Rating & Reviews Section -->
      <div class="reviews-section">
        <div class="reviews-info">
          <div v-if="dish.reviewStats && dish.reviewStats.totalReviews > 0" class="reviews-rating">
            <StarRating :model-value="dish.reviewStats.averageRating" readonly size="sm" />
            <span class="reviews-score">{{ dish.reviewStats.averageRating.toFixed(1) }}</span>
            <span class="reviews-count">({{ dish.reviewStats.totalReviews }} avis)</span>
          </div>
          <span v-else class="reviews-empty">Aucun avis</span>
        </div>
        <button class="reviews-btn" @click="goToReviews">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Donner mon avis
        </button>
      </div>

      <!-- Options Section -->
      <div v-if="dish.options && dish.options.length > 0" class="options-section">
        <div v-for="option in dish.options" :key="option.id" class="option-group">
          <!-- Option Header -->
          <div class="option-header">
            <div class="option-title-row">
              <h4 class="option-title">
                {{ localize(option.name) }}
              </h4>
              <span
                v-if="option.required"
                class="required-badge"
                :class="{ 'required-badge--error': missingRequiredOptions.includes(option.id) }"
              >
                {{ t('menu.required') }}
              </span>
            </div>
            <p class="option-subtitle">
              <template v-if="option.type === 'single'">{{ t('menu.chooseOne') }}</template>
              <template v-else-if="option.minSelections || option.maxSelections">
                {{
                  t('menu.selectRange', {
                    min: option.minSelections || 0,
                    max: option.maxSelections || '∞',
                  })
                }}
              </template>
            </p>
          </div>

          <!-- Choices -->
          <div class="choices-list">
            <!-- Single (Radio) -->
            <template v-if="option.type === 'single'">
              <label
                v-for="choice in option.choices.filter((c) => c.isAvailable)"
                :key="choice.id"
                class="choice-item"
                :class="{ 'choice-item--selected': isChoiceSelected(option.id, choice.id) }"
                @click="selectSingleOption(option.id, choice.id)"
              >
                <div class="choice-radio">
                  <div class="choice-radio-inner" />
                </div>
                <span class="choice-label">{{ localize(choice.name) }}</span>
                <span v-if="choice.priceModifier !== 0" class="choice-price">
                  {{ choice.priceModifier > 0 ? '+' : '' }}{{ formatPrice(choice.priceModifier) }}
                </span>
              </label>
            </template>

            <!-- Multiple (Checkbox) -->
            <template v-else>
              <label
                v-for="choice in option.choices"
                :key="choice.id"
                class="choice-item"
                :class="{
                  'choice-item--selected': isChoiceSelected(option.id, choice.id),
                  'choice-item--disabled': !choice.isAvailable,
                }"
                @click="choice.isAvailable && toggleMultipleOption(option.id, choice.id, option)"
              >
                <div class="choice-checkbox">
                  <svg
                    class="choice-checkbox-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span class="choice-label">
                  {{ localize(choice.name) }}
                  <span v-if="!choice.isAvailable" class="text-neutral-400 text-xs ml-1"
                    >({{ t('menu.unavailable') }})</span
                  >
                </span>
                <span v-if="choice.priceModifier !== 0" class="choice-price">
                  {{ choice.priceModifier > 0 ? '+' : '' }}{{ formatPrice(choice.priceModifier) }}
                </span>
              </label>
            </template>
          </div>
        </div>
      </div>

      <!-- Quantity Selector -->
      <div class="quantity-section">
        <span class="quantity-label">{{ t('cart.quantity') }}</span>
        <div class="quantity-control">
          <button
            class="quantity-btn quantity-btn--minus"
            :disabled="quantity <= 1"
            @click="quantity--"
            aria-label="Decrease quantity"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span class="quantity-value">{{ quantity }}</span>
          <button
            class="quantity-btn quantity-btn--plus"
            @click="quantity++"
            aria-label="Increase quantity"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Price Summary -->
      <div class="price-summary">
        <div class="price-main">
          <span class="price-total">{{ formatPrice(totalPrice) }}</span>
          <span v-if="quantity > 1" class="price-unit">
            {{ formatPrice(unitPrice) }} × {{ quantity }}
          </span>
        </div>
        <span v-if="optionsPriceModifier > 0" class="price-modifier">
          {{ t('menu.options') }}: +{{ formatPrice(optionsPriceModifier) }}
        </span>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <button class="cancel-btn" @click="emit('close')">
          {{ t('app.cancel') }}
        </button>
        <button
          class="add-to-cart-btn"
          :class="{ 'add-to-cart-btn--disabled': !canAddToCart }"
          :disabled="!canAddToCart"
          @click="addToCartHandler"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {{ t('menu.addToCart') }} · {{ formatPrice(totalPrice) }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Hero Image */
.hero-image {
  position: relative;
  margin: -1.5rem -1.5rem 0;
  height: 220px;
  overflow: hidden;
  border-radius: 1rem 1rem 0 0;
  background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
}

@media (min-width: 640px) {
  .hero-image {
    height: 280px;
  }
}

/* Badges */
.badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.badge--popular {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #b45309;
}

.badge--new {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #7c3aed;
}

.badge--veg {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #16a34a;
}

.badge--spicy {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

.badge--time {
  background: rgba(255, 255, 255, 0.95);
  color: #404040;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
}

/* Description */
.description {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #525252;
}

/* Options Section */
.options-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #171717;
}

.required-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 100px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: #f5f5f5;
  color: #737373;
}

.required-badge--error {
  background: #fef2f2;
  color: #dc2626;
  animation: pulse-subtle 2s infinite;
}

@keyframes pulse-subtle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.option-subtitle {
  font-size: 0.8125rem;
  color: #a3a3a3;
}

/* Choices */
.choices-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.choice-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border-radius: 0.875rem;
  background: #fafafa;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.choice-item:hover:not(.choice-item--disabled) {
  background: #f5f5f5;
}

.choice-item--selected {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%);
  border-color: var(--color-primary-400, #4ade80);
}

.choice-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Radio */
.choice-radio {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  border: 2px solid #d4d4d4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 150ms ease-out;
}

.choice-item--selected .choice-radio {
  border-color: var(--color-primary-600, #16a34a);
  background: var(--color-primary-600, #16a34a);
}

.choice-radio-inner {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: white;
  opacity: 0;
  transform: scale(0);
  transition: all 150ms ease-out;
}

.choice-item--selected .choice-radio-inner {
  opacity: 1;
  transform: scale(1);
}

/* Checkbox */
.choice-checkbox {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 0.375rem;
  border: 2px solid #d4d4d4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 150ms ease-out;
}

.choice-item--selected .choice-checkbox {
  border-color: var(--color-primary-600, #16a34a);
  background: var(--color-primary-600, #16a34a);
}

.choice-checkbox-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: white;
  opacity: 0;
  transform: scale(0);
  transition: all 150ms ease-out;
}

.choice-item--selected .choice-checkbox-icon {
  opacity: 1;
  transform: scale(1);
}

.choice-label {
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #262626;
}

.choice-price {
  font-size: 0.875rem;
  font-weight: 500;
  color: #737373;
}

/* Quantity Section */
.quantity-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-top: 1px solid #f0f0f0;
}

.quantity-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #171717;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  background: #f5f5f5;
  border-radius: 1rem;
}

.quantity-btn {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease-out;
}

.quantity-btn--minus {
  color: #525252;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.quantity-btn--minus:hover:not(:disabled) {
  background: #fafafa;
}

.quantity-btn--minus:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quantity-btn--plus {
  color: white;
  background: linear-gradient(
    135deg,
    var(--color-primary-500, #22c55e) 0%,
    var(--color-primary-600, #16a34a) 100%
  );
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.35);
}

.quantity-btn--plus:hover {
  transform: scale(1.02);
}

.quantity-btn:active {
  transform: scale(0.95);
}

.quantity-value {
  width: 3.5rem;
  text-align: center;
  font-size: 1.125rem;
  font-weight: 700;
  color: #171717;
}

/* Price Summary */
.price-summary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.price-main {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.price-total {
  font-size: 1.75rem;
  font-weight: 700;
  color: #171717;
  letter-spacing: -0.02em;
}

.price-unit {
  font-size: 0.875rem;
  color: #a3a3a3;
}

.price-modifier {
  font-size: 0.8125rem;
  color: #737373;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: 0.75rem;
}

.cancel-btn {
  flex: 1;
  padding: 0.9375rem 1.25rem;
  border-radius: 0.875rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #525252;
  background: #f5f5f5;
  transition: all 150ms ease-out;
}

.cancel-btn:hover {
  background: #e5e5e5;
}

.cancel-btn:active {
  transform: scale(0.98);
}

.add-to-cart-btn {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9375rem 1.5rem;
  border-radius: 0.875rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(
    135deg,
    var(--color-primary-500, #22c55e) 0%,
    var(--color-primary-600, #16a34a) 100%
  );
  box-shadow:
    0 4px 12px rgba(34, 197, 94, 0.35),
    0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 150ms ease-out;
}

.add-to-cart-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(34, 197, 94, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-to-cart-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.add-to-cart-btn--disabled,
.add-to-cart-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Reviews Section */
.reviews-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  background: #fafafa;
  border-radius: 0.875rem;
  gap: 1rem;
}

.reviews-info {
  display: flex;
  align-items: center;
}

.reviews-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reviews-score {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #171717;
}

.reviews-count {
  font-size: 0.8125rem;
  color: #737373;
}

.reviews-empty {
  font-size: 0.875rem;
  color: #a3a3a3;
}

.reviews-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0d9488;
  background: #f0fdfa;
  border-radius: 0.625rem;
  transition: all 150ms ease-out;
}

.reviews-btn:hover {
  background: #ccfbf1;
}

.reviews-btn:active {
  transform: scale(0.98);
}
</style>
