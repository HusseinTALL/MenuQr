<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCart } from '@/composables/useCart';
import { useMenu } from '@/composables/useMenu';
import { useWhatsApp } from '@/composables/useWhatsApp';
import { useOffline } from '@/composables/useOffline';
import { useLocale } from '@/composables/useI18n';
import { useGeolocation } from '@/composables/useGeolocation';
import { useCurrency } from '@/composables/useCurrency';
import { useCustomerAuthStore } from '@/stores/customerAuth';
import { useCartStore } from '@/stores/cartStore';
import AppHeader from '@/components/common/AppHeader.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseAlert from '@/components/common/BaseAlert.vue';
import CustomerAuthModal from '@/components/customer/CustomerAuthModal.vue';
import OrderTypeSelector from '@/components/checkout/OrderTypeSelector.vue';
import FulfillmentTypeSelector from '@/components/checkout/FulfillmentTypeSelector.vue';
import DeliveryAddressForm from '@/components/checkout/DeliveryAddressForm.vue';
import SchedulingSelector from '@/components/checkout/SchedulingSelector.vue';
import { FULFILLMENT_TYPE_LABELS } from '@/types/scheduledOrder';

const router = useRouter();
const cartStore = useCartStore();
const { items, subtotal, tableNumber, orderNotes, clearCart } = useCart();
const { restaurant } = useMenu();
const {
  formatOrderMessage,
  sendOrder,
  copyOrderToClipboard,
  estimatedTime,
  displayPhoneNumber,
  isSending,
  customerLocation,
  setCustomerLocation,
} = useWhatsApp();
const { isOffline } = useOffline();
const { t, localize } = useLocale();
const { formatPrice } = useCurrency();
const {
  getCurrentPosition,
  isSupported: isGeolocationSupported,
  permissionState,
  checkPermission,
} = useGeolocation();

// Customer auth
const customerAuthStore = useCustomerAuthStore();
const showAuthModal = ref(false);

const canSendOrder = computed(() => !isOffline.value && cartStore.isSchedulingComplete);

// Scheduling computed properties
const isScheduled = computed(() => cartStore.isScheduled);
const isDelivery = computed(() => cartStore.isDelivery);
const schedulingComplete = computed(() => cartStore.isSchedulingComplete);
const formattedScheduledDateTime = computed(() => cartStore.formattedScheduledDateTime);

// Check if scheduled orders are enabled for this restaurant
const scheduledOrdersEnabled = computed(() => {
  // For now, always enabled. Later can be fetched from restaurant settings
  return true;
});

const orderSent = ref(false);
const showPreview = ref(false);
const orderNumber = ref<string | null>(null);
const copySuccess = ref(false);
const sendError = ref<string | null>(null);

// Initialize customer auth for this restaurant
onMounted(async () => {
  if (isGeolocationSupported) {
    await checkPermission();
  }
  // Initialize customer auth for this restaurant
  if (restaurant.value?.id) {
    customerAuthStore.initForRestaurant(restaurant.value.id);
  }
});

const handleOpenAuthModal = () => {
  showAuthModal.value = true;
};

const handleAuthSuccess = () => {
  showAuthModal.value = false;
};

const handleLogout = async () => {
  await customerAuthStore.logout();
};

const isGettingLocation = ref(false);

const handleSendOrder = async () => {
  sendError.value = null;

  // Try to get location first
  let location = null;
  if (isGeolocationSupported) {
    isGettingLocation.value = true;
    // Increased timeout - iOS needs more time for permission prompt + GPS acquisition
    location = await getCurrentPosition({ timeout: 20000 });
    isGettingLocation.value = false;
    if (location) {
      setCustomerLocation(location);
    }
  }

  // Send order with or without location
  const result = await sendOrder(location);

  if (result.success) {
    orderNumber.value = result.orderNumber;
    orderSent.value = true;
    clearCart();

    // Show copy message if popup was blocked
    if (result.method === 'copied') {
      sendError.value = 'popup_blocked';
    }
  } else {
    sendError.value = result.error;
  }
};

const handleCopyOrder = async () => {
  const success = await copyOrderToClipboard();
  if (success) {
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  }
};

