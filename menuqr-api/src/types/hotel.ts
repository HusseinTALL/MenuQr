/**
 * Hotel Module API Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Hotel module API.
 * These types define the contract between frontend and backend.
 */

import { Types } from 'mongoose';

// ============================================
// Common Types
// ============================================

export type ObjectId = Types.ObjectId | string;

export interface LocalizedString {
  fr: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ============================================
// Hotel Types
// ============================================

export interface HotelAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface RoomServiceSettings {
  isEnabled: boolean;
  availableFrom?: string;
  availableTo?: string;
  minOrderAmount?: number;
  deliveryFee?: number;
  serviceChargePercent?: number;
  taxPercent?: number;
  autoConfirmOrders?: boolean;
  kitchenPrinterEnabled?: boolean;
}

export interface GuestAuthSettings {
  requirePin: boolean;
  pinLength: number;
  allowAccessCode: boolean;
  allowPmsIntegration?: boolean;
  sessionTimeout: number;
}

export interface HotelSettings {
  defaultLanguage: string;
  supportedLanguages: string[];
  currency: string;
  timezone: string;
  roomService?: RoomServiceSettings;
  guestAuth?: GuestAuthSettings;
}

export interface HotelDTO {
  _id: string;
  name: LocalizedString;
  slug: string;
  description?: LocalizedString;
  logo?: string;
  images?: string[];
  phone: string;
  email: string;
  address: HotelAddress;
  ownerId: string;
  linkedRestaurantId?: string;
  starRating?: number;
  totalRooms: number;
  floors: number[];
  buildings?: string[];
  settings: HotelSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelInput {
  name: LocalizedString;
  description?: LocalizedString;
  phone: string;
  email: string;
  address: HotelAddress;
  starRating?: number;
  floors: number[];
  buildings?: string[];
  settings?: Partial<HotelSettings>;
}

export interface UpdateHotelInput extends Partial<CreateHotelInput> {
  logo?: string;
  images?: string[];
  isActive?: boolean;
}

// ============================================
// Room Types
// ============================================

export type RoomStatus =
  | 'vacant'
  | 'occupied'
  | 'checkout'
  | 'maintenance'
  | 'blocked'
  | 'cleaning';

export interface RoomAmenity {
  name: string;
  icon: string;
}

export interface DeliveryPreferences {
  leaveAtDoor: boolean;
  callBeforeDelivery: boolean;
  specialInstructions?: string;
}

export interface RoomDTO {
  _id: string;
  hotelId: string;
  roomNumber: string;
  floor: number;
  building?: string;
  type: string;
  maxOccupancy: number;
  status: RoomStatus;
  qrCode: string;
  amenities?: RoomAmenity[];
  deliveryPreferences?: DeliveryPreferences;
  currentGuestId?: string;
  currentGuest?: GuestDTO;
  lastCheckIn?: string;
  lastCheckOut?: string;
  lastCleaned?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomInput {
  roomNumber: string;
  floor: number;
  building?: string;
  type?: string;
  maxOccupancy?: number;
  amenities?: RoomAmenity[];
  deliveryPreferences?: DeliveryPreferences;
}

export interface UpdateRoomInput extends Partial<CreateRoomInput> {
  status?: RoomStatus;
  notes?: string;
  isActive?: boolean;
}

export interface BulkCreateRoomsInput {
  rooms: Array<{
    roomNumber: string;
    floor: number;
    type?: string;
    building?: string;
  }>;
}

export interface RoomStatusSummary {
  total: number;
  byStatus: Record<RoomStatus, number>;
  byFloor: Array<{
    floor: number;
    total: number;
    occupied: number;
    available: number;
  }>;
}

// ============================================
// Guest Types
// ============================================

export interface GuestDeliveryPreferences {
  leaveAtDoor: boolean;
  callBeforeDelivery: boolean;
  defaultTip?: number;
}

export interface GuestDTO {
  _id: string;
  hotelId: string;
  name: string;
  email?: string;
  phone?: string;
  reservationNumber?: string;
  roomId: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  isVerified: boolean;
  language: string;
  dietaryPreferences?: string[];
  allergens?: string[];
  deliveryPreferences?: GuestDeliveryPreferences;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  linkedCustomerId?: string;
  isActive: boolean;
  isStayActive: boolean;
  stayDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterGuestInput {
  roomId: string;
  name: string;
  email?: string;
  phone?: string;
  reservationNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  pin?: string;
}

export interface GuestAuthResponse {
  guest: GuestDTO;
  token: string;
  refreshToken: string;
}

export interface GuestLoginWithAccessCodeInput {
  roomNumber: string;
  accessCode: string;
}

export interface GuestLoginWithPINInput {
  roomNumber: string;
  pin: string;
}

export interface UpdateGuestPreferencesInput {
  language?: string;
  dietaryPreferences?: string[];
  allergens?: string[];
  deliveryPreferences?: GuestDeliveryPreferences;
}

// ============================================
// Menu Types
// ============================================

export type HotelMenuType =
  | 'room_service'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'minibar'
  | 'poolside'
  | 'spa'
  | 'special'
  | 'all_day';

export type MenuSourceType = 'custom' | 'linked_restaurant';

export interface PricingRules {
  type: 'markup' | 'fixed' | 'same';
  markupPercent?: number;
  markupFixed?: number;
}

export interface HotelMenuDTO {
  _id: string;
  hotelId: string;
  name: LocalizedString;
  slug: string;
  description?: LocalizedString;
  image?: string;
  type: HotelMenuType;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  isAvailable24h: boolean;
  source: MenuSourceType;
  linkedRestaurantId?: string;
  pricingRules?: PricingRules;
  totalOrders: number;
  totalRevenue: number;
  isActive: boolean;
  isCurrentlyAvailable: boolean;
  order: number;
  categories?: HotelCategoryDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelMenuInput {
  name: LocalizedString;
  description?: LocalizedString;
  image?: string;
  type: HotelMenuType;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  isAvailable24h?: boolean;
}

export interface UpdateHotelMenuInput extends Partial<CreateHotelMenuInput> {
  isActive?: boolean;
  order?: number;
}

export interface LinkMenuToRestaurantInput {
  restaurantId: string;
  pricingRules?: PricingRules;
}

// ============================================
// Category Types
// ============================================

export interface HotelCategoryDTO {
  _id: string;
  hotelId: string;
  menuId: string;
  name: LocalizedString;
  slug: string;
  description?: LocalizedString;
  image?: string;
  icon?: string;
  availableFrom?: string;
  availableTo?: string;
  order: number;
  isActive: boolean;
  isCurrentlyAvailable: boolean;
  dishes?: HotelDishDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelCategoryInput {
  name: LocalizedString;
  description?: LocalizedString;
  image?: string;
  icon?: string;
  availableFrom?: string;
  availableTo?: string;
}

export interface UpdateHotelCategoryInput extends Partial<CreateHotelCategoryInput> {
  isActive?: boolean;
  order?: number;
}

export interface ReorderCategoriesInput {
  categoryOrders: Array<{
    categoryId: string;
    order: number;
  }>;
}

// ============================================
// Dish Types
// ============================================

export interface DishOption {
  name: LocalizedString;
  price: number;
  isDefault?: boolean;
}

export interface DishVariant {
  name: LocalizedString;
  price: number;
}

export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface HotelDishDTO {
  _id: string;
  hotelId: string;
  menuId: string;
  categoryId: string;
  name: LocalizedString;
  slug: string;
  description?: LocalizedString;
  price: number;
  image?: string;
  images?: string[];
  allergens?: string[];
  tags?: string[];
  nutritionalInfo?: NutritionalInfo;
  options?: DishOption[];
  variants?: DishVariant[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  spicyLevel?: number;
  isAvailable: boolean;
  availableFrom?: string;
  availableTo?: string;
  isPopular: boolean;
  isNewDish: boolean;
  isFeatured: boolean;
  preparationTime?: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating?: number;
  order: number;
  isCurrentlyAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelDishInput {
  name: LocalizedString;
  description?: LocalizedString;
  price: number;
  image?: string;
  images?: string[];
  allergens?: string[];
  tags?: string[];
  nutritionalInfo?: NutritionalInfo;
  options?: DishOption[];
  variants?: DishVariant[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  spicyLevel?: number;
  availableFrom?: string;
  availableTo?: string;
  preparationTime?: number;
  isPopular?: boolean;
  isNewDish?: boolean;
  isFeatured?: boolean;
}

export interface UpdateHotelDishInput extends Partial<CreateHotelDishInput> {
  isAvailable?: boolean;
  order?: number;
}

export interface ReorderDishesInput {
  dishOrders: Array<{
    dishId: string;
    order: number;
  }>;
}

// ============================================
// Order Types
// ============================================

export type HotelOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type HotelPaymentStatus =
  | 'pending'
  | 'paid'
  | 'room_charge'
  | 'refunded'
  | 'failed';

export type HotelPaymentMethod =
  | 'room_charge'
  | 'card'
  | 'cash'
  | 'mobile_pay';

export interface OrderItemInput {
  dishId: string;
  quantity: number;
  options?: Array<{ name: string; price: number }>;
  variant?: { name: string; price: number };
  specialInstructions?: string;
}

export interface OrderItemDTO {
  dishId: string;
  name: LocalizedString;
  price: number;
  quantity: number;
  options?: Array<{ name: string; price: number }>;
  variant?: { name: string; price: number };
  specialInstructions?: string;
  subtotal: number;
}

export interface StaffAssignment {
  staffId: string;
  staffName: string;
  assignedAt: string;
}

export interface DeliveryInfo {
  staffId: string;
  staffName: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  signature?: string;
  photo?: string;
  recipientName?: string;
}

export interface HotelOrderDTO {
  _id: string;
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
  menuId?: string;
  items: OrderItemDTO[];
  subtotal: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;
  status: HotelOrderStatus;
  paymentStatus: HotelPaymentStatus;
  paymentMethod?: HotelPaymentMethod;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryInstructions?: string;
  assignedTo?: StaffAssignment;
  deliveredBy?: DeliveryInfo;
  isScheduled: boolean;
  scheduledFor?: string;
  leaveAtDoor: boolean;
  callBeforeDelivery: boolean;
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
  specialInstructions?: string;
  itemCount: number;
  isActive: boolean;
  deliveryDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelOrderInput {
  roomId: string;
  guestId?: string;
  guestName: string;
  guestPhone?: string;
  menuType?: string;
  menuId?: string;
  items: OrderItemInput[];
  paymentMethod?: HotelPaymentMethod;
  deliveryInstructions?: string;
  specialInstructions?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
  leaveAtDoor?: boolean;
  callBeforeDelivery?: boolean;
  tip?: number;
}

export interface UpdateOrderStatusInput {
  status: HotelOrderStatus;
}

export interface CancelOrderInput {
  reason: string;
}

export interface AssignOrderInput {
  staffId: string;
}

export interface MarkDeliveredInput {
  recipientName?: string;
  signature?: string;
  photo?: string;
}

export interface AddOrderRatingInput {
  rating: number;
  feedback?: string;
}

export interface OrderFilters {
  status?: HotelOrderStatus | HotelOrderStatus[];
  floor?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================
// Statistics Types
// ============================================

export interface HotelDashboardStats {
  rooms: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
  };
  guests: {
    current: number;
    checkingOutToday: number;
  };
  orders: {
    today: number;
    pending: number;
    revenue: number;
  };
  staff: {
    total: number;
    byRole: Record<string, number>;
  };
}

export interface RevenueAnalytics {
  date: string;
  orders: number;
  revenue: number;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgDeliveryTime: number;
  avgRating: number;
  byStatus: Record<HotelOrderStatus, number>;
  byMenuType: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  topDishes: Array<{
    dishId: string;
    name: string;
    count: number;
    revenue: number;
  }>;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================
// WebSocket Event Types
// ============================================

export interface HotelOrderEvent {
  type: 'order_created' | 'order_updated' | 'order_status_changed' | 'order_assigned';
  hotelId: string;
  order: HotelOrderDTO;
}

export interface RoomStatusEvent {
  type: 'room_status_changed' | 'guest_checked_in' | 'guest_checked_out';
  hotelId: string;
  room: RoomDTO;
}

export interface KitchenDisplayEvent {
  type: 'new_order' | 'order_bump';
  hotelId: string;
  order: HotelOrderDTO;
}
