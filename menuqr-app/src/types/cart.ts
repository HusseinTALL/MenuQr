import type { Dish, OptionChoice } from './menu';
import type { OrderType, FulfillmentType, DeliveryAddress } from './scheduledOrder';

/**
 * Selected option for a cart item
 */
export interface SelectedOption {
  optionId: string;
  optionName: string;
  choiceIds: string[];
  choices: OptionChoice[];
  priceModifier: number;
}

/**
 * Cart item
 */
export interface CartItem {
  id: string; // Unique cart item ID
  dishId: string;
  dish: Dish;
  quantity: number;
  selectedOptions: SelectedOption[];
  notes?: string;
  unitPrice: number; // Base price + options
  totalPrice: number; // unitPrice * quantity
  addedAt: number; // Timestamp
}

/**
 * Cart state
 */
export interface CartState {
  items: CartItem[];
  tableNumber: number | null;
  notes: string; // Global order notes
  restaurantId: string | null;

  // Scheduling fields
  orderType: OrderType;
  fulfillmentType: FulfillmentType;
  scheduledDate: string | null;
  scheduledTime: string | null;
  deliveryAddress: DeliveryAddress | null;
}

/**
 * Order summary for WhatsApp message
 */
export interface OrderSummary {
  restaurantName: string;
  tableNumber: number | null;
  items: {
    name: string;
    quantity: number;
    options: string[];
    notes?: string;
    price: number;
  }[];
  subtotal: number;
  notes?: string;
  timestamp: string;
}
