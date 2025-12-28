<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import api from '@/services/api';
import {
  SearchOutlined,
  EyeOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ShopOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { h } from 'vue';

const router = useRouter();

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  ownerId?: {
    _id: string;
    name: string;
    email: string;
  };
  stats?: {
    orders: number;
    dishes: number;
    categories: number;
  };
}

const loading = ref(true);
const restaurants = ref<Restaurant[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});
const search = ref('');
const statusFilter = ref<string>('all');

// Drawer state
const drawerVisible = ref(false);
const selectedRestaurant = ref<Restaurant | null>(null);
const drawerLoading = ref(false);
const detailedStats = ref<{
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  dishes: number;
  categories: number;
  staff: number;
} | null>(null);

const columns: TableColumnsType = [
  {
    title: 'Restaurant',
    key: 'name',
    fixed: 'left',
    width: 250,
  },
  {
    title: 'Proprietaire',
    key: 'owner',
    width: 200,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: 'Plats',
    key: 'dishes',
    width: 80,
    align: 'center',
  },
  {
    title: 'Commandes',
    key: 'orders',
    width: 100,
    align: 'center',
  },
  {
    title: 'Date creation',
    key: 'createdAt',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 180,
    align: 'center',
  },
];

const fetchRestaurants = async () => {
  loading.value = true;
  try {
    const response = await api.get<{
      restaurants: Restaurant[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>('/superadmin/restaurants', {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      search: search.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    });

    if (response.success && response.data) {
      restaurants.value = response.data.restaurants;
      pagination.value.total = response.data.pagination.total;
    }
  } catch {
    console.error('Failed to fetch restaurants:', error);
    message.error('Erreur lors du chargement des restaurants');
  } finally {
    loading.value = false;
  }
};

const handleTableChange = (pag: { current: number; pageSize: number }) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchRestaurants();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchRestaurants();
};

// Open drawer with restaurant details
const openDrawer = async (restaurant: Restaurant) => {
  selectedRestaurant.value = restaurant;
  drawerVisible.value = true;
  drawerLoading.value = true;

  try {
    const response = await api.get<{
      restaurant: Restaurant;
      stats: {
        totalOrders: number;
        totalRevenue: number;
        completedOrders: number;
        dishes: number;
        categories: number;
        staff: number;
      };
    }>(`/superadmin/restaurants/${restaurant._id}`);

    if (response.success && response.data) {
      selectedRestaurant.value = response.data.restaurant;
      detailedStats.value = response.data.stats;
    }
  } catch {
    console.error('Failed to fetch restaurant details:', error);
  } finally {
    drawerLoading.value = false;
  }
};

const closeDrawer = () => {
  drawerVisible.value = false;
  selectedRestaurant.value = null;
  detailedStats.value = null;
};

const viewRestaurant = (id: string) => {
  router.push(`/super-admin/restaurants/${id}`);
};

const openPublicMenu = (slug: string) => {
  window.open(`/r/${slug}`, '_blank');
};

const toggleRestaurantStatus = (restaurant: Restaurant) => {
  const title = restaurant.isActive ? 'Suspendre ce restaurant ?' : 'Activer ce restaurant ?';
  const content = restaurant.isActive
    ? `Le restaurant "${restaurant.name}" ne sera plus accessible au public.`
    : `Le restaurant "${restaurant.name}" sera de nouveau accessible au public.`;

  Modal.confirm({
    title,
    content,
    icon: h(ExclamationCircleOutlined),
    okText: restaurant.isActive ? 'Suspendre' : 'Activer',
    okType: restaurant.isActive ? 'danger' : 'primary',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.put(`/superadmin/restaurants/${restaurant._id}/status`, {
          isActive: !restaurant.isActive,
        });
        message.success(`Restaurant ${restaurant.isActive ? 'suspendu' : 'active'} avec succes`);
        fetchRestaurants();
        if (selectedRestaurant.value?._id === restaurant._id) {
          selectedRestaurant.value.isActive = !restaurant.isActive;
        }
      } catch {
        console.error('Failed to update restaurant status:', error);
        message.error('Erreur lors de la mise a jour du statut');
      }
    },
  });
};

