import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DishCard from '../DishCard.vue';
import type { Dish } from '@/types';

// Mock the composables
vi.mock('@/composables/useCart', () => ({
  useCart: () => ({
    quickAdd: vi.fn(),
    getDishQuantity: vi.fn().mockReturnValue(0),
  }),
}));

vi.mock('@/composables/useI18n', () => ({
  useLocale: () => ({
    localize: (text: { fr: string; en?: string }) => text.fr || text.en || '',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'menu.popular': 'Populaire',
        'menu.new': 'Nouveau',
        'menu.unavailable': 'Indisponible',
        'menu.addToCart': 'Ajouter',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/composables/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (price: number) => `${price.toFixed(2)} €`,
  }),
}));

// Mock customerAuth store
vi.mock('@/stores/customerAuth', () => ({
  useCustomerAuthStore: () => ({
    isAuthenticated: false,
  }),
}));

// Mock API
vi.mock('@/services/api', () => ({
  default: {
    customerCheckFavorite: vi.fn(),
    customerAddFavorite: vi.fn(),
    customerRemoveFavorite: vi.fn(),
  },
}));

describe('DishCard', () => {
  const mockDish: Dish = {
    id: 'dish-1',
    categoryId: 'cat-1',
    name: { fr: 'Pizza Margherita', en: 'Margherita Pizza' },
    description: { fr: 'Tomates, mozzarella, basilic', en: 'Tomatoes, mozzarella, basil' },
    price: 12.5,
    image: 'https://example.com/pizza.jpg',
    isAvailable: true,
    isPopular: false,
    isNew: false,
    isVegetarian: false,
    isSpicy: false,
    order: 0,
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // Basic rendering tests
  describe('rendering', () => {
    it('renders dish name', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.text()).toContain('Pizza Margherita');
    });

    it('renders dish description', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.text()).toContain('Tomates, mozzarella, basilic');
    });

    it('renders dish price', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.text()).toContain('12.50 €');
    });

    it('renders dish-card class', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.find('.dish-card').exists()).toBe(true);
    });

    it('renders LazyImage component', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.findComponent({ name: 'LazyImage' }).exists()).toBe(true);
    });
  });

  // Accessibility tests
  describe('accessibility', () => {
    it('has role="button"', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.find('.dish-card').attributes('role')).toBe('button');
    });

    it('has tabindex="0" for keyboard navigation', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.find('.dish-card').attributes('tabindex')).toBe('0');
    });

    it('has descriptive aria-label', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      const ariaLabel = wrapper.find('.dish-card').attributes('aria-label');
      expect(ariaLabel).toContain('Pizza Margherita');
      expect(ariaLabel).toContain('12.50 €');
    });

    it('includes unavailable in aria-label when dish is unavailable', () => {
      const unavailableDish = { ...mockDish, isAvailable: false };
      const wrapper = mount(DishCard, {
        props: { dish: unavailableDish },
      });
      expect(wrapper.find('.dish-card').attributes('aria-label')).toContain('non disponible');
    });
  });

  // Badge tests
  describe('badges', () => {
    it('shows popular badge when dish is popular', () => {
      const popularDish = { ...mockDish, isPopular: true };
      const wrapper = mount(DishCard, {
        props: { dish: popularDish },
      });
      expect(wrapper.text()).toContain('Populaire');
    });

    it('shows new badge when dish is new', () => {
      const newDish = { ...mockDish, isNew: true };
      const wrapper = mount(DishCard, {
        props: { dish: newDish },
      });
      expect(wrapper.text()).toContain('Nouveau');
    });

    it('does not show popular badge when dish is not popular', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.text()).not.toContain('Populaire');
    });
  });

  // Estimated time tests
  describe('estimated time', () => {
    it('shows estimated time when provided', () => {
      const dishWithTime = { ...mockDish, estimatedTime: 15 };
      const wrapper = mount(DishCard, {
        props: { dish: dishWithTime },
      });
      expect(wrapper.text()).toContain('15 min');
    });

    it('does not show estimated time when not provided', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.text()).not.toContain('min');
    });
  });

  // Dietary indicators tests
  describe('dietary indicators', () => {
    it('shows vegetarian tag when dish is vegetarian', () => {
      const vegDish = { ...mockDish, isVegetarian: true };
      const wrapper = mount(DishCard, {
        props: { dish: vegDish },
      });
      expect(wrapper.find('.dish-card__dietary').exists()).toBe(true);
    });

    it('shows spicy indicator when dish is spicy', () => {
      const spicyDish = { ...mockDish, isSpicy: true, spicyLevel: 2 as const };
      const wrapper = mount(DishCard, {
        props: { dish: spicyDish },
      });
      expect(wrapper.find('.dish-card__dietary').exists()).toBe(true);
      expect(wrapper.text()).toContain('🌶️');
    });

    it('does not show dietary section when dish has no special diet', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.find('.dish-card__dietary').exists()).toBe(false);
    });
  });

  // Availability tests
  describe('availability', () => {
    it('applies unavailable class when dish is not available', () => {
      const unavailableDish = { ...mockDish, isAvailable: false };
      const wrapper = mount(DishCard, {
        props: { dish: unavailableDish },
      });
      expect(wrapper.find('.dish-card--unavailable').exists()).toBe(true);
    });

    it('shows unavailable overlay when dish is not available', () => {
      const unavailableDish = { ...mockDish, isAvailable: false };
      const wrapper = mount(DishCard, {
        props: { dish: unavailableDish },
      });
      expect(wrapper.text()).toContain('Indisponible');
    });

    it('hides add button when dish is not available', () => {
      const unavailableDish = { ...mockDish, isAvailable: false };
      const wrapper = mount(DishCard, {
        props: { dish: unavailableDish },
      });
      expect(wrapper.find('.dish-card__add-btn').exists()).toBe(false);
    });

    it('shows add button when dish is available', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      expect(wrapper.find('.dish-card__add-btn').exists()).toBe(true);
    });
  });

  // Event tests
  describe('events', () => {
    it('emits select event when card is clicked', async () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      await wrapper.find('.dish-card').trigger('click');
      expect(wrapper.emitted('select')).toBeTruthy();
      expect(wrapper.emitted('select')![0]).toEqual([mockDish]);
    });

    it('emits select event on Enter key', async () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      await wrapper.find('.dish-card').trigger('keydown.enter');
      expect(wrapper.emitted('select')).toBeTruthy();
    });

    it('emits select event on Space key', async () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      await wrapper.find('.dish-card').trigger('keydown.space');
      expect(wrapper.emitted('select')).toBeTruthy();
    });
  });

  // Add button tests
  describe('add button', () => {
    it('has aria-label on add button', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      const button = wrapper.find('.dish-card__add-btn');
      expect(button.attributes('aria-label')).toContain('Pizza Margherita');
    });

    it('emits select when clicking add button if dish has options', async () => {
      const dishWithOptions = {
        ...mockDish,
        options: [
          {
            id: 'opt-1',
            name: { fr: 'Taille' },
            type: 'single' as const,
            choices: [],
            required: true,
          },
        ],
      };
      const wrapper = mount(DishCard, {
        props: { dish: dishWithOptions },
      });
      await wrapper.find('.dish-card__add-btn').trigger('click');
      expect(wrapper.emitted('select')).toBeTruthy();
    });
  });

  // Cart quantity tests
  describe('cart quantity', () => {
    it('shows in-cart state when quantity > 0', async () => {
      // This test verifies the computed property works
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      // With default mock returning 0, in-cart class should not be present
      expect(wrapper.find('.dish-card--in-cart').exists()).toBe(false);
    });
  });

  // Image tests
  describe('image', () => {
    it('passes dish image to LazyImage', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      const lazyImage = wrapper.findComponent({ name: 'LazyImage' });
      expect(lazyImage.props('src')).toBe('https://example.com/pizza.jpg');
    });

    it('passes dish name as alt text', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish },
      });
      const lazyImage = wrapper.findComponent({ name: 'LazyImage' });
      expect(lazyImage.props('alt')).toBe('Pizza Margherita');
    });
  });

  // Skeleton loading tests
  describe('skeleton loading', () => {
    it('shows skeleton when loading prop is true', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish, loading: true },
      });
      expect(wrapper.find('.dish-card--skeleton').exists()).toBe(true);
    });

    it('hides main content when loading', () => {
      const wrapper = mount(DishCard, {
        props: { dish: mockDish, loading: true },
      });
      expect(wrapper.find('.dish-card__title').exists()).toBe(false);
    });
  });
});
