<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Tag, Rate, Button, InputNumber, Radio, Checkbox } from 'ant-design-vue';
import {
  ClockCircleOutlined,
  StarFilled,
  FireFilled,
  ShoppingCartOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import type { Dish, DishOption } from '@/types';
import type { SelectedOption } from '@/types/cart';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import BaseModal from '@/components/common/BaseModal.vue';
import LazyImage from '@/components/common/LazyImage.vue';

/**
 * DishModal - Modal for viewing dish details and adding to cart
 * Uses Ant Design Vue components for consistent styling
 */
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
const handleSingleOption = (optionId: string, e: unknown) => {
  const event = e as { target: { value: string } };
  selectedChoices.value[optionId] = [event.target.value];
};

// Handle multiple option selection (checkbox)
const handleMultipleOption = (optionId: string, values: unknown, option: DishOption) => {
  const choiceIds = values as string[];
  // Check max selections
  if (option.maxSelections && choiceIds.length > option.maxSelections) {
    return;
  }
  selectedChoices.value[optionId] = choiceIds;
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
  if (!props.dish) {return;}
  emit('close');
  router.push({
    path: '/reviews',
    query: {
      dishId: props.dish.id,
      dishName: localize(props.dish.name),
    },
  });
};

// Handle quantity change
const handleQuantityChange = (value: unknown) => {
  quantity.value = (value as number | null) || 1;
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
    <div v-if="dish" class="dish-modal">
      <!-- Hero Image -->
      <div class="dish-modal__hero">
        <LazyImage
          v-if="dish.image"
          :src="dish.image"
          :alt="localize(dish.name)"
          aspect-ratio="16/10"
          :priority="true"
          class="dish-modal__image"
        />
        <div v-else class="dish-modal__image-placeholder">
          <ShoppingCartOutlined class="dish-modal__placeholder-icon" />
        </div>
        <!-- Gradient overlay -->
        <div class="dish-modal__gradient" />

        <!-- Time badge -->
        <Tag v-if="dish.estimatedTime" class="dish-modal__time-badge">
          <ClockCircleOutlined /> {{ dish.estimatedTime }} min
        </Tag>
      </div>

      <!-- Badges Row -->
      <div class="dish-modal__badges">
        <Tag v-if="dish.isPopular" class="dish-modal__badge dish-modal__badge--popular">
          <StarFilled /> {{ t('menu.popular') }}
        </Tag>
        <Tag v-if="dish.isNew" class="dish-modal__badge dish-modal__badge--new">
          <FireFilled /> {{ t('menu.new') }}
        </Tag>
        <Tag v-if="dish.isVegetarian" color="green" :bordered="false">
          {{ t('menu.vegetarian') }}
        </Tag>
        <Tag v-if="dish.isSpicy" color="red" :bordered="false">
          {{ '🌶️'.repeat(dish.spicyLevel || 1) }}
        </Tag>
      </div>

      <!-- Description -->
      <p class="dish-modal__description">
        {{ localize(dish.description) }}
      </p>

      <!-- Rating & Reviews Section -->
      <div class="dish-modal__reviews">
        <div class="dish-modal__reviews-info">
          <template v-if="dish.reviewStats && dish.reviewStats.totalReviews > 0">
            <Rate :value="dish.reviewStats.averageRating" disabled allow-half :count="5" />
            <span class="dish-modal__rating-value">{{ dish.reviewStats.averageRating.toFixed(1) }}</span>
            <span class="dish-modal__rating-count">({{ dish.reviewStats.totalReviews }} avis)</span>
          </template>
          <span v-else class="dish-modal__no-reviews">Aucun avis</span>
        </div>
        <Button type="link" class="dish-modal__reviews-btn" @click="goToReviews">
          <StarFilled /> Donner mon avis
        </Button>
      </div>

      <!-- Options Section -->
      <div v-if="dish.options && dish.options.length > 0" class="dish-modal__options">
        <div v-for="option in dish.options" :key="option.id" class="dish-modal__option-group">
          <!-- Option Header -->
          <div class="dish-modal__option-header">
            <div class="dish-modal__option-title-row">
              <h4 class="dish-modal__option-title">{{ localize(option.name) }}</h4>
              <Tag
                v-if="option.required"
                :color="missingRequiredOptions.includes(option.id) ? 'error' : 'default'"
                size="small"
              >
                {{ t('menu.required') }}
              </Tag>
            </div>
            <p class="dish-modal__option-subtitle">
              <template v-if="option.type === 'single'">{{ t('menu.chooseOne') }}</template>
              <template v-else-if="option.minSelections || option.maxSelections">
                {{ t('menu.selectRange', { min: option.minSelections || 0, max: option.maxSelections || '∞' }) }}
              </template>
            </p>
          </div>

          <!-- Single Option (Radio Group) -->
          <Radio.Group
            v-if="option.type === 'single'"
            :value="selectedChoices[option.id]?.[0]"
            class="dish-modal__choices"
            @change="(e: unknown) => handleSingleOption(option.id, e)"
          >
            <div
              v-for="choice in option.choices.filter((c) => c.isAvailable)"
              :key="choice.id"
              class="dish-modal__choice"
              :class="{ 'dish-modal__choice--selected': selectedChoices[option.id]?.includes(choice.id) }"
            >
              <Radio :value="choice.id">
                <span class="dish-modal__choice-label">{{ localize(choice.name) }}</span>
              </Radio>
              <span v-if="choice.priceModifier !== 0" class="dish-modal__choice-price">
                {{ choice.priceModifier > 0 ? '+' : '' }}{{ formatPrice(choice.priceModifier) }}
              </span>
            </div>
          </Radio.Group>

          <!-- Multiple Option (Checkbox Group) -->
          <Checkbox.Group
            v-else
            :value="selectedChoices[option.id] || []"
            class="dish-modal__choices"
            @change="(values: unknown) => handleMultipleOption(option.id, values, option)"
          >
            <div
              v-for="choice in option.choices"
              :key="choice.id"
              class="dish-modal__choice"
              :class="{
                'dish-modal__choice--selected': selectedChoices[option.id]?.includes(choice.id),
                'dish-modal__choice--disabled': !choice.isAvailable,
              }"
            >
              <Checkbox :value="choice.id" :disabled="!choice.isAvailable">
                <span class="dish-modal__choice-label">
                  {{ localize(choice.name) }}
                  <span v-if="!choice.isAvailable" class="dish-modal__unavailable">({{ t('menu.unavailable') }})</span>
                </span>
              </Checkbox>
              <span v-if="choice.priceModifier !== 0" class="dish-modal__choice-price">
                {{ choice.priceModifier > 0 ? '+' : '' }}{{ formatPrice(choice.priceModifier) }}
              </span>
            </div>
          </Checkbox.Group>
        </div>
      </div>

      <!-- Quantity Selector -->
      <div class="dish-modal__quantity">
        <span class="dish-modal__quantity-label">{{ t('cart.quantity') }}</span>
        <div class="dish-modal__quantity-control">
          <Button
            type="default"
            shape="circle"
            :disabled="quantity <= 1"
            class="dish-modal__quantity-btn"
            @click="quantity--"
          >
            <template #icon><MinusOutlined /></template>
          </Button>
          <InputNumber
            :value="quantity"
            :min="1"
            :max="99"
            :controls="false"
            class="dish-modal__quantity-input"
            @change="handleQuantityChange"
          />
          <Button
            type="primary"
            shape="circle"
            class="dish-modal__quantity-btn dish-modal__quantity-btn--plus"
            @click="quantity++"
          >
            <template #icon><PlusOutlined /></template>
          </Button>
        </div>
      </div>

      <!-- Price Summary -->
      <div class="dish-modal__price">
        <div class="dish-modal__price-main">
          <span class="dish-modal__price-total">{{ formatPrice(totalPrice) }}</span>
          <span v-if="quantity > 1" class="dish-modal__price-unit">
            {{ formatPrice(unitPrice) }} × {{ quantity }}
          </span>
        </div>
        <span v-if="optionsPriceModifier > 0" class="dish-modal__price-modifier">
          {{ t('menu.options') }}: +{{ formatPrice(optionsPriceModifier) }}
        </span>
      </div>
    </div>

    <template #footer>
      <div class="dish-modal__footer">
        <Button size="large" class="dish-modal__cancel-btn" @click="emit('close')">
          {{ t('app.cancel') }}
        </Button>
        <Button
          type="primary"
          size="large"
          :disabled="!canAddToCart"
          class="dish-modal__add-btn"
          @click="addToCartHandler"
        >
          <ShoppingCartOutlined />
          {{ t('menu.addToCart') }} · {{ formatPrice(totalPrice) }}
        </Button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.dish-modal {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Hero Image */
.dish-modal__hero {
  position: relative;
  margin: -1.5rem -1.5rem 0;
  height: 220px;
  overflow: hidden;
  border-radius: 1rem 1rem 0 0;
  background: #f5f5f5;
}

@media (min-width: 640px) {
  .dish-modal__hero {
    height: 280px;
  }
}

.dish-modal__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-modal__image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
}

.dish-modal__placeholder-icon {
  font-size: 48px;
  color: #d4d4d4;
}

.dish-modal__gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 60%);
}

