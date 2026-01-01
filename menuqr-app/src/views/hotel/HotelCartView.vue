<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button as AButton } from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  CoffeeOutlined,
  EditOutlined,
  MinusOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import { useHotelGuestStore } from '@/stores/hotelGuestStore';
import { useConfigStore } from '@/stores/configStore';
import type { HotelDishData } from '@/services/api';

interface CartItem {
  dish: HotelDishData;
  variant?: { name: { fr: string; en?: string }; price: number };
  options: Array<{ name: { fr: string; en?: string }; price: number }>;
  specialInstructions?: string;
  quantity: number;
}

const route = useRoute();
const router = useRouter();
const hotelGuestStore = useHotelGuestStore();
const configStore = useConfigStore();

// State
const cartItems = ref<CartItem[]>([]);

// Computed
const hotel = computed(() => hotelGuestStore.hotel);
const roomNumber = computed(() => hotelGuestStore.roomNumber);

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + getItemTotal(item), 0);
});

const deliveryFee = computed(() => {
  return hotel.value?.settings?.roomService?.deliveryFee || 0;
});

const serviceCharge = computed(() => {
  // 5% service charge
  return Math.round(subtotal.value * 0.05 * 100) / 100;
});

const taxRate = computed(() => 10); // 10% VAT

const tax = computed(() => {
  return Math.round((subtotal.value + serviceCharge.value) * (taxRate.value / 100) * 100) / 100;
});

const total = computed(() => {
  return subtotal.value + deliveryFee.value + serviceCharge.value + tax.value;
});

const minOrderAmount = computed(() => {
  return hotel.value?.settings?.roomService?.minOrderAmount || 0;
});

const canCheckout = computed(() => {
  if (cartItems.value.length === 0) {return false;}
  if (minOrderAmount.value && subtotal.value < minOrderAmount.value) {return false;}
  return true;
});

// Helpers
function localize(obj: { fr: string; en?: string } | undefined): string {
  if (!obj) {return '';}
  const locale = configStore.locale || 'fr';
  return locale === 'en' && obj.en ? obj.en : obj.fr;
}

function formatPrice(price: number): string {
  const currency = hotel.value?.settings?.currency || 'EUR';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(price);
}

function t(key: string, params?: Record<string, unknown>): string {
  const translations: Record<string, string> = {
    'hotel.myCart': 'Mon panier',
    'hotel.clearCart': 'Vider',
    'hotel.room': 'Chambre',
    'hotel.emptyCart': 'Votre panier est vide',
    'hotel.emptyCartMessage': 'Ajoutez des articles depuis notre menu',
    'hotel.browseMenu': 'Voir le menu',
    'hotel.orderSummary': 'Récapitulatif',
    'hotel.subtotal': 'Sous-total',
    'hotel.deliveryFee': 'Frais de livraison',
    'hotel.serviceCharge': 'Service',
    'hotel.tax': 'TVA',
    'hotel.total': 'Total',
    'hotel.minOrderMessage': `Commande minimum: ${params?.amount || '0'}`,
    'hotel.proceedToCheckout': 'Passer la commande',
  };
  return translations[key] || key;
}

function getItemTotal(item: CartItem): number {
  const basePrice = item.variant?.price || item.dish.price;
  const optionsPrice = item.options.reduce((sum, opt) => sum + opt.price, 0);
  return (basePrice + optionsPrice) * item.quantity;
}

