import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { ref } from 'vue';
import MenuView from '../MenuView.vue';

// Mock data
const mockCategories = [
  { id: 'cat-1', name: { fr: 'Entrées', en: 'Starters' }, icon: '🥗', order: 1 },
  { id: 'cat-2', name: { fr: 'Plats', en: 'Main Dishes' }, icon: '🍽️', order: 2 },
];

const mockDishes = {
  'cat-1': [
    { id: 'dish-1', categoryId: 'cat-1', name: { fr: 'Salade' }, price: 1500, isAvailable: true, image: 'salade.jpg' },
  ],
  'cat-2': [
    { id: 'dish-2', categoryId: 'cat-2', name: { fr: 'Poulet' }, price: 2500, isAvailable: true, image: 'poulet.jpg' },
  ],
};

const mockRestaurant = {
  id: 'restaurant-1',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  logo: 'logo.jpg',
  description: { fr: 'Description' },
  address: '123 Main St',
  city: 'Paris',
  settings: {
    reservations: { enabled: false },
  },
};

// Shared refs for dynamic control
const isLoading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const hasActiveFilters = ref(false);
const filteredDishes = ref<typeof mockDishes['cat-1']>([]);
const isEmpty = ref(true);

// Mock all composables
vi.mock('@/composables/useMenu', () => ({
  useMenu: () => ({
    categories: ref(mockCategories),
    isLoading,
    error,
    activeCategoryId: ref('cat-1'),
    searchQuery,
    filteredDishes,
    hasActiveFilters,
    getDishesByCategory: vi.fn((catId: string) => mockDishes[catId as keyof typeof mockDishes] || []),
    setActiveCategory: vi.fn(),
    setSearchQuery: vi.fn((query: string) => { searchQuery.value = query; }),
    clearSearch: vi.fn(() => { searchQuery.value = ''; }),
    clearFilters: vi.fn(() => { hasActiveFilters.value = false; }),
    loadMenu: vi.fn(),
  }),
}));

vi.mock('@/composables/useCart', () => ({
  useCart: () => ({
    setTableNumber: vi.fn(),
    isEmpty,
  }),
}));

vi.mock('@/composables/useI18n', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'app.retry': 'Réessayer',
        'menu.resultsCount': `${params?.count || 0} résultat(s)`,
        'menu.noMatchingDishes': 'Aucun plat trouvé',
        'menu.adjustFilters': 'Ajustez vos filtres',
        'menu.clearFilters': 'Effacer les filtres',
      };
      return translations[key] || key;
    },
    localize: (obj: { fr: string; en?: string }) => obj.fr,
  }),
}));

vi.mock('@/composables/useImagePreloader', () => ({
  useImagePreloader: () => ({
    preloadImages: vi.fn(),
    preloadNext: vi.fn(),
  }),
}));

// Mock stores
vi.mock('@/stores/customerAuth', () => ({
  useCustomerAuthStore: () => ({
    initForRestaurant: vi.fn(),
  }),
}));

vi.mock('@/stores/menuStore', () => ({
  useMenuStore: () => ({
    restaurant: mockRestaurant,
  }),
}));

