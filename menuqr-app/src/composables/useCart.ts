import { computed } from 'vue';
import { useCartStore } from '@/stores/cartStore';
import { announcePolite } from '@/composables/useAnnounce';
import type { Dish, SelectedOption } from '@/types';

/**
 * Composable for cart operations
 * Provides a clean API for cart interactions in components
 */
export function useCart() {
  const cartStore = useCartStore();

  // Reactive getters
  const items = computed(() => cartStore.items);
  const itemCount = computed(() => cartStore.itemCount);
  const subtotal = computed(() => cartStore.subtotal);
  const isEmpty = computed(() => cartStore.isEmpty);
  const tableNumber = computed(() => cartStore.tableNumber);
  const orderNotes = computed(() => cartStore.notes);

  /**
   * Add item to cart
   */
  const addItem = (dish: Dish, quantity = 1, options: SelectedOption[] = [], notes?: string) => {
    cartStore.addItem(dish, quantity, options, notes);
    const dishName =
      typeof dish.name === 'string' ? dish.name : dish.name.fr || dish.name.en || 'Article';
    announcePolite(`${dishName} ajouté au panier, quantité: ${quantity}`);
  };

  /**
   * Quick add (no options, quantity 1)
   */
  const quickAdd = (dish: Dish) => {
    cartStore.addItem(dish, 1, [], undefined);
    const dishName =
      typeof dish.name === 'string' ? dish.name : dish.name.fr || dish.name.en || 'Article';
    announcePolite(`${dishName} ajouté au panier`);
  };

  /**
   * Remove item from cart
   */
  const removeItem = (itemId: string) => {
    const item = cartStore.items.find((i) => i.id === itemId);
    cartStore.removeItem(itemId);
    if (item) {
      const dishName =
        typeof item.dish.name === 'string'
          ? item.dish.name
          : item.dish.name.fr || item.dish.name.en || 'Article';
      announcePolite(`${dishName} retiré du panier`);
    }
  };

  /**
   * Update item quantity
   */
  const updateQuantity = (itemId: string, quantity: number) => {
    cartStore.updateQuantity(itemId, quantity);
  };

  /**
   * Increment item quantity
   */
  const increment = (itemId: string) => {
    cartStore.incrementQuantity(itemId);
  };

  /**
   * Decrement item quantity
   */
  const decrement = (itemId: string) => {
    cartStore.decrementQuantity(itemId);
  };

  /**
   * Update item notes
   */
  const updateItemNotes = (itemId: string, notes: string) => {
    cartStore.updateItemNotes(itemId, notes);
  };

  /**
   * Set table number
   */
  const setTableNumber = (num: number | null) => {
    cartStore.setTableNumber(num);
  };

  /**
   * Set order notes
   */
  const setOrderNotes = (notes: string) => {
    cartStore.setOrderNotes(notes);
  };

  /**
   * Clear cart
   */
  const clearCart = () => {
    cartStore.clearCart();
    announcePolite('Panier vidé');
  };

  /**
   * Check if dish is in cart
   */
  const hasDish = (dishId: string) => {
    return cartStore.hasDish(dishId);
  };

  /**
   * Get quantity of dish in cart
   */
  const getDishQuantity = (dishId: string) => {
    return cartStore.getDishQuantity(dishId);
  };

  return {
    // State
    items,
    itemCount,
    subtotal,
    isEmpty,
    tableNumber,
    orderNotes,

    // Actions
    addItem,
    quickAdd,
    removeItem,
    updateQuantity,
    increment,
    decrement,
    updateItemNotes,
    setTableNumber,
    setOrderNotes,
    clearCart,

    // Helpers
    hasDish,
    getDishQuantity,
  };
}
