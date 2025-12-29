<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import { useDeliveryTracking } from '@/composables/useSocket';
import { useGoogleMaps } from '@/composables/useGoogleMaps';
import ChatBox from '@/components/chat/ChatBox.vue';
import {
  CarOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  StarOutlined,
  MessageOutlined,
  WifiOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

interface TrackingData {
  deliveryId: string;
  orderId: string;
  status: string;
  driverInfo?: {
    name: string;
    phone: string;
    photo?: string;
    vehicleType: string;
    rating: number;
  };
  driverLocation?: {
    lat: number;
    lng: number;
  };
  pickupAddress: {
    street: string;
    city: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
  };
  estimatedArrival?: string;
  distanceRemaining?: number;
  restaurant: {
    name: string;
    phone?: string;
  };
  orderItems: Array<{
    name: string;
    quantity: number;
  }>;
  orderTotal: number;
}

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const tracking = ref<TrackingData | null>(null);
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null);
const etaRefreshInterval = ref<ReturnType<typeof setInterval> | null>(null);
const isLiveTracking = ref(false);
const showChat = ref(false);
const unreadMessages = ref(0);

// ETA data from API
const etaData = ref<{
  eta: string;
  durationMinutes: number;
  distanceKm: number;
  trafficCondition: 'light' | 'moderate' | 'heavy' | 'unknown';
  driverLocation?: { lat: number; lng: number };
  route?: { polyline: string };
} | null>(null);

// Map refs
const mapContainer = ref<HTMLElement | null>(null);
const {
  isLoaded: mapLoaded,
  error: mapError,
  hasApiKey,
  setMarker,
  setPolyline,
  fitBounds,
  panTo,
  createDriverIcon,
  createLocationIcon,
} = useGoogleMaps(mapContainer, {
  zoom: 14,
  disableDefaultUI: true,
  zoomControl: true,
});

const orderId = computed(() => route.params.orderId as string);

// Initialize delivery tracking WebSocket (will be set up after we fetch the deliveryId)
let liveTracking: ReturnType<typeof useDeliveryTracking> | null = null;

const statusSteps = [
  { key: 'confirmed', label: 'Confirmée', icon: CheckCircleOutlined },
  { key: 'preparing', label: 'En préparation', icon: ShopOutlined },
  { key: 'ready', label: 'Prête', icon: CheckCircleOutlined },
  { key: 'picked_up', label: 'Récupérée', icon: CarOutlined },
  { key: 'in_transit', label: 'En route', icon: CarOutlined },
  { key: 'delivered', label: 'Livrée', icon: CheckCircleOutlined },
];

const currentStepIndex = computed(() => {
  if (!tracking.value) {
    return 0;
  }
  const status = tracking.value.status;

  // Map delivery status to step index
  const statusMap: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    preparing: 1,
    ready: 2,
    assigned: 2,
    accepted: 2,
    picked_up: 3,
    in_transit: 4,
    arrived: 4,
    delivered: 5,
  };

  return statusMap[status] ?? 0;
});

