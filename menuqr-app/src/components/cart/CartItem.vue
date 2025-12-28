<script setup lang="ts">
import { Card, Button, Popconfirm } from 'ant-design-vue';
import { DeleteOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons-vue';
import type { CartItem } from '@/types/cart';
import { useCart } from '@/composables/useCart';
import { useLocale } from '@/composables/useI18n';
import { useCurrency } from '@/composables/useCurrency';
import LazyImage from '@/components/common/LazyImage.vue';

/**
 * CartItem - Individual cart item with quantity controls
 * Uses Ant Design components with custom styling
 */
const props = defineProps<{
  item: CartItem;
}>();

defineEmits<{
  remove: [itemId: string];
}>();

const { updateQuantity, removeItem } = useCart();
const { localize, t } = useLocale();
const { formatPrice } = useCurrency();

const increment = () => {
  updateQuantity(props.item.id, props.item.quantity + 1);
};

const decrement = () => {
  if (props.item.quantity > 1) {
    updateQuantity(props.item.id, props.item.quantity - 1);
  }
};

const remove = () => {
  removeItem(props.item.id);
};
</script>

<template>
  <Card class="cart-item" :bordered="false" :body-style="{ padding: '16px' }">
    <div class="cart-item__layout">
      <!-- Dish Image -->
      <div class="cart-item__image">
        <LazyImage
          :src="item.dish.image"
          :alt="localize(item.dish.name)"
          class="cart-item__img"
        />
      </div>

      <!-- Item Details -->
      <div class="cart-item__details">
        <div class="cart-item__header">
          <h3 class="cart-item__name">{{ localize(item.dish.name) }}</h3>
          <Popconfirm
            :title="t('cart.removeConfirm')"
            :ok-text="t('app.yes')"
            :cancel-text="t('app.no')"
            ok-type="danger"
            placement="left"
            @confirm="remove"
          >
            <Button
              type="text"
              shape="circle"
              class="cart-item__delete"
            >
              <template #icon><DeleteOutlined /></template>
            </Button>
          </Popconfirm>
        </div>

        <!-- Selected Options -->
        <div v-if="item.selectedOptions && item.selectedOptions.length > 0" class="cart-item__options">
          <p v-for="option in item.selectedOptions" :key="option.optionId" class="cart-item__option">
            <span class="cart-item__option-name">{{ option.optionName }}:</span>
            {{ option.choices.map((c) => localize(c.name)).join(', ') }}
            <span v-if="option.priceModifier > 0" class="cart-item__option-price">
              (+{{ formatPrice(option.priceModifier) }})
            </span>
          </p>
        </div>

        <!-- Item Notes -->
        <p v-if="item.notes" class="cart-item__notes">"{{ item.notes }}"</p>

        <!-- Price and Quantity -->
        <div class="cart-item__footer">
          <span class="cart-item__price">{{ formatPrice(item.totalPrice) }}</span>

          <!-- Quantity Controls -->
          <div class="cart-item__quantity">
            <Button
              type="default"
              shape="circle"
              :disabled="item.quantity <= 1"
              class="cart-item__qty-btn"
              @click.stop="decrement"
            >
              <template #icon><MinusOutlined /></template>
            </Button>
            <span class="cart-item__qty-value">{{ item.quantity }}</span>
            <Button
              type="primary"
              shape="circle"
              class="cart-item__qty-btn cart-item__qty-btn--plus"
              @click.stop="increment"
            >
              <template #icon><PlusOutlined /></template>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.cart-item {
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.cart-item__layout {
  display: flex;
  gap: 16px;
}

/* Image */
.cart-item__image {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.cart-item__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Details */
.cart-item__details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cart-item__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cart-item__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cart-item__delete {
  flex-shrink: 0;
  color: #9ca3af;
}

.cart-item__delete:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* Options */
.cart-item__options {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cart-item__option {
  margin: 0;
  font-size: 14px;
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-item__option-name {
  color: #9ca3af;
}

.cart-item__option-price {
  font-weight: 500;
  color: #14b8a6;
}

/* Notes */
.cart-item__notes {
  margin: 8px 0 0;
  font-size: 14px;
  font-style: italic;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Footer */
.cart-item__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 16px;
}

.cart-item__price {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

/* Quantity */
.cart-item__quantity {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 24px;
}

.cart-item__qty-btn {
  width: 40px;
  height: 40px;
}

.cart-item__qty-btn--plus {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
  box-shadow: 0 2px 6px rgba(20, 184, 166, 0.35);
}

.cart-item__qty-btn--plus:hover {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
}

.cart-item__qty-value {
  min-width: 48px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}
</style>
