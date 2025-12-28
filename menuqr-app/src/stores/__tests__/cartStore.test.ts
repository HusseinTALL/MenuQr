import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCartStore } from '../cartStore';
import type { Dish } from '@/types/menu';
import type { SelectedOption } from '@/types/cart';

// Mock dish data
const mockDish: Dish = {
  id: 'dish-1',
  categoryId: 'cat-1',
  name: { fr: 'Poulet Braisé', en: 'Grilled Chicken' },
  description: { fr: 'Délicieux poulet', en: 'Delicious chicken' },
  price: 2500,
  image: 'chicken.jpg',
  isAvailable: true,
  isPopular: true,
  isNew: false,
  isVegetarian: false,
  isSpicy: false,
  order: 1,
};

const mockDish2: Dish = {
  id: 'dish-2',
  categoryId: 'cat-1',
  name: { fr: 'Attiéké Poisson', en: 'Attieke with Fish' },
  description: { fr: 'Attiéké avec poisson', en: 'Attieke with fish' },
  price: 3000,
  image: 'fish.jpg',
  isAvailable: true,
  isPopular: false,
  isNew: true,
  isVegetarian: false,
  isSpicy: false,
  order: 2,
};

const mockOptions: SelectedOption[] = [
  {
    optionId: 'opt-1',
    optionName: 'Sauce',
    choiceIds: ['choice-1'],
    choices: [
      {
        id: 'choice-1',
        name: { fr: 'Sauce tomate' },
        priceModifier: 200,
        isDefault: false,
        isAvailable: true,
      },
    ],
    priceModifier: 200,
  },
];

