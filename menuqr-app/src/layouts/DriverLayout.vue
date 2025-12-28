<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useDriverAuthStore } from '@/stores/driverAuth';
import { useDriverSocket } from '@/composables/useSocket';
import {
  HomeOutlined,
  CarOutlined,
  WalletOutlined,
  UserOutlined,
  LogoutOutlined,
  PoweroffOutlined,
  EnvironmentOutlined,
  BellOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const driverStore = useDriverAuthStore();
const { connect: connectSocket, disconnect: disconnectSocket, sendLocation, isConnected: socketConnected } = useDriverSocket();

const locationWatchId = ref<number | null>(null);
const isUpdatingLocation = ref(false);

// Navigation items
const navItems = [
  { key: '/driver', icon: HomeOutlined, label: 'Accueil' },
  { key: '/driver/deliveries', icon: CarOutlined, label: 'Livraisons' },
  { key: '/driver/earnings', icon: WalletOutlined, label: 'Gains' },
  { key: '/driver/profile', icon: UserOutlined, label: 'Profil' },
];

const currentPath = computed(() => route.path);

const statusColor = computed(() => {
  switch (driverStore.user?.shiftStatus) {
    case 'online': return '#52c41a';
    case 'on_delivery': return '#1890ff';
    case 'break': return '#faad14';
    default: return '#8c8c8c';
  }
});

const statusLabel = computed(() => {
  switch (driverStore.user?.shiftStatus) {
    case 'online': return 'En ligne';
    case 'on_delivery': return 'En livraison';
    case 'break': return 'En pause';
    default: return 'Hors ligne';
  }
});

// Toggle online/offline status
const toggleOnline = async () => {
  if (!driverStore.user) {
    return;
  }

  if (driverStore.isOnline) {
    await driverStore.goOffline();
    stopLocationTracking();
  } else {
    // Get current location before going online
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await driverStore.goOnline({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          startLocationTracking();
        },
        async () => {
          // Go online without location if geolocation fails
          await driverStore.goOnline();
          startLocationTracking();
        }
      );
    } else {
      await driverStore.goOnline();
      startLocationTracking();
    }
  }
};

// Start GPS location tracking
const startLocationTracking = () => {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported');
    return;
  }

  // Connect to WebSocket for real-time updates
  const token = localStorage.getItem('driver_token');
  if (token) {
    connectSocket(token);
  }

  locationWatchId.value = navigator.geolocation.watchPosition(
    async (position) => {
      if (isUpdatingLocation.value) return;
      isUpdatingLocation.value = true;

      const locationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
        accuracy: position.coords.accuracy,
      };

      try {
        // Send via WebSocket for real-time tracking (primary)
        sendLocation(locationData);

        // Also update via API for persistence (fallback)
        await driverStore.updateLocation(
          position.coords.latitude,
          position.coords.longitude
        );
      } finally {
        isUpdatingLocation.value = false;
      }
    },
    (error) => {
      console.error('Location error:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000, // Reduced for more frequent updates
    }
  );
};

const stopLocationTracking = () => {
  if (locationWatchId.value !== null) {
    navigator.geolocation.clearWatch(locationWatchId.value);
    locationWatchId.value = null;
  }
  disconnectSocket();
};

const handleLogout = () => {
  stopLocationTracking();
  driverStore.logout();
  router.push('/driver/login');
};

const navigateTo = (path: string) => {
  router.push(path);
};

// Watch for status changes
watch(() => driverStore.isOnline, (isOnline) => {
  if (isOnline) {
    startLocationTracking();
  } else {
    stopLocationTracking();
  }
});

onMounted(async () => {
  if (!driverStore.isAuthenticated) {
    await driverStore.fetchProfile();
  }

  if (driverStore.isOnline) {
    startLocationTracking();
  }
});

onUnmounted(() => {
  stopLocationTracking();
});
</script>

<template>
  <div class="driver-layout">
      <!-- Header -->
      <header class="driver-header">
        <div class="header-left">
          <div class="logo">
            <CarOutlined />
            <span>MenuQR Driver</span>
          </div>
        </div>

        <div class="header-center">
          <a-button
            :type="driverStore.isOnline ? 'primary' : 'default'"
            :class="['status-toggle', { 'is-online': driverStore.isOnline }]"
            @click="toggleOnline"
          >
            <template #icon>
              <PoweroffOutlined />
            </template>
            {{ statusLabel }}
          </a-button>
        </div>

        <div class="header-right">
          <a-badge :count="0" :dot="false">
            <a-button type="text" class="header-icon-btn">
              <BellOutlined />
            </a-button>
          </a-badge>

          <a-dropdown placement="bottomRight">
            <a-avatar :style="{ backgroundColor: statusColor }">
              {{ driverStore.user?.firstName?.charAt(0) || 'D' }}
            </a-avatar>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile" @click="navigateTo('/driver/profile')">
                  <UserOutlined /> Mon Profil
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout" danger>
                  <LogoutOutlined /> Déconnexion
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </header>

      <!-- Status Banner -->
      <div
        v-if="driverStore.isOnline && locationWatchId"
        class="location-banner"
        :class="{ 'socket-connected': socketConnected }"
      >
        <EnvironmentOutlined />
        <span>Position GPS active {{ socketConnected ? '• Live' : '' }}</span>
      </div>

      <!-- Main Content -->
      <main class="driver-content">
        <router-view />
      </main>

      <!-- Bottom Navigation (Mobile) -->
      <nav class="driver-nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          :class="['nav-item', { active: currentPath === item.key || currentPath.startsWith(item.key + '/') }]"
          @click="navigateTo(item.key)"
        >
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label">{{ item.label }}</span>
        </div>
    </nav>
  </div>
</template>

<style scoped>
.driver-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.driver-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left .logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.status-toggle {
  border-radius: 20px;
  padding: 4px 16px;
  height: 36px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-toggle.is-online {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-btn {
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
}

.location-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: linear-gradient(90deg, #faad14, #ffc53d);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.3s ease;
}

.location-banner.socket-connected {
  background: linear-gradient(90deg, #52c41a, #73d13d);
}

.driver-content {
  flex: 1;
  padding: 16px;
  padding-bottom: 80px;
  overflow-y: auto;
}

.driver-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 12px;
}

.nav-item.active {
  color: #1890ff;
}

.nav-item:hover {
  color: rgba(255, 255, 255, 0.85);
}

.nav-icon {
  font-size: 22px;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .driver-header {
    padding: 10px 12px;
  }

  .header-left .logo span {
    display: none;
  }

  .status-toggle {
    font-size: 12px;
    padding: 4px 12px;
    height: 32px;
  }
}
</style>
