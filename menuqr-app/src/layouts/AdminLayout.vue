<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAdminAuthStore } from '@/stores/adminAuth';
import { useSidebarBadges } from '@/composables/useSidebarBadges';
import { useNotifications } from '@/composables/useNotifications';
import { menuQRTheme, antdLocale } from '@/plugins/antd';
import api from '@/services/api';
import '@/styles/admin-responsive.css';
import {
  HomeOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TableOutlined,
  BookOutlined,
  AppstoreOutlined,
  SettingOutlined,
  MessageOutlined,
  StarOutlined,
  CreditCardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  ShopOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  BellOutlined,
  ClockCircleOutlined,
  FireOutlined,
  CarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const authStore = useAdminAuthStore();
const { badges } = useSidebarBadges();
const { notifications, unreadCount, hasUnread, markAsRead, markAllAsRead } = useNotifications();

const collapsed = ref(false);
const searchQuery = ref('');
const searchVisible = ref(false);
const notificationsVisible = ref(false);
const isMobile = ref(window.innerWidth < 1024);
const mobileDrawerVisible = ref(false);

// Restaurant data
interface RestaurantInfo {
  name: string;
  slug: string;
  settings?: { openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }> };
}
const restaurant = ref<RestaurantInfo | null>(null);

// Fetch restaurant info
const fetchRestaurant = async () => {
  try {
    const res = await api.getMyRestaurant();
    if (res.success && res.data) {
      restaurant.value = res.data as unknown as RestaurantInfo;
    }
  } catch (e) {
    console.error('Failed to fetch restaurant:', e);
  }
};

// Check if restaurant is currently open
const isRestaurantOpen = computed(() => {
  if (!restaurant.value?.settings?.openingHours) {return null;}

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const today = dayNames[now.getDay()];
  if (!today) {return null;}
  const hours = restaurant.value.settings.openingHours[today];

  if (!hours || hours.closed) {return false;}

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const openParts = (hours.open || '08:00').split(':').map(Number);
  const closeParts = (hours.close || '22:00').split(':').map(Number);
  const openH = openParts[0] ?? 8;
  const openM = openParts[1] ?? 0;
  const closeH = closeParts[0] ?? 22;
  const closeM = closeParts[1] ?? 0;
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  return currentTime >= openTime && currentTime <= closeTime;
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
    label: 'OPÉRATIONS',
    items: [
      { key: '/admin', icon: HomeOutlined, label: 'Dashboard', badge: 0 },
      { key: '/admin/orders', icon: FileTextOutlined, label: 'Commandes', badge: badges.value.pendingOrders },
      { key: '/admin/deliveries', icon: ShopOutlined, label: 'Livraisons', badge: 0 },
      { key: '/admin/delivery-batching', icon: ThunderboltOutlined, label: 'Lots', badge: 0 },
      { key: '/admin/kds', icon: FireOutlined, label: 'Cuisine (KDS)', badge: 0 },
      { key: '/admin/reservations', icon: CalendarOutlined, label: 'Réservations', badge: badges.value.todayReservations },
      { key: '/admin/tables', icon: TableOutlined, label: 'Tables', badge: 0 },
    ],
  },
  {
    label: 'CATALOGUE',
    items: [
      { key: '/admin/dishes', icon: BookOutlined, label: 'Menu', badge: 0 },
      { key: '/admin/categories', icon: AppstoreOutlined, label: 'Catégories', badge: 0 },
    ],
  },
  {
    label: 'MARKETING',
    items: [
      { key: '/admin/campaigns', icon: MessageOutlined, label: 'Campagnes SMS', badge: 0 },
      { key: '/admin/loyalty', icon: StarOutlined, label: 'Fidélité', badge: 0 },
    ],
  },
  {
    label: 'GESTION',
    items: [
      { key: '/admin/staff', icon: UserOutlined, label: 'Personnel', badge: 0 },
      { key: '/admin/drivers', icon: CarOutlined, label: 'Livreurs', badge: 0 },
      { key: '/admin/reviews', icon: StarOutlined, label: 'Avis Clients', badge: badges.value.pendingReviews },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { key: '/admin/billing', icon: CreditCardOutlined, label: 'Abonnement', badge: 0 },
      { key: '/admin/settings', icon: SettingOutlined, label: 'Paramètres', badge: 0 },
    ],
  },
]);