vi.mock('@/stores/restaurantStore', () => ({
  useRestaurantStore: () => ({
    setSelectedRestaurant: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

vi.mock('@/stores/cartStore', () => ({
  useCartStore: () => ({
    setRestaurantId: vi.fn(),
    resetCart: vi.fn(),
    itemCount: 0,
  }),
}));

// Mock child components
vi.mock('@/components/common/AppHeader.vue', () => ({
  default: {
    name: 'AppHeader',
    template: '<div class="app-header" data-testid="app-header"><slot /></div>',
    props: ['showCart', 'showLang', 'showUser'],
    emits: ['open-auth'],
  },
}));

vi.mock('@/components/menu/CategoryTabs.vue', () => ({
  default: {
    name: 'CategoryTabs',
    template: '<div class="category-tabs" data-testid="category-tabs"><slot /></div>',
    props: ['categories', 'activeId'],
    emits: ['select'],
  },
}));

vi.mock('@/components/menu/SearchBar.vue', () => ({
  default: {
    name: 'SearchBar',
    template: '<input class="search-bar" data-testid="search-bar" />',
    props: ['modelValue'],
    emits: ['update:modelValue', 'clear'],
  },
}));

vi.mock('@/components/menu/MenuFilters.vue', () => ({
  default: {
    name: 'MenuFilters',
    template: '<div class="menu-filters" data-testid="menu-filters"></div>',
  },
}));

vi.mock('@/components/menu/DishCard.vue', () => ({
  default: {
    name: 'DishCard',
    template: '<div class="dish-card" data-testid="dish-card"><slot /></div>',
    props: ['dish', 'loading'],
    emits: ['select', 'request-auth'],
  },
}));

vi.mock('@/components/menu/DishModal.vue', () => ({
  default: {
    name: 'DishModal',
    template: '<div v-if="open" class="dish-modal" data-testid="dish-modal"></div>',
    props: ['open', 'dish'],
    emits: ['close'],
  },
}));

vi.mock('@/components/cart/CartFab.vue', () => ({
  default: {
    name: 'CartFab',
    template: '<button class="cart-fab" data-testid="cart-fab">Cart</button>',
  },
}));

vi.mock('@/components/customer/CustomerAuthModal.vue', () => ({
  default: {
    name: 'CustomerAuthModal',
    template: '<div v-if="show" class="auth-modal" data-testid="auth-modal"></div>',
    props: ['show', 'restaurantId', 'restaurantName'],
    emits: ['close', 'success'],
  },
}));

vi.mock('@/components/restaurant/RestaurantHeader.vue', () => ({
  default: {
    name: 'RestaurantHeader',
    template: '<div class="restaurant-header" data-testid="restaurant-header"><slot /></div>',
    emits: ['change-request'],
  },
}));

vi.mock('@/components/common/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    template: '<div v-if="open" class="confirm-dialog" data-testid="confirm-dialog"></div>',
    props: ['open', 'title', 'message', 'confirmText', 'cancelText'],
    emits: ['confirm', 'cancel', 'close'],
  },
}));

describe('MenuView', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Reset shared refs
    isLoading.value = false;
    error.value = null;
    searchQuery.value = '';
    hasActiveFilters.value = false;
    filteredDishes.value = [];
    isEmpty.value = true;

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
        { path: '/menu/:slug', name: 'menu', component: MenuView },
        { path: '/menu/:slug/:tableNumber', name: 'menu-table', component: MenuView },
        { path: '/reserve', name: 'reserve', component: { template: '<div>Reserve</div>' } },
      ],
    });
  });

  const mountMenuView = async (route = '/menu/test-restaurant') => {
    router.push(route);
    await router.isReady();

    const wrapper = mount(MenuView, {
      global: {
        plugins: [router],
        stubs: {
          teleport: true,
          TransitionGroup: false,
        },
      },
    });

    await flushPromises();
    return wrapper;
  };

  describe('rendering', () => {
    it('renders main components', async () => {
      const wrapper = await mountMenuView();

      expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="search-bar"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="menu-filters"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="category-tabs"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="restaurant-header"]').exists()).toBe(true);
    });

    it('renders dish cards for categories', async () => {
      const wrapper = await mountMenuView();

      const dishCards = wrapper.findAll('[data-testid="dish-card"]');
      expect(dishCards.length).toBeGreaterThan(0);
    });

    it('renders category sections', async () => {
      const wrapper = await mountMenuView();

      const sections = wrapper.findAll('section');
      expect(sections.length).toBe(2); // Two categories
    });

    it('displays category names', async () => {
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('Entrées');
      expect(wrapper.text()).toContain('Plats');
    });

    it('displays category icons', async () => {
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('🥗');
      expect(wrapper.text()).toContain('🍽️');
    });
  });

  describe('loading state', () => {
    it('shows skeleton loading state', async () => {
      isLoading.value = true;
      const wrapper = await mountMenuView();

      expect(wrapper.find('.animate-pulse').exists()).toBe(true);
    });

    it('hides menu content when loading', async () => {
      isLoading.value = true;
      const wrapper = await mountMenuView();

      expect(wrapper.find('[data-testid="category-tabs"]').exists()).toBe(false);
    });
  });

  describe('error state', () => {
    it('shows error message', async () => {
      error.value = 'Failed to load menu';
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('Failed to load menu');
    });

    it('shows retry button on error', async () => {
      error.value = 'Failed to load menu';
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('Réessayer');
    });

    it('has clickable retry button', async () => {
      error.value = 'Failed to load menu';
      const wrapper = await mountMenuView();

      const retryButton = wrapper.find('button.btn-primary');
      expect(retryButton.exists()).toBe(true);
    });
  });

  describe('cart FAB visibility', () => {
    it('hides cart FAB when cart is empty', async () => {
      isEmpty.value = true;
      const wrapper = await mountMenuView();

      expect(wrapper.find('[data-testid="cart-fab"]').exists()).toBe(false);
    });

    it('shows cart FAB when cart has items', async () => {
      isEmpty.value = false;
      const wrapper = await mountMenuView();

      expect(wrapper.find('[data-testid="cart-fab"]').exists()).toBe(true);
    });
  });

  describe('search functionality', () => {
    it('shows filtered view when search query exists', async () => {
      searchQuery.value = 'poulet';
      filteredDishes.value = [mockDishes['cat-2'][0]];
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('résultat');
    });

    it('shows search query in results', async () => {
      searchQuery.value = 'poulet';
      filteredDishes.value = [mockDishes['cat-2'][0]];
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('"poulet"');
    });

    it('shows empty state when no results match', async () => {
      searchQuery.value = 'xyz';
      filteredDishes.value = [];
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('Aucun plat trouvé');
      expect(wrapper.text()).toContain('Ajustez vos filtres');
    });

    it('shows clear filters button in empty state', async () => {
      searchQuery.value = 'xyz';
      filteredDishes.value = [];
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('Effacer les filtres');
    });
  });

  describe('filters functionality', () => {
    it('shows filtered view when filters are active', async () => {
      hasActiveFilters.value = true;
      filteredDishes.value = [mockDishes['cat-1'][0]];
      const wrapper = await mountMenuView();

      expect(wrapper.text()).toContain('résultat');
    });

    it('hides category view when filters active', async () => {
      hasActiveFilters.value = true;
      filteredDishes.value = [mockDishes['cat-1'][0]];
      const wrapper = await mountMenuView();

      // Should show filtered results, not categories
      const sections = wrapper.findAll('section');
      expect(sections.length).toBe(0);
    });
  });

  describe('accessibility', () => {
    it('has proper role="feed" on menu container', async () => {
      const wrapper = await mountMenuView();

      const feed = wrapper.find('[role="feed"]');
      expect(feed.exists()).toBe(true);
    });

    it('has proper aria-label on feed', async () => {
      const wrapper = await mountMenuView();

      const feed = wrapper.find('[role="feed"]');
      expect(feed.attributes('aria-label')).toContain('plats');
    });

    it('has proper aria-labelledby on category sections', async () => {
      const wrapper = await mountMenuView();

      const sections = wrapper.findAll('section');
      sections.forEach((section) => {
        const labelledBy = section.attributes('aria-labelledby');
        expect(labelledBy).toBeTruthy();
        expect(labelledBy).toContain('category-title');
      });
    });

    it('category titles have proper id for aria-labelledby', async () => {
      const wrapper = await mountMenuView();

      const titles = wrapper.findAll('h2[id^="category-title"]');
      expect(titles.length).toBe(2);
    });
  });

  describe('reservations', () => {
    it('hides reservation button when disabled', async () => {
      const wrapper = await mountMenuView();

      expect(wrapper.text()).not.toContain('Réserver une table');
    });
  });

  describe('responsive layout', () => {
    it('uses responsive grid classes', async () => {
      const wrapper = await mountMenuView();

      const grid = wrapper.find('.grid-responsive-cards');
      expect(grid.exists()).toBe(true);
    });
  });
});
