<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button as AButton,
  Textarea as ATextarea,
  Radio as ARadio,
  RadioGroup as ARadioGroup,
  InputNumber as AInputNumber,
  Spin as ASpin,
  Alert as AAlert,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  ShoppingOutlined,
  EditOutlined,
  CreditCardOutlined,
  HeartOutlined,
  MessageOutlined,
} from '@ant-design/icons-vue';
import { useHotelGuestStore } from '@/stores/hotelGuestStore';
import { useConfigStore } from '@/stores/configStore';
import { useToast } from '@/composables/useToast';
import api, { type HotelDishData } from '@/services/api';

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
const { showToast } = useToast();

// State
const cartItems = ref<CartItem[]>([]);
const deliveryInstructions = ref('');
const paymentMethod = ref<'room_charge' | 'cash' | 'card'>('room_charge');
const selectedTipPercent = ref<number | null>(10);
const customTip = ref(0);
const specialInstructions = ref('');
const isSubmitting = ref(false);
const error = ref('');

// Tip options
const tipOptions = [
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
  { label: '0%', value: 0 },
];

// Computed
const hotel = computed(() => hotelGuestStore.hotel);
const room = computed(() => hotelGuestStore.room);
const roomNumber = computed(() => hotelGuestStore.roomNumber);
const isAuthenticated = computed(() => hotelGuestStore.isAuthenticated);

const estimatedTime = computed(() => {
  return hotel.value?.settings?.roomService?.estimatedDeliveryMinutes || 30;
});

const cartItemCount = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
});

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + getItemTotal(item), 0);
});

const deliveryFee = computed(() => {
  return hotel.value?.settings?.roomService?.deliveryFee || 0;
});

const serviceCharge = computed(() => {
  return Math.round(subtotal.value * 0.05 * 100) / 100;
});

const tax = computed(() => {
  return Math.round((subtotal.value + serviceCharge.value) * 0.1 * 100) / 100;
});

const tipAmount = computed(() => {
  if (customTip.value > 0) {return customTip.value;}
  if (selectedTipPercent.value !== null) {
    return calculateTipAmount(selectedTipPercent.value);
  }
  return 0;
});

const grandTotal = computed(() => {
  return subtotal.value + deliveryFee.value + serviceCharge.value + tax.value + tipAmount.value;
});

const canSubmit = computed(() => {
  return cartItems.value.length > 0 && !isSubmitting.value;
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
    'hotel.checkout': 'Finaliser la commande',
    'hotel.placingOrder': 'Envoi de votre commande...',
    'hotel.deliveryDetails': 'Détails de livraison',
    'hotel.room': 'Chambre',
    'hotel.estimatedDelivery': `Livraison estimée: ${params?.minutes || 30} min`,
    'hotel.deliveryInstructions': 'Instructions de livraison',
    'hotel.deliveryInstructionsPlaceholder': 'Ex: Laissez devant la porte...',
    'hotel.orderItems': 'Votre commande',
    'hotel.editOrder': 'Modifier',
    'hotel.paymentMethod': 'Mode de paiement',
    'hotel.chargeToRoom': 'Facturer à la chambre',
    'hotel.chargeToRoomDesc': 'Le montant sera ajouté à votre note',
    'hotel.cash': 'Espèces',
    'hotel.cashDesc': 'Payer à la livraison',
    'hotel.creditCard': 'Carte bancaire',
    'hotel.comingSoon': 'Bientôt disponible',
    'hotel.addTip': 'Ajouter un pourboire',
    'hotel.customTip': 'Montant personnalisé',
    'hotel.specialInstructions': 'Instructions spéciales',
    'hotel.specialInstructionsPlaceholder': 'Ex: Pas d\'oignons, allergies...',
    'hotel.subtotal': 'Sous-total',
    'hotel.deliveryFee': 'Frais de livraison',
    'hotel.serviceCharge': 'Service (5%)',
    'hotel.tax': 'TVA (10%)',
    'hotel.tip': 'Pourboire',
    'hotel.total': 'Total',
    'hotel.placeOrder': 'Confirmer la commande',
    'hotel.orderSuccess': 'Commande envoyée avec succès!',
    'hotel.orderError': 'Erreur lors de la commande',
    'hotel.loginRequired': 'Connexion requise pour commander',
  };
  return translations[key] || key;
}

