import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CartItem from '../CartItem.vue';
import type { CartItem as CartItemType } from '@/types/cart';
import type { Dish } from '@/types';

// Mock composables
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock('@/composables/useCart', () => ({
  useCart: () => ({
    updateQuantity: mockUpdateQuantity,
    removeItem: mockRemoveItem,
  }),
}));

vi.mock('@/composables/useI18n', () => ({
  useLocale: () => ({
    localize: (text: { fr: string; en?: string }) => text?.fr || text?.en || '',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'cart.removeConfirm': 'Voulez-vous retirer cet article ?',
        'app.yes': 'Oui',
        'app.no': 'Non',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/utils/formatters', () => ({
  formatPrice: (price: number) => `${price.toFixed(2)} €`,
}));

describe('CartItem', () => {
  const mockDish: Dish = {
    id: 'dish-1',
    categoryId: 'cat-1',
    name: { fr: 'Pizza Margherita', en: 'Margherita Pizza' },
    description: { fr: 'Description', en: 'Description' },
    price: 12.5,
    image: 'https://example.com/pizza.jpg',
    isAvailable: true,
    isPopular: false,
    isNew: false,
    isVegetarian: false,
    isSpicy: false,
  };

  const mockCartItem: CartItemType = {
    id: 'cart-item-1',
    dish: mockDish,
    quantity: 2,
    unitPrice: 12.5,
    totalPrice: 25,
    selectedOptions: [],
  };

  const mockCartItemWithOptions: CartItemType = {
    ...mockCartItem,
    selectedOptions: [
      {
        optionId: 'size',
        optionName: 'Taille',
        choiceIds: ['large'],
        choices: [
          { id: 'large', name: { fr: 'Grande', en: 'Large' }, priceModifier: 4, isAvailable: true },
        ],
        priceModifier: 4,
      },
    ],
    unitPrice: 16.5,
    totalPrice: 33,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders dish name', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });
      expect(wrapper.text()).toContain('Pizza Margherita');
    });

    it('renders total price', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });
      expect(wrapper.text()).toContain('25.00 €');
    });

    it('renders quantity', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });
      expect(wrapper.text()).toContain('2');
    });

    it('renders LazyImage component', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });
      expect(wrapper.findComponent({ name: 'LazyImage' }).exists()).toBe(true);
    });

    it('passes dish image to LazyImage', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });
      const lazyImage = wrapper.findComponent({ name: 'LazyImage' });
      expect(lazyImage.props('src')).toBe('https://example.com/pizza.jpg');
    });
  });

  describe('selected options', () => {
    it('renders selected options', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItemWithOptions },
      });
      expect(wrapper.text()).toContain('Taille');
      expect(wrapper.text()).toContain('Grande');
    });

    it('renders option price modifier', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItemWithOptions },
      });
      expect(wrapper.text()).toContain('+4.00 €');
    });

    it('does not render options section when no options selected', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });
      expect(wrapper.find('.space-y-1').exists()).toBe(false);
    });
  });

  describe('quantity controls', () => {
    it('calls updateQuantity when increment button is clicked', async () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });

      const incrementButton = wrapper
        .findAll('button')
        .find((btn) => btn.find('svg path[d*="M12 4v16"]').exists());
      await incrementButton?.trigger('click');

      expect(mockUpdateQuantity).toHaveBeenCalledWith('cart-item-1', 3);
    });

    it('calls updateQuantity when decrement button is clicked', async () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });

      const decrementButton = wrapper
        .findAll('button')
        .find((btn) => btn.find('svg path[d="M20 12H4"]').exists());
      await decrementButton?.trigger('click');

      expect(mockUpdateQuantity).toHaveBeenCalledWith('cart-item-1', 1);
    });

    it('disables decrement button when quantity is 1', () => {
      const itemWithQuantity1 = { ...mockCartItem, quantity: 1 };
      const wrapper = mount(CartItem, {
        props: { item: itemWithQuantity1 },
      });

      const decrementButton = wrapper
        .findAll('button')
        .find((btn) => btn.find('svg path[d="M20 12H4"]').exists());
      expect(decrementButton?.attributes('disabled')).toBeDefined();
    });
  });

  describe('delete functionality', () => {
    it('shows confirm dialog when delete button is clicked', async () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });

      // Find delete button (trash icon)
      const deleteButton = wrapper
        .findAll('button')
        .find((btn) => btn.find('svg path[d*="M19 7l-.867"]').exists());
      await deleteButton?.trigger('click');

      expect(wrapper.text()).toContain('Voulez-vous retirer cet article ?');
    });

    it('calls removeItem when confirming deletion', async () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });

      // Show confirm dialog
      const deleteButton = wrapper
        .findAll('button')
        .find((btn) => btn.find('svg path[d*="M19 7l-.867"]').exists());
      await deleteButton?.trigger('click');

      // Find and click "Oui" button
      const confirmButton = wrapper.findAll('button').find((btn) => btn.text() === 'Oui');
      await confirmButton?.trigger('click');

      expect(mockRemoveItem).toHaveBeenCalledWith('cart-item-1');
    });

    it('hides confirm dialog when cancelling deletion', async () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });

      // Show confirm dialog
      const deleteButton = wrapper
        .findAll('button')
        .find((btn) => btn.find('svg path[d*="M19 7l-.867"]').exists());
      await deleteButton?.trigger('click');

      // Find and click "Non" button
      const cancelButton = wrapper.findAll('button').find((btn) => btn.text() === 'Non');
      await cancelButton?.trigger('click');

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).not.toContain('Voulez-vous retirer cet article ?');
    });
  });

  describe('notes', () => {
    it('renders notes when provided', () => {
      const itemWithNotes = { ...mockCartItem, notes: 'Sans oignons' };
      const wrapper = mount(CartItem, {
        props: { item: itemWithNotes },
      });
      expect(wrapper.text()).toContain('Sans oignons');
    });

    it('does not render notes section when no notes', () => {
      const wrapper = mount(CartItem, {
        props: { item: mockCartItem },
      });
      expect(wrapper.find('.italic').exists()).toBe(false);
    });
  });
});