.dish-modal__time-badge {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 20px;
  font-weight: 500;
  backdrop-filter: blur(8px);
}

/* Badges */
.dish-modal__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dish-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  font-size: 12px;
}

.dish-modal__badge--popular {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #b45309;
}

.dish-modal__badge--new {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #7c3aed;
}

/* Description */
.dish-modal__description {
  font-size: 15px;
  line-height: 1.6;
  color: #525252;
  margin: 0;
}

/* Reviews Section */
.dish-modal__reviews {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 14px;
  gap: 16px;
}

.dish-modal__reviews-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dish-modal__reviews-info :deep(.ant-rate) {
  font-size: 14px;
}

.dish-modal__reviews-info :deep(.ant-rate-star-full .anticon) {
  color: #f59e0b;
}

.dish-modal__rating-value {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}

.dish-modal__rating-count {
  font-size: 13px;
  color: #737373;
}

.dish-modal__no-reviews {
  font-size: 14px;
  color: #a3a3a3;
}

.dish-modal__reviews-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-weight: 600;
  color: #14b8a6;
}

/* Options Section */
.dish-modal__options {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dish-modal__option-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dish-modal__option-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dish-modal__option-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dish-modal__option-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}

.dish-modal__option-subtitle {
  margin: 0;
  font-size: 13px;
  color: #a3a3a3;
}

