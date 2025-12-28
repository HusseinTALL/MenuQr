<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDriverAuthStore } from '@/stores/driverAuth';
import api from '@/services/api';
import ChatBox from '@/components/chat/ChatBox.vue';
import {
  CarOutlined,
  ClockCircleOutlined,
  EuroCircleOutlined,
  StarOutlined,
  RightOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ShopOutlined,
  MessageOutlined,
} from '@ant-design/icons-vue';

interface ActiveDelivery {
  _id: string;
  orderId: string;
  status: string;
  pickupAddress: {
    street: string;
    city: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
  };
  estimatedDuration: number;
  earnings: {
    total: number;
    currency: string;
  };
  restaurant?: {
    name: string;
    phone?: string;
  };
  customer?: {
    name: string;
    phone?: string;
  };
}

interface DailyStats {
  deliveriesCompleted: number;
  hoursOnline: number;
  earningsToday: number;
  averageRating: number;
}

const router = useRouter();
const driverStore = useDriverAuthStore();

const loading = ref(true);
const activeDelivery = ref<ActiveDelivery | null>(null);
const showChat = ref(false);
const unreadMessages = ref(0);
const dailyStats = ref<DailyStats>({
  deliveriesCompleted: 0,
  hoursOnline: 0,
  earningsToday: 0,
  averageRating: 0,
});

const statusSteps = [
  { key: 'assigned', label: 'Assignée' },
  { key: 'accepted', label: 'Acceptée' },
  { key: 'arriving_restaurant', label: 'En route resto' },
  { key: 'at_restaurant', label: 'Au restaurant' },
  { key: 'picked_up', label: 'Récupérée' },
  { key: 'in_transit', label: 'En route' },
  { key: 'arrived', label: 'Arrivée' },
  { key: 'delivered', label: 'Livrée' },
];

const currentStepIndex = computed(() => {
  if (!activeDelivery.value) {
    return -1;
  }
  return statusSteps.findIndex(s => s.key === activeDelivery.value!.status);
});

const fetchActiveDelivery = async () => {
  try {
    const response = await api.getActiveDelivery();
    if (response.success && response.data) {
      activeDelivery.value = response.data as ActiveDelivery;
    }
  } catch (error) {
    console.error('Failed to fetch active delivery:', error);
  }
};

const fetchDailyStats = async () => {
  try {
    const response = await api.getDriverEarningsSummary();
    if (response.success && response.data) {
      const data = response.data as { today?: DailyStats };
      if (data.today) {
        dailyStats.value = data.today;
      }
    }
  } catch (error) {
    console.error('Failed to fetch daily stats:', error);
  }
};

const acceptDelivery = async () => {
  if (!activeDelivery.value) {
    return;
  }

  try {
    const response = await api.acceptDelivery(activeDelivery.value._id);
    if (response.success) {
      await fetchActiveDelivery();
    }
  } catch (error) {
    console.error('Failed to accept delivery:', error);
  }
};

const updateDeliveryStatus = async (newStatus: string) => {
  if (!activeDelivery.value) {
    return;
  }

  try {
    const response = await api.updateDeliveryStatus(activeDelivery.value._id, newStatus);
    if (response.success) {
      await fetchActiveDelivery();
    }
  } catch (error) {
    console.error('Failed to update delivery status:', error);
  }
};

const navigateToDelivery = () => {
  if (activeDelivery.value) {
    router.push(`/driver/delivery/${activeDelivery.value._id}`);
  }
};

const toggleChat = () => {
  showChat.value = !showChat.value;
};

const handleUnreadChange = (count: number) => {
  unreadMessages.value = count;
};

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    fetchActiveDelivery(),
    fetchDailyStats(),
  ]);
  loading.value = false;
});
</script>

