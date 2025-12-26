import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCart } from '../useCart';
import { useCartStore } from '@/stores/cartStore';
import type { Dish } from '@/types';

// Mock the announce composable
vi.mock('../useAnnounce', () => ({
  announcePolite: vi.fn(),
}));

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

describe('useCart', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('reactive state', () => {
    it('exposes cart items as computed', () => {
      const cart = useCart();
      expect(cart.items.value).toEqual([]);
    });

    it('exposes itemCount as computed', () => {
      const cart = useCart();
      expect(cart.itemCount.value).toBe(0);
    });

    it('exposes subtotal as computed', () => {
      const cart = useCart();
      expect(cart.subtotal.value).toBe(0);
    });

    it('exposes isEmpty as computed', () => {
      const cart = useCart();
      expect(cart.isEmpty.value).toBe(true);
    });

    it('exposes tableNumber as computed', () => {
      const cart = useCart();
      expect(cart.tableNumber.value).toBeNull();
    });

    it('exposes orderNotes as computed', () => {
      const cart = useCart();
      expect(cart.orderNotes.value).toBe('');
    });

    it('updates computed values when store changes', () => {
      const cart = useCart();
      const store = useCartStore();

      store.addItem(mockDish, 2);
      expect(cart.items.value).toHaveLength(1);
      expect(cart.itemCount.value).toBe(2);
      expect(cart.subtotal.value).toBe(5000);
      expect(cart.isEmpty.value).toBe(false);
    });
  });

  describe('addItem', () => {
    it('adds item to cart', () => {
      const cart = useCart();
      cart.addItem(mockDish, 1);
      expect(cart.items.value).toHaveLength(1);
      expect(cart.items.value[0]?.dishId).toBe('dish-1');
    });

    it('adds item with quantity', () => {
      const cart = useCart();
      cart.addItem(mockDish, 3);
      expect(cart.items.value[0]?.quantity).toBe(3);
    });

    it('adds item with options', () => {
      const cart = useCart();
      const options = [
        {
          optionId: 'opt-1',
          optionName: 'Sauce',
          choiceIds: ['choice-1'],
          choices: [
            {
              id: 'choice-1',
              name: { fr: 'Tomate' },
              priceModifier: 100,
              isDefault: false,
              isAvailable: true,
            },
          ],
          priceModifier: 100,
        },
      ];
      cart.addItem(mockDish, 1, options);
      expect(cart.items.value[0]?.selectedOptions).toHaveLength(1);
    });

    it('adds item with notes', () => {
      const cart = useCart();
      cart.addItem(mockDish, 1, [], 'Extra spicy');
      expect(cart.items.value[0]?.notes).toBe('Extra spicy');
    });
  });

  describe('quickAdd', () => {
    it('adds item with quantity 1 and no options', () => {
      const cart = useCart();
      cart.quickAdd(mockDish);
      expect(cart.items.value).toHaveLength(1);
      expect(cart.items.value[0]?.quantity).toBe(1);
      expect(cart.items.value[0]?.selectedOptions).toEqual([]);
    });
  });

  describe('removeItem', () => {
    it('removes item from cart', () => {
      const cart = useCart();
      cart.addItem(mockDish, 1);
      const itemId = cart.items.value[0]?.id!;
      cart.removeItem(itemId);
      expect(cart.items.value).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('updates item quantity', () => {
      const cart = useCart();
      cart.addItem(mockDish, 1);
      const itemId = cart.items.value[0]?.id!;
      cart.updateQuantity(itemId, 5);
      expect(cart.items.value[0]?.quantity).toBe(5);
    });
  });

  describe('increment', () => {
    it('increments item quantity by 1', () => {
      const cart = useCart();
      cart.addItem(mockDish, 2);
      const itemId = cart.items.value[0]?.id!;
      cart.increment(itemId);
      expect(cart.items.value[0]?.quantity).toBe(3);
    });
  });

  describe('decrement', () => {
    it('decrements item quantity by 1', () => {
      const cart = useCart();
      cart.addItem(mockDish, 3);
      const itemId = cart.items.value[0]?.id!;
      cart.decrement(itemId);
      expect(cart.items.value[0]?.quantity).toBe(2);
    });

    it('removes item when quantity reaches 0', () => {
      const cart = useCart();
      cart.addItem(mockDish, 1);
      const itemId = cart.items.value[0]?.id!;
      cart.decrement(itemId);
      expect(cart.items.value).toHaveLength(0);
    });
  });

  describe('updateItemNotes', () => {
    it('updates item notes', () => {
      const cart = useCart();
      cart.addItem(mockDish, 1);
      const itemId = cart.items.value[0]?.id!;
      cart.updateItemNotes(itemId, 'No onions');
      expect(cart.items.value[0]?.notes).toBe('No onions');
    });
  });

  describe('setTableNumber', () => {
    it('sets table number', () => {
      const cart = useCart();
      cart.setTableNumber(5);
      expect(cart.tableNumber.value).toBe(5);
    });

    it('sets table number to null', () => {
      const cart = useCart();
      cart.setTableNumber(5);
      cart.setTableNumber(null);
      expect(cart.tableNumber.value).toBeNull();
    });
  });

  describe('setOrderNotes', () => {
    it('sets order notes', () => {
      const cart = useCart();
      cart.setOrderNotes('Please hurry');
      expect(cart.orderNotes.value).toBe('Please hurry');
    });
  });

  describe('clearCart', () => {
    it('clears all items from cart', () => {
      const cart = useCart();
      cart.addItem(mockDish, 2);
      cart.addItem(mockDish2, 1);
      cart.clearCart();
      expect(cart.items.value).toHaveLength(0);
    });
  });

  describe('hasDish', () => {
    it('returns true if dish is in cart', () => {
      const cart = useCart();
      cart.addItem(mockDish, 1);
      expect(cart.hasDish('dish-1')).toBe(true);
    });

    it('returns false if dish is not in cart', () => {
      const cart = useCart();
      expect(cart.hasDish('dish-1')).toBe(false);
    });
  });

  describe('getDishQuantity', () => {
    it('returns quantity of dish in cart', () => {
      const cart = useCart();
      cart.addItem(mockDish, 3);
      expect(cart.getDishQuantity('dish-1')).toBe(3);
    });

    it('returns 0 if dish is not in cart', () => {
      const cart = useCart();
      expect(cart.getDishQuantity('dish-1')).toBe(0);
    });
  });
});
