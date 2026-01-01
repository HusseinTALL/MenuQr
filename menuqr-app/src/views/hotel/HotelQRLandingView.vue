<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Spin as ASpin, Button as AButton } from 'ant-design-vue';
import {
  ExclamationCircleOutlined,
  StarFilled,
  HomeOutlined,
  CheckCircleOutlined,
  ShoppingOutlined,
  UserOutlined,
  HistoryOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons-vue';
import { useHotelGuestStore } from '@/stores/hotelGuestStore';
import { useConfigStore } from '@/stores/configStore';

const route = useRoute();
const router = useRouter();
const hotelGuestStore = useHotelGuestStore();
const configStore = useConfigStore();

// State
const isLoading = ref(true);
const error = ref<string | null>(null);

// Computed
const hotel = computed(() => hotelGuestStore.hotel);
const room = computed(() => hotelGuestStore.room);
const isAuthenticated = computed(() => hotelGuestStore.isAuthenticated);

// Localization helper
function localize(obj: { fr: string; en?: string } | undefined): string {
  if (!obj) {return '';}
  const locale = configStore.locale || 'fr';
  return locale === 'en' && obj.en ? obj.en : obj.fr;
}

// Translation helper (simplified for now)
function t(key: string, params?: Record<string, unknown>): string {
  const translations: Record<string, string> = {
    'hotel.loading': 'Chargement...',
    'hotel.errorTitle': 'Erreur',
    'hotel.retry': 'Réessayer',
    'hotel.room': 'Chambre',
    'hotel.welcomeTitle': 'Bienvenue',
    'hotel.defaultDescription': 'Découvrez notre service en chambre',
    'hotel.roomServiceAvailable': 'Service en chambre disponible',
    'hotel.estimatedDelivery': `Livraison estimée: ${params?.minutes || 30} min`,
    'hotel.orderRoomService': 'Commander le Room Service',
    'hotel.signIn': 'Se connecter',
    'hotel.myOrders': 'Mes commandes',
    'hotel.invalidQR': 'Code QR invalide',
    'hotel.roomNotFound': 'Chambre non trouvée',
  };
  return translations[key] || key;
}

// Load hotel/room data
async function loadData() {
  isLoading.value = true;
  error.value = null;

  try {
    const qrCode = route.params.qrCode as string;
    const hotelSlug = route.params.hotelSlug as string;

    if (qrCode) {
      // Coming from QR code scan
      const success = await hotelGuestStore.initFromQRCode(qrCode);
      if (!success) {
        error.value = t('hotel.invalidQR');
      }
    } else if (hotelSlug) {
      // Coming from hotel slug URL
      const hotelData = await hotelGuestStore.getHotelBySlug(hotelSlug);
      if (!hotelData) {
        error.value = hotelGuestStore.error || t('hotel.roomNotFound');
      }
    } else {
      error.value = t('hotel.invalidQR');
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
}

function retry() {
  loadData();
}

function goToMenu() {
  if (hotel.value) {
    router.push({
      name: 'hotel-menu',
      params: { hotelSlug: hotel.value.slug },
    });
  }
}

function goToAuth() {
  if (hotel.value) {
    router.push({
      name: 'hotel-auth',
      params: { hotelSlug: hotel.value.slug },
    });
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

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="hotel-qr-landing">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <a-spin size="large" />
      <p class="loading-text">{{ t('hotel.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">
        <ExclamationCircleOutlined />
      </div>
      <h2>{{ t('hotel.errorTitle') }}</h2>
      <p class="error-message">{{ error }}</p>
      <a-button type="primary" @click="retry">
        {{ t('hotel.retry') }}
      </a-button>
    </div>

    <!-- Hotel Info (when loaded) -->
    <div v-else-if="hotel" class="hotel-info">
      <!-- Hotel Header -->
      <div class="hotel-header">
        <div
          v-if="hotel.coverImage"
          class="hotel-cover"
          :style="{ backgroundImage: `url(${hotel.coverImage})` }"
        />
        <div class="hotel-details">
          <img
            v-if="hotel.logo"
            :src="hotel.logo"
            :alt="hotel.name"
            class="hotel-logo"
          />
          <div class="hotel-title">
            <h1>{{ hotel.name }}</h1>
            <div v-if="hotel.starRating" class="star-rating">
              <StarFilled v-for="n in hotel.starRating" :key="n" />
            </div>
          </div>
        </div>
      </div>

      <!-- Room Info -->
      <div v-if="room" class="room-info">
        <div class="room-badge">
          <HomeOutlined />
          <span>{{ t('hotel.room') }} {{ room.roomNumber }}</span>
        </div>
        <p v-if="room.displayName" class="room-type">{{ room.displayName }}</p>
      </div>

      <!-- Welcome Message -->
      <div class="welcome-section">
        <h2>{{ t('hotel.welcomeTitle') }}</h2>
        <p>{{ localize(hotel.description) || t('hotel.defaultDescription') }}</p>
      </div>

      <!-- Room Service Status -->
      <div v-if="hotel.settings?.roomService?.enabled" class="service-info">
        <div class="service-badge available">
          <CheckCircleOutlined />
          <span>{{ t('hotel.roomServiceAvailable') }}</span>
        </div>
        <p class="delivery-time">
          {{ t('hotel.estimatedDelivery', { minutes: hotel.settings.roomService.estimatedDeliveryMinutes }) }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <a-button
          type="primary"
          size="large"
          block
          :disabled="!hotel.settings?.roomService?.enabled"
          @click="goToMenu"
        >
          <template #icon><ShoppingOutlined /></template>
          {{ t('hotel.orderRoomService') }}
        </a-button>

        <a-button
          v-if="!isAuthenticated"
          size="large"
          block
          @click="goToAuth"
        >
          <template #icon><UserOutlined /></template>
          {{ t('hotel.signIn') }}
        </a-button>

        <a-button
          v-else
          size="large"
          block
          @click="goToOrders"
        >
          <template #icon><HistoryOutlined /></template>
          {{ t('hotel.myOrders') }}
        </a-button>
      </div>

      <!-- Hotel Contact -->
      <div class="hotel-contact">
        <p v-if="hotel.phone">
          <PhoneOutlined />
          <a :href="`tel:${hotel.phone}`">{{ hotel.phone }}</a>
        </p>
        <p v-if="hotel.email">
          <MailOutlined />
          <a :href="`mailto:${hotel.email}`">{{ hotel.email }}</a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotel-qr-landing {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  text-align: center;
}

.loading-text {
  margin-top: 16px;
  color: #666;
  font-size: 16px;
}

.error-icon {
  font-size: 64px;
  color: #ff4d4f;
  margin-bottom: 16px;
}

.error-message {
  color: #666;
  margin-bottom: 24px;
}

.hotel-info {
  padding-bottom: 32px;
}

.hotel-header {
  position: relative;
}

.hotel-cover {
  height: 200px;
  background-size: cover;
  background-position: center;
}

.hotel-details {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  margin: -40px 16px 0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.hotel-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 8px;
}

.hotel-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.star-rating {
  color: #faad14;
  font-size: 14px;
  margin-top: 4px;
}

.star-rating > * {
  margin-right: 2px;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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

.room-type {
  margin: 0;
  color: #666;
}

.welcome-section {
  padding: 24px 16px;
  text-align: center;
}

.welcome-section h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #1a1a1a;
}

.welcome-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.service-info {
  padding: 16px;
  margin: 0 16px 16px;
  background: white;
  border-radius: 12px;
  text-align: center;
}

.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 500;
}

.service-badge.available {
  background: #f6ffed;
  color: #52c41a;
}

.delivery-time {
  margin: 12px 0 0;
  color: #666;
  font-size: 14px;
}

.action-buttons {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-buttons .ant-btn {
  height: 48px;
  font-size: 16px;
  border-radius: 24px;
}

.action-buttons .ant-btn-primary {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
}

.hotel-contact {
  padding: 24px 16px;
  text-align: center;
}

.hotel-contact p {
  margin: 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;
}

.hotel-contact a {
  color: #1890ff;
  text-decoration: none;
}
</style>
