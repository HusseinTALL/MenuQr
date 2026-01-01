<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button as AButton,
  Spin as ASpin,
  Modal as AModal,
  Textarea as ATextarea,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  CloseCircleOutlined,
  StarOutlined,
  StarFilled,
  RedoOutlined,
  QuestionCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CarOutlined,
} from '@ant-design/icons-vue';
import { useHotelGuestStore, type HotelOrder } from '@/stores/hotelGuestStore';
import { useConfigStore } from '@/stores/configStore';
import { useToast } from '@/composables/useToast';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();
const hotelGuestStore = useHotelGuestStore();
const configStore = useConfigStore();
const { showToast } = useToast();

// State
const order = ref<HotelOrder | null>(null);
const isLoading = ref(true);
const isRefreshing = ref(false);
const error = ref('');
const refreshInterval = ref<number | null>(null);

// Cancel modal
const showCancelModal = ref(false);
const cancelReason = ref('');
const isCancelling = ref(false);

// Rating modal
const showRatingModal = ref(false);
const rating = ref(0);
const feedback = ref('');
const isSubmittingRating = ref(false);

// Progress steps
const progressSteps = computed(() => [
  { key: 'pending', title: t('hotel.statusPending'), time: order.value?.createdAt ? formatTime(order.value.createdAt) : '' },
  { key: 'confirmed', title: t('hotel.statusConfirmed'), time: '' },
  { key: 'preparing', title: t('hotel.statusPreparing'), time: '' },
  { key: 'ready', title: t('hotel.statusReady'), time: '' },
  { key: 'delivering', title: t('hotel.statusDelivering'), time: '' },
  { key: 'delivered', title: t('hotel.statusDelivered'), time: order.value?.actualDeliveryTime ? formatTime(order.value.actualDeliveryTime) : '' },
]);

const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];

// Computed
const hotel = computed(() => hotelGuestStore.hotel);

const canRefresh = computed(() => {
  if (!order.value) {return false;}
  return !['delivered', 'cancelled', 'rejected'].includes(order.value.status);
});

const showEstimatedTime = computed(() => {
  if (!order.value) {return false;}
  return ['confirmed', 'preparing', 'ready', 'delivering'].includes(order.value.status);
});

const estimatedArrival = computed(() => {
  if (!order.value?.estimatedDeliveryTime) {
    // Calculate estimate from creation time
    const created = new Date(order.value?.createdAt || Date.now());
    const estimated = new Date(created.getTime() + 30 * 60 * 1000);
    return formatTime(estimated.toISOString());
  }
  return formatTime(order.value.estimatedDeliveryTime);
});

const canCancel = computed(() => {
  if (!order.value) {return false;}
  return ['pending', 'confirmed'].includes(order.value.status);
});

const canRate = computed(() => {
  if (!order.value) {return false;}
  return order.value.status === 'delivered' && !order.value.rating;
});

const isCompleted = computed(() => {
  if (!order.value) {return false;}
  return ['delivered', 'cancelled', 'rejected'].includes(order.value.status);
});

