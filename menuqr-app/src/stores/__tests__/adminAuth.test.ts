import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAdminAuthStore } from '../adminAuth';
import api, { ApiError } from '@/services/api';

// Mock the API module
vi.mock('@/services/api', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    updateAdminProfile: vi.fn(),
    changeAdminPassword: vi.fn(),
    setToken: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  restaurantId: 'restaurant-1',
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

describe('adminAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with null user and not authenticated', () => {
      const store = useAdminAuthStore();
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('has hasRestaurant as false when no user', () => {
      const store = useAdminAuthStore();
      expect(store.hasRestaurant).toBe(false);
    });

    it('has null token when not authenticated', () => {
      const store = useAdminAuthStore();
      expect(store.token).toBeNull();
    });
  });

  describe('login', () => {
    it('successfully logs in and stores user data', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      const result = await store.login('admin@example.com', 'password123');

      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(store.hasRestaurant).toBe(true);
      expect(api.setToken).toHaveBeenCalledWith(mockTokens.accessToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'menuqr_admin_auth',
        JSON.stringify(mockTokens)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'menuqr_admin_user',
        JSON.stringify(mockUser)
      );
    });

    it('handles login failure with error message', async () => {
      (api.login as Mock).mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      const store = useAdminAuthStore();
      const result = await store.login('admin@example.com', 'wrongpassword');

      expect(result).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe('Invalid credentials');
    });

    it('handles API error during login', async () => {
      (api.login as Mock).mockRejectedValue(new ApiError('Network error'));

      const store = useAdminAuthStore();
      const result = await store.login('admin@example.com', 'password123');

      expect(result).toBe(false);
      expect(store.error).toBe('Network error');
    });

    it('handles unexpected error during login', async () => {
      (api.login as Mock).mockRejectedValue(new Error('Something went wrong'));

      const store = useAdminAuthStore();
      const result = await store.login('admin@example.com', 'password123');

      expect(result).toBe(false);
      expect(store.error).toBe('An unexpected error occurred');
    });

    it('sets loading state during login', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => { resolvePromise = resolve; });
      (api.login as Mock).mockReturnValue(promise);

      const store = useAdminAuthStore();
      const loginPromise = store.login('admin@example.com', 'password123');

      expect(store.isLoading).toBe(true);

      resolvePromise!({ success: true, data: { user: mockUser, ...mockTokens } });
      await loginPromise;

      expect(store.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('successfully registers and stores user data', async () => {
      (api.register as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      const result = await store.register('admin@example.com', 'password123', 'Admin User');

      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(api.setToken).toHaveBeenCalledWith(mockTokens.accessToken);
    });

    it('handles registration failure', async () => {
      (api.register as Mock).mockResolvedValue({
        success: false,
        message: 'Email already exists',
      });

      const store = useAdminAuthStore();
      const result = await store.register('admin@example.com', 'password123', 'Admin User');

      expect(result).toBe(false);
      expect(store.error).toBe('Email already exists');
    });

    it('handles API error during registration', async () => {
      (api.register as Mock).mockRejectedValue(new ApiError('Validation failed'));

      const store = useAdminAuthStore();
      const result = await store.register('admin@example.com', 'weak', 'Admin User');

      expect(result).toBe(false);
      expect(store.error).toBe('Validation failed');
    });
  });

  describe('logout', () => {
    it('clears auth data on logout', async () => {
      // First login
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');
      expect(store.isAuthenticated).toBe(true);

      // Then logout
      (api.logout as Mock).mockResolvedValue({ success: true });
      await store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(api.setToken).toHaveBeenLastCalledWith(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('menuqr_admin_auth');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('menuqr_admin_user');
    });

    it('clears auth even if API logout fails', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      (api.logout as Mock).mockRejectedValue(new Error('API Error'));
      await store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('fetchProfile', () => {
    it('returns false when not authenticated', async () => {
      const store = useAdminAuthStore();
      const result = await store.fetchProfile();
      expect(result).toBe(false);
    });

    it('updates user data on successful fetch', async () => {
      // Login first
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      // Fetch updated profile
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      (api.getProfile as Mock).mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      const result = await store.fetchProfile();
      expect(result).toBe(true);
      expect(store.user?.name).toBe('Updated Name');
    });

    it('clears auth on fetch profile failure', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      (api.getProfile as Mock).mockRejectedValue(new Error('Unauthorized'));

      const result = await store.fetchProfile();
      expect(result).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('returns false when not authenticated', async () => {
      const store = useAdminAuthStore();
      const result = await store.updateProfile({ name: 'New Name' });
      expect(result).toBe(false);
    });

    it('updates user data on successful update', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      const updatedUser = { ...mockUser, name: 'New Name' };
      (api.updateAdminProfile as Mock).mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      const result = await store.updateProfile({ name: 'New Name' });
      expect(result).toBe(true);
      expect(store.user?.name).toBe('New Name');
    });

    it('handles update profile error', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      (api.updateAdminProfile as Mock).mockRejectedValue(new ApiError('Update failed'));

      const result = await store.updateProfile({ name: 'New Name' });
      expect(result).toBe(false);
      expect(store.error).toBe('Update failed');
    });
  });

  describe('changePassword', () => {
    it('returns false when not authenticated', async () => {
      const store = useAdminAuthStore();
      const result = await store.changePassword('old', 'new');
      expect(result).toBe(false);
    });

    it('returns true on successful password change', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      (api.changeAdminPassword as Mock).mockResolvedValue({ success: true });

      const result = await store.changePassword('old', 'new');
      expect(result).toBe(true);
    });

    it('handles password change error', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      (api.changeAdminPassword as Mock).mockRejectedValue(
        new ApiError('Current password incorrect')
      );

      const result = await store.changePassword('wrong', 'new');
      expect(result).toBe(false);
      expect(store.error).toBe('Current password incorrect');
    });
  });

  describe('updateUserRestaurant', () => {
    it('updates restaurant ID for logged in user', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: { ...mockUser, restaurantId: undefined }, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      expect(store.hasRestaurant).toBe(false);

      store.updateUserRestaurant('new-restaurant-id');

      expect(store.user?.restaurantId).toBe('new-restaurant-id');
      expect(store.hasRestaurant).toBe(true);
    });

    it('does nothing when no user is logged in', () => {
      const store = useAdminAuthStore();
      store.updateUserRestaurant('restaurant-id');
      expect(store.user).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('clears all auth state', async () => {
      (api.login as Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser, ...mockTokens },
      });

      const store = useAdminAuthStore();
      await store.login('admin@example.com', 'password123');

      store.clearAuth();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('menuqr_admin_auth');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('menuqr_admin_user');
      expect(api.setToken).toHaveBeenLastCalledWith(null);
    });
  });

  describe('token computed', () => {
    it('returns token from localStorage when available', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      const store = useAdminAuthStore();
      expect(store.token).toBe(mockTokens.accessToken);
    });

    it('returns null when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const store = useAdminAuthStore();
      expect(store.token).toBeNull();
    });

    it('returns null when localStorage contains invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const store = useAdminAuthStore();
      expect(store.token).toBeNull();
    });
  });
});
