<script setup lang="ts">
import { ref, computed, watch, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAdminAuthStore } from '@/stores/adminAuth';
import { menuQRTheme, antdLocale } from '@/plugins/antd';
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
} from '@ant-design/icons-vue';
import type { MenuProps } from 'ant-design-vue';
import type { ItemType } from 'ant-design-vue/es/menu/src/interface';

const router = useRouter();
const route = useRoute();
const authStore = useAdminAuthStore();

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

// Setup resize listener
if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleResize);
}

// Menu items with icons
const menuItems = computed<ItemType[]>(() => [
  {
    key: '/admin',
    icon: () => h(HomeOutlined),
    label: 'Dashboard',
  },
  {
    key: '/admin/orders',
    icon: () => h(FileTextOutlined),
    label: 'Commandes',
  },
  {
    key: '/admin/reservations',
    icon: () => h(CalendarOutlined),
    label: 'Réservations',
  },
  {
    key: '/admin/tables',
    icon: () => h(TableOutlined),
    label: 'Tables',
  },
  {
    type: 'divider',
  },
  {
    key: '/admin/dishes',
    icon: () => h(BookOutlined),
    label: 'Menu',
  },
  {
    key: '/admin/categories',
    icon: () => h(AppstoreOutlined),
    label: 'Catégories',
  },
  {
    type: 'divider',
  },
  {
    key: '/admin/campaigns',
    icon: () => h(MessageOutlined),
    label: 'Campagnes SMS',
  },
  {
    key: '/admin/loyalty',
    icon: () => h(StarOutlined),
    label: 'Fidélité',
  },
  {
    key: '/admin/pricing',
    icon: () => h(CreditCardOutlined),
    label: 'Abonnements',
  },
  {
    type: 'divider',
  },
  {
    key: '/admin/settings',
    icon: () => h(SettingOutlined),
    label: 'Paramètres',
  },
]);

// Get selected keys based on current route
const selectedKeys = computed(() => {
  const path = route.path;
  // Exact match for dashboard
  if (path === '/admin' || path === '/admin/') {
    return ['/admin'];
  }
  // Find matching menu item
  const menuKey = menuItems.value.find((item) => {
    if (item && 'key' in item && typeof item.key === 'string') {
      return path.startsWith(item.key) && item.key !== '/admin';
    }
    return false;
  });
  return menuKey && 'key' in menuKey ? [menuKey.key as string] : ['/admin'];
});

// Breadcrumb items
const breadcrumbItems = computed(() => {
  const items = [{ title: 'Dashboard', href: '/admin' }];

  if (route.path !== '/admin' && route.path !== '/admin/') {
    const currentItem = menuItems.value.find((item) => {
      if (item && 'key' in item) {
        return item.key === route.path || route.path.startsWith(item.key as string);
      }
      return false;
    });
    if (currentItem && 'label' in currentItem) {
      items.push({ title: currentItem.label as string, href: route.path });
    } else if (route.meta.title) {
      items.push({ title: route.meta.title as string, href: route.path });
    }
  }

  return items;
});

// Handle menu click
const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
  router.push(key as string);
};

// Handle logout
const handleLogout = async () => {
  await authStore.logout();
  router.push('/admin/login');
};

// User dropdown menu items
const userMenuItems = computed(() => [
  {
    key: 'user-info',
    label: h('div', { class: 'px-1 py-2' }, [
      h('p', { class: 'font-medium text-gray-900' }, authStore.user?.name || 'Admin'),
      h('p', { class: 'text-xs text-gray-500' }, authStore.user?.email || ''),
    ]),
    disabled: true,
  },
  {
    type: 'divider',
  },
  {
    key: 'logout',
    icon: () => h(LogoutOutlined),
    label: 'Déconnexion',
    danger: true,
  },
]);

const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
  if (key === 'logout') {
    handleLogout();
  }
};
</script>