<template>
  <div class="driver-dashboard">
    <!-- Welcome Section -->
    <div class="welcome-section">
      <h1 class="welcome-title">
        Bonjour, {{ driverStore.user?.firstName || 'Livreur' }}
      </h1>
      <p class="welcome-subtitle">
        {{ driverStore.isOnline ? 'Vous êtes en ligne et prêt à livrer' : 'Passez en ligne pour recevoir des commandes' }}
      </p>
    </div>

    <!-- Daily Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon deliveries">
          <CarOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ dailyStats.deliveriesCompleted }}</div>
          <div class="stat-label">Livraisons</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon hours">
          <ClockCircleOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ dailyStats.hoursOnline.toFixed(1) }}h</div>
          <div class="stat-label">En ligne</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon earnings">
          <EuroCircleOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ dailyStats.earningsToday.toFixed(2) }}€</div>
          <div class="stat-label">Gains du jour</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon rating">
          <StarOutlined />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ dailyStats.averageRating.toFixed(1) }}</div>
          <div class="stat-label">Note moyenne</div>
        </div>
      </div>
    </div>

    <!-- Active Delivery Card -->
    <div v-if="activeDelivery" class="active-delivery-section">
      <div class="section-header">
        <h2>Livraison en cours</h2>
        <a-tag :color="activeDelivery?.status === 'assigned' ? 'orange' : 'blue'">
          {{ statusSteps.find(s => s.key === activeDelivery?.status)?.label || activeDelivery?.status }}
        </a-tag>
      </div>

      <div class="delivery-card" @click="navigateToDelivery">
        <!-- Progress Steps -->
        <div class="delivery-progress">
          <a-steps :current="currentStepIndex" size="small" direction="horizontal">
            <a-step v-for="step in statusSteps.slice(0, 4)" :key="step.key" />
          </a-steps>
        </div>

        <!-- Addresses -->
        <div class="delivery-addresses">
          <div class="address-item pickup">
            <div class="address-icon">
              <ShopOutlined />
            </div>
            <div class="address-content">
              <div class="address-label">Récupération</div>
              <div class="address-text">{{ activeDelivery.pickupAddress.street }}</div>
              <div class="address-city">{{ activeDelivery.pickupAddress.city }}</div>
            </div>
          </div>

          <div class="address-divider">
            <div class="divider-line"></div>
            <div class="divider-icon">
              <CarOutlined />
            </div>
            <div class="divider-line"></div>
          </div>

          <div class="address-item delivery">
            <div class="address-icon">
              <EnvironmentOutlined />
            </div>
            <div class="address-content">
              <div class="address-label">Livraison</div>
              <div class="address-text">{{ activeDelivery.deliveryAddress.street }}</div>
              <div class="address-city">{{ activeDelivery.deliveryAddress.city }}</div>
            </div>
          </div>
        </div>

        <!-- Delivery Info -->
        <div class="delivery-info">
          <div class="info-item">
            <ClockCircleOutlined />
            <span>~{{ activeDelivery.estimatedDuration }} min</span>
          </div>
          <div class="info-item earnings">
            <EuroCircleOutlined />
            <span>{{ activeDelivery.earnings.total.toFixed(2) }}€</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="delivery-actions">
          <a-button
            v-if="activeDelivery.status === 'assigned'"
            type="primary"
            size="large"
            block
            @click.stop="acceptDelivery"
          >
            Accepter la livraison
          </a-button>

          <a-button
            v-else-if="activeDelivery.status === 'accepted'"
            type="primary"
            size="large"
            block
            @click.stop="updateDeliveryStatus('arriving_restaurant')"
          >
            En route vers le restaurant
          </a-button>

          <a-button
            v-else-if="activeDelivery.status === 'arriving_restaurant'"
            type="primary"
            size="large"
            block
            @click.stop="updateDeliveryStatus('at_restaurant')"
          >
            Je suis arrivé au restaurant
          </a-button>

          <a-button
            v-else-if="activeDelivery.status === 'at_restaurant'"
            type="primary"
            size="large"
            block
            @click.stop="updateDeliveryStatus('picked_up')"
          >
            J'ai récupéré la commande
          </a-button>

          <a-button
            v-else-if="activeDelivery.status === 'picked_up'"
            type="primary"
            size="large"
            block
            @click.stop="updateDeliveryStatus('in_transit')"
          >
            En route vers le client
          </a-button>

          <a-button
            v-else-if="activeDelivery.status === 'in_transit'"
            type="primary"
            size="large"
            block
            @click.stop="updateDeliveryStatus('arrived')"
          >
            Je suis arrivé chez le client
          </a-button>

          <a-button
            v-else-if="activeDelivery.status === 'arrived'"
            type="primary"
            size="large"
            block
            @click.stop="navigateToDelivery"
          >
            Confirmer la livraison
            <RightOutlined />
          </a-button>

          <a-button
            v-else
            type="primary"
            size="large"
            block
            @click.stop="navigateToDelivery"
          >
            Voir les détails
            <RightOutlined />
          </a-button>
        </div>

        <!-- Contact Buttons -->
        <div class="contact-buttons" v-if="activeDelivery.status !== 'assigned'">
          <a-button
            v-if="activeDelivery.restaurant?.phone"
            :href="'tel:' + activeDelivery.restaurant.phone"
            type="text"
            class="contact-btn"
          >
            <PhoneOutlined /> Restaurant
          </a-button>
          <a-button
            v-if="activeDelivery.customer?.phone"
            :href="'tel:' + activeDelivery.customer.phone"
            type="text"
            class="contact-btn"
          >
            <PhoneOutlined /> Client
          </a-button>
        </div>
      </div>
    </div>

    <!-- No Active Delivery -->
    <div v-else-if="!loading" class="no-delivery-section">
      <div class="no-delivery-card">
        <div class="no-delivery-icon">
          <CarOutlined />
        </div>
        <h3>Aucune livraison en cours</h3>
        <p v-if="driverStore.isOnline">
          Restez en ligne pour recevoir de nouvelles commandes
        </p>
        <p v-else>
          Passez en ligne pour commencer à recevoir des commandes
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-section">
      <a-spin size="large" />
      <p>Chargement...</p>
    </div>

    <!-- Chat FAB Button -->
    <div v-if="activeDelivery && activeDelivery.status !== 'assigned'" class="chat-fab" @click="toggleChat">
      <MessageOutlined />
      <span v-if="unreadMessages > 0" class="unread-badge">{{ unreadMessages }}</span>
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
        v-if="activeDelivery"
        :delivery-id="activeDelivery._id"
        :order-id="activeDelivery.orderId"
        user-type="driver"
        :is-open="showChat"
        @close="showChat = false"
        @unread-change="handleUnreadChange"
      />
    </a-drawer>
  </div>