describe('cartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('starts with empty cart', () => {
      const store = useCartStore();
      expect(store.items).toEqual([]);
      expect(store.tableNumber).toBeNull();
      expect(store.notes).toBe('');
      expect(store.restaurantId).toBeNull();
    });
  });

  describe('getters', () => {
    describe('itemCount', () => {
      it('returns 0 for empty cart', () => {
        const store = useCartStore();
        expect(store.itemCount).toBe(0);
      });

      it('returns total quantity of all items', () => {
        const store = useCartStore();
        store.addItem(mockDish, 2);
        store.addItem(mockDish2, 3);
        expect(store.itemCount).toBe(5);
      });
    });

    describe('subtotal', () => {
      it('returns 0 for empty cart', () => {
        const store = useCartStore();
        expect(store.subtotal).toBe(0);
      });

      it('calculates total price of all items', () => {
        const store = useCartStore();
        store.addItem(mockDish, 2); // 2500 * 2 = 5000
        store.addItem(mockDish2, 1); // 3000 * 1 = 3000
        expect(store.subtotal).toBe(8000);
      });

      it('includes option prices in subtotal', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1, mockOptions); // (2500 + 200) * 1 = 2700
        expect(store.subtotal).toBe(2700);
      });
    });

    describe('isEmpty', () => {
      it('returns true for empty cart', () => {
        const store = useCartStore();
        expect(store.isEmpty).toBe(true);
      });

      it('returns false when items exist', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        expect(store.isEmpty).toBe(false);
      });
    });

    describe('hasDish', () => {
      it('returns false when dish is not in cart', () => {
        const store = useCartStore();
        expect(store.hasDish('dish-1')).toBe(false);
      });

      it('returns true when dish is in cart', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        expect(store.hasDish('dish-1')).toBe(true);
      });
    });

    describe('getDishQuantity', () => {
      it('returns 0 when dish is not in cart', () => {
        const store = useCartStore();
        expect(store.getDishQuantity('dish-1')).toBe(0);
      });

      it('returns quantity of dish in cart', () => {
        const store = useCartStore();
        store.addItem(mockDish, 3);
        expect(store.getDishQuantity('dish-1')).toBe(3);
      });

      it('sums quantities when same dish added with different options', () => {
        const store = useCartStore();
        store.addItem(mockDish, 2);
        store.addItem(mockDish, 3, mockOptions);
        expect(store.getDishQuantity('dish-1')).toBe(5);
      });
    });

    describe('getItemByDishId', () => {
      it('returns undefined when dish is not in cart', () => {
        const store = useCartStore();
        expect(store.getItemByDishId('dish-1')).toBeUndefined();
      });

      it('returns cart item when dish is in cart', () => {
        const store = useCartStore();
        store.addItem(mockDish, 2);
        const item = store.getItemByDishId('dish-1');
        expect(item).toBeDefined();
        expect(item?.dishId).toBe('dish-1');
        expect(item?.quantity).toBe(2);
      });
    });
  });

  describe('actions', () => {
    describe('addItem', () => {
      it('adds new item to cart', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        expect(store.items).toHaveLength(1);
        expect(store.items[0]?.dishId).toBe('dish-1');
        expect(store.items[0]?.quantity).toBe(1);
        expect(store.items[0]?.unitPrice).toBe(2500);
        expect(store.items[0]?.totalPrice).toBe(2500);
      });

      it('calculates correct price with options', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1, mockOptions);
        expect(store.items[0]?.unitPrice).toBe(2700); // 2500 + 200
        expect(store.items[0]?.totalPrice).toBe(2700);
      });

      it('increases quantity when same dish with same options is added', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        store.addItem(mockDish, 2);
        expect(store.items).toHaveLength(1);
        expect(store.items[0]?.quantity).toBe(3);
        expect(store.items[0]?.totalPrice).toBe(7500);
      });

      it('creates separate item when same dish with different options is added', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        store.addItem(mockDish, 1, mockOptions);
        expect(store.items).toHaveLength(2);
      });

      it('stores notes with item', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1, [], 'Extra spicy');
        expect(store.items[0]?.notes).toBe('Extra spicy');
      });

      it('updates notes when adding to existing item', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        store.addItem(mockDish, 1, [], 'Extra spicy');
        expect(store.items[0]?.notes).toBe('Extra spicy');
      });

      it('generates unique id for each cart item', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        store.addItem(mockDish, 1, mockOptions);
        expect(store.items[0]?.id).not.toBe(store.items[1]?.id);
      });

      it('stores addedAt timestamp', () => {
        const store = useCartStore();
        const before = Date.now();
        store.addItem(mockDish, 1);
        const after = Date.now();
        expect(store.items[0]?.addedAt).toBeGreaterThanOrEqual(before);
        expect(store.items[0]?.addedAt).toBeLessThanOrEqual(after);
      });
    });

    describe('removeItem', () => {
      it('removes item from cart by id', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        const itemId = store.items[0]?.id;
        expect(itemId).toBeDefined();
        store.removeItem(itemId!);
        expect(store.items).toHaveLength(0);
      });

      it('does nothing when item id not found', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        store.removeItem('non-existent');
        expect(store.items).toHaveLength(1);
      });
    });

    describe('updateQuantity', () => {
      it('updates item quantity', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        const itemId = store.items[0]?.id!;
        store.updateQuantity(itemId, 5);
        expect(store.items[0]?.quantity).toBe(5);
        expect(store.items[0]?.totalPrice).toBe(12500);
      });

      it('removes item when quantity set to 0', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        const itemId = store.items[0]?.id!;
        store.updateQuantity(itemId, 0);
        expect(store.items).toHaveLength(0);
      });

      it('removes item when quantity set to negative', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        const itemId = store.items[0]?.id!;
        store.updateQuantity(itemId, -1);
        expect(store.items).toHaveLength(0);
      });

      it('does nothing when item not found', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        store.updateQuantity('non-existent', 5);
        expect(store.items[0]?.quantity).toBe(1);
      });
    });

    describe('incrementQuantity', () => {
      it('increases quantity by 1', () => {
        const store = useCartStore();
        store.addItem(mockDish, 2);
        const itemId = store.items[0]?.id!;
        store.incrementQuantity(itemId);
        expect(store.items[0]?.quantity).toBe(3);
        expect(store.items[0]?.totalPrice).toBe(7500);
      });
    });

    describe('decrementQuantity', () => {
      it('decreases quantity by 1', () => {
        const store = useCartStore();
        store.addItem(mockDish, 3);
        const itemId = store.items[0]?.id!;
        store.decrementQuantity(itemId);
        expect(store.items[0]?.quantity).toBe(2);
        expect(store.items[0]?.totalPrice).toBe(5000);
      });

      it('removes item when quantity reaches 0', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        const itemId = store.items[0]?.id!;
        store.decrementQuantity(itemId);
        expect(store.items).toHaveLength(0);
      });
    });

    describe('updateItemNotes', () => {
      it('updates notes for an item', () => {
        const store = useCartStore();
        store.addItem(mockDish, 1);
        const itemId = store.items[0]?.id!;
        store.updateItemNotes(itemId, 'No onions please');
        expect(store.items[0]?.notes).toBe('No onions please');
      });
    });

    describe('setTableNumber', () => {
      it('sets table number', () => {
        const store = useCartStore();
        store.setTableNumber(5);
        expect(store.tableNumber).toBe(5);
      });

      it('can set to null', () => {
        const store = useCartStore();
        store.setTableNumber(5);
        store.setTableNumber(null);
        expect(store.tableNumber).toBeNull();
      });
    });

    describe('setOrderNotes', () => {
      it('sets global order notes', () => {
        const store = useCartStore();
        store.setOrderNotes('Please hurry');
        expect(store.notes).toBe('Please hurry');
      });
    });

    describe('setRestaurantId', () => {
      it('sets restaurant id', () => {
        const store = useCartStore();
        store.setRestaurantId('restaurant-1');
        expect(store.restaurantId).toBe('restaurant-1');
      });

      it('clears cart when switching restaurants', () => {
        const store = useCartStore();
        store.setRestaurantId('restaurant-1');
        store.addItem(mockDish, 1);
        store.setRestaurantId('restaurant-2');
        expect(store.items).toHaveLength(0);
        expect(store.restaurantId).toBe('restaurant-2');
      });

      it('does not clear cart when setting same restaurant', () => {
        const store = useCartStore();
        store.setRestaurantId('restaurant-1');
        store.addItem(mockDish, 1);
        store.setRestaurantId('restaurant-1');
        expect(store.items).toHaveLength(1);
      });
    });

    describe('clearCart', () => {
      it('removes all items from cart', () => {
        const store = useCartStore();
        store.addItem(mockDish, 2);
        store.addItem(mockDish2, 1);
        store.setOrderNotes('Some notes');
        store.clearCart();
        expect(store.items).toHaveLength(0);
        expect(store.notes).toBe('');
      });

      it('keeps table number and restaurant id', () => {
        const store = useCartStore();
        store.setTableNumber(5);
        store.setRestaurantId('restaurant-1');
        store.addItem(mockDish, 1);
        store.clearCart();
        expect(store.tableNumber).toBe(5);
        expect(store.restaurantId).toBe('restaurant-1');
      });
    });

    describe('resetCart', () => {
      it('resets entire cart state', () => {
        const store = useCartStore();
        store.setTableNumber(5);
        store.setRestaurantId('restaurant-1');
        store.addItem(mockDish, 2);
        store.setOrderNotes('Some notes');
        store.resetCart();
        expect(store.items).toHaveLength(0);
        expect(store.tableNumber).toBeNull();
        expect(store.notes).toBe('');
        expect(store.restaurantId).toBeNull();
      });
    });

    describe('setOrderType', () => {
      it('sets order type to scheduled', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        expect(store.orderType).toBe('scheduled');
      });

      it('resets scheduling when switching to immediate', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        store.setScheduledDate('2024-12-25');
        store.setScheduledTime('12:00');
        store.setFulfillmentType('delivery');
        store.setDeliveryAddress({ street: '123 Main St', city: 'Paris', postalCode: '75001' });

        store.setOrderType('immediate');
        expect(store.orderType).toBe('immediate');
        expect(store.scheduledDate).toBeNull();
        expect(store.scheduledTime).toBeNull();
        expect(store.fulfillmentType).toBe('dine_in');
        expect(store.deliveryAddress).toBeNull();
      });

      it('sets fulfillment to pickup when switching from dine_in to scheduled', () => {
        const store = useCartStore();
        expect(store.fulfillmentType).toBe('dine_in');
        store.setOrderType('scheduled');
        expect(store.fulfillmentType).toBe('pickup');
      });

      it('keeps existing fulfillment type when already pickup or delivery', () => {
        const store = useCartStore();
        store.setFulfillmentType('delivery');
        store.setOrderType('scheduled');
        expect(store.fulfillmentType).toBe('delivery');
      });
    });

    describe('setFulfillmentType', () => {
      it('sets fulfillment type', () => {
        const store = useCartStore();
        store.setFulfillmentType('pickup');
        expect(store.fulfillmentType).toBe('pickup');
      });

      it('clears delivery address when switching away from delivery', () => {
        const store = useCartStore();
        store.setFulfillmentType('delivery');
        store.setDeliveryAddress({ street: '123 Main St', city: 'Paris', postalCode: '75001' });
        store.setFulfillmentType('pickup');
        expect(store.deliveryAddress).toBeNull();
      });

      it('keeps delivery address when setting to delivery', () => {
        const store = useCartStore();
        store.setDeliveryAddress({ street: '123 Main St', city: 'Paris', postalCode: '75001' });
        store.setFulfillmentType('delivery');
        expect(store.deliveryAddress).not.toBeNull();
      });
    });

    describe('setScheduledDate', () => {
      it('sets scheduled date', () => {
        const store = useCartStore();
        store.setScheduledDate('2024-12-25');
        expect(store.scheduledDate).toBe('2024-12-25');
      });

      it('can be set to null', () => {
        const store = useCartStore();
        store.setScheduledDate('2024-12-25');
        store.setScheduledDate(null);
        expect(store.scheduledDate).toBeNull();
      });
    });

    describe('setScheduledTime', () => {
      it('sets scheduled time', () => {
        const store = useCartStore();
        store.setScheduledTime('14:30');
        expect(store.scheduledTime).toBe('14:30');
      });

      it('can be set to null', () => {
        const store = useCartStore();
        store.setScheduledTime('14:30');
        store.setScheduledTime(null);
        expect(store.scheduledTime).toBeNull();
      });
    });

    describe('setDeliveryAddress', () => {
      it('sets delivery address', () => {
        const store = useCartStore();
        const address = { street: '123 Main St', city: 'Paris', postalCode: '75001' };
        store.setDeliveryAddress(address);
        expect(store.deliveryAddress).toEqual(address);
      });

      it('can be set to null', () => {
        const store = useCartStore();
        store.setDeliveryAddress({ street: '123 Main St', city: 'Paris', postalCode: '75001' });
        store.setDeliveryAddress(null);
        expect(store.deliveryAddress).toBeNull();
      });
    });

    describe('clearScheduling', () => {
      it('resets all scheduling state', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        store.setFulfillmentType('delivery');
        store.setScheduledDate('2024-12-25');
        store.setScheduledTime('14:30');
        store.setDeliveryAddress({ street: '123 Main St', city: 'Paris', postalCode: '75001' });

        store.clearScheduling();
        expect(store.orderType).toBe('immediate');
        expect(store.fulfillmentType).toBe('dine_in');
        expect(store.scheduledDate).toBeNull();
        expect(store.scheduledTime).toBeNull();
        expect(store.deliveryAddress).toBeNull();
      });
    });
  });

  describe('scheduling getters', () => {
    describe('isScheduled', () => {
      it('returns false for immediate orders', () => {
        const store = useCartStore();
        expect(store.isScheduled).toBe(false);
      });

      it('returns true for scheduled orders', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        expect(store.isScheduled).toBe(true);
      });
    });

    describe('isDelivery', () => {
      it('returns false for dine_in', () => {
        const store = useCartStore();
        expect(store.isDelivery).toBe(false);
      });

      it('returns false for pickup', () => {
        const store = useCartStore();
        store.setFulfillmentType('pickup');
        expect(store.isDelivery).toBe(false);
      });

      it('returns true for delivery', () => {
        const store = useCartStore();
        store.setFulfillmentType('delivery');
        expect(store.isDelivery).toBe(true);
      });
    });

    describe('isSchedulingComplete', () => {
      it('returns true for immediate orders', () => {
        const store = useCartStore();
        expect(store.isSchedulingComplete).toBe(true);
      });

      it('returns false for scheduled orders without date', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        expect(store.isSchedulingComplete).toBe(false);
      });

      it('returns false for scheduled orders with date but no time', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        store.setScheduledDate('2024-12-25');
        expect(store.isSchedulingComplete).toBe(false);
      });

      it('returns true for scheduled pickup orders with date and time', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        store.setScheduledDate('2024-12-25');
        store.setScheduledTime('14:30');
        expect(store.isSchedulingComplete).toBe(true);
      });

      it('returns false for delivery orders without address', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        store.setFulfillmentType('delivery');
        store.setScheduledDate('2024-12-25');
        store.setScheduledTime('14:30');
        expect(store.isSchedulingComplete).toBe(false);
      });

      it('returns true for delivery orders with date, time, and address', () => {
        const store = useCartStore();
        store.setOrderType('scheduled');
        store.setFulfillmentType('delivery');
        store.setScheduledDate('2024-12-25');
        store.setScheduledTime('14:30');
        store.setDeliveryAddress({ street: '123 Main St', city: 'Paris', postalCode: '75001' });
        expect(store.isSchedulingComplete).toBe(true);
      });
    });

    describe('formattedScheduledDateTime', () => {
      it('returns null when no date set', () => {
        const store = useCartStore();
        expect(store.formattedScheduledDateTime).toBeNull();
      });

      it('returns null when date set but no time', () => {
        const store = useCartStore();
        store.setScheduledDate('2024-12-25');
        expect(store.formattedScheduledDateTime).toBeNull();
      });

      it('returns formatted date and time in French', () => {
        const store = useCartStore();
        store.setScheduledDate('2024-12-25');
        store.setScheduledTime('14:30');
        const formatted = store.formattedScheduledDateTime;
        expect(formatted).not.toBeNull();
        // Should contain day, month, and time
        expect(formatted).toContain('25');
        expect(formatted).toContain('14');
        expect(formatted).toContain('30');
      });
    });
  });
});
