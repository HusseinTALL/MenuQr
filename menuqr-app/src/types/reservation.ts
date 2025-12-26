/**
 * Reservation Types for MenuQR Frontend
 */

// ============================================================================
// Table Types
// ============================================================================

export type TableLocation = 'indoor' | 'outdoor' | 'terrace' | 'private';

export interface Table {
  _id: string;
  restaurantId: string;
  name: string;
  capacity: number;
  minCapacity: number;
  location: TableLocation;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableStats {
  total: number;
  active: number;
  inactive: number;
  byLocation: Record<TableLocation, number>;
  totalCapacity: number;
  avgCapacity: number;
}

export interface CreateTableData {
  name: string;
  capacity: number;
  minCapacity?: number;
  location?: TableLocation;
  description?: string;
}

export interface UpdateTableData {
  name?: string;
  capacity?: number;
  minCapacity?: number;
  location?: TableLocation;
  description?: string;
  isActive?: boolean;
}

// ============================================================================
// Reservation Types
// ============================================================================

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type LocationPreference = 'indoor' | 'outdoor' | 'terrace' | 'no_preference';

export interface PreOrderItem {
  dishId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: {
    name: string;
    choice: string;
    price: number;
  }[];
  notes?: string;
}

export interface PreOrder {
  items: PreOrderItem[];
  subtotal: number;
  notes?: string;
}

export interface Reservation {
  _id: string;
  restaurantId: string;
  customerId?: string;
  tableId?: string | Table;
  reservationNumber: string;
  reservationDate: string;
  timeSlot: string;
  endTime: string;
  duration: number;
  partySize: number;
  locationPreference: LocationPreference;
  specialRequests?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  preOrder?: PreOrder;
  status: ReservationStatus;
  confirmationSentAt?: string;
  reminder24hSentAt?: string;
  reminder2hSentAt?: string;
  confirmedAt?: string;
  arrivedAt?: string;
  seatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: 'customer' | 'restaurant';
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationData {
  reservationDate: string;
  timeSlot: string;
  partySize: number;
  duration?: number;
  locationPreference?: LocationPreference;
  specialRequests?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  preOrder?: {
    items: {
      dishId: string;
      quantity: number;
      options?: { name: string; choice: string; price: number }[];
      notes?: string;
    }[];
    notes?: string;
  };
}

export interface UpdateReservationData {
  reservationDate?: string;
  timeSlot?: string;
  partySize?: number;
  duration?: number;
  locationPreference?: LocationPreference;
  specialRequests?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  tableId?: string;
}

// ============================================================================
// Availability Types
// ============================================================================

export interface TimeSlot {
  time: string;
  available: boolean;
  tablesAvailable: number;
}

export interface AvailableDate {
  date: string;
  available: boolean;
  slotsAvailable: number;
}

export interface ReservationSettings {
  enabled: boolean;
  slotDuration: number;
  defaultDuration: number;
  maxPartySize: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  autoConfirm: boolean;
  requirePhone: boolean;
  allowPreOrder: boolean;
}

export interface AvailabilityResponse {
  dates: AvailableDate[];
  settings: {
    maxPartySize: number;
    maxAdvanceDays: number;
    minAdvanceHours: number;
    allowPreOrder: boolean;
  };
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface ReservationStats {
  total: number;
  byStatus: Record<ReservationStatus, number>;
  byLocation: Record<LocationPreference, number>;
  avgPartySize: number;
  noShowRate: number;
  preOrderRate: number;
  preOrderRevenue: number;
}

// ============================================================================
// Status Helpers
// ============================================================================

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  arrived: 'Arrivé',
  seated: 'Placé',
  completed: 'Terminée',
  cancelled: 'Annulée',
  no_show: 'Absent',
};

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: 'warning',
  confirmed: 'info',
  arrived: 'primary',
  seated: 'success',
  completed: 'default',
  cancelled: 'error',
  no_show: 'error',
};

export const LOCATION_LABELS: Record<LocationPreference, string> = {
  indoor: 'Intérieur',
  outdoor: 'Extérieur',
  terrace: 'Terrasse',
  no_preference: 'Sans préférence',
};

export const TABLE_LOCATION_LABELS: Record<TableLocation, string> = {
  indoor: 'Intérieur',
  outdoor: 'Extérieur',
  terrace: 'Terrasse',
  private: 'Privé',
};