// Helpers
function localize(obj: string | { fr: string; en?: string } | undefined): string {
  if (!obj) {return '';}
  if (typeof obj === 'string') {return obj;}
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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function t(key: string, params?: Record<string, unknown>): string {
  const translations: Record<string, string> = {
    'hotel.orderTracking': 'Suivi de commande',
    'hotel.orderNotFound': 'Commande introuvable',
    'hotel.viewAllOrders': 'Voir mes commandes',
    'hotel.estimatedArrival': `Arrivée estimée: ${params?.time || ''}`,
    'hotel.orderNumber': 'Commande',
    'hotel.orderedAt': 'Commandé le',
    'hotel.deliveryTo': 'Livraison',
    'hotel.room': 'Chambre',
    'hotel.orderItems': 'Articles',
    'hotel.paymentSummary': 'Paiement',
    'hotel.subtotal': 'Sous-total',
    'hotel.deliveryFee': 'Frais de livraison',
    'hotel.serviceCharge': 'Service',
    'hotel.tax': 'TVA',
    'hotel.tip': 'Pourboire',
    'hotel.total': 'Total',
    'hotel.paymentMethod': 'Paiement',
    'hotel.roomCharge': 'Facturé à la chambre',
    'hotel.cash': 'Espèces',
    'hotel.card': 'Carte',
    'hotel.cancelOrder': 'Annuler la commande',
    'hotel.rateOrder': 'Noter la commande',
    'hotel.reorder': 'Commander à nouveau',
    'hotel.needHelp': 'Besoin d\'aide ?',
    'hotel.cancelOrderTitle': 'Annuler la commande',
    'hotel.cancelOrderMessage': 'Êtes-vous sûr de vouloir annuler cette commande ?',
    'hotel.cancelReasonPlaceholder': 'Raison de l\'annulation (optionnel)',
    'hotel.rateOrderTitle': 'Noter votre commande',
    'hotel.ratingQuestion': 'Comment était votre commande ?',
    'hotel.feedbackPlaceholder': 'Commentaire (optionnel)',
    'hotel.submitRating': 'Envoyer',
    'hotel.statusPending': 'Reçue',
    'hotel.statusConfirmed': 'Confirmée',
    'hotel.statusPreparing': 'En préparation',
    'hotel.statusReady': 'Prête',
    'hotel.statusDelivering': 'En livraison',
    'hotel.statusDelivered': 'Livrée',
    'hotel.statusCancelled': 'Annulée',
    'hotel.statusRejected': 'Refusée',
    'hotel.orderReceived': 'Commande reçue',
    'hotel.orderReceivedMessage': 'Votre commande est en cours de traitement',
    'hotel.orderConfirmed': 'Commande confirmée',
    'hotel.orderConfirmedMessage': 'La cuisine prépare votre commande',
    'hotel.orderPreparing': 'En préparation',
    'hotel.orderPreparingMessage': 'Votre commande est en cours de préparation',
    'hotel.orderReady': 'Commande prête',
    'hotel.orderReadyMessage': 'Votre commande va bientôt partir',
    'hotel.orderDelivering': 'En route',
    'hotel.orderDeliveringMessage': 'Votre commande arrive !',
    'hotel.orderDelivered': 'Livrée',
    'hotel.orderDeliveredMessage': 'Bon appétit !',
    'hotel.orderCancelled': 'Annulée',
    'hotel.orderCancelledMessage': 'Votre commande a été annulée',
    'hotel.orderRejected': 'Refusée',
    'hotel.orderRejectedMessage': 'Votre commande n\'a pas pu être acceptée',
    'hotel.cancelSuccess': 'Commande annulée',
    'hotel.ratingSuccess': 'Merci pour votre avis !',
  };
  return translations[key] || key;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    preparing: 'status-preparing',
    ready: 'status-ready',
    delivering: 'status-delivering',
    delivered: 'status-delivered',
    cancelled: 'status-cancelled',
    rejected: 'status-rejected',
  };
  return classes[status] || 'status-pending';
}

function getStatusIcon(status: string) {
  const icons: Record<string, typeof ClockCircleOutlined> = {
    pending: ClockCircleOutlined,
    confirmed: CheckCircleOutlined,
    preparing: SyncOutlined,
    ready: CheckCircleOutlined,
    delivering: CarOutlined,
    delivered: CheckCircleOutlined,
    cancelled: CloseCircleOutlined,
    rejected: ExclamationCircleOutlined,
  };
  return icons[status] || LoadingOutlined;
}

function getStatusTitle(status: string): string {
  const titles: Record<string, string> = {
    pending: t('hotel.orderReceived'),
    confirmed: t('hotel.orderConfirmed'),
    preparing: t('hotel.orderPreparing'),
    ready: t('hotel.orderReady'),
    delivering: t('hotel.orderDelivering'),
    delivered: t('hotel.orderDelivered'),
    cancelled: t('hotel.orderCancelled'),
    rejected: t('hotel.orderRejected'),
  };
  return titles[status] || status;
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    pending: t('hotel.orderReceivedMessage'),
    confirmed: t('hotel.orderConfirmedMessage'),
    preparing: t('hotel.orderPreparingMessage'),
    ready: t('hotel.orderReadyMessage'),
    delivering: t('hotel.orderDeliveringMessage'),
    delivered: t('hotel.orderDeliveredMessage'),
    cancelled: t('hotel.orderCancelledMessage'),
    rejected: t('hotel.orderRejectedMessage'),
  };
  return messages[status] || '';
}

function getPaymentMethodLabel(method: string | undefined): string {
  const labels: Record<string, string> = {
    room_charge: t('hotel.roomCharge'),
    cash: t('hotel.cash'),
    card: t('hotel.card'),
  };
  return labels[method || 'room_charge'] || method || '';
}

function isStepActive(step: string): boolean {
  if (!order.value) {return false;}
  return order.value.status === step;
}

function isStepCompleted(step: string): boolean {
  if (!order.value) {return false;}
  const currentIndex = statusOrder.indexOf(order.value.status);
  const stepIndex = statusOrder.indexOf(step);
  return stepIndex < currentIndex;
}

