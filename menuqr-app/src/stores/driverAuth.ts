import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';

interface DriverUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  vehicleType: 'bicycle' | 'scooter' | 'motorcycle' | 'car';
  status: 'pending' | 'verified' | 'suspended';
  shiftStatus: 'offline' | 'online' | 'on_delivery' | 'break';
  isAvailable: boolean;
  currentBalance: number;
  stats?: {
    totalDeliveries: number;
    completedDeliveries: number;
    averageRating: number;
    completionRate: number;
  };
}

export const useDriverAuthStore = defineStore('driverAuth', () => {
  const token = ref<string | null>(localStorage.getItem('driver_token'));
  const user = ref<DriverUser | null>(null);
  const isLoading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isVerified = computed(() => user.value?.status === 'verified');
  const isOnline = computed(() => user.value?.shiftStatus === 'online' || user.value?.shiftStatus === 'on_delivery');
  const fullName = computed(() => user.value ? `${user.value.firstName} ${user.value.lastName}` : '');

  async function login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      isLoading.value = true;
      const response = await api.driverLogin({ email, password });

      if (response.success && response.data) {
        token.value = response.data.token;
        user.value = response.data.driver as DriverUser;
        localStorage.setItem('driver_token', response.data.token);
        return { success: true };
      }

      return { success: false, message: response.message || 'Échec de connexion' };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return { success: false, message: err.response?.data?.message || 'Erreur de connexion' };
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchProfile(): Promise<boolean> {
    if (!token.value) return false;

    try {
      isLoading.value = true;
      const response = await api.getDriverProfile();

      if (response.success && response.data) {
        user.value = response.data as DriverUser;
        return true;
      }

      return false;
    } catch {
      logout();
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function goOnline(location?: { lat: number; lng: number }): Promise<boolean> {
    try {
      const response = await api.driverGoOnline(location);
      if (response.success && user.value) {
        user.value.shiftStatus = 'online';
        user.value.isAvailable = true;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function goOffline(): Promise<boolean> {
    try {
      const response = await api.driverGoOffline();
      if (response.success && user.value) {
        user.value.shiftStatus = 'offline';
        user.value.isAvailable = false;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function updateLocation(lat: number, lng: number): Promise<boolean> {
    try {
      await api.updateDriverLocation({ lat, lng });
      return true;
    } catch {
      return false;
    }
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem('driver_token');
  }

  return {
    token,
    user,
    isLoading,
    isAuthenticated,
    isVerified,
    isOnline,
    fullName,
    login,
    fetchProfile,
    goOnline,
    goOffline,
    updateLocation,
    logout,
  };
});