<template>
  <a-config-provider :theme="menuQRTheme" :locale="antdLocale">
    <a-layout class="min-h-screen">
      <!-- Desktop Sider -->
      <a-layout-sider
        v-if="!isMobile"
        v-model:collapsed="collapsed"
        :width="256"
        :collapsed-width="80"
        theme="dark"
        class="!fixed left-0 top-0 bottom-0 z-30 overflow-auto"
        :trigger="null"
        collapsible
      >
        <!-- Logo -->
        <div class="h-16 flex items-center justify-center border-b border-gray-800">
          <span v-if="!collapsed" class="text-xl font-bold text-white">MenuQR</span>
          <span v-else class="text-xl font-bold text-white">M</span>
        </div>

        <!-- Navigation Menu -->
        <a-menu
          v-model:selectedKeys="selectedKeys"
          theme="dark"
          mode="inline"
          :items="menuItems"
          class="border-none mt-2"
          @click="handleMenuClick"
        />
      </a-layout-sider>

      <!-- Mobile Drawer -->
      <a-drawer
        v-if="isMobile"
        v-model:open="mobileDrawerVisible"
        placement="left"
        :width="280"
        :closable="true"
        :body-style="{ padding: 0, background: '#111827' }"
        :header-style="{ background: '#111827', borderBottom: '1px solid #1f2937' }"
      >
        <template #title>
          <span class="text-white font-bold">MenuQR Admin</span>
        </template>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          theme="dark"
          mode="inline"
          :items="menuItems"
          class="border-none"
          @click="handleMenuClick"
        />
      </a-drawer>

      <!-- Main Layout -->
      <a-layout :style="{ marginLeft: isMobile ? 0 : collapsed ? '80px' : '256px' }" class="transition-all duration-300">
        <!-- Header -->
        <a-layout-header class="!bg-white !px-4 lg:!px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <div class="flex items-center gap-4">
            <!-- Toggle Button -->
            <a-button
              type="text"
              @click="isMobile ? (mobileDrawerVisible = !mobileDrawerVisible) : (collapsed = !collapsed)"
            >
              <template #icon>
                <MenuUnfoldOutlined v-if="collapsed || isMobile" />
                <MenuFoldOutlined v-else />
              </template>
            </a-button>

            <!-- Breadcrumb -->
            <a-breadcrumb class="hidden sm:flex">
              <a-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="index">
                <router-link v-if="index < breadcrumbItems.length - 1" :to="item.href" class="text-gray-500 hover:text-teal-600">
                  <HomeOutlined v-if="index === 0" class="mr-1" />
                  {{ item.title }}
                </router-link>
                <span v-else class="text-gray-900 font-medium">{{ item.title }}</span>
              </a-breadcrumb-item>
            </a-breadcrumb>
          </div>

          <!-- User Menu -->
          <a-dropdown :trigger="['click']" placement="bottomRight">
            <a-button type="text" class="flex items-center gap-2 h-auto py-1">
              <a-avatar :size="32" class="bg-teal-500">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <span class="hidden md:inline text-gray-700">{{ authStore.user?.name }}</span>
            </a-button>
            <template #overlay>
              <a-menu :items="userMenuItems" @click="handleUserMenuClick" />
            </template>
          </a-dropdown>
        </a-layout-header>

        <!-- Content -->
        <a-layout-content class="m-4 lg:m-6">
          <router-view />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<style scoped>
/* Fix Ant Design Layout Sider dark theme */
:deep(.ant-layout-sider) {
  background: #111827 !important;
}

:deep(.ant-menu-dark) {
  background: transparent !important;
}

:deep(.ant-menu-dark .ant-menu-item-selected) {
  background-color: #14b8a6 !important;
}

:deep(.ant-menu-dark .ant-menu-item:hover) {
  background-color: #1f2937 !important;
}

:deep(.ant-drawer-body .ant-menu-dark) {
  background: #111827 !important;
}

/* Header styling */
:deep(.ant-layout-header) {
  height: 64px;
  line-height: 64px;
}

/* Breadcrumb link styles */
:deep(.ant-breadcrumb a:hover) {
  color: #14b8a6;
}
</style>