const goToMenu = () => {
  router.push('/menu');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-32">
    <AppHeader :show-back="!orderSent" :title="t('order.title')" show-lang />

    <div class="container max-w-2xl mx-auto px-4 py-6">
      <!-- Success State -->
      <div v-if="orderSent" class="text-center py-16">
        <div class="relative inline-block mb-10">
          <div
            class="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center shadow-inner"
          >
            <svg
              class="w-16 h-16 text-green-600"
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
          <div class="absolute inset-0 rounded-full ring-8 ring-green-100/50 animate-pulse"></div>
        </div>

        <h2 class="text-3xl font-bold text-gray-900 mb-4">{{ t('order.thankYou') }}</h2>
        <p class="text-lg text-gray-600 max-w-md mx-auto leading-relaxed mb-8">
          {{ t('order.orderSentMessage') }}
        </p>

        <!-- Order Number -->
        <div
          v-if="orderNumber"
          class="inline-flex items-center gap-3 bg-gray-100 rounded-2xl px-6 py-3 mb-10"
        >
          <span class="text-sm text-gray-600">{{ t('order.orderNumber') }}:</span>
          <span class="text-xl font-mono font-bold text-gray-900">{{ orderNumber }}</span>
        </div>

        <!-- Popup Blocked Warning -->
        <div
          v-if="sendError === 'popup_blocked'"
          class="max-w-md mx-auto mb-10 p-5 bg-amber-50 border border-amber-200 rounded-2xl"
        >
          <div class="flex items-start gap-4">
            <svg
              class="w-8 h-8 text-amber-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div class="text-left">
              <p class="font-semibold text-amber-900">{{ t('order.popupBlocked') }}</p>
              <p class="text-sm text-amber-800 mt-1">{{ t('order.orderCopied') }}</p>
              <a
                :href="`https://wa.me/${displayPhoneNumber.replace(/\s/g, '')}`"
                target="_blank"
                class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-md"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  />
                </svg>
                {{ t('order.openWhatsApp') }}
              </a>
            </div>
          </div>
        </div>

        <BaseButton
          variant="primary"
          size="lg"
          class="px-10 py-5 text-lg font-semibold shadow-xl hover:shadow-2xl active:scale-95 transition-all"
          @click="goToMenu"
        >
          {{ t('order.newOrder') }}
        </BaseButton>
      </div>

      <!-- Order Summary (Pre-send) -->
      <div v-else class="space-y-6">
        <!-- Offline Warning -->
        <BaseAlert v-if="isOffline" variant="warning" class="mb-4">
          <template #icon>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
              />
            </svg>
          </template>
          <div>
            <p class="font-semibold">
              {{ t('app.offline') }}
            </p>
            <p class="text-sm mt-1">
              {{
                t('order.offlineMessage') ||
                'Vous devez être connecté à Internet pour envoyer votre commande via WhatsApp.'
              }}
            </p>
          </div>
        </BaseAlert>

        <!-- Error Alert -->
        <div
          v-if="sendError && sendError !== 'popup_blocked'"
          class="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4"
        >
          <svg
            class="w-8 h-8 text-red-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p class="font-semibold text-red-900">{{ t('order.sendError') }}</p>
            <p class="text-sm text-red-800 mt-1">{{ t('order.tryAgain') }}</p>
          </div>
        </div>

        <!-- Restaurant Card -->
        <div v-if="restaurant" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6">
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center shadow-sm"
            >
              <svg
                class="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900">{{ restaurant.name }}</h3>
              <p class="text-base text-gray-600">{{ restaurant.address }}, {{ restaurant.city }}</p>
            </div>
          </div>
        </div>

        <!-- Order Type Selection (Immediate vs Scheduled) -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6">
          <OrderTypeSelector
            :model-value="cartStore.orderType"
            :scheduled-orders-enabled="scheduledOrdersEnabled"
            @update:model-value="cartStore.setOrderType"
          />
        </div>

        <!-- Fulfillment Type Selection (Pickup vs Delivery) - Only for scheduled orders -->
        <div
          v-if="isScheduled"
          class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6"
        >
          <FulfillmentTypeSelector
            :model-value="cartStore.fulfillmentType"
            :pickup-enabled="true"
            :delivery-enabled="true"
            @update:model-value="cartStore.setFulfillmentType"
          />
        </div>

        <!-- Delivery Address Form - Only for delivery orders -->
        <div
          v-if="isScheduled && isDelivery"
          class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6"
        >
          <DeliveryAddressForm
            :model-value="cartStore.deliveryAddress"
            @update:model-value="cartStore.setDeliveryAddress"
          />
        </div>

        <!-- Date & Time Selection - Only for scheduled orders -->
        <div
          v-if="isScheduled && restaurant?.id"
          class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6"
        >
          <SchedulingSelector
            :restaurant-id="restaurant.id"
            :fulfillment-type="cartStore.fulfillmentType"
            :selected-date="cartStore.scheduledDate"
            :selected-time="cartStore.scheduledTime"
            @update:selected-date="cartStore.setScheduledDate"
            @update:selected-time="cartStore.setScheduledTime"
          />
        </div>

        <!-- Scheduling Summary Card - Only when scheduling is complete -->
        <div
          v-if="isScheduled && schedulingComplete"
          class="bg-teal-50 rounded-2xl shadow-sm ring-1 ring-teal-200/60 p-5"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-2xl">
              {{ cartStore.fulfillmentType === 'delivery' ? '🚗' : '🛒' }}
            </div>
            <div class="flex-1">
              <p class="font-semibold text-teal-900">
                {{ FULFILLMENT_TYPE_LABELS[cartStore.fulfillmentType] }}
              </p>
              <p class="text-sm text-teal-700">{{ formattedScheduledDateTime }}</p>
              <p v-if="isDelivery && cartStore.deliveryAddress" class="text-xs text-teal-600 mt-1">
                {{ cartStore.deliveryAddress.street }}, {{ cartStore.deliveryAddress.city }}
              </p>
            </div>
            <svg class="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- Incomplete Scheduling Warning -->
        <div
          v-if="isScheduled && !schedulingComplete"
          class="bg-amber-50 rounded-2xl shadow-sm ring-1 ring-amber-200/60 p-5"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-semibold text-amber-900">Planification incomplète</p>
              <p class="text-sm text-amber-700">
                <template v-if="!cartStore.scheduledDate || !cartStore.scheduledTime">
                  Veuillez sélectionner une date et une heure
                </template>
                <template v-else-if="isDelivery && !cartStore.deliveryAddress">
                  Veuillez renseigner votre adresse de livraison
                </template>
              </p>
            </div>
          </div>
        </div>

        <!-- Table & Time Grid - Only for immediate dine-in orders -->
        <div v-if="!isScheduled" class="grid grid-cols-2 gap-4">
          <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg
                  class="w-7 h-7 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-600">{{ t('order.table') }}</p>
                <p class="text-xl font-bold text-gray-900">
                  {{ tableNumber ? `#${tableNumber}` : t('order.noTable') }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <svg
                  class="w-7 h-7 text-orange-600"
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
              <div>
                <p class="text-sm text-gray-600">{{ t('order.estimatedTime') }}</p>
                <p class="text-xl font-bold text-gray-900">~{{ estimatedTime }} min</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Customer Account Card -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-5">
          <!-- Logged in state -->
          <div v-if="customerAuthStore.isAuthenticated" class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-600">Connecté en tant que</p>
              <p class="font-semibold text-gray-900">{{ customerAuthStore.customerName }}</p>
            </div>
            <button
              class="text-sm text-gray-500 hover:text-red-600 transition-colors"
              @click="handleLogout"
            >
              Déconnexion
            </button>
          </div>

          <!-- Not logged in state -->
          <div v-else>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">Créer un compte ?</p>
                <p class="text-sm text-gray-500">Profitez de l'historique et des favoris</p>
              </div>
            </div>
            <div class="mt-4 flex gap-3">
              <button
                class="flex-1 py-2.5 px-4 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                @click="handleOpenAuthModal"
              >
                Se connecter
              </button>
              <button
                class="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                @click="() => {}"
              >
                Continuer invité
              </button>
            </div>
          </div>
        </div>

        <!-- Location Info Card - Hide for delivery orders since they have address form -->
        <div
          v-if="isGeolocationSupported && !isDelivery"
          class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-5"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center"
              :class="{
                'bg-green-100': customerLocation,
                'bg-gray-100': !customerLocation && permissionState !== 'denied',
                'bg-red-100': permissionState === 'denied',
              }"
            >
              <svg
                class="w-7 h-7"
                :class="{
                  'text-green-600': customerLocation,
                  'text-gray-500': !customerLocation && permissionState !== 'denied',
                  'text-red-500': permissionState === 'denied',
                }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-600">{{ t('order.location') || 'Ma position' }}</p>
              <p v-if="customerLocation" class="text-sm font-medium text-green-600">
                {{ t('order.locationIncluded') || 'Sera incluse dans la commande' }}
              </p>
              <p v-else-if="permissionState === 'denied'" class="text-sm text-red-600">
                {{ t('order.locationDenied') || 'Accès refusé' }}
              </p>
              <p v-else class="text-sm text-gray-500">
                {{ t('order.locationWillBeRequested') || "Sera demandée lors de l'envoi" }}
              </p>
            </div>
            <div v-if="customerLocation" class="flex-shrink-0">
              <svg
                class="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>

        <!-- Order Items Card -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
            <svg
              class="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            {{ t('order.orderSummary') }}
          </h3>

          <div class="space-y-5">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex gap-4 pb-5 border-b border-gray-100 last:border-0 last:pb-0"
            >
              <div
                class="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm"
              >
                {{ item.quantity }}×
              </div>
              <div class="flex-1">
                <p class="font-semibold text-gray-900">{{ localize(item.dish.name) }}</p>
                <div
                  v-if="item.selectedOptions && item.selectedOptions.length > 0"
                  class="mt-2 space-y-1"
                >
                  <p
                    v-for="option in item.selectedOptions"
                    :key="option.optionId"
                    class="text-sm text-gray-600"
                  >
                    {{ option.optionName }}:
                    {{ option.choices.map((c) => localize(c.name)).join(', ') }}
                  </p>
                </div>
                <p v-if="item.notes" class="mt-2 text-sm italic text-gray-500">{{ item.notes }}</p>
              </div>
              <p class="font-bold text-gray-900 self-center">{{ formatPrice(item.totalPrice) }}</p>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-gray-200">
            <div class="flex justify-between items-center">
              <span class="text-xl font-bold text-gray-900">{{ t('cart.total') }}</span>
              <span class="text-2xl font-bold text-primary-600">{{ formatPrice(subtotal) }}</span>
            </div>
          </div>
        </div>

        <!-- Order Notes Card -->
        <div v-if="orderNotes" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6">
          <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-3">
            <svg
              class="w-6 h-6 text-gray-500"
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
          </h4>
          <p class="text-base text-gray-700 leading-relaxed">{{ orderNotes }}</p>
        </div>

        <!-- WhatsApp Message Preview -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 overflow-hidden">
          <button
            class="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            @click="showPreview = !showPreview"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <svg class="w-7 h-7 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  />
                </svg>
              </div>
              <div class="text-left">
                <p class="font-semibold text-gray-900">{{ t('order.previewMessage') }}</p>
                <p class="text-sm text-gray-600">
                  {{ t('order.messagePreviewHint') || 'Voir le message qui sera envoyé' }}
                </p>
              </div>
            </div>
            <svg
              class="w-6 h-6 text-gray-400 transition-transform duration-300"
              :class="{ 'rotate-180': showPreview }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <Transition
            enter-active-class="transition ease-out duration-300"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-96 opacity-100"
            leave-active-class="transition ease-in duration-200"
            leave-from-class="max-h-96 opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div v-if="showPreview" class="border-t border-gray-100">
              <pre
                class="p-6 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap break-words max-h-80 overflow-y-auto"
                >{{ formatOrderMessage }}</pre
              >
              <div class="p-4 border-t border-gray-100">
                <button
                  class="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-semibold transition-all"
                  :class="
                    copySuccess
                      ? 'bg-green-100 text-green-700'
                      : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  "
                  @click="handleCopyOrder"
                >
                  <svg
                    v-if="copySuccess"
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {{ copySuccess ? t('order.copied') : t('order.copyOrder') }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Send via WhatsApp Button -->
    <div
      v-if="!orderSent"
      class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 px-4 py-5 shadow-2xl"
    >
      <div class="container max-w-2xl mx-auto">
        <BaseButton
          variant="primary"
          size="lg"
          full-width
          :loading="isSending || isGettingLocation"
          :disabled="!canSendOrder"
          class="py-5 text-xl font-bold bg-green-600 hover:bg-green-700 shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          @click="handleSendOrder"
        >
          <template v-if="isGettingLocation">
            <svg class="w-7 h-7 mr-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ t('order.gettingLocation') || 'Obtention de la position...' }}
          </template>
          <template v-else>
            <svg class="w-7 h-7 mr-3" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            {{ t('order.orderWhatsApp') }}
          </template>
        </BaseButton>
      </div>
    </div>

    <!-- Customer Auth Modal -->
    <CustomerAuthModal
      v-if="restaurant?.id"
      :show="showAuthModal"
      :restaurant-id="restaurant.id"
      :restaurant-name="restaurant.name"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
    />
  </div>
</template>
