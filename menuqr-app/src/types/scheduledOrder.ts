/**
 * Scheduled Order Types
 * Types for the scheduled/planned orders feature
 */

// Order type - immediate or scheduled for later
export type OrderType = 'immediate' | 'scheduled';

// Fulfillment type - how the customer receives their order
export type FulfillmentType = 'dine_in' | 'pickup' | 'delivery';

// Fulfillment type labels for display
export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  dine_in: 'Sur place',
  pickup: 'À emporter',
  delivery: 'Livraison',
};

// Fulfillment type icons
export const FULFILLMENT_TYPE_ICONS: Record<FulfillmentType, string> = {
  dine_in: '🍽️',
  pickup: '🥡',
  delivery: '🚗',
};

/**
 * Delivery address for delivery orders
 */
export interface DeliveryAddress {
  street: string;
  city: string;
  postalCode?: string;
  apartment?: string;
  instructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Restaurant settings for scheduled orders
 */
export interface ScheduledOrderSettings {
  enabled: boolean;
  minAdvanceMinutes: number; // Minimum time in advance (e.g., 30 mins)
  maxAdvanceDays: number; // Maximum days in advance (e.g., 7 days)
  slotDuration: number; // Duration of each slot in minutes (15, 30, 60)
  maxOrdersPerSlot: number; // Maximum orders per time slot
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryRadius?: number; // Delivery radius in km
  deliveryFee?: number; // Delivery fee
  deliveryMinOrder?: number; // Minimum order for delivery
}

/**
 * Default settings for scheduled orders
 */
export const DEFAULT_SCHEDULED_ORDER_SETTINGS: ScheduledOrderSettings = {
  enabled: false,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 7,
  slotDuration: 30,
  maxOrdersPerSlot: 5,
  pickupEnabled: true,
  deliveryEnabled: false,
};

/**
 * Available date for scheduling
 */
export interface ScheduledOrderDate {
  date: string; // ISO date: "2025-01-15"
  dayOfWeek: string; // "monday", "tuesday", etc.
  isOpen: boolean; // Whether restaurant is open
  slotsAvailable: number; // Number of available slots
}

/**
 * Time slot for scheduling
 */
export interface ScheduledOrderSlot {
  time: string; // "14:00" format
  available: boolean;
  remainingCapacity: number; // Orders left for this slot
}

/**
 * Availability response from API
 */
export interface ScheduledOrderAvailability {
  dates: ScheduledOrderDate[];
  settings: Pick<ScheduledOrderSettings, 'maxAdvanceDays' | 'minAdvanceMinutes' | 'slotDuration'>;
}

/**
 * Scheduled order info stored in cart/order
 */
export interface ScheduledOrderInfo {
  orderType: OrderType;
  fulfillmentType: FulfillmentType;
  scheduledDate: string | null; // "2025-01-15"
  scheduledTime: string | null; // "14:30"
  deliveryAddress: DeliveryAddress | null;
}

/**
 * Helper to format scheduled date/time for display
 */
export function formatScheduledDateTime(date: string, time: string): string {
  const dateObj = new Date(`${date}T${time}`);
  return dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Helper to check if a scheduled time is still valid
 */
export function isScheduledTimeValid(
  date: string,
  time: string,
  minAdvanceMinutes: number
): boolean {
  const scheduledDateTime = new Date(`${date}T${time}`);
  const now = new Date();
  const minTime = new Date(now.getTime() + minAdvanceMinutes * 60 * 1000);
  return scheduledDateTime >= minTime;
}

/**
 * Helper to format delivery address for display
 */
export function formatDeliveryAddress(address: DeliveryAddress): string {
  const parts = [address.street];
  if (address.apartment) {
    parts.push(address.apartment);
  }
  if (address.postalCode) {
    parts.push(address.postalCode);
  }
  parts.push(address.city);
  return parts.join(', ');
}