</template>

<style scoped>
.driver-dashboard {
  max-width: 600px;
  margin: 0 auto;
}

.welcome-section {
  margin-bottom: 24px;
}

.welcome-title {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.welcome-subtitle {
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.deliveries {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #fff;
}

.stat-icon.hours {
  background: linear-gradient(135deg, #722ed1, #9254de);
  color: #fff;
}

.stat-icon.earnings {
  background: linear-gradient(135deg, #52c41a, #73d13d);
  color: #fff;
}

.stat-icon.rating {
  background: linear-gradient(135deg, #faad14, #ffc53d);
  color: #fff;
}

.stat-value {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.active-delivery-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.delivery-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.delivery-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.delivery-progress {
  margin-bottom: 20px;
}

.delivery-progress :deep(.ant-steps-item-finish .ant-steps-item-icon) {
  background: #52c41a;
  border-color: #52c41a;
}

.delivery-progress :deep(.ant-steps-item-process .ant-steps-item-icon) {
  background: #1890ff;
  border-color: #1890ff;
}

.delivery-addresses {
  margin-bottom: 16px;
}

.address-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
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

.address-item.pickup .address-icon {
  background: rgba(250, 173, 20, 0.2);
  color: #faad14;
}

.address-item.delivery .address-icon {
  background: rgba(82, 196, 26, 0.2);
  color: #52c41a;
}

.address-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.address-text {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

.address-city {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
}

.address-divider {
  display: flex;
  align-items: center;
  padding: 4px 0 4px 20px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.divider-icon {
  padding: 0 12px;
  color: rgba(255, 255, 255, 0.5);
}

.delivery-info {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.info-item.earnings {
  color: #52c41a;
  font-weight: 600;
}

.delivery-actions {
  margin-bottom: 12px;
}

.contact-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.contact-btn {
  color: rgba(255, 255, 255, 0.85);
}

.no-delivery-section,
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.no-delivery-card {
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.no-delivery-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 16px;
}

.no-delivery-card h3 {
  color: #fff;
  font-size: 18px;
  margin: 0 0 8px 0;
}

.no-delivery-card p {
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}

.loading-section {
  color: rgba(255, 255, 255, 0.65);
}

.loading-section p {
  margin-top: 16px;
}

/* Chat FAB Button */
.chat-fab {
  position: fixed;
  bottom: 90px;
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

.unread-badge {
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