// Actions
function goBack() {
  if (hotel.value) {
    router.push({
      name: 'hotel-orders',
      params: { hotelSlug: hotel.value.slug },
    });
  } else {
    router.back();
  }
}

function goToOrders() {
  if (hotel.value) {
    router.push({
      name: 'hotel-orders',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

async function loadOrder() {
  const hotelSlug = route.params.hotelSlug as string;
  const orderId = route.params.orderId as string;

  if (!hotel.value && hotelSlug) {
    await hotelGuestStore.getHotelBySlug(hotelSlug);
  }

  if (!hotel.value || !orderId) {
    error.value = 'Invalid order';
    isLoading.value = false;
    return;
  }

  try {
    const response = await api.hotelGetOrder(hotel.value.id, orderId);
    if (response.success && response.data) {
      order.value = response.data;
    } else {
      error.value = response.message || 'Order not found';
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
}

async function refreshOrder() {
  if (!hotel.value || !order.value) {return;}

  isRefreshing.value = true;
  try {
    const response = await api.hotelGetOrder(hotel.value.id, order.value.id);
    if (response.success && response.data) {
      order.value = response.data;
    }
  } catch {
    // Silently fail on refresh
  } finally {
    isRefreshing.value = false;
  }
}

async function cancelOrder() {
  if (!hotel.value || !order.value) {return;}

  isCancelling.value = true;
  try {
    const response = await api.hotelCancelOrder(hotel.value.id, order.value.id, cancelReason.value);
    if (response.success) {
      showToast(t('hotel.cancelSuccess'), 'success');
      showCancelModal.value = false;
      await refreshOrder();
    }
  } catch (err) {
    showToast((err as Error).message, 'error');
  } finally {
    isCancelling.value = false;
  }
}

async function submitRating() {
  if (!hotel.value || !order.value || rating.value === 0) {return;}

  isSubmittingRating.value = true;
  try {
    const response = await api.hotelRateOrder(hotel.value.id, order.value.id, rating.value, feedback.value);
    if (response.success) {
      showToast(t('hotel.ratingSuccess'), 'success');
      showRatingModal.value = false;
      await refreshOrder();
    }
  } catch (err) {
    showToast((err as Error).message, 'error');
  } finally {
    isSubmittingRating.value = false;
  }
}

function reorder() {
  // TODO: Implement reorder functionality
  if (hotel.value) {
    router.push({
      name: 'hotel-menu',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

function contactSupport() {
  // TODO: Implement support contact
  if (hotel.value?.phone) {
    window.location.href = `tel:${hotel.value.phone}`;
  }
}

function startAutoRefresh() {
  if (canRefresh.value) {
    refreshInterval.value = window.setInterval(() => {
      refreshOrder();
    }, 15000); // Refresh every 15 seconds
  }
}

function stopAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
}

onMounted(async () => {
  await loadOrder();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div class="order-tracking">
    <!-- Header -->
    <div class="tracking-header">
      <a-button type="text" @click="goBack">
        <template #icon><ArrowLeftOutlined /></template>
      </a-button>
      <h1>{{ t('hotel.orderTracking') }}</h1>
      <a-button v-if="canRefresh" type="text" @click="refreshOrder">
        <template #icon><ReloadOutlined :spin="isRefreshing" /></template>
      </a-button>
      <div v-else style="width: 32px" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-container">
      <ExclamationCircleOutlined />
      <h2>{{ t('hotel.orderNotFound') }}</h2>
      <p>{{ error }}</p>
      <a-button type="primary" @click="goToOrders">
        {{ t('hotel.viewAllOrders') }}
      </a-button>
    </div>

    <!-- Order Content -->
    <div v-else-if="order" class="tracking-content">
      <!-- Order Status Hero -->
      <div :class="['status-hero', getStatusClass(order.status)]">
        <div class="status-icon">
          <component :is="getStatusIcon(order.status)" />
        </div>
        <h2 class="status-title">{{ getStatusTitle(order.status) }}</h2>
        <p class="status-message">{{ getStatusMessage(order.status) }}</p>

        <!-- Estimated Time -->
        <div v-if="showEstimatedTime" class="estimated-time">
          <ClockCircleOutlined />
          <span>{{ t('hotel.estimatedArrival', { time: estimatedArrival }) }}</span>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="progress-section">
        <div class="progress-steps">
          <div
            v-for="(step, index) in progressSteps"
            :key="step.key"
            :class="['progress-step', { active: isStepActive(step.key), completed: isStepCompleted(step.key) }]"
          >
            <div class="step-indicator">
              <CheckOutlined v-if="isStepCompleted(step.key)" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="step-content">
              <span class="step-title">{{ step.title }}</span>
              <span v-if="step.time" class="step-time">{{ step.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Info -->
      <div class="order-info-section">
        <div class="order-number">
          <span class="label">{{ t('hotel.orderNumber') }}</span>
          <span class="value">#{{ order.orderNumber }}</span>
        </div>
        <div class="order-date">
          <span class="label">{{ t('hotel.orderedAt') }}</span>
          <span class="value">{{ formatDateTime(order.createdAt) }}</span>
        </div>
      </div>

      <!-- Delivery Details -->
      <div class="section">
        <h3>
          <EnvironmentOutlined />
          {{ t('hotel.deliveryTo') }}
        </h3>
        <div class="delivery-info">
          <div class="room-badge">
            <HomeOutlined />
            {{ t('hotel.room') }} {{ order.roomNumber }}
          </div>
          <p v-if="order.deliveryInstructions" class="instructions">
            {{ order.deliveryInstructions }}
          </p>
        </div>
      </div>

      <!-- Order Items -->
      <div class="section">
        <h3>
          <ShoppingOutlined />
          {{ t('hotel.orderItems') }}
        </h3>
        <div class="order-items">
          <div
            v-for="(item, index) in order.items"
            :key="index"
            class="order-item"
          >
            <span class="item-qty">{{ item.quantity }}x</span>
            <div class="item-info">
              <span class="item-name">{{ localize(item.name) }}</span>
              <span v-if="item.variant" class="item-variant">
                {{ localize(item.variant.name) }}
              </span>
              <div v-if="item.options?.length" class="item-options">
                <span v-for="opt in item.options" :key="localize(opt.name)">
                  + {{ localize(opt.name) }}
                </span>
              </div>
            </div>
            <span class="item-price">{{ formatPrice(item.subtotal) }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Summary -->
      <div class="section">
        <h3>
          <CreditCardOutlined />
          {{ t('hotel.paymentSummary') }}
        </h3>
        <div class="payment-details">
          <div class="summary-row">
            <span>{{ t('hotel.subtotal') }}</span>
            <span>{{ formatPrice(order.subtotal) }}</span>
          </div>
          <div v-if="order.deliveryFee > 0" class="summary-row">
            <span>{{ t('hotel.deliveryFee') }}</span>
            <span>{{ formatPrice(order.deliveryFee) }}</span>
          </div>
          <div v-if="order.serviceCharge > 0" class="summary-row">
            <span>{{ t('hotel.serviceCharge') }}</span>
            <span>{{ formatPrice(order.serviceCharge) }}</span>
          </div>
          <div v-if="order.tax > 0" class="summary-row">
            <span>{{ t('hotel.tax') }}</span>
            <span>{{ formatPrice(order.tax) }}</span>
          </div>
          <div v-if="order.tip > 0" class="summary-row tip">
            <span>{{ t('hotel.tip') }}</span>
            <span>{{ formatPrice(order.tip) }}</span>
          </div>
          <div class="summary-row total">
            <span>{{ t('hotel.total') }}</span>
            <span>{{ formatPrice(order.total) }}</span>
          </div>
          <div class="payment-method">
            <span>{{ t('hotel.paymentMethod') }}:</span>
            <span>{{ getPaymentMethodLabel(order.paymentMethod) }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-section">
        <!-- Cancel Order (if possible) -->
        <a-button
          v-if="canCancel"
          danger
          block
          @click="showCancelModal = true"
        >
          <template #icon><CloseCircleOutlined /></template>
          {{ t('hotel.cancelOrder') }}
        </a-button>

        <!-- Rate Order (if delivered) -->
        <a-button
          v-if="canRate"
          type="primary"
          block
          @click="showRatingModal = true"
        >
          <template #icon><StarOutlined /></template>
          {{ t('hotel.rateOrder') }}
        </a-button>

        <!-- Reorder -->
        <a-button
          v-if="isCompleted"
          block
          @click="reorder"
        >
          <template #icon><RedoOutlined /></template>
          {{ t('hotel.reorder') }}
        </a-button>

        <!-- Need Help -->
        <a-button type="link" block @click="contactSupport">
          <template #icon><QuestionCircleOutlined /></template>
          {{ t('hotel.needHelp') }}
        </a-button>
      </div>
    </div>

    <!-- Cancel Modal -->
    <a-modal
      v-model:open="showCancelModal"
      :title="t('hotel.cancelOrderTitle')"
      @ok="cancelOrder"
      @cancel="showCancelModal = false"
    >
      <p>{{ t('hotel.cancelOrderMessage') }}</p>
      <a-textarea
        v-model:value="cancelReason"
        :placeholder="t('hotel.cancelReasonPlaceholder')"
        :rows="3"
      />
    </a-modal>

    <!-- Rating Modal -->
    <a-modal
      v-model:open="showRatingModal"
      :title="t('hotel.rateOrderTitle')"
      :footer="null"
    >
      <div class="rating-content">
        <p class="rating-question">{{ t('hotel.ratingQuestion') }}</p>
        <div class="rating-stars">
          <StarFilled
            v-for="star in 5"
            :key="star"
            :class="['star', { active: star <= rating }]"
            @click="rating = star"
          />
        </div>
        <a-textarea
          v-model:value="feedback"
          :placeholder="t('hotel.feedbackPlaceholder')"
          :rows="3"
        />
        <a-button
          type="primary"
          block
          :loading="isSubmittingRating"
          :disabled="rating === 0"
          @click="submitRating"
        >
          {{ t('hotel.submitRating') }}
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.order-tracking {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 32px;
}

.tracking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.tracking-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.error-container .anticon {
  font-size: 64px;
  color: #ff4d4f;
  margin-bottom: 16px;
}

.error-container h2 {
  margin: 0 0 8px;
  color: #1a1a1a;
}

.error-container p {
  margin: 0 0 24px;
  color: #888;
}

.tracking-content {
  padding: 16px;
}

/* Status Hero */
.status-hero {
  background: white;
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  margin-bottom: 16px;
}

.status-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 32px;
}

.status-hero.status-pending .status-icon { background: #fff7e6; color: #fa8c16; }
.status-hero.status-confirmed .status-icon { background: #e6f7ff; color: #1890ff; }
.status-hero.status-preparing .status-icon { background: #f0f5ff; color: #2f54eb; }
.status-hero.status-ready .status-icon { background: #e6fffb; color: #13c2c2; }
.status-hero.status-delivering .status-icon { background: #e6fffb; color: #14b8a6; }
.status-hero.status-delivered .status-icon { background: #f6ffed; color: #52c41a; }
.status-hero.status-cancelled .status-icon { background: #fff2f0; color: #ff4d4f; }
.status-hero.status-rejected .status-icon { background: #fff2f0; color: #ff4d4f; }

.status-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.status-message {
  margin: 0 0 16px;
  color: #666;
}

.estimated-time {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f6ffed;
  border-radius: 20px;
  color: #52c41a;
  font-weight: 500;
}

/* Progress Steps */
.progress-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  opacity: 0.4;
}

.progress-step.active,
.progress-step.completed {
  opacity: 1;
}

.step-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  flex-shrink: 0;
}

.progress-step.active .step-indicator {
  background: #14b8a6;
  color: white;
}

.progress-step.completed .step-indicator {
  background: #52c41a;
  color: white;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-title {
  font-weight: 500;
  color: #1a1a1a;
}

.step-time {
  font-size: 12px;
  color: #888;
}

/* Order Info */
.order-info-section {
  display: flex;
  justify-content: space-between;
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.order-info-section .label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.order-info-section .value {
  font-weight: 600;
  color: #1a1a1a;
}

/* Sections */
.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.delivery-info .room-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #e6f7ff;
  border-radius: 20px;
  color: #1890ff;
  font-weight: 600;
}

.delivery-info .instructions {
  margin: 12px 0 0;
  color: #666;
  font-style: italic;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.item-qty {
  font-weight: 600;
  color: #14b8a6;
  min-width: 30px;
}

.item-info {
  flex: 1;
}

.item-name {
  display: block;
  font-weight: 500;
  color: #1a1a1a;
}

.item-variant {
  display: block;
  font-size: 13px;
  color: #888;
}

.item-options {
  font-size: 12px;
  color: #14b8a6;
}

.item-price {
  font-weight: 600;
  color: #1a1a1a;
}

.payment-details .summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  color: #666;
}

.payment-details .summary-row.tip {
  color: #14b8a6;
}

.payment-details .summary-row.total {
  border-top: 2px solid #e8e8e8;
  padding-top: 12px;
  margin-top: 8px;
  font-weight: 700;
  color: #1a1a1a;
  font-size: 16px;
}

.payment-method {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px dashed #e8e8e8;
  color: #666;
}

/* Actions */
.actions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions-section .ant-btn-primary {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
}

/* Rating Modal */
.rating-content {
  text-align: center;
}

.rating-question {
  margin: 0 0 16px;
  color: #666;
}

.rating-stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.star {
  font-size: 32px;
  color: #e8e8e8;
  cursor: pointer;
  transition: color 0.2s;
}

.star.active {
  color: #faad14;
}

.star:hover {
  color: #faad14;
}

.rating-content .ant-textarea {
  margin-bottom: 16px;
}
</style>
