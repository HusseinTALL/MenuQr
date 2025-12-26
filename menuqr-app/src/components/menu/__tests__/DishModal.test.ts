import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import DishModal from '../DishModal.vue';
import type { Dish } from '@/types';

// Mock composables
vi.mock('@/composables/useCart', () => ({
  useCart: () => ({
    addItem: vi.fn(),
  }),
}));

vi.mock('@/composables/useI18n', () => ({
  useLocale: () => ({
    localize: (text: { fr: string; en?: string }) => text?.fr || text?.en || '',
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'menu.popular': 'Populaire',
        'menu.new': 'Nouveau',
        'menu.vegetarian': 'Végétarien',
        'menu.unavailable': 'Indisponible',
        'menu.addToCart': 'Ajouter au panier',
        'menu.required': 'Obligatoire',
        'menu.chooseOne': 'Choisissez une option',
        'menu.options': 'Options',
        'cart.quantity': 'Quantité',
        'app.cancel': 'Annuler',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    },
  }),
}));

vi.mock('@/utils/formatters', () => ({
  formatPrice: (price: number) => `${price.toFixed(2)} €`,
}));

describe('DishModal', () => {
  let wrapper: VueWrapper;

  const mockDish: Dish = {
    id: 'dish-1',
    categoryId: 'cat-1',
    name: { fr: 'Pizza Margherita', en: 'Margherita Pizza' },
    description: { fr: 'Tomates, mozzarella, basilic', en: 'Tomatoes, mozzarella, basil' },
    price: 12.5,
    image: 'https://example.com/pizza.jpg',
    isAvailable: true,
    isPopular: true,
    isNew: false,
    isVegetarian: true,
    isSpicy: false,
    estimatedTime: 15,
  };

  const mockDishWithOptions: Dish = {
    ...mockDish,
    options: [
      {
        id: 'size',
        name: { fr: 'Taille', en: 'Size' },
        type: 'single',
        required: true,
        choices: [
          {
            id: 'small',
            name: { fr: 'Petite', en: 'Small' },
            priceModifier: 0,
            isAvailable: true,
            isDefault: true,
          },
          {
            id: 'medium',
            name: { fr: 'Moyenne', en: 'Medium' },
            priceModifier: 2,
            isAvailable: true,
          },
          { id: 'large', name: { fr: 'Grande', en: 'Large' }, priceModifier: 4, isAvailable: true },
        ],
      },
    ],
  };

  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = '';
  });

  describe('rendering', () => {
    it('does not render when open is false', () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: false },
      });
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    });

    it('renders when open is true', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    });

    it('renders dish name in title', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain('Pizza Margherita');
    });

    it('renders dish description', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain('Tomates, mozzarella, basilic');
    });

    it('renders dish price', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain('12.50 €');
    });
  });

  describe('badges', () => {
    it('shows popular badge when dish is popular', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain('Populaire');
    });

    it('shows vegetarian badge when dish is vegetarian', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain('Végétarien');
    });

    it('shows estimated time', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain('15 min');
    });
  });

  describe('quantity controls', () => {
    it('starts with quantity 1', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();
      const quantityDisplay = document.body.querySelector('.quantity-value');
      expect(quantityDisplay?.textContent).toBe('1');
    });

    it('increments quantity when plus button is clicked', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      const plusButton = document.body.querySelector('.quantity-btn--plus') as HTMLButtonElement;
      plusButton?.click();
      await wrapper.vm.$nextTick();

      const quantityDisplay = document.body.querySelector('.quantity-value');
      expect(quantityDisplay?.textContent).toBe('2');
    });

    it('decrements quantity when minus button is clicked', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      // First increment to 2
      const plusButton = document.body.querySelector('.quantity-btn--plus') as HTMLButtonElement;
      plusButton?.click();
      await wrapper.vm.$nextTick();

      // Then decrement back to 1
      const minusButton = document.body.querySelector('.quantity-btn--minus') as HTMLButtonElement;
      minusButton?.click();
      await wrapper.vm.$nextTick();

      const quantityDisplay = document.body.querySelector('.quantity-value');
      expect(quantityDisplay?.textContent).toBe('1');
    });

    it('disables minus button when quantity is 1', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      const minusButton = document.body.querySelector('.quantity-btn--minus') as HTMLButtonElement;
      expect(minusButton?.disabled).toBe(true);
    });
  });

  describe('options', () => {
    it('renders options when dish has options', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDishWithOptions, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      expect(document.body.textContent).toContain('Taille');
      expect(document.body.textContent).toContain('Petite');
      expect(document.body.textContent).toContain('Moyenne');
      expect(document.body.textContent).toContain('Grande');
    });

    it('shows required badge for required options', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDishWithOptions, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      expect(document.body.textContent).toContain('Obligatoire');
    });

    it('shows price modifier for options', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDishWithOptions, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      expect(document.body.textContent).toContain('+2.00 €');
      expect(document.body.textContent).toContain('+4.00 €');
    });
  });

  describe('events', () => {
    it('emits close event when cancel button is clicked', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      const cancelButton = document.body.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelButton?.click();

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits close event when close button is clicked', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      const closeButton = document.body.querySelector(
        'button[aria-label="Fermer"]'
      ) as HTMLButtonElement;
      closeButton?.click();

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('add to cart', () => {
    it('shows add to cart button with price', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      const addButton = document.body.querySelector('.add-to-cart-btn');
      expect(addButton?.textContent).toContain('Ajouter au panier');
      expect(addButton?.textContent).toContain('12.50 €');
    });

    it('updates total price when quantity changes', async () => {
      wrapper = mount(DishModal, {
        props: { dish: mockDish, open: true },
        attachTo: document.body,
      });
      await wrapper.vm.$nextTick();

      const plusButton = document.body.querySelector('.quantity-btn--plus') as HTMLButtonElement;
      plusButton?.click();
      await wrapper.vm.$nextTick();

      const addButton = document.body.querySelector('.add-to-cart-btn');
      expect(addButton?.textContent).toContain('25.00 €');
    });
  });
});
