<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSuperAdminAuthStore } from '@/stores/superAdminAuth';
import { useAlertNotifications } from '@/composables/useAlertNotifications';
import { menuQRTheme, antdLocale } from '@/plugins/antd';
import {
  DashboardOutlined,
  ShopOutlined,
  TeamOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  LoginOutlined,
  AlertOutlined,
  BellOutlined,
  ToolOutlined,
  MonitorOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const authStore = useSuperAdminAuthStore();

// Alert notifications
const {
  alertStats,
  recentAlerts,
  unreadCount,
  criticalCount,
  hasCritical,
  fetchRecentAlerts,
} = useAlertNotifications();

const notificationDropdownVisible = ref(false);

// Type icons for alerts
const alertTypeIcons: Record<string, typeof InfoCircleOutlined> = {
  info: InfoCircleOutlined,
  warning: WarningOutlined,
  error: CloseCircleOutlined,
  critical: ThunderboltOutlined,
};

const alertTypeColors: Record<string, string> = {
  info: '#1890ff',
  warning: '#faad14',
  error: '#ff4d4f',
  critical: '#eb2f96',
};

const priorityColors: Record<string, string> = {
  low: '#8c8c8c',
  medium: '#1890ff',
  high: '#fa8c16',
  urgent: '#f5222d',
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {return "A l'instant";}
  if (diffMins < 60) {return `Il y a ${diffMins} min`;}
  if (diffHours < 24) {return `Il y a ${diffHours}h`;}
  if (diffDays < 7) {return `Il y a ${diffDays}j`;}
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
};

const handleNotificationDropdownVisible = (visible: boolean) => {
  notificationDropdownVisible.value = visible;
  if (visible) {
    fetchRecentAlerts(5);
  }
};

const navigateToAlerts = () => {
  notificationDropdownVisible.value = false;
  router.push('/super-admin/alerts');
};

const collapsed = ref(false);
const isMobile = ref(window.innerWidth < 1024);
const mobileDrawerVisible = ref(false);

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

// Menu groups configuration for Super Admin
const menuGroups = computed(() => [
  {
    label: 'VUE D\'ENSEMBLE',
    items: [
      { key: '/super-admin', icon: DashboardOutlined, label: 'Dashboard' },
      { key: '/super-admin/analytics', icon: BarChartOutlined, label: 'Analytics' },
    ],
  },
  {
    label: 'GESTION',
    items: [
      { key: '/super-admin/restaurants', icon: ShopOutlined, label: 'Restaurants' },
      { key: '/super-admin/users', icon: TeamOutlined, label: 'Utilisateurs' },
    ],
  },
  {
    label: 'FACTURATION',
    items: [
      { key: '/super-admin/subscription-plans', icon: CreditCardOutlined, label: 'Plans' },
      { key: '/super-admin/subscriptions', icon: FileTextOutlined, label: 'Abonnements' },
      { key: '/super-admin/invoices', icon: FileTextOutlined, label: 'Factures' },
    ],
  },
  {
    label: 'AUDIT & SÉCURITÉ',
    items: [
      { key: '/super-admin/audit-logs', icon: AuditOutlined, label: 'Journal d\'activité' },
      { key: '/super-admin/login-history', icon: LoginOutlined, label: 'Connexions' },
      { key: '/super-admin/alerts', icon: AlertOutlined, label: 'Alertes système' },
    ],
  },
  {
    label: 'OUTILS AVANCÉS',
    items: [
      { key: '/super-admin/tools', icon: ToolOutlined, label: 'Outils' },
      { key: '/super-admin/monitoring', icon: MonitorOutlined, label: 'Monitoring' },
    ],
  },
  {
    label: 'SYSTEME',
    items: [
      { key: '/super-admin/reports', icon: FileTextOutlined, label: 'Rapports' },
      { key: '/super-admin/notifications', icon: BellOutlined, label: 'Notifications' },
      { key: '/super-admin/settings', icon: SettingOutlined, label: 'Paramètres' },
    ],
  },
]);

// Get selected keys based on current route
const selectedKey = computed(() => {
  const path = route.path;
  if (path === '/super-admin' || path === '/super-admin/') {
    return '/super-admin';
  }
  // Find matching menu item
  for (const group of menuGroups.value) {
    const item = group.items.find(i => path.startsWith(i.key) && i.key !== '/super-admin');
    if (item) {return item.key;}
  }
  return '/super-admin';
});

// Breadcrumb items
const breadcrumbItems = computed(() => {
  const items = [{ title: 'Dashboard', href: '/super-admin' }];

  if (route.path !== '/super-admin' && route.path !== '/super-admin/') {
    for (const group of menuGroups.value) {
      const item = group.items.find(i => route.path.startsWith(i.key) && i.key !== '/super-admin');
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
  router.push('/super-admin/login');
};

// Setup
onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="super-admin-layout-wrapper">
    <a-config-provider :theme="menuQRTheme" :locale="antdLocale">
      <a-layout class="min-h-screen">
        <!-- Desktop Sider -->
        <a-layout-sider
          v-if="!isMobile"
          v-model:collapsed="collapsed"
          :width="260"
          :collapsed-width="80"
          theme="dark"
          class="super-admin-sider"
          :trigger="null"
          collapsible
        >
          <div class="sider-content">
            <!-- Logo -->
            <div class="sider-header">
              <div class="logo-section">
                <div class="logo-icon">
                  <SafetyCertificateOutlined />
                </div>
                <transition name="fade">
                  <div v-if="!collapsed" class="logo-text">
                    <span class="brand">MenuQR</span>
                    <span class="version">Super Admin</span>
                  </div>
                </transition>
              </div>
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
                    <p class="user-name">{{ authStore.user?.name || 'Super Admin' }}</p>
                    <p class="user-email">{{ authStore.user?.email }}</p>
                  </div>
                </transition>
              </div>

              <div :class="['footer-actions', { collapsed }]">
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
          :body-style="{ padding: 0, background: '#0f172a' }"
          :header-style="{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)' }"
        >
          <template #title>
            <div class="mobile-header">
              <SafetyCertificateOutlined class="mobile-logo-icon" />
              <span class="mobile-brand">Super Admin</span>
            </div>
          </template>

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
                <p class="user-name">{{ authStore.user?.name || 'Super Admin' }}</p>
                <p class="user-email">{{ authStore.user?.email }}</p>
              </div>
            </div>
            <div class="footer-actions">
              <button class="footer-btn logout" @click="handleLogout">
                <LogoutOutlined /> Déconnexion
              </button>
            </div>
          </div>
        </a-drawer>

        <!-- Main Layout -->
        <a-layout :style="{ marginLeft: isMobile ? 0 : collapsed ? '80px' : '260px' }" class="transition-all duration-300">
          <!-- Header -->
          <a-layout-header class="super-admin-header">
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

            <!-- Header Right: Notifications + User -->
            <div class="header-right">
              <!-- Notification Bell -->
              <a-dropdown
                :open="notificationDropdownVisible"
                :trigger="['click']"
                placement="bottomRight"
                @openChange="handleNotificationDropdownVisible"
              >
                <div :class="['notification-trigger', { 'has-critical': hasCritical }]">
                  <a-badge
                    :count="unreadCount"
                    :overflow-count="99"
                    :dot="false"
                    :class="{ 'critical-badge': hasCritical }"
                  >
                    <BellOutlined class="notification-icon" />
                  </a-badge>
                </div>

                <template #overlay>
                  <div class="notification-dropdown">
                    <div class="notification-header">
                      <span class="notification-title">Alertes Systeme</span>
                      <a-badge
                        v-if="criticalCount > 0"
                        :count="criticalCount"
                        class="critical-count"
                        style="background-color: #eb2f96"
                      />
                    </div>

                    <div v-if="recentAlerts.length === 0" class="notification-empty">
                      <CheckCircleOutlined class="empty-icon" />
                      <span>Aucune alerte en attente</span>
                    </div>

                    <div v-else class="notification-list">
                      <div
                        v-for="alert in recentAlerts"
                        :key="alert._id"
                        :class="['notification-item', `type-${alert.type}`]"
                        @click="navigateToAlerts"
                      >
                        <div class="notification-item-icon" :style="{ color: alertTypeColors[alert.type] }">
                          <component :is="alertTypeIcons[alert.type]" />
                        </div>
                        <div class="notification-item-content">
                          <div class="notification-item-title">{{ alert.title }}</div>
                          <div class="notification-item-meta">
                            <span
                              class="notification-priority"
                              :style="{ color: priorityColors[alert.priority] }"
                            >
                              {{ alert.priority === 'urgent' ? 'Urgent' : alert.priority === 'high' ? 'Haute' : '' }}
                            </span>
                            <span class="notification-time">
                              <ClockCircleOutlined /> {{ formatTimeAgo(alert.createdAt) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="notification-footer">
                      <a-button type="link" block @click="navigateToAlerts">
                        Voir toutes les alertes
                        <span v-if="alertStats?.total?.unresolved" class="footer-count">
                          ({{ alertStats.total.unresolved }})
                        </span>
                      </a-button>
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
                        <p class="dropdown-user-name">{{ authStore.user?.name || 'Super Admin' }}</p>
                        <p class="dropdown-user-email">{{ authStore.user?.email }}</p>
                        <a-tag color="purple" class="role-tag">Super Admin</a-tag>
                      </div>
                    </div>
                    <a-menu-divider />
                    <a-menu-item key="settings" @click="router.push('/super-admin/settings')">
                      <SettingOutlined /> Paramètres
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
          <a-layout-content class="super-admin-content">
            <router-view />
          </a-layout-content>
        </a-layout>
      </a-layout>
    </a-config-provider>
  </div>
</template>

<style scoped>
/* ============================================
   Sidebar Base Styles - Purple/Indigo Theme
   ============================================ */
.super-admin-sider {
  position: fixed !important;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 30;
  background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%) !important;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.super-admin-sider :deep(.ant-layout-sider-children) {
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
   Sidebar Header (Logo)
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
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
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
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 1px;
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
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%);
  color: #a78bfa;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #8b5cf6;
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
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
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
  color: #a78bfa;
}

.mobile-brand {
  font-size: 16px;
  font-weight: 700;
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
.super-admin-header {
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
  .super-admin-header {
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
  color: #8b5cf6;
}

.breadcrumb-current {
  color: #1e293b;
  font-weight: 600;
}

/* ============================================
   Header Right
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
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
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
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
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
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-tag {
  font-size: 10px;
  padding: 0 6px;
  line-height: 18px;
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
.super-admin-content {
  margin: 16px;
  min-height: calc(100vh - 64px - 32px);
}

@media (min-width: 1024px) {
  .super-admin-content {
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

/* ============================================
   Notification Bell & Dropdown
   ============================================ */
.notification-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-trigger:hover {
  background: #f1f5f9;
}

.notification-trigger.has-critical {
  animation: pulse-critical 2s infinite;
}

@keyframes pulse-critical {
  0%, 100% {
    background: transparent;
  }
  50% {
    background: rgba(235, 47, 150, 0.1);
  }
}

.notification-icon {
  font-size: 20px;
  color: #64748b;
}

.notification-trigger:hover .notification-icon {
  color: #8b5cf6;
}

.notification-trigger.has-critical .notification-icon {
  color: #eb2f96;
}

.critical-badge :deep(.ant-badge-count) {
  background-color: #eb2f96 !important;
  box-shadow: 0 0 0 2px white, 0 0 8px rgba(235, 47, 150, 0.4);
}

/* Notification Dropdown */
.notification-dropdown {
  width: 360px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

@media (max-width: 640px) {
  .notification-dropdown {
    width: 300px;
  }
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
}

.notification-title {
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.notification-empty .empty-icon {
  font-size: 36px;
  color: #52c41a;
  margin-bottom: 12px;
}

.notification-list {
  max-height: 360px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f1f5f9;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.type-critical {
  background: linear-gradient(90deg, rgba(235, 47, 150, 0.05) 0%, transparent 100%);
}

.notification-item.type-critical:hover {
  background: linear-gradient(90deg, rgba(235, 47, 150, 0.1) 0%, #f8fafc 100%);
}

.notification-item.type-error {
  background: linear-gradient(90deg, rgba(255, 77, 79, 0.05) 0%, transparent 100%);
}

.notification-item-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 16px;
}

.notification-item.type-critical .notification-item-icon {
  background: rgba(235, 47, 150, 0.1);
}

.notification-item.type-error .notification-item-icon {
  background: rgba(255, 77, 79, 0.1);
}

.notification-item.type-warning .notification-item-icon {
  background: rgba(250, 173, 20, 0.1);
}

.notification-item-content {
  flex: 1;
  min-width: 0;
}

.notification-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.notification-priority {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notification-time {
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.notification-footer {
  padding: 8px 12px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.notification-footer .ant-btn {
  color: #8b5cf6;
  font-weight: 500;
}

.notification-footer .ant-btn:hover {
  color: #7c3aed;
}

.footer-count {
  color: #94a3b8;
  margin-left: 4px;
}
</style>
