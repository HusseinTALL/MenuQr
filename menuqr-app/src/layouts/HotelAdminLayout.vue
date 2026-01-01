<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAdminAuthStore } from '@/stores/adminAuth';
import { menuQRTheme, antdLocale } from '@/plugins/antd';
import api from '@/services/api';
import '@/styles/admin-responsive.css';
import {
  HomeOutlined,
  FileTextOutlined,
  TableOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  BankOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  BellOutlined,
  FireOutlined,
  TeamOutlined,
  BookOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  QrcodeOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const authStore = useAdminAuthStore();

const collapsed = ref(false);
const searchQuery = ref('');
const searchVisible = ref(false);
const notificationsVisible = ref(false);
const isMobile = ref(window.innerWidth < 1024);
const mobileDrawerVisible = ref(false);

// Hotel data
interface HotelInfo {
  id: string;
  name: string;
  slug: string;
  starRating?: number;
  settings?: {
    roomService?: { enabled: boolean };
  };
}
const hotel = ref<HotelInfo | null>(null);

// Pending counts for badges
const pendingOrders = ref(0);
const activeGuests = ref(0);

// Fetch hotel info
const fetchHotel = async () => {
  try {
    const res = await api.getMyHotel();
    if (res.success && res.data) {
      hotel.value = res.data as unknown as HotelInfo;
    }
  } catch (e) {
    console.error('Failed to fetch hotel:', e);
  }
};

// Fetch pending counts
const fetchCounts = async () => {
  // TODO: Implement API calls for badge counts
  pendingOrders.value = 0;
  activeGuests.value = 0;
};

// Check if room service is enabled
const isRoomServiceEnabled = computed(() => {
  return hotel.value?.settings?.roomService?.enabled ?? false;
});

// Handle window resize
const handleResize = () => {
  isMobile.value = window.innerWidth < 1024;
  if (!isMobile.value) {
    mobileDrawerVisible.value = false;
  }
};

// Watch for route changes to close mobile drawer
watch(() => route.path, () => {
  mobileDrawerVisible.value = false;
});

// Menu groups configuration
const menuGroups = computed(() => [
  {
    label: 'OPERATIONS',
    items: [
      { key: '/hotel-admin', icon: HomeOutlined, label: 'Dashboard', badge: 0 },
      { key: '/hotel-admin/orders', icon: FileTextOutlined, label: 'Commandes', badge: pendingOrders.value },
      { key: '/hotel-admin/kds', icon: FireOutlined, label: 'Cuisine (KDS)', badge: 0 },
    ],
  },
  {
    label: 'GESTION HOTEL',
    items: [
      { key: '/hotel-admin/rooms', icon: TableOutlined, label: 'Chambres', badge: 0 },
      { key: '/hotel-admin/guests', icon: TeamOutlined, label: 'Clients', badge: activeGuests.value },
      { key: '/hotel-admin/qr-codes', icon: QrcodeOutlined, label: 'QR Codes', badge: 0 },
    ],
  },
  {
    label: 'MENU',
    items: [
      { key: '/hotel-admin/menus', icon: BookOutlined, label: 'Menus', badge: 0 },
      { key: '/hotel-admin/dishes', icon: AppstoreOutlined, label: 'Plats', badge: 0 },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { key: '/hotel-admin/reports', icon: BarChartOutlined, label: 'Rapports', badge: 0 },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { key: '/hotel-admin/staff', icon: UserOutlined, label: 'Personnel', badge: 0 },
      { key: '/hotel-admin/settings', icon: SettingOutlined, label: 'Parametres', badge: 0 },
    ],
  },
]);

// Get selected keys based on current route
const selectedKey = computed(() => {
  const path = route.path;
  if (path === '/hotel-admin' || path === '/hotel-admin/') {
    return '/hotel-admin';
  }
  for (const group of menuGroups.value) {
    const item = group.items.find(i => path.startsWith(i.key) && i.key !== '/hotel-admin');
    if (item) {return item.key;}
  }
  return '/hotel-admin';
});

// Breadcrumb items
const breadcrumbItems = computed(() => {
  const items = [{ title: 'Dashboard', href: '/hotel-admin' }];

  if (route.path !== '/hotel-admin' && route.path !== '/hotel-admin/') {
    for (const group of menuGroups.value) {
      const item = group.items.find(i => route.path.startsWith(i.key) && i.key !== '/hotel-admin');
      if (item) {
        items.push({ title: item.label, href: route.path });
        break;
      }
    }
    if (items.length === 1 && route.meta.title) {
      items.push({ title: route.meta.title as string, href: route.path });
    }
  }

  return items;
});

// Handle menu click
const handleMenuClick = (key: string) => {
  router.push(key);
};

// Handle logout
const handleLogout = async () => {
  await authStore.logout();
  router.push('/hotel-admin/login');
};

// Open public menu
const openPublicMenu = () => {
  if (hotel.value?.slug) {
    window.open(`/hotel/${hotel.value.slug}/menu`, '_blank');
  }
};

// Search functionality
const searchResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) {return [];}
  const query = searchQuery.value.toLowerCase();
  const results: { type: string; label: string; path: string; icon: string }[] = [];

  const quickLinks = [
    { keywords: ['command', 'order'], type: 'page', label: 'Commandes', path: '/hotel-admin/orders', icon: '📋' },
    { keywords: ['kds', 'cuisine', 'kitchen'], type: 'page', label: 'Cuisine (KDS)', path: '/hotel-admin/kds', icon: '🔥' },
    { keywords: ['chambre', 'room'], type: 'page', label: 'Chambres', path: '/hotel-admin/rooms', icon: '🛏️' },
    { keywords: ['client', 'guest'], type: 'page', label: 'Clients', path: '/hotel-admin/guests', icon: '👥' },
    { keywords: ['menu', 'carte'], type: 'page', label: 'Menus', path: '/hotel-admin/menus', icon: '📖' },
    { keywords: ['plat', 'dish'], type: 'page', label: 'Plats', path: '/hotel-admin/dishes', icon: '🍽️' },
    { keywords: ['param', 'setting'], type: 'page', label: 'Parametres', path: '/hotel-admin/settings', icon: '⚙️' },
    { keywords: ['rapport', 'report', 'stat'], type: 'page', label: 'Rapports', path: '/hotel-admin/reports', icon: '📊' },
    { keywords: ['qr', 'code'], type: 'page', label: 'QR Codes', path: '/hotel-admin/qr-codes', icon: '📱' },
  ];

  quickLinks.forEach(link => {
    if (link.keywords.some(k => k.includes(query) || query.includes(k))) {
      results.push(link);
    }
  });

  return results.slice(0, 5);
});