const deleteRestaurant = (restaurant: Restaurant) => {
  Modal.confirm({
    title: 'Supprimer ce restaurant ?',
    content: h('div', [
      h('p', `Etes-vous sur de vouloir supprimer "${restaurant.name}" ?`),
      h('p', { style: { color: '#ef4444', marginTop: '8px' } }, 'Cette action est irreversible et supprimera toutes les donnees associees.'),
    ]),
    icon: h(ExclamationCircleOutlined, { style: { color: '#ef4444' } }),
    okText: 'Supprimer',
    okType: 'danger',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.delete(`/superadmin/restaurants/${restaurant._id}?permanent=true`);
        message.success('Restaurant supprime avec succes');
        fetchRestaurants();
        closeDrawer();
      } catch {
        console.error('Failed to delete restaurant:', error);
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

onMounted(() => {
  fetchRestaurants();
});
</script>

<template>
  <div class="restaurants-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Restaurants</h1>
        <p class="page-subtitle">Gerez tous les restaurants de la plateforme</p>
      </div>
      <a-button @click="fetchRestaurants" :loading="loading">
        <template #icon><ReloadOutlined /></template>
        Actualiser
      </a-button>
    </div>

    <!-- Filters -->
    <a-card class="filters-card mb-4">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="8">
          <a-input-search
            v-model:value="search"
            placeholder="Rechercher un restaurant..."
            allow-clear
            @search="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input-search>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-select
            v-model:value="statusFilter"
            style="width: 100%"
            @change="handleSearch"
          >
            <a-select-option value="all">Tous les statuts</a-select-option>
            <a-select-option value="active">Actifs</a-select-option>
            <a-select-option value="inactive">Inactifs</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="4">
          <a-statistic :value="pagination.total" title="Total" />
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="restaurants"
        :loading="loading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total: number) => `${total} restaurants`,
        }"
        :scroll="{ x: 1100 }"
        row-key="_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="restaurant-cell" @click="openDrawer(record)" style="cursor: pointer">
              <div class="restaurant-info">
                <span class="restaurant-name">{{ record.name }}</span>
                <span class="restaurant-slug">/r/{{ record.slug }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'owner'">
            <div v-if="record.ownerId" class="owner-cell">
              <span class="owner-name">{{ record.ownerId.name }}</span>
              <span class="owner-email">{{ record.ownerId.email }}</span>
            </div>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.isActive ? 'green' : 'red'">
              {{ record.isActive ? 'Actif' : 'Inactif' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'dishes'">
            {{ record.stats?.dishes || 0 }}
          </template>

          <template v-else-if="column.key === 'orders'">
            {{ record.stats?.orders || 0 }}
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Apercu rapide">
                <a-button type="text" size="small" @click="openDrawer(record)">
                  <template #icon><EyeOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Voir le menu public">
                <a-button type="text" size="small" @click="openPublicMenu(record.slug)">
                  <template #icon><ExportOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip :title="record.isActive ? 'Suspendre' : 'Activer'">
                <a-button
                  type="text"
                  size="small"
                  :class="record.isActive ? 'btn-warning' : 'btn-success'"
                  @click="toggleRestaurantStatus(record)"
                >
                  <template #icon>
                    <StopOutlined v-if="record.isActive" />
                    <CheckCircleOutlined v-else />
                  </template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Supprimer">
                <a-button type="text" size="small" danger @click="deleteRestaurant(record)">
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Restaurant Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Details du restaurant"
      placement="right"
      :width="480"
      @close="closeDrawer"
    >
      <template v-if="selectedRestaurant">
        <a-spin :spinning="drawerLoading">
          <!-- Header -->
          <div class="drawer-header">
            <a-avatar :size="64" class="restaurant-avatar">
              <template #icon><ShopOutlined /></template>
            </a-avatar>
            <div class="drawer-title">
              <h2>{{ selectedRestaurant.name }}</h2>
              <a-tag :color="selectedRestaurant.isActive ? 'green' : 'red'">
                {{ selectedRestaurant.isActive ? 'Actif' : 'Inactif' }}
              </a-tag>
            </div>
          </div>

          <a-divider />

          <!-- Info -->
          <div class="drawer-section">
            <h4>Informations</h4>
            <div class="info-list">
              <div class="info-item">
                <ExportOutlined />
                <a :href="`/r/${selectedRestaurant.slug}`" target="_blank">
                  /r/{{ selectedRestaurant.slug }}
                </a>
              </div>
              <div v-if="selectedRestaurant.email" class="info-item">
                <MailOutlined />
                <span>{{ selectedRestaurant.email }}</span>
              </div>
              <div v-if="selectedRestaurant.phone" class="info-item">
                <PhoneOutlined />
                <span>{{ selectedRestaurant.phone }}</span>
              </div>
              <div class="info-item">
                <CalendarOutlined />
                <span>Cree le {{ formatDate(selectedRestaurant.createdAt) }}</span>
              </div>
            </div>
          </div>

          <a-divider />

          <!-- Owner -->
          <div v-if="selectedRestaurant.ownerId" class="drawer-section">
            <h4>Proprietaire</h4>
            <div class="owner-card">
              <a-avatar :size="40" class="owner-avatar">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <div class="owner-details">
                <span class="owner-name">{{ selectedRestaurant.ownerId.name }}</span>
                <span class="owner-email">{{ selectedRestaurant.ownerId.email }}</span>
              </div>
            </div>
          </div>

          <a-divider />

          <!-- Stats -->
          <div v-if="detailedStats" class="drawer-section">
            <h4>Statistiques</h4>
            <a-row :gutter="[16, 16]">
              <a-col :span="12">
                <a-statistic title="Commandes" :value="detailedStats.totalOrders" />
              </a-col>
              <a-col :span="12">
                <a-statistic
                  title="Revenu total"
                  :value="detailedStats.totalRevenue"
                  :precision="2"
                  suffix="EUR"
                />
              </a-col>
              <a-col :span="8">
                <a-statistic title="Plats" :value="detailedStats.dishes" />
              </a-col>
              <a-col :span="8">
                <a-statistic title="Categories" :value="detailedStats.categories" />
              </a-col>
              <a-col :span="8">
                <a-statistic title="Staff" :value="detailedStats.staff" />
              </a-col>
            </a-row>
          </div>

          <a-divider />

          <!-- Actions -->
          <div class="drawer-actions">
            <a-button type="primary" block @click="viewRestaurant(selectedRestaurant._id)">
              Voir tous les details
            </a-button>
            <a-button block @click="openPublicMenu(selectedRestaurant.slug)">
              <template #icon><ExportOutlined /></template>
              Voir le menu public
            </a-button>
            <a-button
              block
              :type="selectedRestaurant.isActive ? 'default' : 'primary'"
              :danger="selectedRestaurant.isActive"
              @click="toggleRestaurantStatus(selectedRestaurant)"
            >
              {{ selectedRestaurant.isActive ? 'Suspendre' : 'Activer' }}
            </a-button>
            <a-button block danger @click="deleteRestaurant(selectedRestaurant)">
              <template #icon><DeleteOutlined /></template>
              Supprimer
            </a-button>
          </div>
        </a-spin>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.restaurants-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.filters-card {
  border-radius: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.restaurant-cell {
  display: flex;
  flex-direction: column;
}

.restaurant-cell:hover .restaurant-name {
  color: #8b5cf6;
}

.restaurant-name {
  font-weight: 600;
  color: #1e293b;
  transition: color 0.2s;
}

.restaurant-slug {
  font-size: 12px;
  color: #94a3b8;
}

.owner-cell {
  display: flex;
  flex-direction: column;
}

.owner-name {
  font-weight: 500;
  color: #1e293b;
}

.owner-email {
  font-size: 12px;
  color: #64748b;
}

.text-gray-400 {
  color: #9ca3af;
}

.btn-warning {
  color: #f59e0b;
}

.btn-warning:hover {
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
}

.btn-success {
  color: #22c55e;
}

.btn-success:hover {
  color: #16a34a;
  background: rgba(34, 197, 94, 0.1);
}

/* Drawer styles */
.drawer-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.restaurant-avatar {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
}

.drawer-title h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
}

.drawer-section h4 {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1e293b;
}

.info-item a {
  color: #8b5cf6;
}

.info-item a:hover {
  text-decoration: underline;
}

.owner-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.owner-avatar {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
}

.owner-details {
  display: flex;
  flex-direction: column;
}

.owner-details .owner-name {
  font-weight: 600;
}

.owner-details .owner-email {
  font-size: 12px;
  color: #64748b;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
