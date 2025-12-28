<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import api from '@/services/api';
import {
  ArrowLeftOutlined,
  ShopOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  ExportOutlined,
  LoginOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CopyOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();

// State
const loading = ref(true);
const restaurant = ref<Restaurant | null>(null);
const stats = ref<RestaurantStats | null>(null);
const recentOrders = ref<Order[]>([]);
const staff = ref<StaffMember[]>([]);
const categories = ref<Category[]>([]);
const activeTab = ref('overview');
const impersonating = ref(false);
const ordersLoading = ref(false);
const staffLoading = ref(false);
const menuLoading = ref(false);

// Types
interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
  settings?: {
    currency?: string;
    defaultLanguage?: string;
    availableLanguages?: string[];
    timezone?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface RestaurantStats {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  dishes: number;
  categories: number;
  staff: number;
  customers?: number;
  reviews?: number;
  avgRating?: number;
  pendingOrders?: number;
  todayOrders?: number;
  todayRevenue?: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  totalAmount: number;
  items: { name: string; quantity: number; price: number }[];
  createdAt: string;
  fulfillmentType: string;
}

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Category {
  _id: string;
  name: { fr: string; en?: string };
  description?: { fr: string; en?: string };
  order: number;
  isActive: boolean;
  dishCount?: number;
}

interface Dish {
  _id: string;
  name: { fr: string; en?: string };
  description?: { fr: string; en?: string };
  price: number;
  image?: string;
  isAvailable: boolean;
  isActive: boolean;
  categoryId: string;
}

// Computed
const restaurantId = computed(() => route.params.id as string);

const statusColor = computed(() => {
  return restaurant.value?.isActive ? 'green' : 'red';
});

const statusText = computed(() => {
  return restaurant.value?.isActive ? 'Actif' : 'Suspendu';
});

const formattedAddress = computed(() => {
  if (!restaurant.value?.address) {return null;}
  const { street, city, country, postalCode } = restaurant.value.address;
  const parts = [street, postalCode, city, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
});

const currencySymbol = computed(() => {
  const currency = restaurant.value?.settings?.currency || 'XOF';
  return currency === 'EUR' ? 'EUR' : 'XOF';
});

// Order columns
const orderColumns: TableColumnsType = [
  {
    title: 'Commande',
    dataIndex: 'orderNumber',
    key: 'orderNumber',
    width: 120,
  },
  {
    title: 'Client',
    key: 'customer',
    width: 150,
  },
  {
    title: 'Articles',
    key: 'items',
    width: 80,
    align: 'center',
  },
  {
    title: 'Total',
    key: 'total',
    width: 100,
    align: 'right',
  },
  {
    title: 'Statut',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: 'Date',
    key: 'createdAt',
    width: 140,
  },
];

// Staff columns
const staffColumns: TableColumnsType = [
  {
    title: 'Membre',
    key: 'member',
    width: 200,
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    width: 100,
  },
  {
    title: 'Statut',
    key: 'status',
    width: 80,
    align: 'center',
  },
  {
    title: 'Derniere connexion',
    key: 'lastLogin',
    width: 150,
  },
];

// Methods
const fetchRestaurant = async () => {
  loading.value = true;
  try {
    const response = await api.get<{
      restaurant: Restaurant;
      stats: RestaurantStats;
    }>(`/superadmin/restaurants/${restaurantId.value}`);

    if (response.success && response.data) {
      restaurant.value = response.data.restaurant;
      stats.value = response.data.stats;
    }
  } catch {
    console.error("Operation failed");
    message.error('Erreur lors du chargement du restaurant');
  } finally {
    loading.value = false;
  }
};

const fetchRecentOrders = async () => {
  ordersLoading.value = true;
  try {
    // Try to fetch orders - this might require a new endpoint
    const response = await api.get<{ orders: Order[] }>(
      `/superadmin/restaurants/${restaurantId.value}/orders`,
      { limit: 10 }
    );
    if (response.success && response.data) {
      recentOrders.value = response.data.orders || [];
    }
  } catch {
    // Fallback: orders endpoint might not exist yet
    console.log('Orders endpoint not available');
    recentOrders.value = [];
  } finally {
    ordersLoading.value = false;
  }
};

const fetchStaff = async () => {
  staffLoading.value = true;
  try {
    const response = await api.get<{ staff: StaffMember[] }>(
      `/superadmin/restaurants/${restaurantId.value}/staff`
    );
    if (response.success && response.data) {
      staff.value = response.data.staff || [];
    }
  } catch {
    console.error("Operation failed");
    staff.value = [];
  } finally {
    staffLoading.value = false;
  }
};

const fetchMenu = async () => {
  menuLoading.value = true;
  try {
    const response = await api.get<{ dishes: Dish[]; categories: Category[] }>(
      `/superadmin/restaurants/${restaurantId.value}/menu`
    );
    if (response.success && response.data) {
      categories.value = response.data.categories || [];
      // Could also use response.data.dishes if needed
    }
  } catch {
    console.error("Operation failed");
    categories.value = [];
  } finally {
    menuLoading.value = false;
  }
};

const toggleStatus = () => {
  if (!restaurant.value) {return;}

  const isActive = restaurant.value.isActive;
  const title = isActive ? 'Suspendre ce restaurant ?' : 'Activer ce restaurant ?';
  const content = isActive
    ? `Le restaurant "${restaurant.value.name}" ne sera plus accessible au public. Les clients ne pourront plus passer de commandes.`
    : `Le restaurant "${restaurant.value.name}" sera de nouveau accessible au public.`;

  Modal.confirm({
    title,
    content,
    icon: h(ExclamationCircleOutlined),
    okText: isActive ? 'Suspendre' : 'Activer',
    okType: isActive ? 'danger' : 'primary',
    cancelText: 'Annuler',
    async onOk() {
      try {
        await api.put(`/superadmin/restaurants/${restaurantId.value}/status`, {
          isActive: !isActive,
        });
        message.success(`Restaurant ${isActive ? 'suspendu' : 'active'} avec succes`);
        fetchRestaurant();
      } catch {
        console.error("Operation failed");
        message.error('Erreur lors de la mise a jour du statut');
      }
    },
  });
};

const deleteRestaurant = () => {
  if (!restaurant.value) {return;}

  Modal.confirm({
    title: 'Supprimer definitivement ce restaurant ?',
    content: h('div', [
      h('p', `Vous etes sur le point de supprimer "${restaurant.value.name}".`),
      h('p', { style: { color: '#ef4444', fontWeight: 'bold', marginTop: '12px' } }, [
        'ATTENTION : Cette action est irreversible !',
      ]),
      h('p', { style: { marginTop: '8px' } }, [
        'Toutes les donnees seront supprimees :',
      ]),
      h('ul', { style: { marginTop: '8px', paddingLeft: '20px', color: '#64748b' } }, [
        h('li', 'Commandes et historique'),
        h('li', 'Menu (categories et plats)'),
        h('li', 'Clients et avis'),
        h('li', 'Reservations'),
        h('li', 'Parametres et configurations'),
      ]),
    ]),
    icon: h(ExclamationCircleOutlined, { style: { color: '#ef4444' } }),
    okText: 'Supprimer definitivement',
    okType: 'danger',
    cancelText: 'Annuler',
    width: 480,
    async onOk() {
      try {
        await api.delete(`/superadmin/restaurants/${restaurantId.value}?permanent=true`);
        message.success('Restaurant supprime avec succes');
        router.push('/super-admin/restaurants');
      } catch {
        console.error("Operation failed");
        message.error('Erreur lors de la suppression');
      }
    },
  });
};

const impersonateOwner = async () => {
  if (!restaurant.value?.ownerId) {
    message.warning('Ce restaurant n\'a pas de proprietaire assigne');
    return;
  }

  impersonating.value = true;
  try {
    const response = await api.post<{
      impersonationToken: string;
      impersonationUrl: string;
      ownerName: string;
    }>(`/superadmin/restaurants/${restaurantId.value}/impersonate`);

    if (response.success && response.data) {
      // Store impersonation token
      localStorage.setItem('impersonationToken', response.data.impersonationToken);
      localStorage.setItem('originalSuperAdminToken', localStorage.getItem('superAdminToken') || '');

      message.success(`Connexion en tant que ${response.data.ownerName}`);

      // Redirect to admin dashboard
      window.open('/admin', '_blank');
    }
  } catch {
    console.error("Operation failed");
    message.error('Erreur lors de l\'impersonnation');
  } finally {
    impersonating.value = false;
  }
};

const openPublicMenu = () => {
  if (!restaurant.value?.slug) {return;}
  window.open(`/r/${restaurant.value.slug}`, '_blank');
};

const copyMenuLink = () => {
  if (!restaurant.value?.slug) {return;}
  const url = `${window.location.origin}/r/${restaurant.value.slug}`;
  navigator.clipboard.writeText(url);
  message.success('Lien copie dans le presse-papier');
};

const formatDate = (date: string, includeTime = false) => {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Intl.DateTimeFormat('fr-FR', options).format(new Date(date));
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; label: string }> = {
    pending: { color: 'orange', label: 'En attente' },
    confirmed: { color: 'blue', label: 'Confirme' },
    preparing: { color: 'purple', label: 'En preparation' },
    ready: { color: 'cyan', label: 'Pret' },
    completed: { color: 'green', label: 'Termine' },
    cancelled: { color: 'red', label: 'Annule' },
    paid: { color: 'green', label: 'Paye' },
  };
  return configs[status] || { color: 'default', label: status };
};

const getRoleLabel = (role: string) => {
  const roles: Record<string, string> = {
    owner: 'Proprietaire',
    admin: 'Administrateur',
    staff: 'Personnel',
    manager: 'Manager',
  };
  return roles[role] || role;
};

const onTabChange = (key: string) => {
  activeTab.value = key;
  if (key === 'orders' && recentOrders.value.length === 0) {
    fetchRecentOrders();
  } else if (key === 'staff' && staff.value.length === 0) {
    fetchStaff();
  } else if (key === 'menu' && categories.value.length === 0) {
    fetchMenu();
  }
};

// Lifecycle
onMounted(() => {
  fetchRestaurant();
});
</script>

<template>
  <div class="restaurant-details">
    <!-- Header -->
    <div class="page-header">
      <a-button type="text" @click="router.push('/super-admin/restaurants')">
        <template #icon><ArrowLeftOutlined /></template>
        Retour aux restaurants
      </a-button>
      <a-button @click="fetchRestaurant" :loading="loading">
        <template #icon><ReloadOutlined /></template>
        Actualiser
      </a-button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Content -->
    <template v-else-if="restaurant">
      <!-- Restaurant Header Card -->
      <a-card class="header-card">
        <div class="restaurant-header">
          <div class="header-left">
            <a-avatar :size="80" class="restaurant-avatar">
              <template #icon><ShopOutlined /></template>
            </a-avatar>
            <div class="header-info">
              <div class="title-row">
                <h1>{{ restaurant.name }}</h1>
                <a-tag :color="statusColor" class="status-tag">
                  <template #icon>
                    <CheckCircleOutlined v-if="restaurant.isActive" />
                    <CloseCircleOutlined v-else />
                  </template>
                  {{ statusText }}
                </a-tag>
              </div>
              <p class="restaurant-slug">
                <GlobalOutlined />
                /r/{{ restaurant.slug }}
                <a-button type="link" size="small" @click="copyMenuLink">
                  <CopyOutlined />
                </a-button>
              </p>
              <p v-if="restaurant.description" class="restaurant-description">
                {{ restaurant.description }}
              </p>
            </div>
          </div>
          <div class="header-actions">
            <a-space direction="vertical" size="small">
              <a-button type="primary" @click="openPublicMenu">
                <template #icon><ExportOutlined /></template>
                Voir le menu public
              </a-button>
              <a-button
                @click="impersonateOwner"
                :loading="impersonating"
                :disabled="!restaurant.ownerId"
              >
                <template #icon><LoginOutlined /></template>
                Acceder comme proprietaire
              </a-button>
              <a-button
                :type="restaurant.isActive ? 'default' : 'primary'"
                :danger="restaurant.isActive"
                @click="toggleStatus"
              >
                <template #icon>
                  <StopOutlined v-if="restaurant.isActive" />
                  <CheckCircleOutlined v-else />
                </template>
                {{ restaurant.isActive ? 'Suspendre' : 'Activer' }}
              </a-button>
              <a-button danger @click="deleteRestaurant">
                <template #icon><DeleteOutlined /></template>
                Supprimer
              </a-button>
            </a-space>
          </div>
        </div>
      </a-card>

      <!-- Stats Cards -->
      <a-row :gutter="[16, 16]" class="stats-row">
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card">
            <a-statistic
              title="Commandes"
              :value="stats?.totalOrders || 0"
              :value-style="{ color: '#6366f1' }"
            >
              <template #prefix><ShoppingCartOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card">
            <a-statistic
              title="Revenu total"
              :value="stats?.totalRevenue || 0"
              :precision="0"
              :suffix="currencySymbol"
              :value-style="{ color: '#10b981' }"
            >
              <template #prefix><DollarOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card">
            <a-statistic
              title="Plats"
              :value="stats?.dishes || 0"
              :value-style="{ color: '#f59e0b' }"
            >
              <template #prefix><AppstoreOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card">
            <a-statistic
              title="Categories"
              :value="stats?.categories || 0"
              :value-style="{ color: '#8b5cf6' }"
            >
              <template #prefix><AppstoreOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card">
            <a-statistic
              title="Personnel"
              :value="stats?.staff || 0"
              :value-style="{ color: '#06b6d4' }"
            >
              <template #prefix><TeamOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="4">
          <a-card class="stat-card">
            <a-statistic
              title="Taux completion"
              :value="stats?.totalOrders ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0"
              suffix="%"
              :value-style="{ color: '#22c55e' }"
            >
              <template #prefix><CheckCircleOutlined /></template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- Tabs Content -->
      <a-card class="content-card">
        <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
          <!-- Overview Tab -->
          <a-tab-pane key="overview" tab="Vue d'ensemble">
            <a-row :gutter="[24, 24]">
              <!-- Restaurant Info -->
              <a-col :xs="24" :lg="12">
                <div class="section">
                  <h3 class="section-title">
                    <SettingOutlined />
                    Informations
                  </h3>
                  <a-descriptions :column="1" bordered size="small">
                    <a-descriptions-item label="Email">
                      <MailOutlined class="info-icon" />
                      {{ restaurant.email || 'Non renseigne' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="Telephone">
                      <PhoneOutlined class="info-icon" />
                      {{ restaurant.phone || 'Non renseigne' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="Adresse">
                      <EnvironmentOutlined class="info-icon" />
                      {{ formattedAddress || 'Non renseignee' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="Devise">
                      <DollarOutlined class="info-icon" />
                      {{ restaurant.settings?.currency || 'XOF' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="Langue">
                      <GlobalOutlined class="info-icon" />
                      {{ restaurant.settings?.defaultLanguage?.toUpperCase() || 'FR' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="Date de creation">
                      <CalendarOutlined class="info-icon" />
                      {{ formatDate(restaurant.createdAt) }}
                    </a-descriptions-item>
                  </a-descriptions>
                </div>
              </a-col>

              <!-- Owner Info -->
              <a-col :xs="24" :lg="12">
                <div class="section">
                  <h3 class="section-title">
                    <UserOutlined />
                    Proprietaire
                  </h3>
                  <template v-if="restaurant.ownerId">
                    <div class="owner-card">
                      <a-avatar :size="56" class="owner-avatar">
                        <template #icon><UserOutlined /></template>
                      </a-avatar>
                      <div class="owner-info">
                        <h4>{{ restaurant.ownerId.name }}</h4>
                        <p class="owner-email">{{ restaurant.ownerId.email }}</p>
                        <a-tag color="purple">{{ getRoleLabel(restaurant.ownerId.role) }}</a-tag>
                      </div>
                      <a-button
                        type="primary"
                        ghost
                        @click="impersonateOwner"
                        :loading="impersonating"
                      >
                        <template #icon><LoginOutlined /></template>
                        Se connecter
                      </a-button>
                    </div>
                  </template>
                  <a-empty v-else description="Aucun proprietaire assigne" />
                </div>

                <!-- Quick Links -->
                <div class="section mt-4">
                  <h3 class="section-title">
                    <ExportOutlined />
                    Liens rapides
                  </h3>
                  <a-space direction="vertical" style="width: 100%">
                    <a-button block @click="openPublicMenu">
                      <template #icon><EyeOutlined /></template>
                      Menu public
                    </a-button>
                    <a-button block @click="copyMenuLink">
                      <template #icon><CopyOutlined /></template>
                      Copier le lien du menu
                    </a-button>
                  </a-space>
                </div>
              </a-col>
            </a-row>
          </a-tab-pane>

          <!-- Orders Tab -->
          <a-tab-pane key="orders" tab="Commandes recentes">
            <a-table
              :columns="orderColumns"
              :data-source="recentOrders"
              :loading="ordersLoading"
              :pagination="false"
              row-key="_id"
              :scroll="{ x: 800 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'customer'">
                  <div class="customer-cell">
                    <span class="customer-name">{{ record.customerName || 'Client anonyme' }}</span>
                    <span v-if="record.customerPhone" class="customer-phone">
                      {{ record.customerPhone }}
                    </span>
                  </div>
                </template>
                <template v-else-if="column.key === 'items'">
                  {{ record.items?.length || 0 }}
                </template>
                <template v-else-if="column.key === 'total'">
                  {{ formatCurrency(record.totalAmount) }} {{ currencySymbol }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="getStatusConfig(record.status).color">
                    {{ getStatusConfig(record.status).label }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDate(record.createdAt, true) }}
                </template>
              </template>
              <template #emptyText>
                <a-empty description="Aucune commande recente" />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- Staff Tab -->
          <a-tab-pane key="staff" tab="Personnel">
            <a-table
              :columns="staffColumns"
              :data-source="staff"
              :loading="staffLoading"
              :pagination="{ pageSize: 10 }"
              row-key="_id"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'member'">
                  <div class="member-cell">
                    <a-avatar :size="36">
                      <template #icon><UserOutlined /></template>
                    </a-avatar>
                    <div class="member-info">
                      <span class="member-name">{{ record.name }}</span>
                      <span class="member-email">{{ record.email }}</span>
                    </div>
                  </div>
                </template>
                <template v-else-if="column.key === 'role'">
                  <a-tag :color="record.role === 'owner' ? 'purple' : 'blue'">
                    {{ getRoleLabel(record.role) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="record.isActive ? 'green' : 'red'">
                    {{ record.isActive ? 'Actif' : 'Inactif' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'lastLogin'">
                  <span v-if="record.lastLogin">
                    <ClockCircleOutlined class="icon-muted" />
                    {{ formatDate(record.lastLogin, true) }}
                  </span>
                  <span v-else class="text-muted">Jamais connecte</span>
                </template>
              </template>
              <template #emptyText>
                <a-empty description="Aucun membre du personnel" />
              </template>
            </a-table>
          </a-tab-pane>

          <!-- Menu Tab -->
          <a-tab-pane key="menu" tab="Menu">
            <a-spin :spinning="menuLoading">
              <div v-if="categories.length > 0" class="menu-preview">
                <div
                  v-for="category in categories"
                  :key="category._id"
                  class="category-card"
                >
                  <div class="category-header">
                    <h4>{{ category.name?.fr || 'Sans nom' }}</h4>
                    <a-tag :color="category.isActive ? 'green' : 'red'">
                      {{ category.isActive ? 'Active' : 'Inactive' }}
                    </a-tag>
                  </div>
                  <p v-if="category.description?.fr" class="category-description">
                    {{ category.description.fr }}
                  </p>
                  <p class="category-meta">
                    <AppstoreOutlined />
                    {{ category.dishCount || 0 }} plat(s)
                  </p>
                </div>
              </div>
              <a-empty v-else description="Menu non disponible" />
            </a-spin>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </template>

    <!-- Not Found -->
    <a-result
      v-else
      status="404"
      title="Restaurant non trouve"
      sub-title="Le restaurant demande n'existe pas ou a ete supprime."
    >
      <template #extra>
        <a-button type="primary" @click="router.push('/super-admin/restaurants')">
          Retour aux restaurants
        </a-button>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.restaurant-details {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* Header Card */
.header-card {
  margin-bottom: 24px;
  border-radius: 16px;
}

.restaurant-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-left {
  display: flex;
  gap: 20px;
  flex: 1;
}

.restaurant-avatar {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  flex-shrink: 0;
}

.header-info {
  flex: 1;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.title-row h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.status-tag {
  font-size: 12px;
}

.restaurant-slug {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
  margin-bottom: 8px;
}

.restaurant-description {
  color: #64748b;
  font-size: 14px;
  margin: 0;
  max-width: 600px;
}

.header-actions {
  flex-shrink: 0;
}

/* Stats Row */
.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  text-align: center;
}

.stat-card :deep(.ant-statistic-title) {
  font-size: 12px;
  color: #64748b;
}

.stat-card :deep(.ant-statistic-content) {
  font-size: 24px;
}

/* Content Card */
.content-card {
  border-radius: 16px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.info-icon {
  color: #8b5cf6;
  margin-right: 8px;
}

/* Owner Card */
.owner-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.owner-avatar {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  flex-shrink: 0;
}

.owner-info {
  flex: 1;
}

.owner-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.owner-email {
  color: #64748b;
  font-size: 13px;
  margin: 0 0 8px 0;
}

.mt-4 {
  margin-top: 24px;
}

/* Table Cells */
.customer-cell,
.member-cell {
  display: flex;
  flex-direction: column;
}

.member-cell {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.customer-name,
.member-name {
  font-weight: 500;
  color: #1e293b;
}

.customer-phone,
.member-email {
  font-size: 12px;
  color: #64748b;
}

.icon-muted {
  color: #94a3b8;
  margin-right: 6px;
}

.text-muted {
  color: #94a3b8;
}

/* Menu Preview */
.menu-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.category-card {
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.category-description {
  color: #64748b;
  font-size: 13px;
  margin: 0 0 8px 0;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 12px;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .restaurant-header {
    flex-direction: column;
  }

  .header-left {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .title-row {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions :deep(.ant-space) {
    width: 100%;
  }

  .header-actions :deep(.ant-btn) {
    width: 100%;
  }

  .owner-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