// Get selected keys based on current route
const selectedKey = computed(() => {
  const path = route.path;
  if (path === '/admin' || path === '/admin/') {
    return '/admin';
  }
  // Find matching menu item
  for (const group of menuGroups.value) {
    const item = group.items.find(i => path.startsWith(i.key) && i.key !== '/admin');
    if (item) {return item.key;}
  }
  return '/admin';
});

// Breadcrumb items
const breadcrumbItems = computed(() => {
  const items = [{ title: 'Dashboard', href: '/admin' }];

  if (route.path !== '/admin' && route.path !== '/admin/') {
    for (const group of menuGroups.value) {
      const item = group.items.find(i => route.path.startsWith(i.key) && i.key !== '/admin');
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
  router.push('/admin/login');
};

// Open public menu
const openPublicMenu = () => {
  if (restaurant.value?.slug) {
    window.open(`/menu/${restaurant.value.slug}`, '_blank');
  }
};

// Search functionality
const searchResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) {return [];}
  // Return quick search suggestions
  const query = searchQuery.value.toLowerCase();
  const results: { type: string; label: string; path: string; icon: string }[] = [];

  // Quick links based on query
  const quickLinks = [
    { keywords: ['command', 'order'], type: 'page', label: 'Commandes', path: '/admin/orders', icon: '📋' },
    { keywords: ['kds', 'cuisine', 'kitchen', 'cuisinier'], type: 'page', label: 'Cuisine (KDS)', path: '/admin/kds', icon: '🔥' },
    { keywords: ['reserv', 'table'], type: 'page', label: 'Réservations', path: '/admin/reservations', icon: '📅' },
    { keywords: ['menu', 'plat', 'dish'], type: 'page', label: 'Menu / Plats', path: '/admin/dishes', icon: '🍽️' },
    { keywords: ['categ'], type: 'page', label: 'Catégories', path: '/admin/categories', icon: '📁' },
    { keywords: ['campag', 'sms'], type: 'page', label: 'Campagnes SMS', path: '/admin/campaigns', icon: '📱' },
    { keywords: ['fidel', 'loyal'], type: 'page', label: 'Fidélité', path: '/admin/loyalty', icon: '⭐' },
    { keywords: ['param', 'setting', 'config'], type: 'page', label: 'Paramètres', path: '/admin/settings', icon: '⚙️' },
    { keywords: ['avis', 'review'], type: 'page', label: 'Avis clients', path: '/admin/reviews', icon: '💬' },
    { keywords: ['dash', 'tableau'], type: 'page', label: 'Dashboard', path: '/admin', icon: '📊' },
    { keywords: ['table'], type: 'page', label: 'Tables', path: '/admin/tables', icon: '🪑' },
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

// Notification click handler
const handleNotificationClick = (notification: { id: string; link?: string }) => {
  markAsRead(notification.id);
  if (notification.link) {
    router.push(notification.link);
  }
  notificationsVisible.value = false;
};

// Format relative time for notifications
const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) {return 'À l\'instant';}
  if (minutes < 60) {return `Il y a ${minutes}min`;}
  if (hours < 24) {return `Il y a ${hours}h`;}
  return new Date(date).toLocaleDateString('fr-FR');
};

// Get notification icon based on type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'order': return '📋';
    case 'reservation': return '📅';
    case 'review': return '⭐';
    default: return '🔔';
  }
};

