import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { CartItem, CartState, SelectedOption } from '@/types/cart';
import type { Dish } from '@/types/menu';
import type { OrderType, FulfillmentType, DeliveryAddress } from '@/types/scheduledOrder';

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    tableNumber: null,
    notes: '',
    restaurantId: null,

    // Scheduling fields
    orderType: 'immediate',
    fulfillmentType: 'dine_in',
    scheduledDate: null,
    scheduledTime: null,
    deliveryAddress: null,
  }),

  getters: {
    /**
     * Total number of items in cart
     */
    itemCount: (state): number => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    /**
     * Cart subtotal
     */
    subtotal: (state): number => {
      return state.items.reduce((sum, item) => sum + item.totalPrice, 0);
    },

    /**
     * Check if cart is empty
     */
    isEmpty: (state): boolean => {
      return state.items.length === 0;
    },

    /**
     * Check if a dish is in the cart
     */
    hasDish:
      (state) =>
      (dishId: string): boolean => {
        return state.items.some((item) => item.dishId === dishId);
      },

    /**
     * Get quantity of a specific dish in cart
     */
    getDishQuantity:
      (state) =>
      (dishId: string): number => {
        return state.items
          .filter((item) => item.dishId === dishId)
          .reduce((sum, item) => sum + item.quantity, 0);
      },

    /**
     * Get cart item by dish ID (first match)
     */
    getItemByDishId:
      (state) =>
      (dishId: string): CartItem | undefined => {
        return state.items.find((item) => item.dishId === dishId);
      },

    /**
     * Check if order is scheduled
     */
    isScheduled: (state): boolean => {
      return state.orderType === 'scheduled';
    },

    /**
     * Check if order is for delivery
     */
    isDelivery: (state): boolean => {
      return state.fulfillmentType === 'delivery';
    },

    /**
     * Check if scheduling is complete
     */
    isSchedulingComplete: (state): boolean => {
      if (state.orderType === 'immediate') {
        return true;
      }
      // For scheduled orders, need date and time
      if (!state.scheduledDate || !state.scheduledTime) {
        return false;
      }
      // For delivery, need address
      if (state.fulfillmentType === 'delivery' && !state.deliveryAddress) {
        return false;
      }
      return true;
    },

    /**
     * Get formatted scheduled date/time
     */
    formattedScheduledDateTime: (state): string | null => {
      if (!state.scheduledDate || !state.scheduledTime) {
        return null;
      }
      const dateObj = new Date(`${state.scheduledDate}T${state.scheduledTime}`);
      return dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
  },

  actions: {
    /**
     * Add item to cart
     */
    addItem(dish: Dish, quantity = 1, options: SelectedOption[] = [], notes?: string) {
      // Calculate price with options
      const optionsPrice = options.reduce((sum, opt) => sum + opt.priceModifier, 0);
      const unitPrice = dish.price + optionsPrice;

      // Check if same dish with same options already exists
      const optionsKey = JSON.stringify(
        options.map((o) => ({ id: o.optionId, choices: o.choiceIds.sort() }))
      );

      const existingIndex = this.items.findIndex((item) => {
        const itemOptionsKey = JSON.stringify(
          item.selectedOptions.map((o) => ({ id: o.optionId, choices: o.choiceIds.sort() }))
        );
        return item.dishId === dish.id && itemOptionsKey === optionsKey;
      });

      if (existingIndex > -1) {
        // Update existing item quantity
        const existingItem = this.items[existingIndex];
        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;

          // Update notes if provided
          if (notes) {
            existingItem.notes = notes;
          }
        }
      } else {
        // Add new item
        this.items.push({
          id: uuidv4(),
          dishId: dish.id,
          dish,
          quantity,
          selectedOptions: options,
          notes,
          unitPrice,
          totalPrice: unitPrice * quantity,
          addedAt: Date.now(),
        });
      }
    },

    /**
     * Remove item from cart
     */
    removeItem(itemId: string) {
      const index = this.items.findIndex((item) => item.id === itemId);
      if (index > -1) {
        this.items.splice(index, 1);
      }
    },

    /**
     * Update item quantity
     */
    updateQuantity(itemId: string, quantity: number) {
      const item = this.items.find((item) => item.id === itemId);
      if (!item) {
        return;
      }

      if (quantity <= 0) {
        this.removeItem(itemId);
      } else {
        item.quantity = quantity;
        item.totalPrice = item.unitPrice * quantity;
      }
    },

    /**
     * Increment item quantity
     */
    incrementQuantity(itemId: string) {
      const item = this.items.find((item) => item.id === itemId);
      if (item) {
        item.quantity += 1;
        item.totalPrice = item.unitPrice * item.quantity;
      }
    },

    /**
     * Decrement item quantity
     */
    decrementQuantity(itemId: string) {
      const item = this.items.find((item) => item.id === itemId);
      if (item) {
        if (item.quantity <= 1) {
          this.removeItem(itemId);
        } else {
          item.quantity -= 1;
          item.totalPrice = item.unitPrice * item.quantity;
        }
      }
    },

    /**
     * Update item notes
     */
    updateItemNotes(itemId: string, notes: string) {
      const item = this.items.find((item) => item.id === itemId);
      if (item) {
        item.notes = notes;
      }
    },

    /**
     * Set table number
     */
    setTableNumber(tableNumber: number | null) {
      this.tableNumber = tableNumber;
    },

    /**
     * Set global order notes
     */
    setOrderNotes(notes: string) {
      this.notes = notes;
    },

    /**
     * Set restaurant ID
     */
    setRestaurantId(restaurantId: string) {
      // If switching restaurants, clear cart
      if (this.restaurantId && this.restaurantId !== restaurantId) {
        this.clearCart();
      }
      this.restaurantId = restaurantId;
    },

    /**
     * Set order type (immediate or scheduled)
     */
    setOrderType(orderType: OrderType) {
      this.orderType = orderType;
      // Reset scheduling if switching to immediate
      if (orderType === 'immediate') {
        this.scheduledDate = null;
        this.scheduledTime = null;
        this.fulfillmentType = 'dine_in';
        this.deliveryAddress = null;
      } else if (orderType === 'scheduled') {
        // Set default fulfillment type to pickup for scheduled orders
        // (dine_in is not valid for scheduled orders)
        if (this.fulfillmentType === 'dine_in') {
          this.fulfillmentType = 'pickup';
        }
      }
    },

    /**
     * Set fulfillment type (dine_in, pickup, delivery)
     */
    setFulfillmentType(fulfillmentType: FulfillmentType) {
      this.fulfillmentType = fulfillmentType;
      // Clear delivery address if not delivery
      if (fulfillmentType !== 'delivery') {
        this.deliveryAddress = null;
      }
    },

    /**
     * Set scheduled date
     */
    setScheduledDate(date: string | null) {
      this.scheduledDate = date;
      // Clear time when date changes
      if (date !== this.scheduledDate) {
        this.scheduledTime = null;
      }
    },

    /**
     * Set scheduled time
     */
    setScheduledTime(time: string | null) {
      this.scheduledTime = time;
    },

    /**
     * Set delivery address
     */
    setDeliveryAddress(address: DeliveryAddress | null) {
      this.deliveryAddress = address;
    },

    /**
     * Clear scheduling info
     */
    clearScheduling() {
      this.orderType = 'immediate';
      this.fulfillmentType = 'dine_in';
      this.scheduledDate = null;
      this.scheduledTime = null;
      this.deliveryAddress = null;
    },

    /**
     * Clear all items from cart
     */
    clearCart() {
      this.items = [];
      this.notes = '';
      this.clearScheduling();
      // Keep table number and restaurant ID
    },

    /**
     * Reset entire cart state
     */
    resetCart() {
      this.items = [];
      this.tableNumber = null;
      this.notes = '';
      this.restaurantId = null;
      this.clearScheduling();
    },
  },

  persist: {
    key: 'menuqr-cart',
    storage: localStorage,
    pick: [
      'items',
      'tableNumber',
      'notes',
      'restaurantId',
      'orderType',
      'fulfillmentType',
      'scheduledDate',
      'scheduledTime',
      'deliveryAddress',
    ],
  },
});
