import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api, { ApiError, type CustomerProfile, type CustomerAddress } from '@/services/api';

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  restaurantId: string;
  isPhoneVerified: boolean;
  dietaryPreferences?: string[];
  allergens?: string[];
  totalOrders?: number;
  totalSpent?: number;
  defaultAddress?: CustomerAddress;
  savedAddresses?: CustomerAddress[];
  favoriteDishes?: string[];
}

export const useCustomerAuthStore = defineStore('customerAuth', () => {
  const customer = ref<Customer | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const otpSent = ref(false);
  const otpToken = ref<string | null>(null);
  const currentRestaurantId = ref<string | null>(null);

  const isAuthenticated = computed(() => !!customer.value);
  const customerName = computed(() => customer.value?.name || customer.value?.phone || '');

  // Storage key includes restaurant ID for multi-restaurant support
  function getStorageKey(restaurantId: string) {
    return `menuqr_customer_${restaurantId}`;
  }

  // Load from localStorage
  function loadFromStorage(restaurantId: string) {
    const key = getStorageKey(restaurantId);
    const stored = localStorage.getItem(`${key}_auth`);
    const storedCustomer = localStorage.getItem(`${key}_user`);

    if (stored && storedCustomer) {
      try {
        const { accessToken } = JSON.parse(stored);
        api.setCustomerToken(accessToken);
        customer.value = JSON.parse(storedCustomer);
        currentRestaurantId.value = restaurantId;
        return true;
      } catch {
        clearAuth(restaurantId);
        return false;
      }
    }
    return false;
  }

  function saveToStorage(restaurantId: string, accessToken: string, refreshToken: string, customerData: Customer) {
    const key = getStorageKey(restaurantId);
    localStorage.setItem(`${key}_auth`, JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem(`${key}_user`, JSON.stringify(customerData));
    currentRestaurantId.value = restaurantId;
  }

  function clearAuth(restaurantId?: string) {
    const rid = restaurantId || currentRestaurantId.value;
    if (rid) {
      const key = getStorageKey(rid);
      localStorage.removeItem(`${key}_auth`);
      localStorage.removeItem(`${key}_user`);
    }
    api.setCustomerToken(null);
    customer.value = null;
    otpSent.value = false;
    otpToken.value = null;
  }

  // Step 1: Send OTP
  async function sendOtp(phone: string, restaurantId: string, type: 'register' | 'login' | 'reset_password' = 'register'): Promise<{ success: boolean; message?: string }> {
    isLoading.value = true;
    error.value = null;
    otpSent.value = false;

    try {
      const response = await api.customerSendOtp(phone, restaurantId, type);
      if (response.success) {
        otpSent.value = true;
        return { success: true };
      }
      error.value = response.message || 'Erreur lors de l\'envoi du code';
      return { success: false, message: error.value };
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Une erreur inattendue est survenue';
      }
      return { success: false, message: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Step 2: Verify OTP
  async function verifyOtp(phone: string, restaurantId: string, code: string): Promise<{ success: boolean; type?: string; message?: string }> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.customerVerifyOtp(phone, restaurantId, code);
      if (response.success && response.data) {
        otpToken.value = response.data.otpToken;
        return { success: true, type: response.data.type };
      }
      error.value = response.message || 'Code invalide';
      return { success: false, message: error.value };
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Une erreur inattendue est survenue';
      }
      return { success: false, message: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Step 3: Register (after OTP verified)
  async function register(
    phone: string,
    restaurantId: string,
    password: string,
    name?: string,
    email?: string
  ): Promise<boolean> {
    if (!otpToken.value) {
      error.value = 'Veuillez d\'abord vérifier votre numéro de téléphone';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.customerRegister(phone, restaurantId, password, otpToken.value, name, email);
      if (response.success && response.data) {
        const { customer: customerData, accessToken, refreshToken } = response.data;
        customer.value = customerData;
        api.setCustomerToken(accessToken);
        saveToStorage(restaurantId, accessToken, refreshToken, customerData);
        otpToken.value = null;
        otpSent.value = false;
        return true;
      }
      error.value = response.message || 'Erreur lors de l\'inscription';
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

  // Login (phone + password)
  async function login(phone: string, restaurantId: string, password: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.customerLogin(phone, restaurantId, password);
      if (response.success && response.data) {
        const { customer: customerData, accessToken, refreshToken } = response.data;
        customer.value = customerData;
        api.setCustomerToken(accessToken);
        saveToStorage(restaurantId, accessToken, refreshToken, customerData);
        return true;
      }
      error.value = response.message || 'Identifiants incorrects';
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

  // Logout
  async function logout(): Promise<void> {
    try {
      await api.customerLogout();
    } catch {
      // Ignore errors
    }
    clearAuth();
  }

  // Fetch profile
  async function fetchProfile(): Promise<boolean> {
    if (!isAuthenticated.value) return false;

    try {
      const response = await api.customerGetProfile();
      if (response.success && response.data) {
        customer.value = response.data;
        if (currentRestaurantId.value) {
          const key = getStorageKey(currentRestaurantId.value);
          localStorage.setItem(`${key}_user`, JSON.stringify(response.data));
        }
        return true;
      }
      return false;
    } catch {
      clearAuth();
      return false;
    }
  }

  // Update profile
  async function updateProfile(data: Partial<CustomerProfile>): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.customerUpdateProfile(data);
      if (response.success && response.data) {
        customer.value = { ...customer.value, ...response.data } as Customer;
        if (currentRestaurantId.value) {
          const key = getStorageKey(currentRestaurantId.value);
          localStorage.setItem(`${key}_user`, JSON.stringify(customer.value));
        }
        return true;
      }
      error.value = response.message || 'Erreur lors de la mise à jour';
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

  // Check if phone exists
  async function checkPhone(phone: string, restaurantId: string): Promise<{ exists: boolean; isVerified: boolean }> {
    try {
      const response = await api.customerCheckPhone(phone, restaurantId);
      if (response.success && response.data) {
        return response.data;
      }
      return { exists: false, isVerified: false };
    } catch {
      return { exists: false, isVerified: false };
    }
  }

  // Forgot password
  async function forgotPassword(phone: string, restaurantId: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.customerForgotPassword(phone, restaurantId);
      if (response.success) {
        otpSent.value = true;
        return true;
      }
      error.value = response.message || 'Erreur';
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

  // Reset password
  async function resetPassword(phone: string, restaurantId: string, code: string, newPassword: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.customerResetPassword(phone, restaurantId, code, newPassword);
      if (response.success) {
        otpSent.value = false;
        return true;
      }
      error.value = response.message || 'Erreur lors de la réinitialisation';
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

  // Initialize for a specific restaurant
  function initForRestaurant(restaurantId: string) {
    currentRestaurantId.value = restaurantId;
    loadFromStorage(restaurantId);
  }

  return {
    customer,
    isLoading,
    error,
    otpSent,
    isAuthenticated,
    customerName,
    currentRestaurantId,
    sendOtp,
    verifyOtp,
    register,
    login,
    logout,
    fetchProfile,
    updateProfile,
    checkPhone,
    forgotPassword,
    resetPassword,
    initForRestaurant,
    clearAuth,
    loadFromStorage,
  };
});