const handleSearch = (value: string) => {
  const firstResult = searchResults.value[0];
  if (value && firstResult) {
    router.push(firstResult.path);
    searchQuery.value = '';
    searchVisible.value = false;
  }
};

const selectSearchResult = (result: { path: string }) => {
  router.push(result.path);
  searchQuery.value = '';
  searchVisible.value = false;
};

// Format relative time - kept for future use
const _formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) {return 'A l\'instant';}
  if (minutes < 60) {return `Il y a ${minutes}min`;}
  if (hours < 24) {return `Il y a ${hours}h`;}
  return new Date(date).toLocaleDateString('fr-FR');
};

// Setup
onMounted(() => {
  window.addEventListener('resize', handleResize);
  fetchHotel();
  fetchCounts();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="admin-layout-wrapper">
    <a-config-provider :theme="menuQRTheme" :locale="antdLocale">
      <a-layout class="min-h-screen">
        <!-- Desktop Sider -->
        <a-layout-sider
          v-if="!isMobile"
          v-model:collapsed="collapsed"
          :width="260"
          :collapsed-width="80"
          theme="dark"
          class="admin-sider"
          :trigger="null"
          collapsible
        >
          <div class="sider-content">
            <!-- Logo & Hotel Info -->
            <div class="sider-header">
              <div class="logo-section">
                <div class="logo-icon hotel">
                  <BankOutlined />
                </div>
                <transition name="fade">
                  <div v-if="!collapsed" class="logo-text">
                    <span class="brand">MenuQR</span>
                    <span class="version">Hotel</span>
                  </div>
                </transition>
              </div>

              <transition name="fade">
                <div v-if="!collapsed && hotel" class="restaurant-info">
                  <p class="restaurant-name">{{ hotel.name }}</p>
                  <div class="restaurant-status">
                    <span v-if="isRoomServiceEnabled" class="status-badge open">
                      <CheckCircleOutlined /> Room Service
                    </span>
                    <span v-else class="status-badge closed">
                      <CloseCircleOutlined /> Desactive
                    </span>
                  </div>
                  <div v-if="hotel.starRating" class="hotel-stars">
                    <span v-for="n in hotel.starRating" :key="n">⭐</span>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Navigation Menu -->
            <nav class="sider-nav">
              <div v-for="group in menuGroups" :key="group.label" class="nav-group">
                <transition name="fade">
                  <div v-if="!collapsed" class="nav-group-label">{{ group.label }}</div>
                </transition>

                <a-tooltip
                  v-for="item in group.items"
                  :key="item.key"
                  :title="collapsed ? item.label : ''"
                  placement="right"
                >
                  <div
                    :class="['nav-item', { active: selectedKey === item.key }]"
                    @click="handleMenuClick(item.key)"
                  >
                    <component :is="item.icon" class="nav-icon" />
                    <transition name="fade">
                      <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
                    </transition>
                    <a-badge
                      v-if="item.badge > 0"
                      :count="item.badge"
                      :class="['nav-badge', { collapsed }]"
                      :number-style="{
                        backgroundColor: '#ef4444',
                        boxShadow: '0 0 0 2px #1a1f2e',
                      }"
                    />
                  </div>
                </a-tooltip>
              </div>
            </nav>

            <!-- User Section (Bottom) -->
            <div class="sider-footer">
              <div :class="['user-section', { collapsed }]">
                <a-avatar :size="collapsed ? 36 : 40" class="user-avatar">
                  <template #icon><UserOutlined /></template>
                </a-avatar>

                <transition name="fade">
                  <div v-if="!collapsed" class="user-info">
                    <p class="user-name">{{ authStore.user?.name || 'Admin' }}</p>
                    <p class="user-email">{{ authStore.user?.email }}</p>
                  </div>
                </transition>
              </div>

              <div :class="['footer-actions', { collapsed }]">
                <a-tooltip :title="collapsed ? 'Voir le menu' : ''" placement="right">
                  <button
                    v-if="hotel?.slug"
                    class="footer-btn"
                    @click="openPublicMenu"
                  >
                    <EyeOutlined />
                    <span v-if="!collapsed">Voir menu</span>
                  </button>
                </a-tooltip>

                <a-tooltip :title="collapsed ? 'Deconnexion' : ''" placement="right">
                  <button class="footer-btn logout" @click="handleLogout">
                    <LogoutOutlined />
                    <span v-if="!collapsed">Deconnexion</span>
                  </button>
                </a-tooltip>
              </div>
            </div>
          </div>
        </a-layout-sider>

        <!-- Mobile Drawer -->
        <a-drawer
          v-if="isMobile"
          v-model:open="mobileDrawerVisible"
          placement="left"
          :width="280"
          :closable="true"
          class="mobile-drawer"
          :body-style="{ padding: 0, background: '#1a1f2e' }"
          :header-style="{ background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.1)' }"
        >
          <template #title>
            <div class="mobile-header">
              <BankOutlined class="mobile-logo-icon" />
              <span class="mobile-brand">MenuQR Hotel</span>
            </div>
          </template>

          <!-- Hotel Info (Mobile) -->
          <div v-if="hotel" class="mobile-restaurant-info">
            <p class="restaurant-name">{{ hotel.name }}</p>
            <span v-if="isRoomServiceEnabled" class="status-badge open">
              <CheckCircleOutlined /> Room Service
            </span>
            <span v-else class="status-badge closed">
              <CloseCircleOutlined /> Desactive
            </span>
          </div>

          <!-- Mobile Navigation -->
          <nav class="mobile-nav">
            <div v-for="group in menuGroups" :key="group.label" class="nav-group">
              <div class="nav-group-label">{{ group.label }}</div>
              <div
                v-for="item in group.items"
                :key="item.key"
                :class="['nav-item', { active: selectedKey === item.key }]"
                @click="handleMenuClick(item.key)"
              >
                <component :is="item.icon" class="nav-icon" />
                <span class="nav-label">{{ item.label }}</span>
                <a-badge
                  v-if="item.badge > 0"
                  :count="item.badge"
                  :number-style="{ backgroundColor: '#ef4444' }"
                />
              </div>
            </div>
          </nav>

          <!-- Mobile Footer -->
          <div class="mobile-footer">
            <div class="user-section">
              <a-avatar :size="40" class="user-avatar">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <div class="user-info">
                <p class="user-name">{{ authStore.user?.name || 'Admin' }}</p>
                <p class="user-email">{{ authStore.user?.email }}</p>
              </div>
            </div>
            <div class="footer-actions">
              <button v-if="hotel?.slug" class="footer-btn" @click="openPublicMenu">
                <EyeOutlined /> Voir menu
              </button>
              <button class="footer-btn logout" @click="handleLogout">
                <LogoutOutlined /> Deconnexion
              </button>
            </div>
          </div>
        </a-drawer>

        <!-- Main Layout -->
        <a-layout :style="{ marginLeft: isMobile ? 0 : collapsed ? '80px' : '260px' }" class="transition-all duration-300">
          <!-- Header -->
          <a-layout-header class="admin-header">
            <div class="header-left">
              <!-- Toggle Button -->
              <a-button
                type="text"
                class="toggle-btn"
                @click="isMobile ? (mobileDrawerVisible = !mobileDrawerVisible) : (collapsed = !collapsed)"
              >
                <template #icon>
                  <MenuUnfoldOutlined v-if="collapsed || isMobile" />
                  <MenuFoldOutlined v-else />
                </template>
              </a-button>

              <!-- Breadcrumb -->
              <a-breadcrumb class="breadcrumb">
                <a-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="index">
                  <router-link v-if="index < breadcrumbItems.length - 1" :to="item.href" class="breadcrumb-link">
                    <HomeOutlined v-if="index === 0" class="mr-1" />
                    {{ item.title }}
                  </router-link>
                  <span v-else class="breadcrumb-current">{{ item.title }}</span>
                </a-breadcrumb-item>
              </a-breadcrumb>
            </div>

            <!-- Header Center: Search Bar -->
            <div class="header-center">
              <a-dropdown
                v-model:open="searchVisible"
                :trigger="['click']"
                placement="bottom"
              >
                <div class="search-input-wrapper">
                  <SearchOutlined class="search-icon" />
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher..."
                    class="search-input"
                    @keydown.enter="handleSearch(searchQuery)"
                    @focus="searchVisible = true"
                  />
                  <span class="search-shortcut">⌘K</span>
                </div>

                <template #overlay>
                  <div v-if="searchResults.length > 0" class="search-dropdown">
                    <div class="search-dropdown-header">Navigation rapide</div>
                    <div
                      v-for="result in searchResults"
                      :key="result.path"
                      class="search-result-item"
                      @click="selectSearchResult(result)"
                    >
                      <span class="result-icon">{{ result.icon }}</span>
                      <span class="result-label">{{ result.label }}</span>
                    </div>
                  </div>
                  <div v-else-if="searchQuery.length >= 2" class="search-dropdown">
                    <div class="search-no-results">Aucun resultat</div>
                  </div>
                </template>
              </a-dropdown>
            </div>

            <!-- Header Right: Notifications & User -->
            <div class="header-right">
              <!-- Notifications Dropdown -->
              <a-dropdown
                v-model:open="notificationsVisible"
                :trigger="['click']"
                placement="bottomRight"
              >
                <a-badge :count="0" :offset="[-4, 4]">
                  <a-button type="text" class="header-icon-btn">
                    <template #icon><BellOutlined /></template>
                  </a-button>
                </a-badge>

                <template #overlay>
                  <div class="notifications-dropdown">
                    <div class="notifications-header">
                      <span class="notifications-title">Notifications</span>
                    </div>

                    <div class="notifications-list">
                      <div class="notifications-empty">
                        <BellOutlined class="empty-icon" />
                        <p>Aucune notification</p>
                      </div>
                    </div>
                  </div>
                </template>
              </a-dropdown>

              <!-- User Dropdown -->
              <a-dropdown :trigger="['click']" placement="bottomRight">
                <div class="user-dropdown-trigger">
                  <a-avatar :size="36" class="header-avatar">
                    <template #icon><UserOutlined /></template>
                  </a-avatar>
                  <span class="header-username">{{ authStore.user?.name }}</span>
                </div>

                <template #overlay>
                  <a-menu class="user-dropdown-menu">
                    <div class="user-dropdown-header">
                      <a-avatar :size="48" class="dropdown-avatar">
                        <template #icon><UserOutlined /></template>
                      </a-avatar>
                      <div class="dropdown-user-info">
                        <p class="dropdown-user-name">{{ authStore.user?.name || 'Admin' }}</p>
                        <p class="dropdown-user-email">{{ authStore.user?.email }}</p>
                      </div>
                    </div>
                    <a-menu-divider />
                    <a-menu-item key="settings" @click="router.push('/hotel-admin/settings')">
                      <SettingOutlined /> Parametres
                    </a-menu-item>
                    <a-menu-item v-if="hotel?.slug" key="menu" @click="openPublicMenu">
                      <EyeOutlined /> Voir le menu public
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="logout" class="logout-item" @click="handleLogout">
                      <LogoutOutlined /> Deconnexion
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </a-layout-header>

          <!-- Content -->
          <a-layout-content class="admin-content">
            <router-view />
          </a-layout-content>
        </a-layout>
      </a-layout>
    </a-config-provider>
  </div>
</template>

<style scoped>
/* Using same styles as AdminLayout with hotel-specific tweaks */
.admin-sider {
  position: fixed !important;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 30;
  background: linear-gradient(180deg, #1a1f2e 0%, #151922 100%) !important;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.admin-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sider-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sider-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
}

.logo-icon.hotel {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.logo-text .brand {
  font-size: 18px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.5px;
}

.logo-text .version {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.restaurant-info {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.restaurant-name {
  font-size: 13px;
  font-weight: 600;
  color: white;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.restaurant-status {
  display: flex;
  align-items: center;
}

.hotel-stars {
  margin-top: 8px;
  font-size: 12px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  font-weight: 500;
}

.status-badge.open {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.status-badge.closed {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.sider-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 0;
}

.sider-nav::-webkit-scrollbar {
  width: 4px;
}

.sider-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sider-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.nav-group {
  margin-bottom: 8px;
}

.nav-group-label {
  padding: 12px 20px 8px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 2px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: rgba(255, 255, 255, 0.7);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%);
  color: #818cf8;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #6366f1;
  border-radius: 0 3px 3px 0;
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.nav-badge {
  margin-left: auto;
}

.nav-badge.collapsed {
  position: absolute;
  top: 6px;
  right: 6px;
}

.sider-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin-bottom: 12px;
}

.user-section.collapsed {
  justify-content: center;
  padding: 8px;
}

.user-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  flex-shrink: 0;
}

.user-info {
  min-width: 0;
  flex: 1;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: white;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.footer-actions.collapsed {
  flex-direction: column;
}

.footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.footer-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.footer-btn.logout {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.footer-btn.logout:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}

/* Mobile Drawer */
.mobile-drawer :deep(.ant-drawer-header) {
  padding: 16px 20px;
}

.mobile-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

.mobile-logo-icon {
  font-size: 20px;
  color: #6366f1;
}

.mobile-brand {
  font-size: 16px;
  font-weight: 700;
}

.mobile-restaurant-info {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 12px 12px;
  border-radius: 10px;
}

.mobile-restaurant-info .restaurant-name {
  margin-bottom: 8px;
}

.mobile-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.mobile-nav .nav-group {
  margin-bottom: 8px;
}

.mobile-nav .nav-group-label {
  padding: 12px 20px 8px;
}

.mobile-nav .nav-item {
  margin: 2px 12px;
}

.mobile-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.mobile-footer .user-section {
  margin-bottom: 12px;
}

.mobile-footer .footer-actions {
  display: flex;
  gap: 8px;
}

.mobile-footer .footer-btn {
  flex: 1;
}

/* Header */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 12px !important;
  background: white !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 20;
  gap: 12px;
}

@media (min-width: 1024px) {
  .admin-header {
    padding: 0 24px !important;
    gap: 24px;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.toggle-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #64748b;
}

.toggle-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.breadcrumb {
  display: none;
}

@media (min-width: 640px) {
  .breadcrumb {
    display: flex;
  }
}

.breadcrumb-link {
  color: #64748b;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #6366f1;
}

.breadcrumb-current {
  color: #1e293b;
  font-weight: 600;
}

/* Header Center: Search */
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 480px;
  margin: 0 auto;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
  height: 40px;
  padding: 0 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: text;
  transition: all 0.2s ease;
}

.search-input-wrapper:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.search-input-wrapper:focus-within {
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.search-icon {
  color: #94a3b8;
  font-size: 16px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: #1e293b;
  padding: 0 12px;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-shortcut {
  font-size: 11px;
  padding: 3px 6px;
  background: #e2e8f0;
  border-radius: 4px;
  color: #64748b;
  font-weight: 500;
  display: none;
}

@media (min-width: 768px) {
  .search-shortcut {
    display: inline;
  }
}

.search-dropdown {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  min-width: 300px;
}

.search-dropdown-header {
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-result-item:hover {
  background: #f1f5f9;
}

.result-icon {
  font-size: 18px;
}

.result-label {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.search-no-results {
  padding: 24px 16px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

@media (max-width: 575px) {
  .header-center {
    display: none;
  }
}

/* Header Right */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .header-right {
    gap: 12px;
  }
}

.header-icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #64748b;
  font-size: 18px;
}

.header-icon-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.notifications-dropdown {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  width: 360px;
  max-width: calc(100vw - 24px);
  overflow: hidden;
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.notifications-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notifications-empty {
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
}

.notifications-empty .empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.notifications-empty p {
  margin: 0;
  font-size: 13px;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 4px 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-dropdown-trigger:hover {
  background: #f1f5f9;
}

.header-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  cursor: pointer;
}

.header-username {
  display: none;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

@media (min-width: 768px) {
  .header-username {
    display: inline;
  }
}

.user-dropdown-menu {
  min-width: 240px;
  border-radius: 12px !important;
  overflow: hidden;
  padding: 0 !important;
}

.user-dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
}

.dropdown-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  flex-shrink: 0;
}

.dropdown-user-info {
  min-width: 0;
}

.dropdown-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 2px 0;
}

.dropdown-user-email {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dropdown-menu :deep(.ant-dropdown-menu-item) {
  padding: 10px 16px;
}

.user-dropdown-menu .logout-item {
  color: #ef4444;
}

.user-dropdown-menu .logout-item:hover {
  background: #fef2f2;
}

/* Content Area */
.admin-content {
  margin: 16px;
  min-height: calc(100vh - 64px - 32px);
}

@media (min-width: 1024px) {
  .admin-content {
    margin: 24px;
    min-height: calc(100vh - 64px - 48px);
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