// Setup
onMounted(() => {
  window.addEventListener('resize', handleResize);
  fetchRestaurant();
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
            <!-- Logo & Restaurant Info -->
            <div class="sider-header">
              <div class="logo-section">
                <div class="logo-icon">
                  <ShopOutlined />
                </div>
                <transition name="fade">
                  <div v-if="!collapsed" class="logo-text">
                    <span class="brand">MenuQR</span>
                    <span class="version">Admin</span>
                  </div>
                </transition>
              </div>

              <transition name="fade">
                <div v-if="!collapsed && restaurant" class="restaurant-info">
                  <p class="restaurant-name">{{ restaurant.name }}</p>
                  <div class="restaurant-status">
                    <span v-if="isRestaurantOpen === true" class="status-badge open">
                      <CheckCircleOutlined /> Ouvert
                    </span>
                    <span v-else-if="isRestaurantOpen === false" class="status-badge closed">
                      <CloseCircleOutlined /> Fermé
                    </span>
                    <span v-else class="status-badge unknown">
                      Horaires non définis
                    </span>
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
                    v-if="restaurant?.slug"
                    class="footer-btn"
                    @click="openPublicMenu"
                  >
                    <EyeOutlined />
                    <span v-if="!collapsed">Voir menu</span>
                  </button>
                </a-tooltip>

                <a-tooltip :title="collapsed ? 'Déconnexion' : ''" placement="right">
                  <button class="footer-btn logout" @click="handleLogout">
                    <LogoutOutlined />
                    <span v-if="!collapsed">Déconnexion</span>
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
              <ShopOutlined class="mobile-logo-icon" />
              <span class="mobile-brand">MenuQR Admin</span>
            </div>
          </template>

          <!-- Restaurant Info (Mobile) -->
          <div v-if="restaurant" class="mobile-restaurant-info">
            <p class="restaurant-name">{{ restaurant.name }}</p>
            <span v-if="isRestaurantOpen === true" class="status-badge open">
              <CheckCircleOutlined /> Ouvert
            </span>
            <span v-else-if="isRestaurantOpen === false" class="status-badge closed">
              <CloseCircleOutlined /> Fermé
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
              <button v-if="restaurant?.slug" class="footer-btn" @click="openPublicMenu">
                <EyeOutlined /> Voir menu
              </button>
              <button class="footer-btn logout" @click="handleLogout">
                <LogoutOutlined /> Déconnexion
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
                    <div class="search-no-results">Aucun résultat</div>
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
                <a-badge :count="unreadCount" :offset="[-4, 4]">
                  <a-button type="text" class="header-icon-btn">
                    <template #icon><BellOutlined /></template>
                  </a-button>
                </a-badge>

                <template #overlay>
                  <div class="notifications-dropdown">
                    <div class="notifications-header">
                      <span class="notifications-title">Notifications</span>
                      <a-button
                        v-if="hasUnread"
                        type="link"
                        size="small"
                        @click="markAllAsRead"
                      >
                        Tout marquer lu
                      </a-button>
                    </div>

                    <div class="notifications-list">
                      <template v-if="notifications.length > 0">
                        <div
                          v-for="notif in notifications"
                          :key="notif.id"
                          :class="['notification-item', { unread: !notif.read }]"
                          @click="handleNotificationClick(notif)"
                        >
                          <span class="notif-icon">{{ getNotificationIcon(notif.type) }}</span>
                          <div class="notif-content">
                            <p class="notif-title">{{ notif.title }}</p>
                            <p class="notif-message">{{ notif.message }}</p>
                            <span class="notif-time">
                              <ClockCircleOutlined /> {{ formatRelativeTime(notif.createdAt) }}
                            </span>
                          </div>
                          <span v-if="!notif.read" class="notif-dot"></span>
                        </div>
                      </template>
                      <div v-else class="notifications-empty">
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
                    <a-menu-item key="settings" @click="router.push('/admin/settings')">
                      <SettingOutlined /> Paramètres
                    </a-menu-item>
                    <a-menu-item v-if="restaurant?.slug" key="menu" @click="openPublicMenu">
                      <EyeOutlined /> Voir le menu public
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="logout" class="logout-item" @click="handleLogout">
                      <LogoutOutlined /> Déconnexion
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
/* ============================================
   Sidebar Base Styles
   ============================================ */
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

/* ============================================
   Sidebar Header (Logo + Restaurant)
   ============================================ */
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

.status-badge.unknown {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  font-size: 10px;
}

/* ============================================
   Navigation Menu
   ============================================ */
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
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%);
  color: #14b8a6;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #14b8a6;
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

/* ============================================
   Sidebar Footer (User Section)
   ============================================ */
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
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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

/* ============================================
   Mobile Drawer
   ============================================ */
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
  color: #14b8a6;
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

/* ============================================
   Header
   ============================================ */
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
  color: #14b8a6;
}

.breadcrumb-current {
  color: #1e293b;
  font-weight: 600;
}

/* ============================================
   Header Center: Search
   ============================================ */
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
  border-color: #14b8a6;
  background: white;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
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

/* Search Dropdown */
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

/* Hide search on very small screens */
@media (max-width: 575px) {
  .header-center {
    display: none;
  }
}

/* ============================================
   Header Right: Notifications & User
   ============================================ */
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

/* Notifications Dropdown */
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

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item.unread {
  background: #f0fdfa;
}

.notification-item.unread:hover {
  background: #e6fffa;
}

.notif-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.notif-message {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 6px 0;
  line-height: 1.4;
}

.notif-time {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.notif-dot {
  width: 8px;
  height: 8px;
  background: #14b8a6;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
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

/* User Dropdown */
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
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
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

/* User Dropdown Menu */
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
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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

/* ============================================
   Content Area
   ============================================ */
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

/* ============================================
   Transitions
   ============================================ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