/* Choices */
.dish-modal__choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.dish-modal__choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fafafa;
  border: 2px solid transparent;
  border-radius: 14px;
  transition: all 0.15s ease;
}

.dish-modal__choice:hover:not(.dish-modal__choice--disabled) {
  background: #f5f5f5;
}

.dish-modal__choice--selected {
  background: rgba(20, 184, 166, 0.08);
  border-color: #14b8a6;
}

.dish-modal__choice--disabled {
  opacity: 0.5;
}

.dish-modal__choice :deep(.ant-radio-wrapper),
.dish-modal__choice :deep(.ant-checkbox-wrapper) {
  flex: 1;
  margin: 0;
}

.dish-modal__choice :deep(.ant-radio-checked .ant-radio-inner),
.dish-modal__choice :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background-color: #14b8a6;
  border-color: #14b8a6;
}

.dish-modal__choice-label {
  font-size: 15px;
  font-weight: 500;
  color: #262626;
}

.dish-modal__unavailable {
  font-size: 12px;
  color: #a3a3a3;
  margin-left: 4px;
}

.dish-modal__choice-price {
  font-size: 14px;
  font-weight: 500;
  color: #737373;
  flex-shrink: 0;
}

/* Quantity Section */
.dish-modal__quantity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
}

.dish-modal__quantity-label {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}

.dish-modal__quantity-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dish-modal__quantity-btn {
  width: 44px;
  height: 44px;
}

.dish-modal__quantity-btn--plus {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.35);
}

.dish-modal__quantity-btn--plus:hover {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
}

.dish-modal__quantity-input {
  width: 56px;
}

.dish-modal__quantity-input :deep(.ant-input-number-input) {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  height: 44px;
}

/* Price Summary */
.dish-modal__price {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dish-modal__price-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.dish-modal__price-total {
  font-size: 28px;
  font-weight: 700;
  color: #171717;
  letter-spacing: -0.02em;
}

.dish-modal__price-unit {
  font-size: 14px;
  color: #a3a3a3;
}

.dish-modal__price-modifier {
  font-size: 13px;
  color: #737373;
}

/* Footer */
.dish-modal__footer {
  display: flex;
  gap: 12px;
}

.dish-modal__cancel-btn {
  flex: 1;
  height: 48px;
  border-radius: 14px;
  font-weight: 600;
}

.dish-modal__add-btn {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border-radius: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.35);
}

.dish-modal__add-btn:not(:disabled):hover {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  box-shadow: 0 6px 16px rgba(20, 184, 166, 0.45);
}

.dish-modal__add-btn:disabled {
  background: #d4d4d4;
  box-shadow: none;
}
</style>
