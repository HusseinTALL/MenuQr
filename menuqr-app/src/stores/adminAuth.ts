import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api, { ApiError } from '@/services/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurantId?: string;
}

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const user = ref<AdminUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const hasRestaurant = computed(() => !!user.value?.restaurantId);

  // Load from localStorage on init
  function loadFromStorage() {
    const stored = localStorage.getItem('menuqr_admin_auth');
    const storedUser = localStorage.getItem('menuqr_admin_user');
    if (stored && storedUser) {
      try {
        const { accessToken } = JSON.parse(stored);
        api.setToken(accessToken);
        user.value = JSON.parse(storedUser);
      } catch {
        clearAuth();
      }
    }
  }

  function saveToStorage(accessToken: string, refreshToken: string, userData: AdminUser) {
    localStorage.setItem('menuqr_admin_auth', JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem('menuqr_admin_user', JSON.stringify(userData));
  }

  function clearAuth() {
    localStorage.removeItem('menuqr_admin_auth');
    localStorage.removeItem('menuqr_admin_user');
    api.setToken(null);
    user.value = null;
  }

  async function login(email: string, password: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.login(email, password);
      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;
        user.value = userData;
        api.setToken(accessToken);
        saveToStorage(accessToken, refreshToken, userData);
        return true;
      }
      error.value = response.message || 'Login failed';
      return false;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(email: string, password: string, name: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.register(email, password, name);
      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;
        user.value = userData;
        api.setToken(accessToken);
        saveToStorage(accessToken, refreshToken, userData);
        return true;
      }
      error.value = response.message || 'Registration failed';
      return false;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.logout();
    } catch {
      // Ignore errors during logout
    }
    clearAuth();
  }

  async function fetchProfile(): Promise<boolean> {
    if (!isAuthenticated.value) return false;

    try {
      const response = await api.getProfile();
      if (response.success && response.data) {
        user.value = response.data;
        localStorage.setItem('menuqr_admin_user', JSON.stringify(response.data));
        return true;
      }
      return false;
    } catch {
      clearAuth();
      return false;
    }
  }

  function updateUserRestaurant(restaurantId: string) {
    if (user.value) {
      user.value.restaurantId = restaurantId;
      localStorage.setItem('menuqr_admin_user', JSON.stringify(user.value));
    }
  }

  // Initialize
  loadFromStorage();

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    hasRestaurant,
    login,
    register,
    logout,
    fetchProfile,
    updateUserRestaurant,
    clearAuth,
  };
});
