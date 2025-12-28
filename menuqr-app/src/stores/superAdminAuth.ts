import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api, { ApiError } from '@/services/api';

interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'superadmin';
}

export const useSuperAdminAuthStore = defineStore('superAdminAuth', () => {
  const user = ref<SuperAdminUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isSessionValidated = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const isSuperAdmin = computed(() => user.value?.role === 'superadmin');

  // Load from localStorage on init
  function loadFromStorage() {
    const stored = localStorage.getItem('menuqr_superadmin_auth');
    const storedUser = localStorage.getItem('menuqr_superadmin_user');
    if (stored && storedUser) {
      try {
        const { accessToken } = JSON.parse(stored);
        const userData = JSON.parse(storedUser);
        // Verify user is actually a superadmin
        if (userData.role === 'superadmin') {
          api.setToken(accessToken);
          user.value = userData;
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      }
    }
  }

  function saveToStorage(accessToken: string, refreshToken: string, userData: SuperAdminUser) {
    localStorage.setItem('menuqr_superadmin_auth', JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem('menuqr_superadmin_user', JSON.stringify(userData));
  }

  function clearAuth() {
    localStorage.removeItem('menuqr_superadmin_auth');
    localStorage.removeItem('menuqr_superadmin_user');
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

        // Verify user is a superadmin
        if (userData.role !== 'superadmin') {
          error.value = 'Accès refusé. Seuls les super administrateurs peuvent accéder à cette plateforme.';
          return false;
        }

        user.value = userData as SuperAdminUser;
        api.setToken(accessToken);
        saveToStorage(accessToken, refreshToken, userData as SuperAdminUser);
        return true;
      }
      error.value = response.message || 'Échec de la connexion';
      return false;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Une erreur inattendue est survenue';
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
    if (!isAuthenticated.value) {return false;}

    try {
      const response = await api.getProfile();
      if (response.success && response.data) {
        // Verify user is still a superadmin
        if (response.data.role !== 'superadmin') {
          clearAuth();
          return false;
        }
        user.value = response.data as SuperAdminUser;
        localStorage.setItem('menuqr_superadmin_user', JSON.stringify(response.data));
        return true;
      }
      return false;
    } catch {
      clearAuth();
      return false;
    }
  }

  /**
   * Validate the current session with the backend
   * Should be called on app initialization
   * Returns true if session is valid and user is superadmin, false otherwise
   */
  async function validateSession(): Promise<boolean> {
    const stored = localStorage.getItem('menuqr_superadmin_auth');
    if (!stored) {
      isSessionValidated.value = true;
      return false;
    }

    try {
      // Attempt to fetch profile - this will validate the token
      const response = await api.getProfile();
      if (response.success && response.data) {
        // Verify user is a superadmin
        if (response.data.role !== 'superadmin') {
          clearAuth();
          isSessionValidated.value = true;
          return false;
        }
        user.value = response.data as SuperAdminUser;
        localStorage.setItem('menuqr_superadmin_user', JSON.stringify(response.data));
        isSessionValidated.value = true;
        return true;
      }
      clearAuth();
      isSessionValidated.value = true;
      return false;
    } catch {
      clearAuth();
      isSessionValidated.value = true;
      return false;
    }
  }

  // Initialize
  loadFromStorage();

  return {
    // State
    user,
    isLoading,
    error,
    isSessionValidated,
    // Computed
    isAuthenticated,
    isSuperAdmin,
    // Actions
    login,
    logout,
    fetchProfile,
    validateSession,
    clearAuth,
  };
});
