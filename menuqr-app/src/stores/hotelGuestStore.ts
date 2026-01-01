import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api, { ApiError } from '@/services/api';

// Types
export interface HotelGuest {
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
}

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
      estimatedDeliveryMinutes: number;
    };
    guestAuth?: {
      pinLength: number;
      requirePinForOrders: boolean;
      allowAccessCodeAuth: boolean;
    };
  };
}

export interface RoomInfo {
  id: string;
  hotelId: string;
  roomNumber: string;
  displayName?: string;
  floor: number;
  building?: string;
  type: string;
  roomServiceEnabled: boolean;
  specialInstructions?: string;
}

export interface HotelOrder {
  id: string;
  orderNumber: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  status: string;
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
  paymentMethod?: string;
  paymentStatus: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryInstructions?: string;
  specialInstructions?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export const useHotelGuestStore = defineStore('hotelGuest', () => {
  // State
  const guest = ref<HotelGuest | null>(null);
  const hotel = ref<HotelInfo | null>(null);
  const room = ref<RoomInfo | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentHotelId = ref<string | null>(null);

  // Computed
  const isAuthenticated = computed(() => !!guest.value);
  const guestName = computed(() => guest.value?.name || `Chambre ${room.value?.roomNumber}` || '');
  const roomNumber = computed(() => room.value?.roomNumber || guest.value?.roomNumber || '');
  const hotelName = computed(() => hotel.value?.name || '');

  // Storage helpers
  function getStorageKey(hotelId: string) {
    return `menuqr_hotel_guest_${hotelId}`;
  }

  function loadFromStorage(hotelId: string): boolean {
    const key = getStorageKey(hotelId);
    const storedAuth = localStorage.getItem(`${key}_auth`);
    const storedGuest = localStorage.getItem(`${key}_guest`);
    const storedHotel = localStorage.getItem(`${key}_hotel`);
    const storedRoom = localStorage.getItem(`${key}_room`);

    if (storedAuth && storedGuest) {
      try {
        const { accessToken } = JSON.parse(storedAuth);
        api.setHotelGuestToken(accessToken);
        guest.value = JSON.parse(storedGuest);
        if (storedHotel) {hotel.value = JSON.parse(storedHotel);}
        if (storedRoom) {room.value = JSON.parse(storedRoom);}
        currentHotelId.value = hotelId;
        return true;
      } catch {
        clearAuth(hotelId);
        return false;
      }
    }
    return false;
  }

  function saveToStorage(
    hotelId: string,
    accessToken: string,
    refreshToken: string,
    guestData: HotelGuest,
    hotelData?: HotelInfo,
    roomData?: RoomInfo
  ) {
    const key = getStorageKey(hotelId);
    localStorage.setItem(`${key}_auth`, JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem(`${key}_guest`, JSON.stringify(guestData));
    if (hotelData) {localStorage.setItem(`${key}_hotel`, JSON.stringify(hotelData));}
    if (roomData) {localStorage.setItem(`${key}_room`, JSON.stringify(roomData));}
    currentHotelId.value = hotelId;
  }

  function clearAuth(hotelId?: string) {
    const hid = hotelId || currentHotelId.value;
    if (hid) {
      const key = getStorageKey(hid);
      localStorage.removeItem(`${key}_auth`);
      localStorage.removeItem(`${key}_guest`);
      localStorage.removeItem(`${key}_hotel`);
      localStorage.removeItem(`${key}_room`);
    }
    api.setHotelGuestToken(null);
    guest.value = null;
    hotel.value = null;
    room.value = null;
    currentHotelId.value = null;
  }

  // Get hotel by slug (public)
  async function getHotelBySlug(slug: string): Promise<HotelInfo | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.hotelGetBySlug(slug);
      if (response.success && response.data) {
        hotel.value = response.data;
        currentHotelId.value = response.data.id;
        return response.data;
      }
      error.value = response.message || 'Hotel not found';
      return null;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Get room by QR code (public)
  async function getRoomByQRCode(qrCode: string): Promise<{ room: RoomInfo; hotel: HotelInfo } | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.hotelGetRoomByQR(qrCode);
      if (response.success && response.data) {
        room.value = response.data.room;
        hotel.value = response.data.hotel;
        currentHotelId.value = response.data.hotel.id;
        return response.data;
      }
      error.value = response.message || 'Invalid QR code';
      return null;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Authenticate with access code (from check-in)
  async function authenticateWithAccessCode(
    hotelId: string,
    accessCode: string
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.hotelGuestAuthAccessCode(hotelId, accessCode);
      if (response.success && response.data) {
        const { guest: guestData, accessToken, refreshToken, hotel: hotelData, room: roomData } = response.data;
        guest.value = guestData;
        hotel.value = hotelData;
        room.value = roomData;
        api.setHotelGuestToken(accessToken);
        saveToStorage(hotelId, accessToken, refreshToken, guestData, hotelData, roomData);
        return true;
      }
      error.value = response.message || 'Invalid access code';
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

  // Authenticate with PIN
  async function authenticateWithPIN(
    hotelId: string,
    roomNumber: string,
    pin: string
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.hotelGuestAuthPIN(hotelId, roomNumber, pin);
      if (response.success && response.data) {
        const { guest: guestData, accessToken, refreshToken, hotel: hotelData, room: roomData } = response.data;
        guest.value = guestData;
        hotel.value = hotelData;
        room.value = roomData;
        api.setHotelGuestToken(accessToken);
        saveToStorage(hotelId, accessToken, refreshToken, guestData, hotelData, roomData);
        return true;
      }
      error.value = response.message || 'Invalid PIN';
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

  // Set PIN (first time after access code login)
  async function setGuestPIN(pin: string): Promise<boolean> {
    if (!isAuthenticated.value) {
      error.value = 'Not authenticated';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.hotelGuestSetPIN(pin);
      if (response.success) {
        return true;
      }
      error.value = response.message || 'Failed to set PIN';
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

  // Fetch guest profile
  async function fetchProfile(): Promise<boolean> {
    if (!isAuthenticated.value) {return false;}

    try {
      const response = await api.hotelGuestGetProfile();
      if (response.success && response.data) {
        guest.value = response.data;
        if (currentHotelId.value) {
          const key = getStorageKey(currentHotelId.value);
          localStorage.setItem(`${key}_guest`, JSON.stringify(response.data));
        }
        return true;
      }
      return false;
    } catch {
      clearAuth();
      return false;
    }
  }

  // Update preferences
  async function updatePreferences(data: {
    language?: string;
    dietaryPreferences?: string[];
    allergens?: string[];
  }): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.hotelGuestUpdatePreferences(data);
      if (response.success && response.data) {
        guest.value = { ...guest.value, ...response.data } as HotelGuest;
        if (currentHotelId.value) {
          const key = getStorageKey(currentHotelId.value);
          localStorage.setItem(`${key}_guest`, JSON.stringify(guest.value));
        }
        return true;
      }
      error.value = response.message || 'Failed to update preferences';
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

  // Get order history
  async function getOrderHistory(): Promise<HotelOrder[]> {
    if (!isAuthenticated.value) {return [];}

    try {
      const response = await api.hotelGuestGetOrders();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  // Logout
  async function logout(): Promise<void> {
    try {
      await api.hotelGuestRefreshToken(); // Just clear server-side if needed
    } catch {
      // Ignore errors
    }
    clearAuth();
  }

  // Initialize for a specific hotel
  function initForHotel(hotelId: string) {
    currentHotelId.value = hotelId;
    loadFromStorage(hotelId);
  }

  // Initialize from QR code
  async function initFromQRCode(qrCode: string): Promise<boolean> {
    const result = await getRoomByQRCode(qrCode);
    if (result) {
      // Check if we have stored auth for this hotel
      loadFromStorage(result.hotel.id);
      return true;
    }
    return false;
  }

  return {
    // State
    guest,
    hotel,
    room,
    isLoading,
    error,
    currentHotelId,

    // Computed
    isAuthenticated,
    guestName,
    roomNumber,
    hotelName,

    // Actions
    getHotelBySlug,
    getRoomByQRCode,
    authenticateWithAccessCode,
    authenticateWithPIN,
    setGuestPIN,
    fetchProfile,
    updatePreferences,
    getOrderHistory,
    logout,
    initForHotel,
    initFromQRCode,
    clearAuth,
    loadFromStorage,
  };
});