// Actions
function goBack() {
  if (hotel.value) {
    router.push({
      name: 'hotel-menu',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

function goToMenu() {
  if (hotel.value) {
    router.push({
      name: 'hotel-menu',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

function goToCheckout() {
  if (!canCheckout.value || !hotel.value) {return;}

  // Save cart to sessionStorage
  saveCart();

  router.push({
    name: 'hotel-checkout',
    params: { hotelSlug: hotel.value.slug },
  });
}

function clearCart() {
  cartItems.value = [];
  saveCart();
}

function incrementItem(index: number) {
  const item = cartItems.value[index];
  if (item) {
    item.quantity++;
    saveCart();
  }
}

function decrementItem(index: number) {
  const item = cartItems.value[index];
  if (item) {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      removeItem(index);
    }
    saveCart();
  }
}

function removeItem(index: number) {
  cartItems.value.splice(index, 1);
  saveCart();
}

function saveCart() {
  sessionStorage.setItem('hotelCart', JSON.stringify(cartItems.value));
}

function loadCart() {
  const saved = sessionStorage.getItem('hotelCart');
  if (saved) {
    try {
      cartItems.value = JSON.parse(saved);
    } catch {
      cartItems.value = [];
    }
  }
}

onMounted(async () => {
  const hotelSlug = route.params.hotelSlug as string;

  // Load hotel data if not already loaded
  if (!hotel.value && hotelSlug) {
    await hotelGuestStore.getHotelBySlug(hotelSlug);
  }

  // Load cart from sessionStorage
  loadCart();
});
</script>

<template>
  <div class="hotel-cart">
    <!-- Header -->
    <div class="cart-header">
      <a-button type="text" @click="goBack">
        <template #icon><ArrowLeftOutlined /></template>
      </a-button>
      <h1>{{ t('hotel.myCart') }}</h1>
      <a-button v-if="cartItems.length > 0" type="text" danger @click="clearCart">
        {{ t('hotel.clearCart') }}
      </a-button>
      <div v-else style="width: 70px" />
    </div>

    <!-- Hotel Info -->
    <div v-if="hotel" class="hotel-mini-info">
      <img
        v-if="hotel.logo"
        :src="hotel.logo"
        :alt="hotel.name"
        class="hotel-mini-logo"
      />
      <div class="hotel-details">
        <span class="hotel-name">{{ hotel.name }}</span>
        <span v-if="roomNumber" class="room-info">
          <HomeOutlined /> {{ t('hotel.room') }} {{ roomNumber }}
        </span>
      </div>
    </div>

    <!-- Empty Cart -->
    <div v-if="cartItems.length === 0" class="empty-cart">
      <ShoppingCartOutlined />
      <h2>{{ t('hotel.emptyCart') }}</h2>
      <p>{{ t('hotel.emptyCartMessage') }}</p>
      <a-button type="primary" @click="goToMenu">
        {{ t('hotel.browseMenu') }}
      </a-button>
    </div>

    <!-- Cart Items -->
    <div v-else class="cart-content">
      <div class="cart-items">
        <div
          v-for="(item, index) in cartItems"
          :key="index"
          class="cart-item"
        >
          <div class="item-image">
            <img
              v-if="item.dish.images?.[0]"
              :src="item.dish.images[0]"
              :alt="localize(item.dish.name)"
            />
            <div v-else class="image-placeholder">
              <CoffeeOutlined />
            </div>
          </div>

          <div class="item-details">
            <h3 class="item-name">{{ localize(item.dish.name) }}</h3>
            <p v-if="item.variant" class="item-variant">
              {{ localize(item.variant.name) }}
            </p>
            <div v-if="item.options.length > 0" class="item-options">
              <span v-for="opt in item.options" :key="localize(opt.name)" class="option-badge">
                + {{ localize(opt.name) }}
              </span>
            </div>
            <p v-if="item.specialInstructions" class="item-instructions">
              <EditOutlined /> {{ item.specialInstructions }}
            </p>
            <div class="item-footer">
              <span class="item-price">{{ formatPrice(getItemTotal(item)) }}</span>
              <div class="quantity-controls">
                <a-button
                  size="small"
                  @click="decrementItem(index)"
                >
                  <template #icon><MinusOutlined /></template>
                </a-button>
                <span class="quantity">{{ item.quantity }}</span>
                <a-button
                  size="small"
                  @click="incrementItem(index)"
                >
                  <template #icon><PlusOutlined /></template>
                </a-button>
              </div>
            </div>
          </div>

          <a-button
            type="text"
            danger
            class="remove-btn"
            @click="removeItem(index)"
          >
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="order-summary">
        <h3>{{ t('hotel.orderSummary') }}</h3>

        <div class="summary-row">
          <span>{{ t('hotel.subtotal') }}</span>
          <span>{{ formatPrice(subtotal) }}</span>
        </div>

        <div v-if="deliveryFee > 0" class="summary-row">
          <span>{{ t('hotel.deliveryFee') }}</span>
          <span>{{ formatPrice(deliveryFee) }}</span>
        </div>

        <div v-if="serviceCharge > 0" class="summary-row">
          <span>{{ t('hotel.serviceCharge') }}</span>
          <span>{{ formatPrice(serviceCharge) }}</span>
        </div>

        <div class="summary-row tax">
          <span>{{ t('hotel.tax') }} ({{ taxRate }}%)</span>
          <span>{{ formatPrice(tax) }}</span>
        </div>

        <div class="summary-row total">
          <span>{{ t('hotel.total') }}</span>
          <span>{{ formatPrice(total) }}</span>
        </div>

        <!-- Minimum Order Warning -->
        <div v-if="minOrderAmount && subtotal < minOrderAmount" class="min-order-warning">
          <InfoCircleOutlined />
          {{ t('hotel.minOrderMessage', { amount: formatPrice(minOrderAmount) }) }}
        </div>
      </div>

      <!-- Checkout Button -->
      <div class="checkout-section">
        <a-button
          type="primary"
          size="large"
          block
          :disabled="!canCheckout"
          @click="goToCheckout"
        >
          {{ t('hotel.proceedToCheckout') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotel-cart {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100px;
}

.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.cart-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.hotel-mini-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  margin-bottom: 8px;
}

.hotel-mini-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
}

.hotel-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hotel-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #1890ff;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-cart .anticon {
  font-size: 64px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.empty-cart h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #1a1a1a;
}

.empty-cart p {
  margin: 0 0 24px;
  color: #888;
}

.empty-cart .ant-btn {
  border-radius: 24px;
  height: 44px;
  padding: 0 32px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
}

.cart-content {
  padding: 16px;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.cart-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #bbb;
  font-size: 24px;
}

.item-details {
  flex: 1;
  min-width: 0;
}

.item-name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.item-variant {
  margin: 0 0 4px;
  font-size: 13px;
  color: #666;
}

.item-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.option-badge {
  font-size: 11px;
  color: #14b8a6;
  background: #e6fffb;
  padding: 2px 8px;
  border-radius: 10px;
}

.item-instructions {
  margin: 0 0 8px;
  font-size: 12px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-price {
  font-size: 16px;
  font-weight: 700;
  color: #14b8a6;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-controls .ant-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quantity {
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

.order-summary {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.order-summary h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.summary-row.tax {
  border-top: 1px dashed #e8e8e8;
  padding-top: 12px;
  margin-top: 4px;
}

.summary-row.total {
  border-top: 2px solid #e8e8e8;
  padding-top: 12px;
  margin-top: 4px;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.min-order-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fff7e6;
  border-radius: 8px;
  font-size: 13px;
  color: #fa8c16;
  margin-top: 12px;
}

.checkout-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
}

.checkout-section .ant-btn {
  height: 48px;
  font-size: 16px;
  border-radius: 24px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
}

.checkout-section .ant-btn:disabled {
  background: #d9d9d9;
}
</style>
