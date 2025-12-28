import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api, { ApiError } from '@/services/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurantId?: string;
  twoFactorEnabled?: boolean;
}

interface PasswordExpiryInfo {
  daysUntilExpiry: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  expiresAt: string;
}

interface LoginResult {
  success: boolean;
  requiresTwoFactor?: boolean;
  userId?: string;
  passwordExpired?: boolean;
  passwordExpiryWarning?: string;
}

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const user = ref<AdminUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const passwordExpiry = ref<PasswordExpiryInfo | null>(null);
  const isSessionValidated = ref(false);
  const pendingTwoFactor = ref<{ userId: string; email: string } | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const hasRestaurant = computed(() => !!user.value?.restaurantId);
  const isPasswordExpired = computed(() => passwordExpiry.value?.isExpired ?? false);
  const isPasswordExpiringSoon = computed(() => passwordExpiry.value?.isExpiringSoon ?? false);

  // Get current access token from localStorage
  const token = computed(() => {
    const stored = localStorage.getItem('menuqr_admin_auth');
    if (stored) {
      try {
        const { accessToken } = JSON.parse(stored);
        return accessToken;
      } catch {
        return null;
      }
    }
    return null;
  });

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
    if (!isAuthenticated.value) {return false;}

    try {
      const response = await api.getProfile();
      if (response.success && response.data) {
        const profileData = response.data as AdminUser & { passwordExpiry?: PasswordExpiryInfo };
        user.value = {
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
          role: profileData.role,
          restaurantId: profileData.restaurantId,
          twoFactorEnabled: profileData.twoFactorEnabled,
        };
        // Update password expiry info
        if (profileData.passwordExpiry) {
          passwordExpiry.value = profileData.passwordExpiry;
        }
        localStorage.setItem('menuqr_admin_user', JSON.stringify(user.value));
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
   * Returns true if session is valid, false otherwise
   */
  async function validateSession(): Promise<boolean> {
    const stored = localStorage.getItem('menuqr_admin_auth');
    if (!stored) {
      isSessionValidated.value = true;
      return false;
    }

    try {
      // Attempt to fetch profile - this will validate the token
      const response = await api.getProfile();
      if (response.success && response.data) {
        const profileData = response.data as AdminUser & { passwordExpiry?: PasswordExpiryInfo };
        user.value = {
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
          role: profileData.role,
          restaurantId: profileData.restaurantId,
          twoFactorEnabled: profileData.twoFactorEnabled,
        };
        // Update password expiry info
        if (profileData.passwordExpiry) {
          passwordExpiry.value = profileData.passwordExpiry;
        }
        localStorage.setItem('menuqr_admin_user', JSON.stringify(user.value));
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

  async function updateProfile(data: { name?: string; email?: string }): Promise<boolean> {
    if (!isAuthenticated.value) {return false;}

    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.updateAdminProfile(data);
      if (response.success && response.data) {
        user.value = response.data;
        localStorage.setItem('menuqr_admin_user', JSON.stringify(response.data));
        return true;
      }
      error.value = response.message || 'Erreur lors de la mise à jour du profil';
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

  async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (!isAuthenticated.value) {return false;}

    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.changeAdminPassword(currentPassword, newPassword);
      if (response.success) {
        return true;
      }
      error.value = response.message || 'Erreur lors du changement de mot de passe';
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

  function updateUserRestaurant(restaurantId: string) {
    if (user.value) {
      user.value.restaurantId = restaurantId;
      localStorage.setItem('menuqr_admin_user', JSON.stringify(user.value));
    }
  }

  // Initialize
  loadFromStorage();

  return {
    // State
    user,
    token,
    isLoading,
    error,
    passwordExpiry,
    isSessionValidated,
    pendingTwoFactor,
    // Computed
    isAuthenticated,
    hasRestaurant,
    isPasswordExpired,
    isPasswordExpiringSoon,
    // Actions
    login,
    register,
    logout,
    fetchProfile,
    validateSession,
    updateProfile,
    changePassword,
    updateUserRestaurant,
    clearAuth,
  };
});
