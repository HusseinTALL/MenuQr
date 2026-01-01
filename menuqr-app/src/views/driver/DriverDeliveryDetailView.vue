<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import api from '@/services/api';
import { useSocket } from '@/composables/useSocket';
import ChatBox from '@/components/chat/ChatBox.vue';
import {
  LeftOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MessageOutlined,
  ShopOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  CarOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

interface DeliveryDetail {
  _id: string;
  orderId: string;
  orderNumber?: string;
  status: string;
  pickupAddress: {
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lng?: number;
  };
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lng?: number;
    instructions?: string;
  };
  restaurant: {
    _id: string;
    name: string;
    phone?: string;
    address: string;
  };
  customer: {
    _id: string;
    name: string;
    phone?: string;
  };
  order: {
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    total: number;
    paymentStatus: string;
    specialInstructions?: string;
  };
  estimatedDistance: number;
  estimatedDuration: number;
  actualDistance?: number;
  actualDuration?: number;
  earnings: {
    baseFee: number;
    distanceBonus: number;
    tip: number;
    total: number;
  };
  pod?: {
    type: string;
    photoUrl?: string;
    otpVerified?: boolean;
    customerConfirmedAt?: string;
  };
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

const route = useRoute();
const router = useRouter();
const deliveryId = computed(() => route.params.id as string);

const loading = ref(true);
const delivery = ref<DeliveryDetail | null>(null);
const updating = ref(false);

// POD State
const showPODModal = ref(false);
const podType = ref<'photo' | 'otp' | 'signature'>('photo');
const podPhoto = ref<File | null>(null);
const podPhotoPreview = ref<string | null>(null);
const otpCode = ref('');
const verifyingOTP = ref(false);

// Chat
const showChat = ref(false);
const unreadMessages = ref(0);

// Socket for real-time updates
const { socket: getSocket, isConnected: _isConnected } = useSocket();

const statusSteps = [
  { key: 'assigned', label: 'Assignee', icon: ClockCircleOutlined },
  { key: 'accepted', label: 'Acceptee', icon: CheckCircleOutlined },
  { key: 'arriving_restaurant', label: 'En route resto', icon: CarOutlined },
  { key: 'at_restaurant', label: 'Au restaurant', icon: ShopOutlined },
  { key: 'picked_up', label: 'Recuperee', icon: CheckCircleOutlined },
  { key: 'in_transit', label: 'En livraison', icon: CarOutlined },
  { key: 'arrived', label: 'Arrive', icon: EnvironmentOutlined },
  { key: 'delivered', label: 'Livree', icon: CheckCircleOutlined },
];

const currentStepIndex = computed(() => {
  if (!delivery.value) {return -1;}
  return statusSteps.findIndex(s => s.key === delivery.value!.status);
});

const nextStatus = computed(() => {
  const index = currentStepIndex.value;
  if (index < statusSteps.length - 1) {
    return statusSteps[index + 1];
  }
  return null;
});

const _canComplete = computed(() => {
  return delivery.value?.status === 'arrived';
});

const fetchDelivery = async () => {
  loading.value = true;
  try {
    const response = await api.getDriverDeliveryDetail(deliveryId.value);
    if (response.success && response.data) {
      delivery.value = response.data as DeliveryDetail;
    } else {
      message.error('Livraison non trouvee');
      router.push('/driver/deliveries');
    }
  } catch (error) {
    console.error('Failed to fetch delivery:', error);
    message.error('Erreur lors du chargement');
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (newStatus: string) => {
  if (!delivery.value || updating.value) {return;}

  updating.value = true;
  try {
    const response = await api.updateDeliveryStatus(delivery.value._id, newStatus);
    if (response.success) {
      delivery.value.status = newStatus;
      message.success('Statut mis a jour');

      // If arrived, show POD modal
      if (newStatus === 'arrived') {
        showPODModal.value = true;
      }
    } else {
      message.error(response.message || 'Erreur');
    }
  } catch (error) {
    console.error('Failed to update status:', error);
    message.error('Erreur lors de la mise a jour');
  } finally {
    updating.value = false;
  }
};

// POD Functions
const handlePhotoCapture = (file: File) => {
  podPhoto.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    podPhotoPreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
  return false;
};

const submitPhotoPOD = async () => {
  if (!podPhoto.value || !delivery.value) {return;}

  updating.value = true;
  try {
    const formData = new FormData();
    formData.append('photo', podPhoto.value);
    formData.append('type', 'photo');

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || '/api/v1'}/driver/deliveries/${delivery.value._id}/complete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('driver_token')}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (data.success) {
      message.success('Livraison terminee avec succes !');
      showPODModal.value = false;
      router.push('/driver');
    } else {
      message.error(data.message || 'Erreur lors de la confirmation');
    }
  } catch (error) {
    console.error('Failed to submit POD:', error);
    message.error('Erreur lors de l\'envoi');
  } finally {
    updating.value = false;
  }
};

const verifyOTP = async () => {
  if (!otpCode.value || otpCode.value.length !== 4 || !delivery.value) {return;}

  verifyingOTP.value = true;
  try {
    const response = await api.verifyDeliveryOTP(delivery.value._id, otpCode.value);

    if (response.success) {
      message.success('Code verifie ! Livraison terminee.');
      showPODModal.value = false;
      router.push('/driver');
    } else {
      message.error(response.message || 'Code invalide');
    }
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    message.error('Erreur lors de la verification');
  } finally {
    verifyingOTP.value = false;
  }
};

const confirmWithoutPOD = async () => {
  if (!delivery.value) {return;}

  updating.value = true;
  try {
    const response = await api.completeDeliverySimple(delivery.value._id, 'customer_confirm');

    if (response.success) {
      message.success('Livraison terminee !');
      showPODModal.value = false;
      router.push('/driver');
    } else {
      message.error(response.message || 'Erreur');
    }
  } catch (error) {
    console.error('Failed to complete:', error);
    message.error('Erreur');
  } finally {
    updating.value = false;
  }
};

// Navigation
const openNavigation = (type: 'pickup' | 'delivery') => {
  if (!delivery.value) {return;}

  const address = type === 'pickup' ? delivery.value.pickupAddress : delivery.value.deliveryAddress;
  const query = encodeURIComponent(`${address.street}, ${address.postalCode} ${address.city}`);

  // Open in Google Maps or Apple Maps based on device
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${query}`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  }
};

const callPhone = (phone: string | undefined) => {
  if (phone) {
    window.location.href = `tel:${phone}`;
  }
};

const goBack = () => {
  router.back();
};

const handleUnreadChange = (count: number) => {
  unreadMessages.value = count;
};

// Socket listeners
onMounted(() => {
  fetchDelivery();

  const socket = getSocket();
  if (socket) {
    socket.on('delivery:updated', (data: { deliveryId: string; status: string }) => {
      if (data.deliveryId === deliveryId.value && delivery.value) {
        delivery.value.status = data.status;
      }
    });
  }
});

onUnmounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.off('delivery:updated');
  }
});
</script>

<template>
  <div class="delivery-detail-page">
    <!-- Header -->
    <div class="page-header">
      <a-button type="text" class="back-btn" @click="goBack">
        <LeftOutlined />
      </a-button>
      <h1>Livraison #{{ delivery?.orderNumber || deliveryId.slice(-6).toUpperCase() }}</h1>
      <a-button type="text" @click="fetchDelivery">
        <ReloadOutlined />
      </a-button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>

    <template v-else-if="delivery">
      <!-- Status Progress -->
      <div class="status-section">
        <div class="status-progress">
          <div
            v-for="(step, index) in statusSteps"
            :key="step.key"
            class="status-step"
            :class="{
              completed: index < currentStepIndex,
              current: index === currentStepIndex,
            }"
          >
            <div class="step-dot">
              <component :is="step.icon" v-if="index <= currentStepIndex" />
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div v-if="nextStatus && delivery.status !== 'delivered'" class="action-section">
        <a-button
          type="primary"
          size="large"
          block
          :loading="updating"
          @click="updateStatus(nextStatus.key)"
        >
          <template v-if="delivery.status === 'assigned'">
            Accepter la livraison
          </template>
          <template v-else-if="delivery.status === 'accepted'">
            En route vers le restaurant
          </template>
          <template v-else-if="delivery.status === 'arriving_restaurant'">
            Je suis au restaurant
          </template>
          <template v-else-if="delivery.status === 'at_restaurant'">
            J'ai recupere la commande
          </template>
          <template v-else-if="delivery.status === 'picked_up'">
            En route vers le client
          </template>
          <template v-else-if="delivery.status === 'in_transit'">
            Je suis arrive
          </template>
          <template v-else-if="delivery.status === 'arrived'">
            Confirmer la livraison
          </template>
        </a-button>
      </div>

      <!-- Addresses -->
      <div class="addresses-section">
        <!-- Pickup Address -->
        <div class="address-card">
          <div class="address-header">
            <div class="address-icon pickup">
              <ShopOutlined />
            </div>
            <div class="address-info">
              <span class="address-label">Restaurant</span>
              <span class="address-name">{{ delivery.restaurant.name }}</span>
            </div>
            <div class="address-actions">
              <a-button
                v-if="delivery.restaurant.phone"
                type="text"
                shape="circle"
                @click="callPhone(delivery.restaurant.phone)"
              >
                <PhoneOutlined />
              </a-button>
              <a-button type="text" shape="circle" @click="openNavigation('pickup')">
                <EnvironmentOutlined />
              </a-button>
            </div>
          </div>
          <div class="address-content">
            <p>{{ delivery.pickupAddress.street }}</p>
            <p>{{ delivery.pickupAddress.postalCode }} {{ delivery.pickupAddress.city }}</p>
          </div>
        </div>

        <!-- Delivery Address -->
        <div class="address-card">
          <div class="address-header">
            <div class="address-icon delivery">
              <UserOutlined />
            </div>
            <div class="address-info">
              <span class="address-label">Client</span>
              <span class="address-name">{{ delivery.customer.name }}</span>
            </div>
            <div class="address-actions">
              <a-button
                type="text"
                shape="circle"
                @click="showChat = true"
              >
                <MessageOutlined />
                <span v-if="unreadMessages > 0" class="badge">{{ unreadMessages }}</span>
              </a-button>
              <a-button
                v-if="delivery.customer.phone"
                type="text"
                shape="circle"
                @click="callPhone(delivery.customer.phone)"
              >
                <PhoneOutlined />
              </a-button>
              <a-button type="text" shape="circle" @click="openNavigation('delivery')">
                <EnvironmentOutlined />
              </a-button>
            </div>
          </div>
          <div class="address-content">
            <p>{{ delivery.deliveryAddress.street }}</p>
            <p>{{ delivery.deliveryAddress.postalCode }} {{ delivery.deliveryAddress.city }}</p>
            <p v-if="delivery.deliveryAddress.instructions" class="instructions">
              <ExclamationCircleOutlined /> {{ delivery.deliveryAddress.instructions }}
            </p>
          </div>
        </div>
      </div>

      <!-- Order Details -->
      <div class="order-section">
        <h3>Details de la commande</h3>
        <div class="order-items">
          <div v-for="(item, index) in delivery.order.items" :key="index" class="order-item">
            <span class="item-qty">{{ item.quantity }}x</span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-price">{{ (item.price * item.quantity).toFixed(2) }}€</span>
          </div>
        </div>
        <div class="order-total">
          <span>Total</span>
          <span>{{ delivery.order.total.toFixed(2) }}€</span>
        </div>
        <div v-if="delivery.order.specialInstructions" class="special-instructions">
          <strong>Instructions:</strong> {{ delivery.order.specialInstructions }}
        </div>
      </div>

      <!-- Earnings -->
      <div class="earnings-section">
        <h3>Vos gains</h3>
        <div class="earnings-breakdown">
          <div class="earning-row">
            <span>Base</span>
            <span>{{ delivery.earnings.baseFee.toFixed(2) }}€</span>
          </div>
          <div v-if="delivery.earnings.distanceBonus > 0" class="earning-row">
            <span>Bonus distance</span>
            <span>+{{ delivery.earnings.distanceBonus.toFixed(2) }}€</span>
          </div>
          <div v-if="delivery.earnings.tip > 0" class="earning-row tip">
            <span>Pourboire</span>
            <span>+{{ delivery.earnings.tip.toFixed(2) }}€</span>
          </div>
          <div class="earning-row total">
            <span>Total</span>
            <span>{{ delivery.earnings.total.toFixed(2) }}€</span>
          </div>
        </div>
      </div>

      <!-- Delivery Info -->
      <div class="info-section">
        <div class="info-row">
          <ClockCircleOutlined />
          <span>Duree estimee: {{ delivery.estimatedDuration }} min</span>
        </div>
        <div class="info-row">
          <CarOutlined />
          <span>Distance: {{ delivery.estimatedDistance.toFixed(1) }} km</span>
        </div>
      </div>
    </template>

    <!-- Chat Drawer -->
    <a-drawer
      v-model:open="showChat"
      title=""
      placement="bottom"
      :height="520"
      :body-style="{ padding: 0 }"
      :header-style="{ display: 'none' }"
    >
      <ChatBox
        v-if="delivery"
        :delivery-id="delivery._id"
        :order-id="delivery.orderId"
        user-type="driver"
        :is-open="showChat"
        @close="showChat = false"
        @unread-change="handleUnreadChange"
      />
    </a-drawer>

    <!-- POD Modal -->
    <a-modal
      v-model:open="showPODModal"
      title="Confirmer la livraison"
      :footer="null"
      centered
      :closable="false"
      :maskClosable="false"
      width="90%"
      :style="{ maxWidth: '400px' }"
    >
      <div class="pod-modal">
        <!-- POD Type Selector -->
        <div class="pod-tabs">
          <button
            :class="{ active: podType === 'photo' }"
            @click="podType = 'photo'"
          >
            <CameraOutlined /> Photo
          </button>
          <button
            :class="{ active: podType === 'otp' }"
            @click="podType = 'otp'"
          >
            <CheckCircleOutlined /> Code
          </button>
        </div>

        <!-- Photo POD -->
        <div v-if="podType === 'photo'" class="pod-content">
          <p>Prenez une photo de la commande livree</p>

          <div v-if="podPhotoPreview" class="photo-preview">
            <img :src="podPhotoPreview" alt="Photo de livraison" />
            <a-button type="text" @click="podPhoto = null; podPhotoPreview = null">
              Reprendre
            </a-button>
          </div>

          <a-upload
            v-else
            :before-upload="handlePhotoCapture"
            :show-upload-list="false"
            accept="image/*"
            capture="environment"
          >
            <div class="upload-area">
              <CameraOutlined />
              <span>Prendre une photo</span>
            </div>
          </a-upload>

          <a-button
            type="primary"
            size="large"
            block
            :disabled="!podPhoto"
            :loading="updating"
            @click="submitPhotoPOD"
          >
            Confirmer avec photo
          </a-button>
        </div>

        <!-- OTP POD -->
        <div v-if="podType === 'otp'" class="pod-content">
          <p>Demandez le code a 4 chiffres au client</p>

          <div class="otp-input">
            <a-input
              v-model:value="otpCode"
              placeholder="0000"
              size="large"
              :maxlength="4"
              style="text-align: center; font-size: 24px; letter-spacing: 8px"
            />
          </div>

          <a-button
            type="primary"
            size="large"
            block
            :disabled="otpCode.length !== 4"
            :loading="verifyingOTP"
            @click="verifyOTP"
          >
            Verifier le code
          </a-button>
        </div>

        <!-- Alternative: No POD -->
        <div class="pod-alternative">
          <a-button type="link" @click="confirmWithoutPOD" :loading="updating">
            Confirmer sans preuve (client confirme)
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.delivery-detail-page {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 100px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.page-header h1 {
  flex: 1;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.back-btn {
  color: rgba(255, 255, 255, 0.75);
}

/* Loading */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 60px;
}

/* Status Section */
.status-section {
  margin-bottom: 20px;
  overflow-x: auto;
}

.status-progress {
  display: flex;
  min-width: max-content;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 60px;
  position: relative;
}

.status-step::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.15);
}

.status-step:last-child::after {
  display: none;
}

.status-step.completed::after {
  background: #52c41a;
}

.status-step.current::after {
  background: linear-gradient(to right, #52c41a 50%, rgba(255, 255, 255, 0.15) 50%);
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  position: relative;
  z-index: 1;
}

.status-step.completed .step-dot {
  background: #52c41a;
  color: #fff;
}

.status-step.current .step-dot {
  background: #1890ff;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.3);
}

.step-label {
  margin-top: 8px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
}

.status-step.completed .step-label,
.status-step.current .step-label {
  color: rgba(255, 255, 255, 0.85);
}

/* Action Section */
.action-section {
  margin-bottom: 20px;
}

/* Addresses */
.addresses-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.address-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
}

.address-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.address-icon.pickup {
  background: rgba(250, 173, 20, 0.2);
  color: #faad14;
}

.address-icon.delivery {
  background: rgba(82, 196, 26, 0.2);
  color: #52c41a;
}

.address-info {
  flex: 1;
}

.address-label {
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  text-transform: uppercase;
}

.address-name {
  display: block;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

.address-actions {
  display: flex;
  gap: 4px;
}

.address-actions .ant-btn {
  color: rgba(255, 255, 255, 0.75);
}

.address-actions .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  background: #ff4d4f;
  border-radius: 8px;
  font-size: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.address-content {
  padding: 12px 16px;
}

.address-content p {
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  margin: 0 0 4px 0;
}

.address-content .instructions {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(250, 173, 20, 0.1);
  border-radius: 8px;
  color: #faad14;
  font-size: 13px;
}

/* Order Section */
.order-section,
.earnings-section,
.info-section {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.order-section h3,
.earnings-section h3 {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.item-qty {
  color: #1890ff;
  font-weight: 600;
  min-width: 30px;
}

.item-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.85);
}

.item-price {
  color: rgba(255, 255, 255, 0.65);
}

.order-total {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  color: #fff;
}

.special-instructions {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

/* Earnings */
.earnings-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.earning-row {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
}

.earning-row.tip span:last-child {
  color: #52c41a;
}

.earning-row.total {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  color: #fff;
  font-size: 16px;
}

/* Info Section */
.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  padding: 8px 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* POD Modal */
.pod-modal {
  padding: 8px 0;
}

.pod-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.pod-tabs button {
  flex: 1;
  padding: 12px;
  background: rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.pod-tabs button.active {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.pod-content {
  text-align: center;
}

.pod-content p {
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 16px;
}

.upload-area {
  padding: 40px;
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

.upload-area:hover {
  border-color: #1890ff;
}

.upload-area .anticon {
  font-size: 32px;
  color: #1890ff;
  display: block;
  margin-bottom: 8px;
}

.upload-area span {
  color: rgba(0, 0, 0, 0.65);
}

.photo-preview {
  margin-bottom: 16px;
}

.photo-preview img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 12px;
}

.otp-input {
  margin-bottom: 16px;
}

.pod-alternative {
  margin-top: 16px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}
</style>
