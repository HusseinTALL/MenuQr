/**
 * API Service for MenuQR Backend
 */

import type {
  CustomerLoyaltyInfo,
  LoyaltyTransaction,
  LoyaltyStats,
  CustomerWithLoyalty,
} from '@/types/loyalty';
import type {
  Table,
  TableStats,
  CreateTableData,
  UpdateTableData,
  Reservation,
  ReservationStats,
  CreateReservationData,
  UpdateReservationData,
  TimeSlot,
  AvailabilityResponse,
  ReservationStatus,
  LocationPreference,
} from '@/types/reservation';
import type {
  Review,
  ReviewStats,
  AdminReviewStats,
  CreateReviewDTO,
  UpdateReviewDTO,
  CanReviewResult,
  HelpfulVoteResponse,
  ReviewQueryParams,
  AdminReviewQueryParams,
} from '@/types/review';

// In development, use proxy path to avoid mixed content issues (HTTPS frontend -> HTTP backend)
// In production, use the full API URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api/v1' : 'http://localhost:3001/api/v1');

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: 'admin' | 'customer' | 'driver' | 'none';
}

// Staff types
export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: string;
  roleDisplayName: string;
  isActive: boolean;
  lastLogin?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  customPermissions?: string[];
}

export interface CreateStaffData {
  email: string;
  name: string;
  role: string;
  customPermissions?: string[];
}

export interface UpdateStaffData {
  name?: string;
  role?: string;
  isActive?: boolean;
  customPermissions?: string[];
}

// JWT token expiry buffer (refresh 5 minutes before expiry)
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Decode JWT token without verification (for expiry check only)
 */
function decodeJwtPayload(token: string): { exp?: number; iat?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {return null;}
    const base64Payload = parts[1];
    if (!base64Payload) {return null;}
    const payload = JSON.parse(atob(base64Payload));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired or about to expire
 */
function isTokenExpiringSoon(token: string, bufferMs: number = TOKEN_EXPIRY_BUFFER_MS): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {return true;} // Treat as expired if can't decode

  const expiryTime = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  return now >= expiryTime - bufferMs;
}

