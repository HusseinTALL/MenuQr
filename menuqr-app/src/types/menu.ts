import type { DishReviewStats } from './review';

/**
 * Localized string for multi-language support
 */
export interface LocalizedString {
  fr: string;
  en?: string;
}

/**
 * Opening hours for a restaurant
 */
export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string; // Format: "HH:MM"
  close: string; // Format: "HH:MM"
  isClosed: boolean;
}

/**
 * Restaurant review settings
 */
export interface RestaurantReviewSettings {
  enabled: boolean;
  requireApproval: boolean;
  allowPhotos: boolean;
  minOrdersToReview: number;
  autoApproveThreshold?: number;
}

/**
 * Restaurant reservation settings
 */
export interface RestaurantReservationSettings {
  enabled: boolean;
  maxPartySize?: number;
  minAdvanceHours?: number;
  maxAdvanceDays?: number;
  slotDurationMinutes?: number;
  requireDeposit?: boolean;
  depositAmount?: number;
}

/**
 * Restaurant settings
 */
export interface RestaurantSettings {
  reviews?: RestaurantReviewSettings;
  reservations?: RestaurantReservationSettings;
}

/**
 * Restaurant information
 */
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  whatsappNumber: string;
  address: string;
  city: string;
  tables: number;
  openingHours: OpeningHours;
  currency: 'XOF'; // Franc CFA
  defaultLocale: 'fr' | 'en';
  description?: LocalizedString;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
  };
  settings?: RestaurantSettings;
}

/**
 * Menu category
 */
export interface Category {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  icon?: string; // Emoji or icon name
  order: number;
  isActive: boolean;
  dishes: Dish[];
}

/**
 * Dish/Menu item
 */
export interface Dish {
  id: string;
  categoryId: string;
  name: LocalizedString;
  description?: LocalizedString;
  price: number; // In FCFA
  image: string; // URL to image
  thumbnail?: string; // Smaller image for lists
  estimatedTime?: number; // In minutes
  isAvailable: boolean;
  isPopular: boolean;
  isNew: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  spicyLevel?: 1 | 2 | 3;
  allergens?: string[];
  options?: DishOption[];
  order: number;
  reviewStats?: DishReviewStats;
}

/**
 * Dish customization option
 */
export interface DishOption {
  id: string;
  name: LocalizedString;
  type: 'single' | 'multiple'; // Radio or checkbox
  required: boolean;
  minSelections?: number; // For multiple type
  maxSelections?: number; // For multiple type
  choices: OptionChoice[];
}

/**
 * Option choice
 */
export interface OptionChoice {
  id: string;
  name: LocalizedString;
  priceModifier: number; // Can be positive (surcharge) or 0
  isAvailable: boolean;
  isDefault?: boolean;
}

/**
 * Complete menu data structure
 */
export interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  lastUpdated: string; // ISO date string
  version: string;
}