function getItemTotal(item: CartItem): number {
  const basePrice = item.variant?.price || item.dish.price;
  const optionsPrice = item.options.reduce((sum, opt) => sum + opt.price, 0);
  return (basePrice + optionsPrice) * item.quantity;
}

function calculateTipAmount(percent: number): number {
  return Math.round(subtotal.value * (percent / 100) * 100) / 100;
}

function selectTip(percent: number) {
  selectedTipPercent.value = percent;
  customTip.value = 0;
}

// Actions
function goBack() {
  if (hotel.value) {
    router.push({
      name: 'hotel-cart',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

async function submitOrder() {
  if (!canSubmit.value || !hotel.value) {return;}

  // Check authentication
  if (!isAuthenticated.value) {
    error.value = t('hotel.loginRequired');
    // Redirect to auth after delay
    setTimeout(() => {
      router.push({
        name: 'hotel-auth',
        params: { hotelSlug: hotel.value!.slug },
      });
    }, 2000);
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  // Ensure room is available
  if (!room.value?.id) {
    error.value = 'Room information not available';
    isSubmitting.value = false;
    return;
  }

  try {
    // Prepare order data
    const orderData = {
      roomId: room.value.id,
      items: cartItems.value.map(item => ({
        dishId: item.dish.id,
        quantity: item.quantity,
        variant: item.variant ? {
          name: typeof item.variant.name === 'string' ? item.variant.name : item.variant.name.fr,
          price: item.variant.price,
        } : undefined,
        options: item.options.map(opt => ({
          name: typeof opt.name === 'string' ? opt.name : opt.name.fr,
          price: opt.price,
        })),
        specialInstructions: item.specialInstructions,
      })),
      deliveryInstructions: deliveryInstructions.value || undefined,
      specialInstructions: specialInstructions.value || undefined,
      paymentMethod: paymentMethod.value,
      tip: tipAmount.value,
    };

    const response = await api.hotelCreateOrder(hotel.value.id, orderData);

    if (response.success && response.data) {
      // Clear cart
      sessionStorage.removeItem('hotelCart');

      // Show success
      showToast(t('hotel.orderSuccess'), 'success');

      // Navigate to order tracking
      router.push({
        name: 'hotel-order-tracking',
        params: {
          hotelSlug: hotel.value.slug,
          orderId: response.data.id,
        },
      });
    } else {
      error.value = response.message || t('hotel.orderError');
    }
  } catch (err) {
    error.value = (err as Error).message || t('hotel.orderError');
  } finally {
    isSubmitting.value = false;
  }
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

  // Load cart
  loadCart();

  // Redirect if cart is empty
  if (cartItems.value.length === 0 && hotel.value) {
    router.push({
      name: 'hotel-menu',
      params: { hotelSlug: hotel.value.slug },
    });
  }
});
</script>

<template>
  <div class="hotel-checkout">
    <!-- Header -->
    <div class="checkout-header">
      <a-button type="text" @click="goBack">
        <template #icon><ArrowLeftOutlined /></template>
      </a-button>
      <h1>{{ t('hotel.checkout') }}</h1>
      <div style="width: 32px" />
    </div>

    <!-- Loading -->
    <div v-if="isSubmitting" class="loading-overlay">
      <a-spin size="large" />
      <p>{{ t('hotel.placingOrder') }}</p>
    </div>

    <div v-else class="checkout-content">
      <!-- Delivery Info -->
      <div class="checkout-section">
        <h3>
          <EnvironmentOutlined />
          {{ t('hotel.deliveryDetails') }}
        </h3>

        <div class="room-delivery-info">
          <div class="room-badge">
            <HomeOutlined />
            <span>{{ t('hotel.room') }} {{ roomNumber }}</span>
          </div>
          <p v-if="estimatedTime" class="delivery-estimate">
            <ClockCircleOutlined />
            {{ t('hotel.estimatedDelivery', { minutes: estimatedTime }) }}
          </p>
        </div>

        <div class="form-group">
          <label>{{ t('hotel.deliveryInstructions') }}</label>
          <a-textarea
            v-model:value="deliveryInstructions"
            :placeholder="t('hotel.deliveryInstructionsPlaceholder')"
            :rows="2"
            :maxlength="200"
          />
        </div>
      </div>

      <!-- Order Items Summary -->
      <div class="checkout-section">
        <h3>
          <ShoppingOutlined />
          {{ t('hotel.orderItems') }}
          <span class="item-count">({{ cartItemCount }})</span>
        </h3>

        <div class="order-items">
          <div
            v-for="(item, index) in cartItems"
            :key="index"
            class="order-item"
          >
            <span class="item-qty">{{ item.quantity }}x</span>
            <span class="item-name">
              {{ localize(item.dish.name) }}
              <span v-if="item.variant" class="item-variant">
                ({{ localize(item.variant.name) }})
              </span>
            </span>
            <span class="item-price">{{ formatPrice(getItemTotal(item)) }}</span>
          </div>
        </div>

        <a-button type="link" class="edit-order-btn" @click="goBack">
          <EditOutlined /> {{ t('hotel.editOrder') }}
        </a-button>
      </div>

      <!-- Payment Method -->
      <div class="checkout-section">
        <h3>
          <CreditCardOutlined />
          {{ t('hotel.paymentMethod') }}
        </h3>

        <a-radio-group v-model:value="paymentMethod" class="payment-methods">
          <a-radio value="room_charge" class="payment-option">
            <div class="payment-info">
              <span class="payment-name">{{ t('hotel.chargeToRoom') }}</span>
              <span class="payment-desc">{{ t('hotel.chargeToRoomDesc') }}</span>
            </div>
          </a-radio>
          <a-radio value="cash" class="payment-option">
            <div class="payment-info">
              <span class="payment-name">{{ t('hotel.cash') }}</span>
              <span class="payment-desc">{{ t('hotel.cashDesc') }}</span>
            </div>
          </a-radio>
          <a-radio value="card" class="payment-option" disabled>
            <div class="payment-info">
              <span class="payment-name">{{ t('hotel.creditCard') }}</span>
              <span class="payment-desc">{{ t('hotel.comingSoon') }}</span>
            </div>
          </a-radio>
        </a-radio-group>
      </div>

      <!-- Tip -->
      <div class="checkout-section">
        <h3>
          <HeartOutlined />
          {{ t('hotel.addTip') }}
        </h3>

        <div class="tip-options">
          <button
            v-for="tipOption in tipOptions"
            :key="tipOption.value"
            :class="['tip-btn', { active: selectedTipPercent === tipOption.value }]"
            @click="selectTip(tipOption.value)"
          >
            <span class="tip-percent">{{ tipOption.label }}</span>
            <span class="tip-amount">{{ formatPrice(calculateTipAmount(tipOption.value)) }}</span>
          </button>
        </div>

        <div class="custom-tip">
          <span>{{ t('hotel.customTip') }}</span>
          <a-input-number
            v-model:value="customTip"
            :min="0"
            :max="100"
            :formatter="value => `${value} €`"
            :parser="(value: string) => value.replace(' €', '')"
            @change="selectedTipPercent = null"
          />
        </div>
      </div>

      <!-- Special Instructions -->
      <div class="checkout-section">
        <h3>
          <MessageOutlined />
          {{ t('hotel.specialInstructions') }}
        </h3>
        <a-textarea
          v-model:value="specialInstructions"
          :placeholder="t('hotel.specialInstructionsPlaceholder')"
          :rows="2"
          :maxlength="300"
        />
      </div>

      <!-- Order Total -->
      <div class="checkout-section total-section">
        <div class="summary-row">
          <span>{{ t('hotel.subtotal') }}</span>
          <span>{{ formatPrice(subtotal) }}</span>
        </div>
        <div v-if="deliveryFee > 0" class="summary-row">
          <span>{{ t('hotel.deliveryFee') }}</span>
          <span>{{ formatPrice(deliveryFee) }}</span>
        </div>
        <div class="summary-row">
          <span>{{ t('hotel.serviceCharge') }}</span>
          <span>{{ formatPrice(serviceCharge) }}</span>
        </div>
        <div class="summary-row">
          <span>{{ t('hotel.tax') }}</span>
          <span>{{ formatPrice(tax) }}</span>
        </div>
        <div v-if="tipAmount > 0" class="summary-row tip">
          <span>{{ t('hotel.tip') }}</span>
          <span>{{ formatPrice(tipAmount) }}</span>
        </div>
        <div class="summary-row grand-total">
          <span>{{ t('hotel.total') }}</span>
          <span>{{ formatPrice(grandTotal) }}</span>
        </div>
      </div>
    </div>

    <!-- Submit Button -->
    <div class="checkout-footer">
      <a-button
        type="primary"
        size="large"
        block
        :loading="isSubmitting"
        :disabled="!canSubmit"
        @click="submitOrder"
      >
        {{ t('hotel.placeOrder') }} - {{ formatPrice(grandTotal) }}
      </a-button>
    </div>

    <!-- Error Alert -->
    <a-alert
      v-if="error"
      type="error"
      :message="error"
      show-icon
      closable
      class="error-alert"
      @close="error = ''"
    />
  </div>
</template>

<style scoped>
.hotel-checkout {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100px;
}

.checkout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.checkout-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-overlay p {
  margin-top: 16px;
  color: #666;
}

.checkout-content {
  padding: 16px;
}

.checkout-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.checkout-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.checkout-section h3 .item-count {
  font-weight: 400;
  color: #888;
}

.room-delivery-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.room-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #e6f7ff;
  border-radius: 20px;
  color: #1890ff;
  font-weight: 600;
}

.delivery-estimate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #52c41a;
  font-size: 14px;
}

.form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #666;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.order-item:last-child {
  border-bottom: none;
}

.item-qty {
  font-weight: 600;
  color: #14b8a6;
  min-width: 30px;
}

.item-name {
  flex: 1;
  color: #1a1a1a;
}

.item-variant {
  color: #888;
  font-size: 13px;
}

.item-price {
  font-weight: 600;
  color: #1a1a1a;
}

.edit-order-btn {
  padding: 0;
  height: auto;
  margin-top: 12px;
  color: #14b8a6;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.payment-option {
  display: flex;
  width: 100%;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  margin: 0;
}

.payment-option :deep(.ant-radio) {
  align-self: flex-start;
  margin-top: 2px;
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-name {
  font-weight: 500;
  color: #1a1a1a;
}

.payment-desc {
  font-size: 12px;
  color: #888;
}

.tip-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.tip-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.tip-btn:hover {
  border-color: #14b8a6;
}

.tip-btn.active {
  border-color: #14b8a6;
  background: #e6fffb;
}

.tip-percent {
  font-weight: 600;
  color: #1a1a1a;
}

.tip-amount {
  font-size: 12px;
  color: #888;
}

.custom-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.custom-tip span {
  color: #666;
}

.custom-tip :deep(.ant-input-number) {
  width: 120px;
}

.total-section .summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #666;
}

.total-section .summary-row.tip {
  color: #14b8a6;
}

.total-section .summary-row.grand-total {
  border-top: 2px solid #e8e8e8;
  padding-top: 12px;
  margin-top: 4px;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.checkout-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
}

.checkout-footer .ant-btn {
  height: 52px;
  font-size: 16px;
  border-radius: 26px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
}

.checkout-footer .ant-btn:disabled {
  background: #d9d9d9;
}

.error-alert {
  position: fixed;
  bottom: 80px;
  left: 16px;
  right: 16px;
  z-index: 1001;
}
</style>