class ApiService {
  private baseUrl: string;
  // Mutex for token refresh to prevent race conditions
  private refreshPromise: Promise<boolean> | null = null;
  private customerRefreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get admin/superadmin access token directly from localStorage
   * No caching - always reads fresh value to avoid race conditions
   * Checks both admin and superadmin tokens
   */
  private getAccessToken(): string | null {
    // Try admin token first
    const adminStored = localStorage.getItem('menuqr_admin_auth');
    if (adminStored) {
      try {
        const { accessToken } = JSON.parse(adminStored);
        if (accessToken) {return accessToken;}
      } catch {
        // Continue to try superadmin
      }
    }

    // Try superadmin token
    const superAdminStored = localStorage.getItem('menuqr_superadmin_auth');
    if (superAdminStored) {
      try {
        const { accessToken } = JSON.parse(superAdminStored);
        if (accessToken) {return accessToken;}
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Get customer access token directly from localStorage
   * No caching - always reads fresh value to avoid race conditions
   */
  private getCustomerToken(): string | null {
    // Customer tokens are stored per restaurant
    const keys = Object.keys(localStorage).filter(k => k.startsWith('menuqr_customer_') && k.endsWith('_auth'));
    const firstKey = keys[0];
    if (firstKey) {
      const stored = localStorage.getItem(firstKey);
      if (stored) {
        try {
          const { accessToken } = JSON.parse(stored);
          return accessToken;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Get driver access token from localStorage
   */
  private getDriverToken(): string | null {
    return localStorage.getItem('driver_token');
  }

  // Legacy methods kept for backward compatibility - they do nothing now
  // Token is always read from localStorage directly
  setToken(_token: string | null): void {
    // No-op: token is now always read from localStorage
  }

  setCustomerToken(_token: string | null): void {
    // No-op: token is now always read from localStorage
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, useCustomerToken = false): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, auth } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Determine auth type - support both legacy parameter and new auth option
    const authType = auth || (useCustomerToken ? 'customer' : 'admin');

    // Skip auth for 'none'
    if (authType !== 'none') {
      // Get token based on auth type
      let token: string | null = null;
      if (authType === 'driver') {
        token = this.getDriverToken();
      } else if (authType === 'customer') {
        token = this.getCustomerToken();
      } else {
        token = this.getAccessToken();
      }

      // Proactive token refresh for non-driver tokens
      if (token && authType !== 'driver' && isTokenExpiringSoon(token)) {
        const refreshed = authType === 'customer'
          ? await this.refreshCustomerToken()
          : await this.refreshToken();
        if (refreshed) {
          token = authType === 'customer' ? this.getCustomerToken() : this.getAccessToken();
        }
      }

      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = useCustomerToken
            ? await this.refreshCustomerToken()
            : await this.refreshToken();
          if (refreshed) {
            // Retry the request
            return this.request<T>(endpoint, options, useCustomerToken);
          }
        }
        throw new ApiError(data.message || 'Request failed', response.status, data.errors);
      }

      return data;
    } catch (_error) {
      if (_error instanceof ApiError) {
        throw _error;
      }
      throw new ApiError('Network error', 0);
    }
  }

  private async refreshToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it
    // This check MUST happen before any other operations
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Create the promise immediately to prevent race conditions
    // Other callers will see this promise and wait for it
    this.refreshPromise = (async () => {
      try {
        // Try admin token first, then superadmin
        let stored = localStorage.getItem('menuqr_admin_auth');
        let storageKey = 'menuqr_admin_auth';
        let userKey = 'menuqr_admin_user';

        if (!stored) {
          stored = localStorage.getItem('menuqr_superadmin_auth');
          storageKey = 'menuqr_superadmin_auth';
          userKey = 'menuqr_superadmin_user';
        }

        if (!stored) {
          return false;
        }

        const { refreshToken } = JSON.parse(stored);
        const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(userKey);
          return false;
        }

        const data = await response.json();
        const newAuth = {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        };
        localStorage.setItem(storageKey, JSON.stringify(newAuth));
        // Token will be read fresh from localStorage on next request
        return true;
      } catch {
        // Clear both possible storage keys on error
        localStorage.removeItem('menuqr_admin_auth');
        localStorage.removeItem('menuqr_admin_user');
        localStorage.removeItem('menuqr_superadmin_auth');
        localStorage.removeItem('menuqr_superadmin_user');
        return false;
      } finally {
        // Clear the promise after completion
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async refreshCustomerToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it
    // This check MUST happen before any other operations
    if (this.customerRefreshPromise) {
      return this.customerRefreshPromise;
    }

    // Create the promise immediately to prevent race conditions
    this.customerRefreshPromise = (async () => {
      try {
        // Customer tokens are stored per restaurant, find current one
        const keys = Object.keys(localStorage).filter(k => k.startsWith('menuqr_customer_') && k.endsWith('_auth'));
        const authKey = keys[0];
        if (!authKey) {
          return false;
        }

        // Try the first matching key (most likely the current restaurant)
        const stored = localStorage.getItem(authKey);
        if (!stored) {
          return false;
        }

        const { refreshToken } = JSON.parse(stored);
        const response = await fetch(`${this.baseUrl}/customer/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          localStorage.removeItem(authKey);
          return false;
        }

        const data = await response.json();
        const newAuth = {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        };
        localStorage.setItem(authKey, JSON.stringify(newAuth));
        // Token will be read fresh from localStorage on next request
        return true;
      } catch {
        // On error, find the key again (it might have been removed)
        const keys = Object.keys(localStorage).filter(k => k.startsWith('menuqr_customer_') && k.endsWith('_auth'));
        keys.forEach(k => localStorage.removeItem(k));
        return false;
      } finally {
        // Clear the promise after completion
        this.customerRefreshPromise = null;
      }
    })();

    return this.customerRefreshPromise;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{
      user: { id: string; email: string; name: string; role: string; restaurantId?: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', { method: 'POST', body: { email, password } });
  }

  async register(email: string, password: string, name: string) {
    return this.request<{
      user: { id: string; email: string; name: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', { method: 'POST', body: { email, password, name } });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getProfile() {
    return this.request<{
      id: string;
      email: string;
      name: string;
      role: string;
      restaurantId?: string;
    }>('/auth/profile');
  }

  async updateAdminProfile(data: { name?: string; email?: string }) {
    return this.request<{
      id: string;
      email: string;
      name: string;
      role: string;
      restaurantId?: string;
    }>('/auth/profile', {
      method: 'PUT',
      body: data,
    });
  }

  async changeAdminPassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  }

  // Restaurant endpoints (Public)
  async getRestaurants(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.search) {query.set('search', params.search);}
    const queryString = query.toString();
    return this.request<{
      restaurants: Restaurant[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/restaurants${queryString ? `?${queryString}` : ''}`);
  }

  async getRestaurantBySlug(slug: string) {
    return this.request<Restaurant>(`/restaurants/slug/${slug}`);
  }

  async getRestaurantById(id: string) {
    return this.request<Restaurant>(`/restaurants/${id}`);
  }

  // Restaurant endpoints (Admin)
  async getMyRestaurant() {
    return this.request<Restaurant>('/restaurants/me/restaurant');
  }

  async createRestaurant(data: Partial<Restaurant>) {
    return this.request<Restaurant>('/restaurants', { method: 'POST', body: data });
  }

  async updateRestaurant(id: string, data: Partial<Restaurant>) {
    return this.request<Restaurant>(`/restaurants/${id}`, { method: 'PUT', body: data });
  }

  // Category endpoints
  async getMyCategories() {
    return this.request<Category[]>('/categories/me/categories');
  }

  async createCategory(data: Partial<Category>) {
    return this.request<Category>('/categories', { method: 'POST', body: data });
  }

  async updateCategory(id: string, data: Partial<Category>) {
    return this.request<Category>(`/categories/${id}`, { method: 'PUT', body: data });
  }

  async deleteCategory(id: string) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  async reorderCategories(categories: { id: string; order: number }[]) {
    return this.request('/categories/reorder', { method: 'PUT', body: { categories } });
  }

  // Dish endpoints
  async getMyDishes(params?: { categoryId?: string; isAvailable?: boolean }) {
    const query = new URLSearchParams();
    if (params?.categoryId) {query.set('categoryId', params.categoryId);}
    if (params?.isAvailable !== undefined) {query.set('isAvailable', String(params.isAvailable));}
    const queryString = query.toString();
    return this.request<Dish[]>(`/dishes/me/dishes${queryString ? `?${queryString}` : ''}`);
  }

  async createDish(data: Partial<Dish>) {
    return this.request<Dish>('/dishes', { method: 'POST', body: data });
  }

  async updateDish(id: string, data: Partial<Dish>) {
    return this.request<Dish>(`/dishes/${id}`, { method: 'PUT', body: data });
  }

  async deleteDish(id: string) {
    return this.request(`/dishes/${id}`, { method: 'DELETE' });
  }

  async toggleDishAvailability(id: string) {
    return this.request<{ isAvailable: boolean }>(`/dishes/${id}/availability`, { method: 'PATCH' });
  }

  async reorderDishes(dishes: { id: string; order: number }[]) {
    return this.request('/dishes/reorder', { method: 'PUT', body: { dishes } });
  }

  async getDishesByRestaurant(restaurantId: string) {
    return this.request<Dish[]>(`/dishes/restaurant/${restaurantId}`);
  }

  // Order endpoints
  async createOrder(data: {
    restaurantId: string;
    tableNumber?: string;
    customerName?: string;
    customerPhone?: string;
    items: {
      dishId: string;
      quantity: number;
      options?: { name: string; price: number }[];
      specialInstructions?: string;
    }[];
    specialInstructions?: string;
    orderType?: 'immediate' | 'scheduled';
    fulfillmentType?: 'dine-in' | 'takeaway' | 'delivery';
    scheduledDate?: string;
    scheduledTime?: string;
    deliveryAddress?: {
      street: string;
      city: string;
      postalCode?: string;
      details?: string;
      coordinates?: { lat: number; lng: number };
    };
  }) {
    return this.request<Order>('/orders', { method: 'POST', body: data });
  }

  async getOrders(params?: {
    status?: string;
    tableNumber?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) {query.set('status', params.status);}
    if (params?.tableNumber) {query.set('tableNumber', params.tableNumber);}
    if (params?.dateFrom) {query.set('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.set('dateTo', params.dateTo);}
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    const queryString = query.toString();
    return this.request<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/orders${queryString ? `?${queryString}` : ''}`);
  }

  async getActiveOrders() {
    return this.request<Order[]>('/orders/active');
  }

  async getOrderStats(params?: { dateFrom?: string; dateTo?: string }) {
    const query = new URLSearchParams();
    if (params?.dateFrom) {query.set('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.set('dateTo', params.dateTo);}
    const queryString = query.toString();
    return this.request<{
      summary: {
        totalOrders: number;
        totalRevenue: number;
        completedOrders: number;
        cancelledOrders: number;
        averageOrderValue: number;
      };
      statusCounts: Record<string, number>;
    }>(`/orders/stats${queryString ? `?${queryString}` : ''}`);
  }

  async getDailyOrderStats(days: number = 7) {
    return this.request<Array<{
      date: string;
      dayOfWeek: string;
      count: number;
      revenue: number;
      completedCount: number;
    }>>(`/orders/stats/daily?days=${days}`);
  }

  async getOrderLocationStats(params?: { dateFrom?: string; dateTo?: string }) {
    const query = new URLSearchParams();
    if (params?.dateFrom) {query.set('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.set('dateTo', params.dateTo);}
    const queryString = query.toString();
    return this.request<{
      locations: Array<{
        location: string;
        count: number;
        revenue: number;
        percentage: number;
      }>;
      total: number;
    }>(`/orders/stats/locations${queryString ? `?${queryString}` : ''}`);
  }

  async updateOrderStatus(id: string, status: string, cancelReason?: string) {
    return this.request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: { status, cancelReason },
    });
  }

  async updateOrderItems(id: string, data: {
    items: {
      dishId: string;
      quantity: number;
      options?: { name: string; price: number }[];
      variant?: { name: string; price: number };
      specialInstructions?: string;
    }[];
    specialInstructions?: string;
  }) {
    return this.request<Order>(`/orders/${id}/items`, {
      method: 'PUT',
      body: data,
    });
  }

  // ============================================
  // SCHEDULED ORDER ENDPOINTS
  // ============================================

  /**
   * Get available dates for scheduled orders
   */
  async getScheduledOrderAvailability(restaurantId: string, params?: { days?: number }) {
    const query = new URLSearchParams();
    if (params?.days) {query.set('days', String(params.days));}
    const queryString = query.toString();
    return this.request<{
      dates: {
        date: string;
        dayOfWeek: string;
        isOpen: boolean;
        slotsAvailable: number;
      }[];
      settings: {
        maxAdvanceDays: number;
        minAdvanceMinutes: number;
        slotDuration: number;
      };
    }>(`/scheduled-orders/${restaurantId}/availability${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get available time slots for a specific date
   */
  async getScheduledOrderSlots(
    restaurantId: string,
    date: string,
    fulfillmentType: 'pickup' | 'delivery'
  ) {
    return this.request<{
      time: string;
      available: boolean;
      remainingCapacity: number;
    }[]>(`/scheduled-orders/${restaurantId}/slots?date=${date}&type=${fulfillmentType}`);
  }

  /**
   * Get scheduled order settings (admin)
   */
  async getScheduledOrderSettings() {
    return this.request<{
      enabled: boolean;
      minAdvanceMinutes: number;
      maxAdvanceDays: number;
      slotDuration: number;
      maxOrdersPerSlot: number;
      pickupEnabled: boolean;
      deliveryEnabled: boolean;
      deliveryRadius?: number;
      deliveryFee?: number;
      deliveryMinOrder?: number;
    }>('/scheduled-orders/settings');
  }

  /**
   * Update scheduled order settings (admin)
   */
  async updateScheduledOrderSettings(settings: {
    enabled?: boolean;
    minAdvanceMinutes?: number;
    maxAdvanceDays?: number;
    slotDuration?: number;
    maxOrdersPerSlot?: number;
    pickupEnabled?: boolean;
    deliveryEnabled?: boolean;
    deliveryRadius?: number;
    deliveryFee?: number;
    deliveryMinOrder?: number;
  }) {
    return this.request('/scheduled-orders/settings', {
      method: 'PUT',
      body: settings,
    });
  }

  /**
   * Get scheduled orders (admin)
   */
  async getScheduledOrders(params?: {
    status?: string;
    fulfillmentType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) {query.set('status', params.status);}
    if (params?.fulfillmentType) {query.set('fulfillmentType', params.fulfillmentType);}
    if (params?.dateFrom) {query.set('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.set('dateTo', params.dateTo);}
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    const queryString = query.toString();
    return this.request<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/scheduled-orders${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get scheduled orders calendar data (admin)
   */
  async getScheduledOrdersCalendar(params?: { month?: string }) {
    const query = new URLSearchParams();
    if (params?.month) {query.set('month', params.month);}
    const queryString = query.toString();
    return this.request<{
      date: string;
      pickupCount: number;
      deliveryCount: number;
      totalRevenue: number;
    }[]>(`/scheduled-orders/calendar${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get customer's scheduled orders
   */
  async customerGetScheduledOrders(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    const queryString = query.toString();
    return this.request<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/customer/scheduled-orders${queryString ? `?${queryString}` : ''}`, {}, true);
  }

  /**
   * Cancel a scheduled order (customer)
   */
  async customerCancelScheduledOrder(orderId: string, reason?: string) {
    return this.request<Order>(`/customer/scheduled-orders/${orderId}/cancel`, {
      method: 'PUT',
      body: { reason },
    }, true);
  }

  // Public menu endpoint (no auth required)
  async getPublicMenu(slug: string) {
    return this.request<PublicMenuData>(`/menu/slug/${slug}`);
  }

  // Upload endpoints
  async uploadImage(file: File): Promise<ApiResponse<{ url: string; publicId: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = {};
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/upload/image`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.uploadImage(file);
          }
        }
        throw new ApiError(data.message || 'Upload failed', response.status, data.errors);
      }

      return data;
    } catch (_error) {
      if (_error instanceof ApiError) {
        throw _error;
      }
      throw new ApiError('Network error', 0);
    }
  }

  async deleteImage(url: string) {
    return this.request('/upload/image', { method: 'DELETE', body: { url } });
  }

  // ============================================
  // CUSTOMER AUTH ENDPOINTS
  // ============================================

  async customerSendOtp(phone: string, restaurantId: string, type: string = 'register') {
    return this.request<{ expiresIn: number }>('/customer/auth/send-otp', {
      method: 'POST',
      body: { phone, restaurantId, type },
    });
  }

  async customerVerifyOtp(phone: string, restaurantId: string, code: string) {
    return this.request<{ otpToken: string; type: string }>('/customer/auth/verify-otp', {
      method: 'POST',
      body: { phone, restaurantId, code },
    });
  }

  async customerRegister(phone: string, restaurantId: string, password: string, otpToken: string, name?: string, email?: string) {
    return this.request<{
      customer: CustomerProfile;
      accessToken: string;
      refreshToken: string;
    }>('/customer/auth/register', {
      method: 'POST',
      body: { phone, restaurantId, password, otpToken, name, email },
    });
  }

  async customerLogin(phone: string, restaurantId: string, password: string) {
    return this.request<{
      customer: CustomerProfile;
      accessToken: string;
      refreshToken: string;
    }>('/customer/auth/login', {
      method: 'POST',
      body: { phone, restaurantId, password },
    });
  }

  async customerLogout() {
    return this.request('/customer/auth/logout', { method: 'POST' }, true);
  }

  async customerGetProfile() {
    return this.request<CustomerProfile>('/customer/auth/profile', {}, true);
  }

  async customerUpdateProfile(data: Partial<CustomerProfile>) {
    return this.request<CustomerProfile>('/customer/auth/profile', {
      method: 'PUT',
      body: data,
    }, true);
  }

  async customerChangePassword(currentPassword: string, newPassword: string) {
    return this.request<{ accessToken: string; refreshToken: string }>('/customer/auth/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    }, true);
  }

  async customerCheckPhone(phone: string, restaurantId: string) {
    return this.request<{ exists: boolean; isVerified: boolean }>('/customer/auth/check-phone', {
      method: 'POST',
      body: { phone, restaurantId },
    });
  }

  async customerForgotPassword(phone: string, restaurantId: string) {
    return this.request('/customer/auth/forgot-password', {
      method: 'POST',
      body: { phone, restaurantId },
    });
  }

  async customerResetPassword(phone: string, restaurantId: string, code: string, newPassword: string) {
    return this.request('/customer/auth/reset-password', {
      method: 'POST',
      body: { phone, restaurantId, code, newPassword },
    });
  }

  // ============================================
  // CUSTOMER ENDPOINTS (Protected)
  // ============================================

  // Favorites
  async customerGetFavorites() {
    return this.request<Dish[]>('/customer/favorites', {}, true);
  }

  async customerAddFavorite(dishId: string) {
    return this.request(`/customer/favorites/${dishId}`, { method: 'POST' }, true);
  }

  async customerRemoveFavorite(dishId: string) {
    return this.request(`/customer/favorites/${dishId}`, { method: 'DELETE' }, true);
  }

  async customerCheckFavorite(dishId: string) {
    return this.request<{ isFavorite: boolean }>(`/customer/favorites/${dishId}/check`, {}, true);
  }

  // Addresses
  async customerGetAddresses() {
    return this.request<{
      defaultAddress?: CustomerAddress;
      savedAddresses: CustomerAddress[];
    }>('/customer/addresses', {}, true);
  }

  async customerAddAddress(address: Omit<CustomerAddress, '_id'>) {
    return this.request<CustomerAddress>('/customer/addresses', {
      method: 'POST',
      body: address,
    }, true);
  }

  async customerUpdateAddress(addressId: string, address: Partial<CustomerAddress>) {
    return this.request<CustomerAddress>(`/customer/addresses/${addressId}`, {
      method: 'PUT',
      body: address,
    }, true);
  }

  async customerDeleteAddress(addressId: string) {
    return this.request(`/customer/addresses/${addressId}`, { method: 'DELETE' }, true);
  }

  async customerSetDefaultAddress(addressId: string) {
    return this.request(`/customer/addresses/${addressId}/default`, { method: 'PUT' }, true);
  }

  // Order history
  async customerGetOrders(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.status) {query.set('status', params.status);}
    const queryString = query.toString();
    return this.request<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/customer/orders${queryString ? `?${queryString}` : ''}`, {}, true);
  }

  async customerGetOrder(orderId: string) {
    return this.request<Order>(`/customer/orders/${orderId}`, {}, true);
  }

  async customerReorder(orderId: string) {
    return this.request<{
      items: {
        dishId: string;
        name: string;
        price: number;
        quantity: number;
        options?: { name: string; price: number }[];
        variant?: { name: string; price: number };
        specialInstructions?: string;
        subtotal: number;
      }[];
      subtotal: number;
      originalOrderNumber: string;
      note: string;
    }>(`/customer/orders/${orderId}/reorder`, { method: 'POST' }, true);
  }

  // Stats
  async customerGetStats() {
    return this.request<{
      totalOrders: number;
      totalSpent: number;
      avgOrderValue: number;
      favoriteCount: number;
      memberSince: string;
    }>('/customer/stats', {}, true);
  }

  // ============================================
  // CUSTOMER LOYALTY ENDPOINTS
  // ============================================

  async customerGetLoyalty() {
    return this.request<CustomerLoyaltyInfo>('/customer/loyalty/me', {}, true);
  }

  async customerGetPointsHistory(params?: { page?: number; limit?: number; type?: string }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.type) {query.set('type', params.type);}
    const queryString = query.toString();
    return this.request<{
      transactions: LoyaltyTransaction[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/customer/loyalty/me/history${queryString ? `?${queryString}` : ''}`, {}, true);
  }

  async customerRedeemPoints(points: number) {
    return this.request<{
      transaction: LoyaltyTransaction;
      creditValue: number;
      newBalance: number;
    }>('/customer/loyalty/me/redeem', { method: 'POST', body: { points } }, true);
  }

  async customerGetExpiringPoints(days: number = 30) {
    return this.request<{ points: number; expiresAt: string } | null>(
      `/customer/loyalty/me/expiring?days=${days}`,
      {},
      true
    );
  }

  // ============================================
  // ADMIN LOYALTY ENDPOINTS
  // ============================================

  async getLoyaltyStats() {
    return this.request<LoyaltyStats>('/loyalty/stats');
  }

  async getLoyaltyCustomers(params?: {
    page?: number;
    limit?: number;
    tier?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.tier) {query.set('tier', params.tier);}
    if (params?.search) {query.set('search', params.search);}
    if (params?.sortBy) {query.set('sortBy', params.sortBy);}
    if (params?.sortOrder) {query.set('sortOrder', params.sortOrder);}
    const queryString = query.toString();
    return this.request<{
      customers: CustomerWithLoyalty[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/loyalty/customers${queryString ? `?${queryString}` : ''}`);
  }

  async getLoyaltyCustomer(customerId: string) {
    return this.request<{
      customer: { _id: string; name?: string; phone: string; email?: string };
      loyalty: CustomerLoyaltyInfo;
      recentTransactions: LoyaltyTransaction[];
    }>(`/loyalty/customers/${customerId}`);
  }

  async getLoyaltyCustomerHistory(
    customerId: string,
    params?: { page?: number; limit?: number; type?: string }
  ) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.type) {query.set('type', params.type);}
    const queryString = query.toString();
    return this.request<{
      transactions: LoyaltyTransaction[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/loyalty/customers/${customerId}/history${queryString ? `?${queryString}` : ''}`);
  }

  async adjustCustomerPoints(customerId: string, points: number, reason: string) {
    return this.request<{
      transaction: LoyaltyTransaction;
      newBalance: number;
      newTier: string;
    }>(`/loyalty/customers/${customerId}/adjust`, {
      method: 'POST',
      body: { points, reason },
    });
  }

  async addCustomerBonusPoints(customerId: string, points: number, description: string) {
    return this.request<{
      transaction: LoyaltyTransaction;
      newBalance: number;
      newTier: string;
    }>(`/loyalty/customers/${customerId}/bonus`, {
      method: 'POST',
      body: { points, description },
    });
  }

  async triggerPointExpiration() {
    return this.request<{
      customersProcessed: number;
      totalPointsExpired: number;
    }>('/loyalty/expire-points', { method: 'POST' });
  }

  // ============================================
  // TABLE ENDPOINTS (Admin)
  // ============================================

  async getTables() {
    return this.request<Table[]>('/tables');
  }

  async getTableById(id: string) {
    return this.request<Table>(`/tables/${id}`);
  }

  async createTable(data: CreateTableData) {
    return this.request<Table>('/tables', { method: 'POST', body: data });
  }

  async updateTable(id: string, data: UpdateTableData) {
    return this.request<Table>(`/tables/${id}`, { method: 'PUT', body: data });
  }

  async deleteTable(id: string) {
    return this.request(`/tables/${id}`, { method: 'DELETE' });
  }

  async toggleTableStatus(id: string) {
    return this.request<Table>(`/tables/${id}/toggle`, { method: 'PUT' });
  }

  async reorderTables(tables: { id: string; order: number }[]) {
    return this.request('/tables/reorder', { method: 'PUT', body: { tables } });
  }

  async bulkCreateTables(tables: CreateTableData[]) {
    return this.request<Table[]>('/tables/bulk', { method: 'POST', body: { tables } });
  }

  async getTablesByLocation(location: string) {
    return this.request<Table[]>(`/tables/location/${location}`);
  }

  async getTableStats() {
    return this.request<TableStats>('/tables/stats');
  }

  // ============================================
  // RESERVATION ENDPOINTS (Admin)
  // ============================================

  async getReservations(params?: {
    status?: ReservationStatus | ReservationStatus[];
    dateFrom?: string;
    dateTo?: string;
    tableId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const query = new URLSearchParams();
    if (params?.status) {
      query.set('status', Array.isArray(params.status) ? params.status.join(',') : params.status);
    }
    if (params?.dateFrom) {query.set('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.set('dateTo', params.dateTo);}
    if (params?.tableId) {query.set('tableId', params.tableId);}
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.sortBy) {query.set('sortBy', params.sortBy);}
    if (params?.sortOrder) {query.set('sortOrder', params.sortOrder);}
    const queryString = query.toString();
    return this.request<{
      reservations: Reservation[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/reservations${queryString ? `?${queryString}` : ''}`);
  }

  async getTodayReservations() {
    return this.request<Reservation[]>('/reservations/today');
  }

  async getReservationStats(params?: { dateFrom?: string; dateTo?: string }) {
    const query = new URLSearchParams();
    if (params?.dateFrom) {query.set('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.set('dateTo', params.dateTo);}
    const queryString = query.toString();
    return this.request<ReservationStats>(`/reservations/stats${queryString ? `?${queryString}` : ''}`);
  }

  async getReservation(id: string) {
    return this.request<Reservation>(`/reservations/${id}`);
  }

  async createReservationAdmin(data: CreateReservationData) {
    return this.request<Reservation>('/reservations', { method: 'POST', body: data });
  }

  async updateReservation(id: string, data: UpdateReservationData) {
    return this.request<Reservation>(`/reservations/${id}`, { method: 'PUT', body: data });
  }

  async confirmReservation(id: string) {
    return this.request<Reservation>(`/reservations/${id}/confirm`, { method: 'PUT' });
  }

  async assignTableToReservation(id: string, tableId?: string) {
    return this.request<Reservation>(`/reservations/${id}/assign-table`, {
      method: 'PUT',
      body: tableId ? { tableId } : {},
    });
  }

  async markReservationArrived(id: string) {
    return this.request<Reservation>(`/reservations/${id}/arrived`, { method: 'PUT' });
  }

  async markReservationSeated(id: string, tableId?: string) {
    return this.request<Reservation>(`/reservations/${id}/seated`, {
      method: 'PUT',
      body: tableId ? { tableId } : {},
    });
  }

  async markReservationCompleted(id: string) {
    return this.request<Reservation>(`/reservations/${id}/completed`, { method: 'PUT' });
  }

  async markReservationNoShow(id: string) {
    return this.request<Reservation>(`/reservations/${id}/no-show`, { method: 'PUT' });
  }

  async cancelReservationAdmin(id: string, reason?: string) {
    return this.request<Reservation>(`/reservations/${id}/cancel`, {
      method: 'PUT',
      body: reason ? { reason } : {},
    });
  }

  // ============================================
  // CUSTOMER RESERVATION ENDPOINTS
  // ============================================

  async getAvailableDates(
    restaurantId: string,
    partySize: number,
    params?: { days?: number; location?: LocationPreference }
  ) {
    const query = new URLSearchParams();
    query.set('partySize', String(partySize));
    if (params?.days) {query.set('days', String(params.days));}
    if (params?.location) {query.set('location', params.location);}
    return this.request<AvailabilityResponse>(
      `/customer/reservations/${restaurantId}/availability/dates?${query.toString()}`
    );
  }

  async getAvailableSlots(
    restaurantId: string,
    date: string,
    partySize: number,
    location?: LocationPreference
  ) {
    const query = new URLSearchParams();
    query.set('date', date);
    query.set('partySize', String(partySize));
    if (location) {query.set('location', location);}
    return this.request<TimeSlot[]>(
      `/customer/reservations/${restaurantId}/availability/slots?${query.toString()}`
    );
  }

  async createCustomerReservation(restaurantId: string, data: CreateReservationData) {
    return this.request<Reservation>(
      `/customer/reservations/${restaurantId}`,
      { method: 'POST', body: data },
      true
    );
  }

  async getMyReservations(params?: { upcoming?: boolean; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.upcoming) {query.set('upcoming', 'true');}
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    const queryString = query.toString();
    return this.request<{
      reservations: Reservation[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/customer/reservations/me${queryString ? `?${queryString}` : ''}`, {}, true);
  }

  async getMyReservation(id: string) {
    return this.request<Reservation>(`/customer/reservations/me/${id}`, {}, true);
  }

  async cancelMyReservation(id: string, reason?: string) {
    return this.request<Reservation>(
      `/customer/reservations/me/${id}/cancel`,
      { method: 'PUT', body: reason ? { reason } : {} },
      true
    );
  }

  // ============================================
  // Campaigns (SMS Marketing)
  // ============================================
  async getCampaigns(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) {query.set('status', params.status);}
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    const queryString = query.toString();
    return this.request<{
      campaigns: Campaign[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/campaigns${queryString ? `?${queryString}` : ''}`);
  }

  async getCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}`);
  }

  async getCampaignStats() {
    return this.request<{
      summary: {
        totalCampaigns: number;
        completedCampaigns: number;
        totalMessagesSent: number;
        totalSuccess: number;
        totalFailed: number;
      };
      statusCounts: Record<string, number>;
    }>('/campaigns/stats');
  }

  async createCampaign(data: { name: string; message: string; scheduledAt?: string }) {
    return this.request<{ campaign: Campaign; estimatedRecipients: number }>('/campaigns', {
      method: 'POST',
      body: data,
    });
  }

  async updateCampaign(id: string, data: Partial<{ name: string; message: string; scheduledAt: string }>) {
    return this.request<Campaign>(`/campaigns/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteCampaign(id: string) {
    return this.request<void>(`/campaigns/${id}`, { method: 'DELETE' });
  }

  async sendCampaign(id: string, scheduledAt?: string) {
    return this.request<{ campaign: Campaign }>(`/campaigns/${id}/send`, {
      method: 'POST',
      body: scheduledAt ? { scheduledAt } : {},
    });
  }

  async cancelCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}/cancel`, { method: 'POST' });
  }

  // ============================================
  // REVIEW ENDPOINTS (Public)
  // ============================================

  async getRestaurantReviews(restaurantId: string, params?: ReviewQueryParams) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.rating) {query.set('rating', String(params.rating));}
    if (params?.sort) {query.set('sort', params.sort);}
    const queryString = query.toString();
    return this.request<{
      reviews: Review[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/reviews/restaurant/${restaurantId}${queryString ? `?${queryString}` : ''}`);
  }

  async getDishReviews(dishId: string, params?: ReviewQueryParams) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.rating) {query.set('rating', String(params.rating));}
    if (params?.sort) {query.set('sort', params.sort);}
    const queryString = query.toString();
    return this.request<{
      reviews: Review[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/reviews/dish/${dishId}${queryString ? `?${queryString}` : ''}`);
  }

  async getReviewById(id: string) {
    return this.request<Review>(`/reviews/${id}`);
  }

  async getRestaurantReviewStats(restaurantId: string) {
    return this.request<ReviewStats>(`/reviews/restaurant/${restaurantId}/stats`);
  }

  async checkCanReview(restaurantId: string, dishId?: string) {
    const query = new URLSearchParams();
    query.set('restaurantId', restaurantId);
    if (dishId) {query.set('dishId', dishId);}
    return this.request<CanReviewResult>(`/reviews/can-review?${query.toString()}`, {}, true);
  }

  // ============================================
  // REVIEW ENDPOINTS (Customer)
  // ============================================

  async createReview(data: CreateReviewDTO) {
    return this.request<Review>('/customer/reviews', { method: 'POST', body: data }, true);
  }

  async updateReview(id: string, data: UpdateReviewDTO) {
    return this.request<Review>(`/customer/reviews/${id}`, { method: 'PUT', body: data }, true);
  }

  async deleteReview(id: string) {
    return this.request<void>(`/customer/reviews/${id}`, { method: 'DELETE' }, true);
  }

  async getMyReviews(params?: ReviewQueryParams) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.sort) {query.set('sort', params.sort);}
    const queryString = query.toString();
    return this.request<{
      reviews: Review[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/customer/reviews/me${queryString ? `?${queryString}` : ''}`, {}, true);
  }

  async markReviewHelpful(id: string) {
    return this.request<HelpfulVoteResponse>(`/customer/reviews/${id}/helpful`, { method: 'POST' }, true);
  }

  async reportReview(id: string, reason?: string) {
    return this.request<void>(`/customer/reviews/${id}/report`, { method: 'POST', body: { reason } }, true);
  }

  // ============================================
  // REVIEW ENDPOINTS (Admin)
  // ============================================

  async getAdminReviews(params?: AdminReviewQueryParams) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.rating) {query.set('rating', String(params.rating));}
    if (params?.status) {query.set('status', params.status);}
    if (params?.sort) {query.set('sort', params.sort);}
    if (params?.dishId) {query.set('dishId', params.dishId);}
    if (params?.customerId) {query.set('customerId', params.customerId);}
    if (params?.hasResponse !== undefined) {query.set('hasResponse', String(params.hasResponse));}
    if (params?.isVerifiedPurchase !== undefined) {query.set('isVerifiedPurchase', String(params.isVerifiedPurchase));}
    const queryString = query.toString();
    return this.request<{
      reviews: Review[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/admin/reviews${queryString ? `?${queryString}` : ''}`);
  }

  async getPendingReviews() {
    return this.request<Review[]>('/admin/reviews/pending');
  }

  async getAdminReviewStats() {
    return this.request<AdminReviewStats>('/admin/reviews/stats');
  }

  async getReviewDistribution() {
    return this.request<{
      distribution: Array<{
        rating: number;
        count: number;
        percentage: number;
      }>;
      total: number;
    }>('/admin/reviews/stats/distribution');
  }

  async getReviewTrend(params?: { period?: 'day' | 'week' | 'month'; months?: number }) {
    const query = new URLSearchParams();
    if (params?.period) {query.set('period', params.period);}
    if (params?.months) {query.set('months', String(params.months));}
    const queryString = query.toString();
    return this.request<Array<{
      label: string;
      avgRating: number;
      count: number;
    }>>(`/admin/reviews/stats/trend${queryString ? `?${queryString}` : ''}`);
  }

  async approveReview(id: string) {
    return this.request<Review>(`/admin/reviews/${id}/approve`, { method: 'PUT' });
  }

  async rejectReview(id: string, reason: string) {
    return this.request<Review>(`/admin/reviews/${id}/reject`, { method: 'PUT', body: { reason } });
  }

  async respondToReview(id: string, content: string) {
    return this.request<Review>(`/admin/reviews/${id}/respond`, { method: 'PUT', body: { content } });
  }

  async deleteAdminReview(id: string) {
    return this.request<void>(`/admin/reviews/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // SUPER ADMIN: AUDIT LOGS
  // ============================================

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    category?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.category) {query.set('category', params.category);}
    if (params?.action) {query.set('action', params.action);}
    if (params?.userId) {query.set('userId', params.userId);}
    if (params?.startDate) {query.set('startDate', params.startDate);}
    if (params?.endDate) {query.set('endDate', params.endDate);}
    if (params?.search) {query.set('search', params.search);}
    if (params?.status) {query.set('status', params.status);}
    const queryString = query.toString();
    return this.request<{
      logs: AuditLog[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/superadmin/audit-logs${queryString ? `?${queryString}` : ''}`);
  }

  async getAuditLogById(id: string) {
    return this.request<AuditLog>(`/superadmin/audit-logs/${id}`);
  }

  async getAuditLogStats(days?: number) {
    const query = days ? `?days=${days}` : '';
    return this.request<{
      total: number;
      byAction: { _id: string; count: number }[];
      byCategory: { _id: string; count: number }[];
      byStatus: { _id: string; count: number }[];
      daily: { date: string; count: number; success: number; failure: number }[];
      topUsers: { _id: string; userName: string; userEmail: string; count: number }[];
    }>(`/superadmin/audit-logs/stats${query}`);
  }

  // ============================================
  // SUPER ADMIN: LOGIN HISTORY
  // ============================================

  async getLoginHistory(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    userEmail?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    ipAddress?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.userId) {query.set('userId', params.userId);}
    if (params?.userEmail) {query.set('userEmail', params.userEmail);}
    if (params?.status) {query.set('status', params.status);}
    if (params?.startDate) {query.set('startDate', params.startDate);}
    if (params?.endDate) {query.set('endDate', params.endDate);}
    if (params?.ipAddress) {query.set('ipAddress', params.ipAddress);}
    const queryString = query.toString();
    return this.request<{
      history: LoginHistoryEntry[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/superadmin/login-history${queryString ? `?${queryString}` : ''}`);
  }

  async getLoginHistoryStats(days?: number) {
    const query = days ? `?days=${days}` : '';
    return this.request<{
      today: { total: number; success: number; failed: number; uniqueUsers: number };
      byStatus: { _id: string; count: number }[];
      byDevice: { _id: string; count: number }[];
      daily: { date: string; total: number; success: number; failed: number }[];
      topIPs: { _id: string; count: number; successCount: number; failedCount: number }[];
      failureReasons: { _id: string; count: number }[];
      avgSessionDuration: number;
    }>(`/superadmin/login-history/stats${query}`);
  }

  async getUserLoginHistory(userId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    const queryString = query.toString();
    return this.request<{
      history: LoginHistoryEntry[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/superadmin/login-history/user/${userId}${queryString ? `?${queryString}` : ''}`);
  }

  // ============================================
  // SUPER ADMIN: SYSTEM ALERTS
  // ============================================

  async getSystemAlerts(params?: {
    page?: number;
    limit?: number;
    type?: string;
    category?: string;
    priority?: string;
    isResolved?: boolean;
    isAcknowledged?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.type) {query.set('type', params.type);}
    if (params?.category) {query.set('category', params.category);}
    if (params?.priority) {query.set('priority', params.priority);}
    if (params?.isResolved !== undefined) {query.set('isResolved', String(params.isResolved));}
    if (params?.isAcknowledged !== undefined) {query.set('isAcknowledged', String(params.isAcknowledged));}
    if (params?.startDate) {query.set('startDate', params.startDate);}
    if (params?.endDate) {query.set('endDate', params.endDate);}
    const queryString = query.toString();
    return this.request<{
      alerts: SystemAlertEntry[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/superadmin/alerts${queryString ? `?${queryString}` : ''}`);
  }

  async getSystemAlertById(id: string) {
    return this.request<SystemAlertEntry>(`/superadmin/alerts/${id}`);
  }

  async getSystemAlertStats() {
    return this.request<{
      total: { unresolved: number; resolved: number; critical: number; last24h: number };
      byType: { _id: string; count: number }[];
      byCategory: { _id: string; count: number }[];
      byPriority: { _id: string; count: number }[];
      unresolvedByPriority: Record<string, { count: number; unacknowledged: number }>;
    }>('/superadmin/alerts/stats');
  }

  async acknowledgeAlert(id: string) {
    return this.request<SystemAlertEntry>(`/superadmin/alerts/${id}/acknowledge`, { method: 'PUT' });
  }

  async resolveAlert(id: string, resolutionNote?: string) {
    return this.request<SystemAlertEntry>(`/superadmin/alerts/${id}/resolve`, {
      method: 'PUT',
      body: { resolutionNote },
    });
  }

  async deleteAlert(id: string) {
    return this.request<void>(`/superadmin/alerts/${id}`, { method: 'DELETE' });
  }

  async createTestAlert(data: { type?: string; category?: string; priority?: string; title?: string; message?: string }) {
    return this.request<SystemAlertEntry>('/superadmin/alerts/test', { method: 'POST', body: data });
  }

  // ============================================
  // BULK OPERATIONS (Super Admin)
  // ============================================

  async bulkUpdateRestaurantStatus(ids: string[], isActive: boolean, reason?: string) {
    return this.request<{ modified: number; matched: number }>('/superadmin/bulk/restaurants/status', {
      method: 'POST',
      body: { ids, isActive, reason },
    });
  }

  async bulkDeleteRestaurants(ids: string[], permanent = false) {
    return this.request<{ modified?: number }>('/superadmin/bulk/restaurants/delete', {
      method: 'POST',
      body: { ids, permanent },
    });
  }

  async bulkExportRestaurants(ids?: string[], format: 'json' | 'csv' = 'json') {
    return this.request<unknown[]>('/superadmin/bulk/restaurants/export', {
      method: 'POST',
      body: { ids, format },
    });
  }

  async bulkUpdateUserStatus(ids: string[], isActive: boolean, reason?: string) {
    return this.request<{ modified: number; matched: number }>('/superadmin/bulk/users/status', {
      method: 'POST',
      body: { ids, isActive, reason },
    });
  }

  async bulkDeleteUsers(ids: string[]) {
    return this.request<void>('/superadmin/bulk/users/delete', {
      method: 'POST',
      body: { ids },
    });
  }

  async bulkExtendSubscriptions(ids: string[], days: number, reason?: string) {
    return this.request<{ id: string; oldEndDate: string; newEndDate: string }[]>('/superadmin/bulk/subscriptions/extend', {
      method: 'POST',
      body: { ids, days, reason },
    });
  }

  async bulkCancelSubscriptions(ids: string[], reason?: string) {
    return this.request<{ modified: number }>('/superadmin/bulk/subscriptions/cancel', {
      method: 'POST',
      body: { ids, reason },
    });
  }

  // ============================================
  // IMPERSONATION (Super Admin)
  // ============================================

  async startImpersonation(restaurantId: string) {
    return this.request<{
      restaurantId: string;
      restaurantName: string;
      restaurantSlug: string;
      ownerId: string;
      ownerName: string;
      ownerEmail: string;
      ownerRole: string;
      impersonationToken: string;
      expiresIn: number;
      impersonationUrl: string;
    }>(`/superadmin/restaurants/${restaurantId}/impersonate`, { method: 'POST' });
  }

  async endImpersonation() {
    return this.request<{
      originalUserId: string;
      originalEmail: string;
      redirectUrl: string;
    }>('/superadmin/end-impersonation', { method: 'POST' });
  }

  // ============================================
  // BACKUP & EXPORT (Super Admin)
  // ============================================

  async getBackups(params?: { page?: number; limit?: number; status?: string; type?: string }) {
    const query = new URLSearchParams();
    if (params?.page) {query.set('page', String(params.page));}
    if (params?.limit) {query.set('limit', String(params.limit));}
    if (params?.status) {query.set('status', params.status);}
    if (params?.type) {query.set('type', params.type);}
    const queryString = query.toString();
    return this.request<{
      backups: Backup[];
      total: number;
      pages: number;
    }>(`/superadmin/backups${queryString ? `?${queryString}` : ''}`);
  }

  async getBackupById(id: string) {
    return this.request<Backup>(`/superadmin/backups/${id}`);
  }

  async getBackupStats() {
    return this.request<{
      totalBackups: number;
      totalSize: number;
      completedCount: number;
      failedCount: number;
      pendingCount: number;
      lastBackup: string | null;
    }>('/superadmin/backups/stats');
  }

  async createFullBackup() {
    return this.request<Backup>('/superadmin/backups/full', { method: 'POST' });
  }

  async createPartialBackup(collections: string[], filters?: Record<string, unknown>) {
    return this.request<Backup>('/superadmin/backups/partial', {
      method: 'POST',
      body: { collections, filters },
    });
  }

  async deleteBackup(id: string) {
    return this.request<void>(`/superadmin/backups/${id}`, { method: 'DELETE' });
  }

  async downloadBackup(id: string): Promise<Blob> {
    const token = this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/superadmin/backups/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Failed to download backup');
    }
    return response.blob();
  }

  async exportRestaurantData(restaurantId: string, format: 'json' | 'download' = 'json') {
    return this.request<Record<string, unknown[]>>(`/superadmin/export/restaurant/${restaurantId}?format=${format}`);
  }

  // ============================================
  // MONITORING (Super Admin)
  // ============================================

  async getAllMonitoringMetrics(hours = 1) {
    return this.request<{
      system: SystemMetrics;
      database: DatabaseMetrics;
      app: AppMetrics;
      services: ServicesHealth;
      health: HealthCheck;
      history: MetricsHistoryPoint[];
    }>(`/superadmin/monitoring?hours=${hours}`);
  }

  async getSystemMetrics() {
    return this.request<SystemMetrics>('/superadmin/monitoring/system');
  }

  async getDatabaseMetrics() {
    return this.request<DatabaseMetrics>('/superadmin/monitoring/database');
  }

  async getAppMetrics() {
    return this.request<AppMetrics>('/superadmin/monitoring/app');
  }

  async getServicesHealth() {
    return this.request<ServicesHealth>('/superadmin/monitoring/services');
  }

  async getHealthCheck() {
    return this.request<HealthCheck>('/superadmin/monitoring/health');
  }

  async getMetricsHistory(hours = 24) {
    return this.request<{
      history: MetricsHistoryPoint[];
      count: number;
      hours: number;
    }>(`/superadmin/monitoring/history?hours=${hours}`);
  }

  // ============================================
  // STAFF MANAGEMENT
  // ============================================

  async getStaff(params?: { role?: string; isActive?: string; search?: string }) {
    let url = '/staff';
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.set(key, value);
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    }
    return this.request<{
      staff: StaffMember[];
      total: number;
    }>(url);
  }

  async getStaffMember(id: string) {
    return this.request<{
      staff: StaffMember & { permissions: string[] };
    }>(`/staff/${id}`);
  }

  async createStaffMember(data: CreateStaffData) {
    return this.request<{
      staff: StaffMember;
      temporaryPassword: string;
    }>('/staff', { method: 'POST', body: data });
  }

  async updateStaffMember(id: string, data: UpdateStaffData) {
    return this.request<{
      staff: StaffMember;
    }>(`/staff/${id}`, { method: 'PUT', body: data });
  }

  async deleteStaffMember(id: string) {
    return this.request<void>(`/staff/${id}`, { method: 'DELETE' });
  }

  async resetStaffPassword(id: string) {
    return this.request<{
      temporaryPassword: string;
    }>(`/staff/${id}/reset-password`, { method: 'POST' });
  }

  async getAvailableRoles() {
    return this.request<{
      roles: {
        value: string;
        label: string;
        permissions: string[];
      }[];
    }>('/staff/roles');
  }

  async getAvailablePermissions() {
    return this.request<{
      permissions: {
        key: string;
        value: string;
      }[];
    }>('/staff/permissions');
  }

  // ============================================
  // GENERIC HTTP METHODS (for Super Admin and flexible use)
  // ============================================

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.set(key, String(value));
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url = `${endpoint}?${queryString}`;
      }
    }
    return this.request<T>(url);
  }

  // ==================== DRIVER ENDPOINTS ====================

  /**
   * Driver login
   */
  async driverLogin(data: { email: string; password: string }) {
    return this.request<{ token: string; driver: unknown }>('/drivers/login', {
      method: 'POST',
      body: data,
      auth: 'none',
    });
  }

  /**
   * Get driver profile
   */
  async getDriverProfile() {
    return this.request<unknown>('/driver/profile', {
      auth: 'driver',
    });
  }

  /**
   * Go online (start accepting deliveries)
   */
  async driverGoOnline(location?: { lat: number; lng: number }) {
    return this.request<unknown>('/driver/go-online', {
      method: 'POST',
      body: location ? { location } : {},
      auth: 'driver',
    });
  }

  /**
   * Go offline (stop accepting deliveries)
   */
  async driverGoOffline() {
    return this.request<unknown>('/driver/go-offline', {
      method: 'POST',
      auth: 'driver',
    });
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(location: { lat: number; lng: number }) {
    return this.request<unknown>('/driver/update-location', {
      method: 'POST',
      body: location,
      auth: 'driver',
    });
  }

  /**
   * Get active delivery for driver
   */
  async getActiveDelivery() {
    return this.request<unknown>('/driver/deliveries/active', {
      auth: 'driver',
    });
  }

  /**
   * Get driver deliveries history
   */
  async getDriverDeliveries(params?: { page?: number; limit?: number; status?: string }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<unknown>(`/driver/deliveries${queryString ? '?' + queryString : ''}`, {
      auth: 'driver',
    });
  }

  /**
   * Accept delivery assignment
   */
  async acceptDelivery(deliveryId: string) {
    return this.request<unknown>(`/deliveries/${deliveryId}/accept`, {
      method: 'POST',
      auth: 'driver',
    });
  }

  /**
   * Reject delivery assignment
   */
  async rejectDelivery(deliveryId: string, reason?: string) {
    return this.request<unknown>(`/deliveries/${deliveryId}/reject`, {
      method: 'POST',
      body: { reason },
      auth: 'driver',
    });
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(deliveryId: string, status: string, data?: Record<string, unknown>) {
    return this.request<unknown>(`/deliveries/${deliveryId}/status`, {
      method: 'PUT',
      body: { status, ...data },
      auth: 'driver',
    });
  }

  /**
   * Complete delivery with POD
   */
  async completeDeliveryWithPOD(deliveryId: string, podData: {
    photoUrl?: string;
    signatureUrl?: string;
    otpCode?: string;
    deliveryNotes?: string;
    gpsCoordinates?: { lat: number; lng: number };
  }) {
    return this.request<unknown>(`/deliveries/${deliveryId}/complete`, {
      method: 'POST',
      body: podData,
      auth: 'driver',
    });
  }

  /**
   * Get delivery ETA (public - for customer tracking)
   */
  async getDeliveryETA(deliveryId: string) {
    return this.request<{
      deliveryId: string;
      status: string;
      etaType: 'to_restaurant' | 'to_customer';
      eta: string;
      durationMinutes: number;
      distanceKm: number;
      trafficCondition: 'light' | 'moderate' | 'heavy' | 'unknown';
      driverLocation: { lat: number; lng: number; updatedAt: string };
      destination: { lat: number; lng: number; type: string };
      route?: { polyline: string; distanceKm: number; durationMinutes: number };
      mapsApiEnabled: boolean;
    }>(`/deliveries/${deliveryId}/eta`, {
      auth: 'none',
    });
  }

  /**
   * Get delivery route with polyline (public - for customer tracking)
   */
  async getDeliveryRoute(deliveryId: string) {
    return this.request<{
      deliveryId: string;
      status: string;
      driverLocation: { lat: number; lng: number };
      restaurant: { coordinates: { lat: number; lng: number }; address: string };
      customer: { coordinates: { lat: number; lng: number }; address: string; instructions?: string };
      eta: {
        toRestaurant: { eta: string; durationMinutes: number; distanceKm: number };
        toCustomer: { eta: string; durationMinutes: number; distanceKm: number };
        total: { eta: string; minutes: number };
      };
      routes: {
        toRestaurant?: { polyline: string; distanceKm: number; durationMinutes: number };
        toCustomer?: { polyline: string; distanceKm: number; durationMinutes: number };
      };
      mapsApiEnabled: boolean;
    }>(`/deliveries/${deliveryId}/route`, {
      auth: 'none',
    });
  }

  /**
   * Track delivery by tracking code (public)
   */
  async trackDelivery(trackingCode: string) {
    return this.request<unknown>(`/deliveries/track/${trackingCode}`, {
      auth: 'none',
    });
  }

  /**
   * Add tip to a completed delivery (public - for customers)
   */
  async addDeliveryTip(deliveryId: string, amount: number, tipMessage?: string) {
    return this.request<{ tipAmount: number; deliveryId: string }>(`/deliveries/${deliveryId}/tip`, {
      method: 'POST',
      body: { amount, message: tipMessage },
      auth: 'none',
    });
  }

  /**
   * Rate a completed delivery (public - for customers)
   */
  async rateDelivery(deliveryId: string, rating: number, comment?: string) {
    return this.request<{ rating: number; deliveryId: string }>(`/deliveries/${deliveryId}/rate`, {
      method: 'POST',
      body: { rating, comment },
      auth: 'none',
    });
  }

  /**
   * Get driver earnings
   */
  async getDriverEarnings(params?: { startDate?: string; endDate?: string }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<unknown>(`/driver/earnings${queryString ? '?' + queryString : ''}`, {
      auth: 'driver',
    });
  }

  /**
   * Get driver earnings summary
   */
  async getDriverEarningsSummary() {
    return this.request<unknown>('/driver/earnings', {
      auth: 'driver',
    });
  }

  /**
   * Get specific delivery details for driver
   */
  async getDriverDeliveryDetail(deliveryId: string) {
    return this.request<unknown>(`/driver/deliveries/${deliveryId}`, {
      auth: 'driver',
    });
  }

  /**
   * Verify delivery OTP
   */
  async verifyDeliveryOTP(deliveryId: string, otp: string) {
    return this.request<unknown>(`/driver/deliveries/${deliveryId}/verify-otp`, {
      method: 'POST',
      body: { otp },
      auth: 'driver',
    });
  }

  /**
   * Complete delivery without POD
   */
  async completeDeliverySimple(deliveryId: string, type: string = 'customer_confirm') {
    return this.request<unknown>(`/driver/deliveries/${deliveryId}/complete`, {
      method: 'POST',
      body: { type },
      auth: 'driver',
    });
  }

  /**
   * Update driver profile
   */
  async updateDriverProfile(data: Record<string, unknown>) {
    return this.request<unknown>('/driver/profile', {
      method: 'PUT',
      body: data,
      auth: 'driver',
    });
  }

  /**
   * Update driver notification preferences
   */
  async updateDriverNotifications(preferences: Record<string, boolean>) {
    return this.request<unknown>('/driver/notifications', {
      method: 'PUT',
      body: { notificationPreferences: preferences },
      auth: 'driver',
    });
  }

  // ============================================
  // Admin Driver Management API Methods
  // ============================================

  /**
   * Get all drivers (admin)
   */
  async getDrivers(params?: { page?: number; limit?: number; search?: string; status?: string; vehicleType?: string }) {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<{ drivers: unknown[]; total: number; page: number; pages: number }>(
      `/drivers${queryString ? '?' + queryString : ''}`,
      { auth: 'admin' }
    );
  }

  /**
   * Verify driver (admin)
   */
  async verifyDriver(driverId: string) {
    return this.request<unknown>(`/drivers/${driverId}/verify`, {
      method: 'POST',
      auth: 'admin',
    });
  }

  /**
   * Suspend driver (admin)
   */
  async suspendDriver(driverId: string, reason?: string) {
    return this.request<unknown>(`/drivers/${driverId}/suspend`, {
      method: 'POST',
      body: { reason },
      auth: 'admin',
    });
  }

  /**
   * Reactivate driver (admin)
   */
  async reactivateDriver(driverId: string) {
    return this.request<unknown>(`/drivers/${driverId}/reactivate`, {
      method: 'POST',
      auth: 'admin',
    });
  }

  /**
   * Verify driver document (admin)
   */
  async verifyDriverDocument(driverId: string, docType: string) {
    return this.request<unknown>(`/drivers/${driverId}/documents/${docType}/verify`, {
      method: 'POST',
      auth: 'admin',
    });
  }

  // ============================================
  // Masked Calling (Twilio Voice)
  // ============================================

  /**
   * Check if masked calling is enabled
   */
  async isCallingEnabled() {
    return this.request<{ enabled: boolean }>('/calls/enabled', {
      auth: 'none',
    });
  }

  /**
   * Customer: Initiate call to driver
   */
  async customerInitiateCall(deliveryId: string) {
    return this.request<{
      callSessionId: string;
      twilioCallSid: string;
      message: string;
    }>('/calls/customer/initiate', {
      method: 'POST',
      body: { deliveryId },
      auth: 'customer',
    });
  }

  /**
   * Driver: Initiate call to customer
   */
  async driverInitiateCall(deliveryId: string) {
    return this.request<{
      callSessionId: string;
      twilioCallSid: string;
      message: string;
    }>('/calls/driver/initiate', {
      method: 'POST',
      body: { deliveryId },
      auth: 'driver',
    });
  }

  /**
   * Get call status
   */
  async getCallStatus(sessionId: string) {
    return this.request<{
      id: string;
      status: 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy';
      duration?: number;
      createdAt: string;
      answeredAt?: string;
      endedAt?: string;
    }>(`/calls/status/${sessionId}`, {
      auth: 'none',
    });
  }

  /**
   * End an active call
   */
  async endCall(sessionId: string) {
    return this.request<{ message: string }>(`/calls/end/${sessionId}`, {
      method: 'POST',
      auth: 'none',
    });
  }

  /**
   * Get call history for a delivery
   */
  async getDeliveryCallHistory(deliveryId: string) {
    return this.request<Array<{
      id: string;
      callerType: 'customer' | 'driver';
      recipientType: 'customer' | 'driver';
      status: string;
      duration?: number;
      createdAt: string;
      endedAt?: string;
    }>>(`/calls/delivery/${deliveryId}/history`, {
      auth: 'none',
    });
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============================================
  // Hotel Guest API Methods
  // ============================================

  private hotelGuestToken: string | null = null;

  /**
   * Set hotel guest token
   */
  setHotelGuestToken(token: string | null): void {
    this.hotelGuestToken = token;
  }

  /**
   * Get hotel guest token
   */
  private getHotelGuestToken(): string | null {
    if (this.hotelGuestToken) {return this.hotelGuestToken;}
    // Try to get from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('menuqr_hotel_guest_') && k.endsWith('_auth'));
    const firstKey = keys[0];
    if (firstKey) {
      const stored = localStorage.getItem(firstKey);
      if (stored) {
        try {
          const { accessToken } = JSON.parse(stored);
          this.hotelGuestToken = accessToken;
          return accessToken;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Hotel guest request helper
   */
  private async hotelGuestRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const token = this.getHotelGuestToken();
    const headers = { ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.request<T>(endpoint, { ...options, headers, auth: 'none' });
  }

  /**
   * Get hotel by slug (public)
   */
  async hotelGetBySlug(slug: string) {
    return this.request<HotelInfo>(`/hotels/slug/${slug}`, { auth: 'none' });
  }

  /**
   * Get room by QR code (public)
   */
  async hotelGetRoomByQR(qrCode: string) {
    return this.request<{ room: RoomInfo; hotel: HotelInfo }>(`/hotels/rooms/qr/${qrCode}`, { auth: 'none' });
  }

  /**
   * Hotel guest authenticate with access code
   */
  async hotelGuestAuthAccessCode(hotelId: string, accessCode: string) {
    return this.request<{
      guest: HotelGuestData;
      accessToken: string;
      refreshToken: string;
      hotel: HotelInfo;
      room: RoomInfo;
    }>(`/hotels/${hotelId}/guest/auth/access-code`, {
      method: 'POST',
      body: { accessCode },
      auth: 'none',
    });
  }

  /**
   * Hotel guest authenticate with PIN
   */
  async hotelGuestAuthPIN(hotelId: string, roomNumber: string, pin: string) {
    return this.request<{
      guest: HotelGuestData;
      accessToken: string;
      refreshToken: string;
      hotel: HotelInfo;
      room: RoomInfo;
    }>(`/hotels/${hotelId}/guest/auth/pin`, {
      method: 'POST',
      body: { roomNumber, pin },
      auth: 'none',
    });
  }

  /**
   * Hotel guest set PIN
   */
  async hotelGuestSetPIN(pin: string) {
    return this.hotelGuestRequest<{ message: string }>('/hotels/guest/auth/set-pin', {
      method: 'POST',
      body: { pin },
    });
  }

  /**
   * Hotel guest refresh token
   */
  async hotelGuestRefreshToken() {
    return this.hotelGuestRequest<{ accessToken: string; refreshToken: string }>('/hotels/guest/auth/refresh', {
      method: 'POST',
    });
  }

  /**
   * Get hotel guest profile
   */
  async hotelGuestGetProfile() {
    return this.hotelGuestRequest<HotelGuestData>('/hotels/guest/me');
  }

  /**
   * Update hotel guest preferences
   */
  async hotelGuestUpdatePreferences(data: {
    language?: string;
    dietaryPreferences?: string[];
    allergens?: string[];
  }) {
    return this.hotelGuestRequest<HotelGuestData>('/hotels/guest/me/preferences', {
      method: 'PATCH',
      body: data,
    });
  }

  /**
   * Get hotel guest order history
   */
  async hotelGuestGetOrders() {
    return this.hotelGuestRequest<HotelOrderData[]>('/hotels/guest/me/orders');
  }

  /**
   * Get hotel guest active orders
   */
  async hotelGuestGetActiveOrders() {
    return this.hotelGuestRequest<HotelOrderData[]>('/hotels/guest/orders');
  }

  /**
   * Get hotel menus (public)
   */
  async hotelGetMenus(hotelId: string) {
    return this.request<HotelMenuData[]>(`/hotels/${hotelId}/menus`, { auth: 'none' });
  }

  /**
   * Get hotel menu for guest (with categories and dishes)
   */
  async hotelGetMenuForGuest(hotelId: string, menuId: string) {
    return this.request<HotelMenuWithItems>(`/hotels/${hotelId}/menus/${menuId}/guest`, { auth: 'none' });
  }

  /**
   * Get categories for a menu
   */
  async hotelGetCategories(hotelId: string, menuId: string) {
    return this.request<HotelCategoryData[]>(`/hotels/${hotelId}/menus/${menuId}/categories`, { auth: 'none' });
  }

  /**
   * Get dishes for a category
   */
  async hotelGetDishes(hotelId: string, menuId: string, categoryId: string) {
    return this.request<HotelDishData[]>(`/hotels/${hotelId}/menus/${menuId}/categories/${categoryId}/dishes`, { auth: 'none' });
  }

  /**
   * Get dish by ID
   */
  async hotelGetDish(hotelId: string, dishId: string) {
    return this.request<HotelDishData>(`/hotels/${hotelId}/dishes/${dishId}`, { auth: 'none' });
  }

  /**
   * Search dishes
   */
  async hotelSearchDishes(hotelId: string, query: string) {
    return this.request<HotelDishData[]>(`/hotels/${hotelId}/dishes/search?q=${encodeURIComponent(query)}`, { auth: 'none' });
  }

  /**
   * Get popular dishes
   */
  async hotelGetPopularDishes(hotelId: string) {
    return this.request<HotelDishData[]>(`/hotels/${hotelId}/dishes/popular`, { auth: 'none' });
  }

  /**
   * Get featured dishes
   */
  async hotelGetFeaturedDishes(hotelId: string) {
    return this.request<HotelDishData[]>(`/hotels/${hotelId}/dishes/featured`, { auth: 'none' });
  }

  /**
   * Create hotel order (guest)
   */
  async hotelCreateOrder(hotelId: string, orderData: {
    roomId: string;
    items: Array<{
      dishId: string;
      quantity: number;
      options?: Array<{ name: string; price: number }>;
      variant?: { name: string; price: number };
      specialInstructions?: string;
    }>;
    paymentMethod?: string;
    deliveryInstructions?: string;
    specialInstructions?: string;
    tip?: number;
    isScheduled?: boolean;
    scheduledFor?: string;
  }) {
    return this.hotelGuestRequest<HotelOrderData>(`/hotels/${hotelId}/orders`, {
      method: 'POST',
      body: orderData,
    });
  }

  /**
   * Get hotel order by ID
   */
  async hotelGetOrder(hotelId: string, orderId: string) {
    return this.hotelGuestRequest<HotelOrderData>(`/hotels/${hotelId}/orders/${orderId}`);
  }

  /**
   * Cancel hotel order
   */
  async hotelCancelOrder(hotelId: string, orderId: string, reason?: string) {
    return this.hotelGuestRequest<HotelOrderData>(`/hotels/${hotelId}/orders/${orderId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
  }

  /**
   * Rate hotel order
   */
  async hotelRateOrder(hotelId: string, orderId: string, rating: number, feedback?: string) {
    return this.hotelGuestRequest<HotelOrderData>(`/hotels/${hotelId}/orders/${orderId}/rate`, {
      method: 'POST',
      body: { rating, feedback },
    });
  }

  // ============================================
  // Hotel Admin API Methods
  // ============================================

  /**
   * Get current user's hotel (for hotel_owner/hotel_manager roles)
   */
  async getMyHotel() {
    return this.request<HotelAdminData>('/hotels/my-hotel');
  }

  /**
   * Update hotel
   */
  async updateHotel(hotelId: string, data: Partial<Omit<HotelAdminData, 'id' | 'createdAt' | 'updatedAt'>>) {
    return this.request<HotelAdminData>(`/hotels/${hotelId}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Update hotel settings only
   */
  async updateHotelSettings(hotelId: string, settings: Partial<HotelAdminData['settings']>) {
    return this.request<HotelAdminData>(`/hotels/${hotelId}/settings`, {
      method: 'PATCH',
      body: settings,
    });
  }

  /**
   * Get hotel dashboard stats
   */
  async getHotelDashboardStats(hotelId: string) {
    return this.request<HotelDashboardStats>(`/hotels/${hotelId}/dashboard`);
  }

  /**
   * Get hotel rooms list
   */
  async getHotelRooms(hotelId: string, params?: { status?: string; floor?: number; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) {query.append('status', params.status);}
    if (params?.floor !== undefined) {query.append('floor', String(params.floor));}
    if (params?.page) {query.append('page', String(params.page));}
    if (params?.limit) {query.append('limit', String(params.limit));}
    const queryStr = query.toString();
    return this.request<{ rooms: HotelRoomAdmin[]; total: number; page: number; pages: number }>(
      `/hotels/${hotelId}/rooms${queryStr ? `?${queryStr}` : ''}`
    );
  }

  /**
   * Create a new room
   */
  async createHotelRoom(hotelId: string, data: Partial<HotelRoomAdmin>) {
    return this.request<HotelRoomAdmin>(`/hotels/${hotelId}/rooms`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update room
   */
  async updateHotelRoom(hotelId: string, roomId: string, data: Partial<HotelRoomAdmin>) {
    return this.request<HotelRoomAdmin>(`/hotels/${hotelId}/rooms/${roomId}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete room
   */
  async deleteHotelRoom(hotelId: string, roomId: string) {
    return this.request<{ message: string }>(`/hotels/${hotelId}/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update room status
   */
  async updateRoomStatus(hotelId: string, roomId: string, status: string) {
    return this.request<HotelRoomAdmin>(`/hotels/${hotelId}/rooms/${roomId}/status`, {
      method: 'PUT',
      body: { status },
    });
  }

  /**
   * Bulk create rooms
   */
  async bulkCreateRooms(hotelId: string, data: {
    prefix: string;
    startNumber: number;
    count: number;
    floor: number;
    building?: string;
    roomType: string;
    capacity: number;
    isRoomServiceEnabled: boolean;
  }) {
    return this.request<{ created: number; rooms: HotelRoomAdmin[] }>(`/hotels/${hotelId}/rooms/bulk`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Generate QR code for room
   */
  async generateRoomQR(hotelId: string, roomId: string) {
    return this.request<{ qrCode: string; qrCodeUrl: string }>(`/hotels/${hotelId}/rooms/${roomId}/qr`, {
      method: 'POST',
    });
  }

  /**
   * Get hotel guests list
   */
  async getHotelGuests(hotelId: string, params?: { status?: string; roomNumber?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) {query.append('status', params.status);}
    if (params?.roomNumber) {query.append('roomNumber', params.roomNumber);}
    if (params?.page) {query.append('page', String(params.page));}
    if (params?.limit) {query.append('limit', String(params.limit));}
    const queryStr = query.toString();
    return this.request<{ guests: HotelGuestAdmin[]; total: number; page: number; pages: number }>(
      `/hotels/${hotelId}/guests${queryStr ? `?${queryStr}` : ''}`
    );
  }

  /**
   * Check-in guest
   */
  async checkInGuest(hotelId: string, data: {
    name: string;
    email?: string;
    phone?: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    reservationNumber?: string;
  }) {
    return this.request<HotelGuestAdmin>(`/hotels/${hotelId}/guests`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update guest
   */
  async updateHotelGuest(hotelId: string, guestId: string, data: Partial<HotelGuestAdmin>) {
    return this.request<HotelGuestAdmin>(`/hotels/${hotelId}/guests/${guestId}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Check-out guest
   */
  async checkOutGuest(hotelId: string, guestId: string) {
    return this.request<{ message: string }>(`/hotels/${hotelId}/guests/${guestId}/checkout`, {
      method: 'POST',
    });
  }

  /**
   * Get hotel orders (admin)
   */
  async getHotelOrders(hotelId: string, params?: {
    status?: string;
    roomNumber?: string;
    floor?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) {query.append('status', params.status);}
    if (params?.roomNumber) {query.append('roomNumber', params.roomNumber);}
    if (params?.floor !== undefined) {query.append('floor', String(params.floor));}
    if (params?.dateFrom) {query.append('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.append('dateTo', params.dateTo);}
    if (params?.page) {query.append('page', String(params.page));}
    if (params?.limit) {query.append('limit', String(params.limit));}
    const queryStr = query.toString();
    return this.request<{ orders: HotelOrderAdmin[]; total: number; page: number; pages: number }>(
      `/hotels/${hotelId}/orders${queryStr ? `?${queryStr}` : ''}`
    );
  }

  /**
   * Get active orders for KDS
   */
  async getHotelActiveOrders(hotelId: string) {
    return this.request<HotelOrderAdmin[]>(`/hotels/${hotelId}/orders/active`);
  }

  /**
   * Update order status
   */
  async updateHotelOrderStatus(hotelId: string, orderId: string, status: string) {
    return this.request<HotelOrderAdmin>(`/hotels/${hotelId}/orders/${orderId}/status`, {
      method: 'PUT',
      body: { status },
    });
  }

  /**
   * Assign order to staff
   */
  async assignHotelOrder(hotelId: string, orderId: string, staffId: string) {
    return this.request<HotelOrderAdmin>(`/hotels/${hotelId}/orders/${orderId}/assign`, {
      method: 'PUT',
      body: { staffId },
    });
  }

  /**
   * Mark order as delivered
   */
  async markHotelOrderDelivered(hotelId: string, orderId: string, signature?: string) {
    return this.request<HotelOrderAdmin>(`/hotels/${hotelId}/orders/${orderId}/deliver`, {
      method: 'POST',
      body: { signature },
    });
  }

  /**
   * Cancel hotel order (admin)
   */
  async cancelHotelOrderAdmin(hotelId: string, orderId: string, reason: string) {
    return this.request<HotelOrderAdmin>(`/hotels/${hotelId}/orders/${orderId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
  }

  /**
   * Get hotel menus (admin)
   */
  async getHotelMenusAdmin(hotelId: string) {
    return this.request<HotelMenuAdmin[]>(`/hotels/${hotelId}/menus`);
  }

  /**
   * Create hotel menu
   */
  async createHotelMenu(hotelId: string, data: Partial<HotelMenuAdmin>) {
    return this.request<HotelMenuAdmin>(`/hotels/${hotelId}/menus`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update hotel menu
   */
  async updateHotelMenu(hotelId: string, menuId: string, data: Partial<HotelMenuAdmin>) {
    return this.request<HotelMenuAdmin>(`/hotels/${hotelId}/menus/${menuId}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete hotel menu
   */
  async deleteHotelMenu(hotelId: string, menuId: string) {
    return this.request<{ message: string }>(`/hotels/${hotelId}/menus/${menuId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get hotel categories (admin)
   */
  async getHotelCategoriesAdmin(hotelId: string, menuId: string) {
    return this.request<HotelCategoryAdmin[]>(`/hotels/${hotelId}/menus/${menuId}/categories`);
  }

  /**
   * Create hotel category
   */
  async createHotelCategory(hotelId: string, menuId: string, data: Partial<HotelCategoryAdmin>) {
    return this.request<HotelCategoryAdmin>(`/hotels/${hotelId}/menus/${menuId}/categories`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update hotel category
   */
  async updateHotelCategory(hotelId: string, menuId: string, categoryId: string, data: Partial<HotelCategoryAdmin>) {
    return this.request<HotelCategoryAdmin>(`/hotels/${hotelId}/menus/${menuId}/categories/${categoryId}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete hotel category
   */
  async deleteHotelCategory(hotelId: string, menuId: string, categoryId: string) {
    return this.request<{ message: string }>(`/hotels/${hotelId}/menus/${menuId}/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get hotel dishes (admin)
   */
  async getHotelDishesAdmin(hotelId: string, params?: { menuId?: string; categoryId?: string }) {
    const query = new URLSearchParams();
    if (params?.menuId) {query.append('menuId', params.menuId);}
    if (params?.categoryId) {query.append('categoryId', params.categoryId);}
    const queryStr = query.toString();
    return this.request<HotelDishAdmin[]>(`/hotels/${hotelId}/dishes${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Create hotel dish
   */
  async createHotelDish(hotelId: string, data: Partial<HotelDishAdmin>) {
    return this.request<HotelDishAdmin>(`/hotels/${hotelId}/dishes`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update hotel dish
   */
  async updateHotelDish(hotelId: string, dishId: string, data: Partial<HotelDishAdmin>) {
    return this.request<HotelDishAdmin>(`/hotels/${hotelId}/dishes/${dishId}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete hotel dish
   */
  async deleteHotelDish(hotelId: string, dishId: string) {
    return this.request<{ message: string }>(`/hotels/${hotelId}/dishes/${dishId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get hotel reports
   */
  async getHotelReports(hotelId: string, reportType: string, params?: { dateFrom?: string; dateTo?: string }) {
    const query = new URLSearchParams();
    if (params?.dateFrom) {query.append('dateFrom', params.dateFrom);}
    if (params?.dateTo) {query.append('dateTo', params.dateTo);}
    const queryStr = query.toString();
    return this.request<HotelReportData>(`/hotels/${hotelId}/reports/${reportType}${queryStr ? `?${queryStr}` : ''}`);
  }
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// Types
export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  settings: {
    currency: string;
    timezone: string;
    defaultLanguage: string;
    availableLanguages: string[];
    orderNotifications: boolean;
    autoAcceptOrders: boolean;
    tablePrefix: string;
    tableCount: number;
  };
  isActive: boolean;
}

export interface Category {
  _id: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr?: string; en?: string };
  image?: string;
  icon?: string;
  order: number;
  restaurantId: string;
  isActive: boolean;
}

export interface Dish {
  _id: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr?: string; en?: string };
  price: number;
  image?: string;
  images?: string[];
  categoryId: string | { _id: string; name: { fr: string; en?: string }; slug: string };
  restaurantId: string;
  allergens?: string[];
  tags?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  options?: { name: { fr: string; en?: string }; price: number; isDefault?: boolean }[];
  variants?: { name: { fr: string; en?: string }; price: number }[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  spicyLevel?: number;
  isAvailable: boolean;
  isPopular: boolean;
  isNewDish: boolean;
  preparationTime?: number;
  order: number;
}

export interface PublicMenuData {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    phone?: string;
    openingHours?: {
      day: string;
      open: string;
      close: string;
      isClosed: boolean;
    }[];
    settings: {
      currency: string;
      defaultLanguage: string;
    };
  };
  categories: {
    id: string;
    name: { fr: string; en?: string };
    slug: string;
    description?: { fr?: string; en?: string };
    icon?: string;
    order: number;
    isActive: boolean;
    dishes: {
      id: string;
      name: { fr: string; en?: string };
      slug: string;
      description?: { fr?: string; en?: string };
      price: number;
      image?: string;
      allergens?: string[];
      isVegetarian: boolean;
      isVegan: boolean;
      isGlutenFree: boolean;
      isSpicy: boolean;
      spicyLevel?: number;
      isAvailable: boolean;
      isPopular: boolean;
      isNewDish: boolean;
      preparationTime?: number;
      order: number;
      options?: { name: { fr: string; en?: string }; price: number; isDefault?: boolean }[];
      variants?: { name: { fr: string; en?: string }; price: number }[];
    }[];
  }[];
  lastUpdated: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  restaurantId: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: {
    dishId: string;
    name: string;
    price: number;
    quantity: number;
    options?: { name: string; price: number }[];
    variant?: { name: string; price: number };
    specialInstructions?: string;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentMethod?: string;
  specialInstructions?: string;
  estimatedReadyTime?: string;
  confirmedAt?: string;
  preparedAt?: string;
  servedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;

  // Scheduled order fields
  orderType?: 'immediate' | 'scheduled';
  fulfillmentType?: 'dine_in' | 'pickup' | 'delivery';
  scheduledDate?: string;
  scheduledTime?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode?: string;
    apartment?: string;
    instructions?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  reminder24hSentAt?: string;
  reminder2hSentAt?: string;
}

export interface CustomerAddress {
  _id?: string;
  label: string;
  street: string;
  city: string;
  postalCode?: string;
  country?: string;
  instructions?: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  restaurantId: string;
  isPhoneVerified: boolean;
  defaultAddress?: CustomerAddress;
  savedAddresses?: CustomerAddress[];
  dietaryPreferences?: string[];
  allergens?: string[];
  favoriteDishes?: string[];
  totalOrders?: number;
  totalSpent?: number;
  lastOrderAt?: string;
  createdAt?: string;
}

export interface CampaignRecipient {
  customerId: string;
  phone: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

export interface Campaign {
  _id: string;
  restaurantId: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled';
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  stats: {
    totalRecipients: number;
    sent: number;
    success: number;
    failed: number;
  };
  recipients: CampaignRecipient[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Audit & Security Types
export interface AuditLog {
  _id: string;
  action: string;
  category: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  description: string;
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  createdAt: string;
}

export interface LoginHistoryEntry {
  _id: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  userRole?: string;
  loginAt: string;
  logoutAt?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser?: string;
    os?: string;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  status: 'success' | 'failed';
  failureReason?: string;
  sessionId?: string;
  sessionDuration?: number;
  createdAt: string;
}

export interface SystemAlertEntry {
  _id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  category: 'security' | 'performance' | 'billing' | 'system' | 'database' | 'integration';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  details?: Record<string, unknown>;
  source: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  acknowledgedBy: {
    userId: string;
    userName: string;
    acknowledgedAt: string;
  }[];
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  isAcknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Backup Types
export interface Backup {
  _id: string;
  filename: string;
  type: 'full' | 'partial' | 'export';
  size: number;
  collections: string[];
  filters?: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  completedAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
  error?: string;
  metadata?: {
    recordCount?: number;
    compressedSize?: number;
    format?: 'json' | 'csv' | 'zip';
  };
  createdAt: string;
  updatedAt: string;
}

// Monitoring Types
export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: {
    system: number;
    process: number;
  };
  nodeVersion: string;
  platform: string;
  hostname: string;
}

export interface DatabaseMetrics {
  status: string;
  host: string;
  database: string;
  collections: {
    name: string;
    count: number;
    size: number;
  }[];
  totalSize: number;
  connections: number;
}

export interface AppMetrics {
  activeUsers: number;
  activeRestaurants: number;
  ordersToday: number;
  customersTotal: number;
  activeSubscriptions: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface ServicesHealth {
  mongodb: {
    status: string;
    latency: number;
  };
  scheduler: {
    status: string;
  };
  sms: {
    status: string;
  };
  email: {
    status: string;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    memory: boolean;
    cpu: boolean;
  };
  details: {
    database: string;
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  };
}

export interface MetricsHistoryPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  requests: number;
  avgResponseTime: number;
  errorRate: number;
}

// ============================================
// Hotel Types
// ============================================

export interface HotelInfo {
  id: string;
  name: string;
  slug: string;
  description?: { fr: string; en?: string };
  logo?: string;
  coverImage?: string;
  starRating?: number;
  phone?: string;
  email?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  settings: {
    currency: string;
    timezone: string;
    defaultLanguage: string;
    availableLanguages: string[];
    roomService: {
      enabled: boolean;
      minOrderAmount?: number;
      deliveryFee: number;
      deliveryFeeType: 'fixed' | 'percentage';
      estimatedDeliveryMinutes: number;
      allowScheduledOrders: boolean;
    };
    billing: {
      allowRoomCharge: boolean;
      requirePaymentUpfront: boolean;
      acceptedPaymentMethods: string[];
    };
    guestAuth?: {
      pinLength: number;
      requirePinForOrders: boolean;
      allowAccessCodeAuth: boolean;
    };
  };
  isActive: boolean;
}

export interface RoomInfo {
  id: string;
  hotelId: string;
  roomNumber: string;
  displayName?: string;
  floor: number;
  building?: string;
  type: 'standard' | 'superior' | 'deluxe' | 'suite' | 'penthouse';
  roomServiceEnabled: boolean;
  specialInstructions?: string;
  status: 'vacant' | 'occupied' | 'checkout' | 'maintenance' | 'blocked';
}

export interface HotelGuestData {
  id: string;
  hotelId: string;
  name: string;
  email?: string;
  phone?: string;
  roomId: string;
  roomNumber: string;
  floor: number;
  building?: string;
  checkInDate: string;
  checkOutDate: string;
  language: string;
  dietaryPreferences?: string[];
  allergens?: string[];
  totalOrders: number;
  totalSpent: number;
  isActive: boolean;
}

export interface HotelMenuData {
  id: string;
  hotelId: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr: string; en?: string };
  type: 'room_service' | 'breakfast' | 'minibar' | 'poolside' | 'spa' | 'special';
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  isAvailable24h: boolean;
  isActive: boolean;
  isCurrentlyAvailable: boolean;
  order: number;
}

export interface HotelCategoryData {
  id: string;
  hotelId: string;
  menuId: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr: string; en?: string };
  image?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  isCurrentlyAvailable: boolean;
}

export interface HotelDishData {
  id: string;
  hotelId: string;
  menuId: string;
  categoryId: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr: string; en?: string };
  price: number;
  images?: string[];
  allergens?: string[];
  tags?: string[];
  options?: Array<{
    name: { fr: string; en?: string };
    price: number;
    isDefault?: boolean;
  }>;
  variants?: Array<{
    name: { fr: string; en?: string };
    price: number;
  }>;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  spicyLevel?: number;
  isAvailable: boolean;
  isPopular: boolean;
  isNewDish: boolean;
  isFeatured: boolean;
  preparationTime?: number;
  order: number;
  isCurrentlyAvailable: boolean;
}

export interface HotelMenuWithItems extends HotelMenuData {
  categories: Array<HotelCategoryData & {
    dishes: HotelDishData[];
  }>;
}

export interface HotelOrderData {
  id: string;
  orderNumber: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  floor: number;
  building?: string;
  guestId?: string;
  guestName: string;
  guestPhone?: string;
  menuType: string;
  items: Array<{
    dishId: string;
    name: { fr: string; en?: string };
    price: number;
    quantity: number;
    options?: Array<{ name: string; price: number }>;
    variant?: { name: string; price: number };
    specialInstructions?: string;
    subtotal: number;
  }>;
  subtotal: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivering' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'room_charge' | 'refunded' | 'failed';
  paymentMethod?: 'room_charge' | 'card' | 'cash' | 'mobile_pay';
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryInstructions?: string;
  specialInstructions?: string;
  isScheduled: boolean;
  scheduledFor?: string;
  assignedTo?: {
    staffId: string;
    staffName: string;
    assignedAt: string;
  };
  deliveredBy?: {
    staffId: string;
    staffName: string;
    deliveredAt?: string;
  };
  rating?: number;
  feedback?: string;
  ratedAt?: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: 'guest' | 'staff' | 'kitchen' | 'system';
  createdAt: string;
  updatedAt: string;
}

// =============================================
// HOTEL ADMIN INTERFACES
// =============================================

export interface HotelAdminData {
  id: string;
  name: string;
  slug: string;
  description?: { fr: string; en?: string };
  logo?: string;
  coverImage?: string;
  starRating: number;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  settings: {
    currency: string;
    timezone: string;
    defaultLanguage: string;
    availableLanguages: string[];
    roomService: {
      enabled: boolean;
      availableHours: { start: string; end: string };
      minimumOrder: number;
      deliveryFee: number;
      serviceChargePercent: number;
    };
    notifications: {
      orderEmail: boolean;
      orderSms: boolean;
      orderPush: boolean;
      lowStockAlert: boolean;
    };
    payment: {
      roomCharge: boolean;
      cardOnDelivery: boolean;
      onlinePayment: boolean;
      cashOnDelivery: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface HotelDashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  activeGuests: number;
  todayOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  averageOrderValue: number;
  roomServiceEnabled: boolean;
  recentOrders: HotelOrderAdmin[];
  popularDishes: Array<{
    dishId: string;
    name: { fr: string; en?: string };
    orderCount: number;
    revenue: number;
  }>;
  ordersByStatus: Record<string, number>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface HotelRoomAdmin {
  id: string;
  hotelId: string;
  roomNumber: string;
  floor: number;
  building?: string;
  roomType: 'standard' | 'deluxe' | 'suite' | 'presidential' | 'apartment';
  capacity: number;
  description?: { fr: string; en?: string };
  amenities: string[];
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';
  currentGuest?: {
    guestId: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
  };
  qrCode?: string;
  qrCodeUrl?: string;
  isRoomServiceEnabled: boolean;
  pricePerNight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HotelGuestAdmin {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  floor: number;
  building?: string;
  name: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  nationality?: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'checked_in' | 'checked_out' | 'reserved' | 'no_show';
  totalOrders: number;
  totalSpent: number;
  preferredLanguage?: string;
  dietaryRestrictions?: string[];
  specialRequests?: string;
  notes?: string;
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelOrderAdmin {
  id: string;
  orderNumber: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  floor: number;
  building?: string;
  guestId?: string;
  guestName: string;
  guestPhone?: string;
  menuType: string;
  items: Array<{
    dishId: string;
    name: { fr: string; en?: string };
    price: number;
    quantity: number;
    options?: Array<{ name: string; price: number }>;
    variant?: { name: string; price: number };
    specialInstructions?: string;
    subtotal: number;
    status?: 'pending' | 'preparing' | 'ready' | 'delivered';
  }>;
  subtotal: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivering' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  paymentStatus: 'pending' | 'paid' | 'room_charge' | 'refunded' | 'failed';
  paymentMethod?: 'room_charge' | 'card' | 'cash' | 'mobile_pay';
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryInstructions?: string;
  specialInstructions?: string;
  isScheduled: boolean;
  scheduledFor?: string;
  priority: 'normal' | 'high' | 'urgent';
  assignedTo?: {
    staffId: string;
    staffName: string;
    assignedAt: string;
  };
  deliveredBy?: {
    staffId: string;
    staffName: string;
    deliveredAt?: string;
    signature?: string;
  };
  rating?: number;
  feedback?: string;
  ratedAt?: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: 'guest' | 'staff' | 'kitchen' | 'system';
  createdAt: string;
  updatedAt: string;
}

export interface HotelMenuAdmin {
  id: string;
  hotelId: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr: string; en?: string };
  type: 'room_service' | 'breakfast' | 'restaurant' | 'bar' | 'pool' | 'spa' | 'minibar';
  image?: string;
  isActive: boolean;
  isDefault: boolean;
  availability: {
    isAlwaysAvailable: boolean;
    schedule?: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
  };
  categoriesCount: number;
  dishesCount: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface HotelCategoryAdmin {
  id: string;
  hotelId: string;
  menuId: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr: string; en?: string };
  image?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  dishesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HotelDishAdmin {
  id: string;
  hotelId: string;
  menuId: string;
  categoryId: string;
  name: { fr: string; en?: string };
  slug: string;
  description?: { fr: string; en?: string };
  price: number;
  images?: string[];
  allergens?: string[];
  tags?: string[];
  options?: Array<{
    name: { fr: string; en?: string };
    price: number;
    isDefault?: boolean;
  }>;
  variants?: Array<{
    name: { fr: string; en?: string };
    price: number;
  }>;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  spicyLevel?: number;
  isAvailable: boolean;
  isPopular: boolean;
  isNewDish: boolean;
  isFeatured: boolean;
  preparationTime?: number;
  order: number;
  orderCount?: number;
  revenue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HotelReportData {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    uniqueGuests: number;
    averageRating: number;
  };
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  ordersByStatus: Record<string, number>;
  topDishes: Array<{
    dishId: string;
    name: { fr: string; en?: string };
    quantity: number;
    revenue: number;
  }>;
  topRooms: Array<{
    roomId: string;
    roomNumber: string;
    orders: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
  }>;
}

export const api = new ApiService(API_BASE_URL);
export default api;