const estimatedTimeRemaining = computed(() => {
  if (!tracking.value?.estimatedArrival) {
    return null;
  }

  const arrival = new Date(tracking.value.estimatedArrival);
  const now = new Date();
  const diffMs = arrival.getTime() - now.getTime();
  const diffMins = Math.max(0, Math.round(diffMs / 60000));

  if (diffMins === 0) {
    return 'Arrivée imminente';
  }
  if (diffMins < 60) {
    return `${diffMins} min`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h${mins > 0 ? mins : ''}`;
});

const statusMessage = computed(() => {
  if (!tracking.value) {
    return '';
  }

  const messages: Record<string, string> = {
    pending: 'Votre commande a été reçue',
    confirmed: 'Votre commande est confirmée',
    preparing: 'Le restaurant prépare votre commande',
    ready: 'Votre commande est prête, en attente du livreur',
    assigned: 'Un livreur a été assigné à votre commande',
    accepted: 'Le livreur se dirige vers le restaurant',
    picked_up: 'Le livreur a récupéré votre commande',
    in_transit: 'Votre commande est en route',
    arrived: 'Le livreur est arrivé',
    delivered: 'Votre commande a été livrée',
  };

  return messages[tracking.value.status] || 'Suivi en cours';
});

const fetchTracking = async () => {
  if (!orderId.value) {
    return;
  }

  try {
    const response = await api.get<TrackingData>(`/orders/${orderId.value}/tracking`);

    if (response.success && response.data) {
      tracking.value = response.data;

      // Set up live WebSocket tracking if we have a deliveryId
      if (response.data.deliveryId && !liveTracking) {
        liveTracking = useDeliveryTracking(response.data.deliveryId);
        isLiveTracking.value = true;

        // Start ETA polling for active deliveries
        startETAPolling();
      }
    }
  } catch (error) {
    console.error('Failed to fetch tracking:', error);
  } finally {
    loading.value = false;
  }
};

// Fetch real-time ETA from API
const fetchETA = async () => {
  if (!tracking.value?.deliveryId) return;

  // Only fetch ETA for active delivery statuses
  const activeStatuses = ['accepted', 'arriving_restaurant', 'at_restaurant', 'picked_up', 'in_transit', 'arrived'];
  if (!activeStatuses.includes(tracking.value.status)) return;

  try {
    const response = await api.getDeliveryETA(tracking.value.deliveryId);

    if (response.success && response.data) {
      etaData.value = {
        eta: response.data.eta,
        durationMinutes: response.data.durationMinutes,
        distanceKm: response.data.distanceKm,
        trafficCondition: response.data.trafficCondition,
        driverLocation: response.data.driverLocation,
        route: response.data.route,
      };

      // Update tracking data with new ETA
      if (response.data.eta) {
        tracking.value.estimatedArrival = response.data.eta;
      }
      if (response.data.distanceKm) {
        tracking.value.distanceRemaining = response.data.distanceKm;
      }
      if (response.data.driverLocation) {
        tracking.value.driverLocation = response.data.driverLocation;
      }

      // Update map markers and route
      updateMapMarkers();
    }
  } catch (error) {
    console.error('Failed to fetch ETA:', error);
  }
};

// Update map with current positions
const updateMapMarkers = () => {
  if (!mapLoaded.value || !tracking.value) return;

  // Add restaurant marker
  if (tracking.value.pickupAddress) {
    // We need coordinates - for now use a placeholder or fetch from delivery route
  }

  // Add driver marker if we have location
  if (tracking.value.driverLocation) {
    setMarker('driver', {
      position: tracking.value.driverLocation,
      title: tracking.value.driverInfo?.name || 'Livreur',
      icon: createDriverIcon('#1890ff'),
    });

    // Pan to driver location
    panTo(tracking.value.driverLocation);
  }

  // Add route polyline if available
  if (etaData.value?.route?.polyline) {
    setPolyline('route', etaData.value.route.polyline, {
      strokeColor: '#1890ff',
      strokeWeight: 4,
      strokeOpacity: 0.8,
    });
  }
};

// Start polling for ETA updates
const startETAPolling = () => {
  // Initial fetch
  fetchETA();

  // Poll every 15 seconds for active deliveries
  etaRefreshInterval.value = setInterval(() => {
    if (tracking.value && !['delivered', 'cancelled'].includes(tracking.value.status)) {
      fetchETA();
    }
  }, 15000);
};

// Stop ETA polling
const stopETAPolling = () => {
  if (etaRefreshInterval.value) {
    clearInterval(etaRefreshInterval.value);
    etaRefreshInterval.value = null;
  }
};

// Traffic condition label
const trafficLabel = computed(() => {
  if (!etaData.value?.trafficCondition) return null;
  const labels: Record<string, string> = {
    light: 'Trafic fluide',
    moderate: 'Trafic modéré',
    heavy: 'Trafic dense',
    unknown: '',
  };
  return labels[etaData.value.trafficCondition];
});

// Traffic condition color
const trafficColor = computed(() => {
  if (!etaData.value?.trafficCondition) return '#8c8c8c';
  const colors: Record<string, string> = {
    light: '#52c41a',
    moderate: '#faad14',
    heavy: '#ff4d4f',
    unknown: '#8c8c8c',
  };
  return colors[etaData.value.trafficCondition];
});

// Watch for live location updates from WebSocket
watch(
  () => liveTracking?.driverLocation.value,
  (newLocation) => {
    if (newLocation && tracking.value) {
      tracking.value.driverLocation = {
        lat: newLocation.lat,
        lng: newLocation.lng,
      };
    }
  },
  { deep: true }
);

// Watch for live ETA updates from WebSocket
watch(
  () => liveTracking?.eta.value,
  (newEta) => {
    if (newEta && tracking.value) {
      // Update distance remaining
      tracking.value.distanceRemaining = newEta.distanceMeters / 1000;
    }
  },
  { deep: true }
);

// Watch for live status updates from WebSocket
watch(
  () => liveTracking?.deliveryStatus.value,
  (newStatus) => {
    if (newStatus && tracking.value && newStatus !== 'pending') {
      tracking.value.status = newStatus;
    }
  }
);

const callDriver = () => {
  if (tracking.value?.driverInfo?.phone) {
    window.location.href = `tel:${tracking.value.driverInfo.phone}`;
  }
};

const callRestaurant = () => {
  if (tracking.value?.restaurant?.phone) {
    window.location.href = `tel:${tracking.value.restaurant.phone}`;
  }
};

const toggleChat = () => {
  showChat.value = !showChat.value;
};

const handleUnreadChange = (count: number) => {
  unreadMessages.value = count;
};

// Check if chat should be available (delivery assigned and not delivered)
const chatAvailable = computed(() => {
  if (!tracking.value) {
    return false;
  }
  const chatStatuses = ['assigned', 'accepted', 'picked_up', 'in_transit', 'arrived'];
  return chatStatuses.includes(tracking.value.status);
});

const startAutoRefresh = () => {
  // Refresh every 10 seconds for active deliveries
  refreshInterval.value = setInterval(() => {
    if (tracking.value && !['delivered', 'cancelled'].includes(tracking.value.status)) {
      fetchTracking();
    }
  }, 10000);
};

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
};

watch(() => route.params.orderId, () => {
  loading.value = true;
  fetchTracking();
});

onMounted(() => {
  fetchTracking();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
  stopETAPolling();
});
</script>

<template>
  <div class="delivery-tracking">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <a-spin size="large" />
      <p>Chargement du suivi...</p>
    </div>

    <template v-else-if="tracking">
      <!-- Header -->
      <div class="tracking-header">
        <div class="header-top">
          <h1>Suivi de votre commande</h1>
          <span v-if="isLiveTracking" class="live-badge">
            <WifiOutlined />
            Live
          </span>
        </div>
        <p class="order-id">#{{ tracking.orderId?.slice(-6) || tracking.deliveryId.slice(-6) }}</p>
      </div>

      <!-- Status Card -->
      <div class="status-card">
        <div class="status-icon" :class="tracking.status">
          <CarOutlined v-if="['in_transit', 'picked_up', 'arrived'].includes(tracking.status)" />
          <CheckCircleOutlined v-else-if="tracking.status === 'delivered'" />
          <ShopOutlined v-else-if="['preparing', 'ready'].includes(tracking.status)" />
          <ClockCircleOutlined v-else />
        </div>

        <div class="status-content">
          <h2 class="status-message">{{ statusMessage }}</h2>
          <div v-if="estimatedTimeRemaining && tracking.status !== 'delivered'" class="eta">
            <ClockCircleOutlined />
            <span>Arrivée estimée: <strong>{{ estimatedTimeRemaining }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="progress-section">
        <div class="progress-steps">
          <div
            v-for="(step, index) in statusSteps"
            :key="step.key"
            :class="['step', { completed: index < currentStepIndex, current: index === currentStepIndex }]"
          >
            <div class="step-icon">
              <component :is="step.icon" />
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
      </div>

      <!-- Driver Info -->
      <div v-if="tracking.driverInfo" class="driver-card">
        <div class="driver-header">
          <h3>Votre livreur</h3>
          <div v-if="tracking.distanceRemaining" class="distance-badge">
            <EnvironmentOutlined />
            {{ tracking.distanceRemaining.toFixed(1) }} km
          </div>
        </div>

        <div class="driver-info">
          <a-avatar :src="tracking.driverInfo.photo" :size="56">
            {{ tracking.driverInfo.name.charAt(0) }}
          </a-avatar>

          <div class="driver-details">
            <div class="driver-name">{{ tracking.driverInfo.name }}</div>
            <div class="driver-meta">
              <span class="vehicle">
                <CarOutlined /> {{ tracking.driverInfo.vehicleType }}
              </span>
              <span v-if="tracking.driverInfo.rating" class="rating">
                <StarOutlined /> {{ tracking.driverInfo.rating.toFixed(1) }}
              </span>
            </div>
          </div>

          <div class="driver-actions">
            <a-button
              type="default"
              shape="circle"
              size="large"
              class="chat-btn"
              @click="toggleChat"
            >
              <MessageOutlined />
              <span v-if="unreadMessages > 0" class="action-badge">{{ unreadMessages }}</span>
            </a-button>
            <a-button
              type="primary"
              shape="circle"
              size="large"
              @click="callDriver"
            >
              <PhoneOutlined />
            </a-button>
          </div>
        </div>
      </div>

      <!-- Map Section -->
      <div class="map-section">
        <!-- Real Google Map -->
        <div v-if="hasApiKey" class="map-container">
          <div ref="mapContainer" class="google-map"></div>

          <!-- Map overlay with ETA info -->
          <div v-if="etaData" class="map-overlay">
            <div class="eta-card">
              <div class="eta-time">
                <ClockCircleOutlined />
                <span>{{ etaData.durationMinutes }} min</span>
              </div>
              <div class="eta-distance">
                {{ etaData.distanceKm.toFixed(1) }} km
              </div>
              <div v-if="trafficLabel" class="traffic-badge" :style="{ backgroundColor: trafficColor }">
                {{ trafficLabel }}
              </div>
            </div>
          </div>

          <!-- Map loading state -->
          <div v-if="!mapLoaded" class="map-loading">
            <a-spin />
            <span>Chargement de la carte...</span>
          </div>

          <!-- Map error state -->
          <div v-if="mapError" class="map-error">
            <EnvironmentOutlined />
            <span>{{ mapError }}</span>
          </div>
        </div>

        <!-- Fallback when no API key -->
        <div v-else class="map-placeholder">
          <EnvironmentOutlined />
          <p>Carte de suivi en temps réel</p>
          <span v-if="tracking?.driverLocation" class="map-hint">
            Position: {{ tracking.driverLocation.lat.toFixed(4) }}, {{ tracking.driverLocation.lng.toFixed(4) }}
          </span>
          <span v-else class="map-hint">La position du livreur sera affichée ici</span>

          <!-- Show ETA info even without map -->
          <div v-if="etaData" class="eta-fallback">
            <div class="eta-info">
              <ClockCircleOutlined />
              <span><strong>{{ etaData.durationMinutes }} min</strong> ({{ etaData.distanceKm.toFixed(1) }} km)</span>
            </div>
            <div v-if="trafficLabel" class="traffic-info" :style="{ color: trafficColor }">
              {{ trafficLabel }}
            </div>
          </div>
        </div>

        <!-- Refresh ETA button -->
        <a-button
          v-if="tracking && !['delivered', 'cancelled'].includes(tracking.status)"
          type="text"
          size="small"
          class="refresh-eta-btn"
          @click="fetchETA"
        >
          <ReloadOutlined /> Actualiser
        </a-button>
      </div>

      <!-- Addresses -->
      <div class="addresses-section">
        <div class="address-card pickup">
          <div class="address-icon">
            <ShopOutlined />
          </div>
          <div class="address-content">
            <div class="address-label">Restaurant</div>
            <div class="address-name">{{ tracking.restaurant.name }}</div>
            <div class="address-text">{{ tracking.pickupAddress.street }}</div>
            <a-button
              v-if="tracking.restaurant.phone"
              type="link"
              size="small"
              @click="callRestaurant"
            >
              <PhoneOutlined /> Appeler
            </a-button>
          </div>
        </div>

        <div class="address-divider">
          <div class="divider-line"></div>
          <CarOutlined />
          <div class="divider-line"></div>
        </div>

        <div class="address-card delivery">
          <div class="address-icon">
            <EnvironmentOutlined />
          </div>
          <div class="address-content">
            <div class="address-label">Livraison</div>
            <div class="address-text">{{ tracking.deliveryAddress.street }}</div>
            <div class="address-city">{{ tracking.deliveryAddress.city }}</div>
          </div>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="order-summary">
        <h3>Récapitulatif</h3>
        <div class="order-items">
          <div v-for="item in tracking.orderItems" :key="item.name" class="order-item">
            <span class="item-quantity">{{ item.quantity }}x</span>
            <span class="item-name">{{ item.name }}</span>
          </div>
        </div>
        <div class="order-total">
          <span>Total</span>
          <strong>{{ tracking.orderTotal.toFixed(2) }}€</strong>
        </div>
      </div>

      <!-- Help Section -->
      <div class="help-section">
        <h4>Besoin d'aide?</h4>
        <div class="help-buttons">
          <a-button block>
            <MessageOutlined /> Contacter le support
          </a-button>
        </div>
      </div>

      <!-- Chat FAB Button (when driver not shown) -->
      <div
        v-if="chatAvailable && !tracking.driverInfo"
        class="chat-fab"
        @click="toggleChat"
      >
        <MessageOutlined />
        <span v-if="unreadMessages > 0" class="fab-badge">{{ unreadMessages }}</span>
      </div>

      <!-- Chat Drawer -->
      <a-drawer
        v-model:open="showChat"
        title=""
        placement="bottom"
        :height="520"
        :body-style="{ padding: 0 }"
        :header-style="{ display: 'none' }"
        class="chat-drawer"
      >
        <ChatBox
          v-if="tracking"
          :delivery-id="tracking.deliveryId"
          :order-id="tracking.orderId"
          user-type="customer"
          :is-open="showChat"
          @close="showChat = false"
          @unread-change="handleUnreadChange"
        />
      </a-drawer>
    </template>

    <!-- Not Found -->
    <div v-else class="not-found">
      <CarOutlined style="font-size: 48px; color: #ccc" />
      <h3>Commande introuvable</h3>
      <p>Nous n'avons pas trouvé cette commande</p>
      <a-button type="primary" @click="router.push('/orders')">
        Voir mes commandes
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.delivery-tracking {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: #8c8c8c;
}

.tracking-header {
  text-align: center;
  margin-bottom: 24px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tracking-header h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 12px;
  text-transform: uppercase;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.order-id {
  color: #8c8c8c;
  font-family: monospace;
  margin: 0;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border-radius: 16px;
  margin-bottom: 24px;
}

.status-card.in_transit,
.status-card.picked_up {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
}

.status-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #52c41a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.status-icon.in_transit,
.status-icon.picked_up,
.status-icon.arrived {
  background: #1890ff;
}

.status-icon.preparing,
.status-icon.ready {
  background: #faad14;
}

.status-message {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.eta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #595959;
  font-size: 14px;
}

.progress-section {
  margin-bottom: 24px;
  padding: 0 8px;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.progress-steps::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 24px;
  right: 24px;
  height: 2px;
  background: #e8e8e8;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.step-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f0;
  color: #bfbfbf;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.3s ease;
}

.step.completed .step-icon {
  background: #52c41a;
  color: #fff;
}

.step.current .step-icon {
  background: #1890ff;
  color: #fff;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.step-label {
  font-size: 11px;
  color: #8c8c8c;
  text-align: center;
  max-width: 60px;
}

.step.completed .step-label,
.step.current .step-label {
  color: #262626;
  font-weight: 500;
}

.driver-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.driver-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.driver-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.distance-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.driver-details {
  flex: 1;
}

.driver-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.driver-meta {
  display: flex;
  gap: 12px;
  color: #8c8c8c;
  font-size: 13px;
}

.driver-meta .rating {
  color: #faad14;
}

.map-section {
  margin-bottom: 24px;
  position: relative;
}

.map-container {
  position: relative;
  height: 250px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.google-map {
  width: 100%;
  height: 100%;
}

.map-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  pointer-events: none;
}

.eta-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
}

.eta-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

.eta-distance {
  font-size: 14px;
  color: #595959;
}

.traffic-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
}

.map-loading,
.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #8c8c8c;
}

.map-error {
  color: #ff4d4f;
}

.map-placeholder {
  height: 200px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  gap: 8px;
}

.map-placeholder .anticon {
  font-size: 32px;
}

.map-hint {
  font-size: 12px;
}

.eta-fallback {
  margin-top: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  text-align: center;
}

.eta-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #1890ff;
  font-size: 14px;
}

.traffic-info {
  font-size: 12px;
  margin-top: 4px;
}

.refresh-eta-btn {
  position: absolute;
  bottom: -32px;
  right: 0;
  color: #8c8c8c;
  font-size: 12px;
}

.refresh-eta-btn:hover {
  color: #1890ff;
}

.addresses-section {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.address-card {
  display: flex;
  gap: 12px;
}

.address-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.address-card.pickup .address-icon {
  background: #fff7e6;
  color: #fa8c16;
}

.address-card.delivery .address-icon {
  background: #f6ffed;
  color: #52c41a;
}

.address-label {
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.address-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.address-text {
  color: #595959;
  font-size: 14px;
}

.address-city {
  color: #8c8c8c;
  font-size: 13px;
}

.address-divider {
  display: flex;
  align-items: center;
  padding: 12px 0 12px 20px;
  color: #d9d9d9;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #f0f0f0;
}

.order-summary {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.order-summary h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.order-items {
  margin-bottom: 16px;
}

.order-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.order-item:last-child {
  border-bottom: none;
}

.item-quantity {
  color: #8c8c8c;
  font-size: 13px;
  min-width: 24px;
}

.item-name {
  flex: 1;
}

.order-total {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 16px;
}

.order-total strong {
  color: #1890ff;
}

.help-section {
  text-align: center;
  padding: 20px;
}

.help-section h4 {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0 0 12px 0;
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 12px;
  text-align: center;
}

.not-found h3 {
  margin: 0;
}

.not-found p {
  color: #8c8c8c;
  margin: 0 0 16px 0;
}

/* Driver actions with chat */
.driver-actions {
  display: flex;
  gap: 8px;
}

.chat-btn {
  position: relative;
}

.action-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Chat FAB Button */
.chat-fab {
  position: fixed;
  bottom: 100px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(24, 144, 255, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 100;
}

.chat-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(24, 144, 255, 0.5);
}

.chat-fab:active {
  transform: scale(0.95);
}

.fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ff4d4f;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-badge 2s infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* Chat Drawer */
.chat-drawer :deep(.ant-drawer-body) {
  padding: 0 !important;
}
</style>
