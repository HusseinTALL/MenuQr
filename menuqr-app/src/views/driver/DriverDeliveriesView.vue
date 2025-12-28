<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import {
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  EuroCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons-vue';

interface Delivery {
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
  earnings: {
    total: number;
    currency: string;
  };
  estimatedDuration: number;
  createdAt: string;
  deliveredAt?: string;
}

const router = useRouter();
const loading = ref(true);
const deliveries = ref<Delivery[]>([]);
const activeFilter = ref<string>('all');
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
});

const filters = [
  { key: 'all', label: 'Toutes' },
  { key: 'delivered', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées' },
];

const filteredDeliveries = computed(() => {
  if (activeFilter.value === 'all') {
    return deliveries.value;
  }
  return deliveries.value.filter(d => d.status === activeFilter.value);
});

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered': return CheckCircleOutlined;
    case 'cancelled': return CloseCircleOutlined;
    default: return ClockCircleOutlined;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return '#52c41a';
    case 'cancelled': return '#ff4d4f';
    case 'in_transit': return '#1890ff';
    default: return '#faad14';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    assigned: 'Assignée',
    accepted: 'Acceptée',
    picked_up: 'Récupérée',
    in_transit: 'En route',
    arrived: 'Arrivée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };
  return labels[status] || status;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days === 1) {
    return `Hier ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fetchDeliveries = async () => {
  try {
    loading.value = true;
    const response = await api.getDriverDeliveries({
      page: pagination.value.page,
      limit: pagination.value.limit,
      status: activeFilter.value !== 'all' ? activeFilter.value : undefined,
    });

    if (response.success && response.data) {
      const data = response.data as { deliveries: Delivery[]; total: number };
      deliveries.value = data.deliveries || [];
      pagination.value.total = data.total || 0;
    }
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
  } finally {
    loading.value = false;
  }
};

const navigateToDelivery = (deliveryId: string) => {
  router.push(`/driver/delivery/${deliveryId}`);
};

const handleFilterChange = (filter: string) => {
  activeFilter.value = filter;
  pagination.value.page = 1;
  fetchDeliveries();
};

onMounted(() => {
  fetchDeliveries();
});
</script>

<template>
  <div class="deliveries-view">
    <div class="page-header">
      <h1>Mes Livraisons</h1>
      <div class="filter-chips">
        <div
          v-for="filter in filters"
          :key="filter.key"
          :class="['filter-chip', { active: activeFilter === filter.key }]"
          @click="handleFilterChange(filter.key)"
        >
          {{ filter.label }}
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <a-spin size="large" />
    </div>

    <!-- Deliveries List -->
    <div v-else-if="filteredDeliveries.length > 0" class="deliveries-list">
      <div
        v-for="delivery in filteredDeliveries"
        :key="delivery._id"
        class="delivery-item"
        @click="navigateToDelivery(delivery._id)"
      >
        <div class="delivery-status">
          <div
            class="status-icon"
            :style="{ backgroundColor: getStatusColor(delivery.status) + '20', color: getStatusColor(delivery.status) }"
          >
            <component :is="getStatusIcon(delivery.status)" />
          </div>
        </div>

        <div class="delivery-content">
          <div class="delivery-header">
            <span class="delivery-id">#{{ delivery.orderId?.slice(-6) || delivery._id.slice(-6) }}</span>
            <a-tag
              :color="delivery.status === 'delivered' ? 'success' : (delivery.status === 'cancelled' ? 'error' : 'processing')"
              size="small"
            >
              {{ getStatusLabel(delivery.status) }}
            </a-tag>
          </div>

          <div class="delivery-addresses">
            <div class="address-line">
              <EnvironmentOutlined />
              <span>{{ delivery.pickupAddress.street }}</span>
            </div>
            <div class="address-arrow">↓</div>
            <div class="address-line">
              <EnvironmentOutlined />
              <span>{{ delivery.deliveryAddress.street }}</span>
            </div>
          </div>

          <div class="delivery-footer">
            <div class="delivery-time">
              <ClockCircleOutlined />
              {{ formatDate(delivery.createdAt) }}
            </div>
            <div class="delivery-earnings">
              <EuroCircleOutlined />
              {{ delivery.earnings.total.toFixed(2) }}€
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <CarOutlined />
      </div>
      <h3>Aucune livraison</h3>
      <p>
        {{ activeFilter === 'all' ? "Vous n'avez pas encore de livraison" : `Aucune livraison ${filters.find(f => f.key === activeFilter)?.label.toLowerCase()}` }}
      </p>
    </div>

    <!-- Load More -->
    <div v-if="deliveries.length > 0 && deliveries.length < pagination.total" class="load-more">
      <a-button
        type="default"
        @click="() => { pagination.page++; fetchDeliveries(); }"
        :loading="loading"
      >
        Charger plus
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.deliveries-view {
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px 0;
}

.filter-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-chip {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.filter-chip:hover {
  background: rgba(255, 255, 255, 0.15);
}

.filter-chip.active {
  background: rgba(24, 144, 255, 0.2);
  color: #1890ff;
  border-color: #1890ff;
}

.deliveries-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.delivery-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.delivery-item:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.delivery-status {
  flex-shrink: 0;
}

.status-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.delivery-content {
  flex: 1;
  min-width: 0;
}

.delivery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.delivery-id {
  color: #fff;
  font-weight: 600;
  font-size: 15px;
}

.delivery-addresses {
  margin-bottom: 12px;
}

.address-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

.address-line span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.address-arrow {
  padding-left: 22px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.delivery-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.delivery-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.delivery-earnings {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #52c41a;
  font-weight: 600;
  font-size: 14px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 16px;
}

.empty-state h3 {
  color: #fff;
  font-size: 18px;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>
