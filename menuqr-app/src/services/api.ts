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
}

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private customerToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken(): void {
    const stored = localStorage.getItem('menuqr_admin_auth');
    if (stored) {
      try {
        const { accessToken } = JSON.parse(stored);
        this.accessToken = accessToken;
      } catch {
        this.accessToken = null;
      }
    }
  }

  setToken(token: string | null): void {
    this.accessToken = token;
  }

  setCustomerToken(token: string | null): void {
    this.customerToken = token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, useCustomerToken = false): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Use customer token for customer endpoints, admin token otherwise
    const token = useCustomerToken ? this.customerToken : this.accessToken;
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
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
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0);
    }
  }

  private async refreshToken(): Promise<boolean> {
    const stored = localStorage.getItem('menuqr_admin_auth');
    if (!stored) return false;

    try {
      const { refreshToken } = JSON.parse(stored);
      const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        localStorage.removeItem('menuqr_admin_auth');
        this.accessToken = null;
        return false;
      }

      const data = await response.json();
      const newAuth = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      };
      localStorage.setItem('menuqr_admin_auth', JSON.stringify(newAuth));
      this.accessToken = data.data.accessToken;
      return true;
    } catch {
      localStorage.removeItem('menuqr_admin_auth');
      this.accessToken = null;
      return false;
    }
  }

  private async refreshCustomerToken(): Promise<boolean> {
    // Customer tokens are stored per restaurant, find current one
    const keys = Object.keys(localStorage).filter(k => k.startsWith('menuqr_customer_') && k.endsWith('_auth'));
    if (keys.length === 0) return false;

    // Try the first matching key (most likely the current restaurant)
    const stored = localStorage.getItem(keys[0]);
    if (!stored) return false;

    try {
      const { refreshToken } = JSON.parse(stored);
      const response = await fetch(`${this.baseUrl}/customer/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        localStorage.removeItem(keys[0]);
        this.customerToken = null;
        return false;
      }

      const data = await response.json();
      const newAuth = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      };
      localStorage.setItem(keys[0], JSON.stringify(newAuth));
      this.customerToken = data.data.accessToken;
      return true;
    } catch {
      localStorage.removeItem(keys[0]);
      this.customerToken = null;
      return false;
    }
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

  // Restaurant endpoints (Public)
  async getRestaurants(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
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
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.isAvailable !== undefined) query.set('isAvailable', String(params.isAvailable));
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
    if (params?.status) query.set('status', params.status);
    if (params?.tableNumber) query.set('tableNumber', params.tableNumber);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
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
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
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
    if (params?.days) query.set('days', String(params.days));
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
    if (params?.status) query.set('status', params.status);
    if (params?.fulfillmentType) query.set('fulfillmentType', params.fulfillmentType);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
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
    if (params?.month) query.set('month', params.month);
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
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
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
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
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.tier) query.set('tier', params.tier);
    if (params?.search) query.set('search', params.search);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
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
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.tableId) query.set('tableId', params.tableId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
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
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
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
    if (params?.days) query.set('days', String(params.days));
    if (params?.location) query.set('location', params.location);
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
    if (location) query.set('location', location);
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
    if (params?.upcoming) query.set('upcoming', 'true');
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
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
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.rating) query.set('rating', String(params.rating));
    if (params?.sort) query.set('sort', params.sort);
    const queryString = query.toString();
    return this.request<{
      reviews: Review[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/reviews/restaurant/${restaurantId}${queryString ? `?${queryString}` : ''}`);
  }

  async getDishReviews(dishId: string, params?: ReviewQueryParams) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.rating) query.set('rating', String(params.rating));
    if (params?.sort) query.set('sort', params.sort);
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
    if (dishId) query.set('dishId', dishId);
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sort) query.set('sort', params.sort);
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
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.rating) query.set('rating', String(params.rating));
    if (params?.status) query.set('status', params.status);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.dishId) query.set('dishId', params.dishId);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.hasResponse !== undefined) query.set('hasResponse', String(params.hasResponse));
    if (params?.isVerifiedPurchase !== undefined) query.set('isVerifiedPurchase', String(params.isVerifiedPurchase));
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

export const api = new ApiService(API_BASE_URL);
export default api;
