import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMenuStore } from '../menuStore';
import type { Category, Dish, Restaurant } from '@/types';

// Mock dish data
const createMockDish = (overrides: Partial<Dish> = {}): Dish => ({
  id: 'dish-1',
  categoryId: 'cat-1',
  name: { fr: 'Poulet Braisé', en: 'Grilled Chicken' },
  description: { fr: 'Délicieux poulet', en: 'Delicious chicken' },
  price: 2500,
  image: 'chicken.jpg',
  isAvailable: true,
  isPopular: false,
  isNew: false,
  isVegetarian: false,
  isSpicy: false,
  order: 1,
  ...overrides,
});

const mockDish1 = createMockDish({
  id: 'dish-1',
  name: { fr: 'Poulet Braisé', en: 'Grilled Chicken' },
  price: 2500,
  isPopular: true,
  order: 1,
});

const mockDish2 = createMockDish({
  id: 'dish-2',
  name: { fr: 'Attiéké Poisson', en: 'Attieke Fish' },
  description: { fr: 'Attiéké avec poisson frais', en: 'Attieke with fresh fish' },
  price: 3000,
  isNew: true,
  isSpicy: true,
  order: 2,
});

const mockDish3 = createMockDish({
  id: 'dish-3',
  categoryId: 'cat-2',
  name: { fr: 'Salade Verte', en: 'Green Salad' },
  description: { fr: 'Salade fraîche', en: 'Fresh salad' },
  price: 1500,
  isVegetarian: true,
  isAvailable: false,
  order: 1,
});

const mockDish4 = createMockDish({
  id: 'dish-4',
  categoryId: 'cat-2',
  name: { fr: 'Riz Jollof', en: 'Jollof Rice' },
  description: { fr: 'Riz épicé africain', en: 'Spicy African rice' },
  price: 2000,
  isPopular: true,
  order: 2,
});

const mockCategory1: Category = {
  id: 'cat-1',
  name: { fr: 'Plats Principaux', en: 'Main Courses' },
  description: { fr: 'Nos plats', en: 'Our dishes' },
  image: 'main.jpg',
  isActive: true,
  order: 1,
  dishes: [mockDish1, mockDish2],
};

const mockCategory2: Category = {
  id: 'cat-2',
  name: { fr: 'Accompagnements', en: 'Side Dishes' },
  description: { fr: 'Nos accompagnements', en: 'Our sides' },
  image: 'sides.jpg',
  isActive: true,
  order: 2,
  dishes: [mockDish3, mockDish4],
};

const mockInactiveCategory: Category = {
  id: 'cat-3',
  name: { fr: 'Desserts', en: 'Desserts' },
  description: { fr: 'Nos desserts', en: 'Our desserts' },
  image: 'desserts.jpg',
  isActive: false,
  order: 3,
  dishes: [
    createMockDish({ id: 'dish-5', categoryId: 'cat-3', name: { fr: 'Gâteau', en: 'Cake' } }),
  ],
};

const mockRestaurant: Restaurant = {
  id: 'resto-1',
  name: 'Maquis du Bonheur',
  slug: 'maquis-bonheur',
  description: { fr: 'Restaurant africain', en: 'African restaurant' },
  logo: 'logo.png',
  coverImage: 'cover.jpg',
  currency: 'XOF',
  phone: '+225 07 00 00 00 00',
  address: { fr: "Abidjan, Côte d'Ivoire", en: 'Abidjan, Ivory Coast' },
  openingHours: {
    monday: { open: '08:00', close: '22:00', isClosed: false },
    tuesday: { open: '08:00', close: '22:00', isClosed: false },
    wednesday: { open: '08:00', close: '22:00', isClosed: false },
    thursday: { open: '08:00', close: '22:00', isClosed: false },
    friday: { open: '08:00', close: '23:00', isClosed: false },
    saturday: { open: '10:00', close: '23:00', isClosed: false },
    sunday: { open: '10:00', close: '22:00', isClosed: false },
  },
  socialMedia: {},
  features: { hasDelivery: false, hasTakeaway: true, hasTableService: true },
};

describe('menuStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('starts with empty state', () => {
      const store = useMenuStore();
      expect(store.restaurant).toBeNull();
      expect(store.categories).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.lastUpdated).toBeNull();
      expect(store.searchQuery).toBe('');
      expect(store.activeCategoryId).toBeNull();
      expect(store.sortBy).toBe('default');
    });

    it('has default filters', () => {
      const store = useMenuStore();
      expect(store.filters).toEqual({
        isVegetarian: false,
        isSpicy: false,
        isNew: false,
        isPopular: false,
      });
    });
  });

  describe('getters', () => {
    describe('allDishes', () => {
      it('returns empty array when no categories', () => {
        const store = useMenuStore();
        expect(store.allDishes).toEqual([]);
      });

      it('returns all dishes from all categories', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        expect(store.allDishes).toHaveLength(4);
      });
    });

    describe('availableDishes', () => {
      it('returns only available dishes from active categories', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2, mockInactiveCategory];
        const available = store.availableDishes;
        // mockDish3 is not available, mockInactiveCategory dishes excluded
        expect(available).toHaveLength(3);
        expect(available.find((d) => d.id === 'dish-3')).toBeUndefined();
        expect(available.find((d) => d.id === 'dish-5')).toBeUndefined();
      });
    });

    describe('popularDishes', () => {
      it('returns only popular and available dishes', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        const popular = store.popularDishes;
        expect(popular).toHaveLength(2);
        expect(popular.every((d) => d.isPopular)).toBe(true);
      });
    });

    describe('activeCategories', () => {
      it('returns only active categories sorted by order', () => {
        const store = useMenuStore();
        store.categories = [mockCategory2, mockInactiveCategory, mockCategory1];
        const active = store.activeCategories;
        expect(active).toHaveLength(2);
        expect(active[0]?.id).toBe('cat-1');
        expect(active[1]?.id).toBe('cat-2');
      });
    });

    describe('hasActiveFilters', () => {
      it('returns false when no filters active', () => {
        const store = useMenuStore();
        expect(store.hasActiveFilters).toBe(false);
      });

      it('returns true when any filter is active', () => {
        const store = useMenuStore();
        store.filters.isVegetarian = true;
        expect(store.hasActiveFilters).toBe(true);
      });
    });

    describe('filteredDishes', () => {
      it('returns available dishes from active categories by default', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        const filtered = store.filteredDishes('fr');
        expect(filtered).toHaveLength(3);
      });

      it('filters by search query', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.searchQuery = 'poulet';
        const filtered = store.filteredDishes('fr');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe('dish-1');
      });

      it('searches in description', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.searchQuery = 'poisson';
        const filtered = store.filteredDishes('fr');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe('dish-2');
      });

      it('searches in English when locale is en', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.searchQuery = 'chicken';
        const filtered = store.filteredDishes('en');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe('dish-1');
      });

      it('filters by vegetarian', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.filters.isVegetarian = true;
        const filtered = store.filteredDishes('fr');
        // mockDish3 is vegetarian but not available
        expect(filtered).toHaveLength(0);
      });

      it('filters by spicy', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.filters.isSpicy = true;
        const filtered = store.filteredDishes('fr');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe('dish-2');
      });

      it('filters by new', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.filters.isNew = true;
        const filtered = store.filteredDishes('fr');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe('dish-2');
      });

      it('filters by popular', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.filters.isPopular = true;
        const filtered = store.filteredDishes('fr');
        expect(filtered).toHaveLength(2);
      });

      it('sorts by price ascending', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.sortBy = 'priceAsc';
        const filtered = store.filteredDishes('fr');
        expect(filtered[0]?.price).toBe(2000);
        expect(filtered[filtered.length - 1]?.price).toBe(3000);
      });

      it('sorts by price descending', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.sortBy = 'priceDesc';
        const filtered = store.filteredDishes('fr');
        expect(filtered[0]?.price).toBe(3000);
        expect(filtered[filtered.length - 1]?.price).toBe(2000);
      });

      it('sorts by name', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.sortBy = 'name';
        const filtered = store.filteredDishes('fr');
        expect(filtered[0]?.name.fr).toBe('Attiéké Poisson');
      });

      it('sorts by popularity', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.sortBy = 'popularity';
        const filtered = store.filteredDishes('fr');
        // Popular dishes first
        expect(filtered[0]?.isPopular).toBe(true);
        expect(filtered[1]?.isPopular).toBe(true);
      });

      it('combines search and filters', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        store.searchQuery = 'atti';
        store.filters.isSpicy = true;
        const filtered = store.filteredDishes('fr');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe('dish-2');
      });
    });

    describe('dishesByCategory', () => {
      it('returns dishes for a specific category', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        const dishes = store.dishesByCategory('cat-1');
        expect(dishes).toHaveLength(2);
        expect(dishes[0]?.categoryId).toBe('cat-1');
      });

      it('returns empty array for non-existent category', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1];
        const dishes = store.dishesByCategory('non-existent');
        expect(dishes).toEqual([]);
      });

      it('returns dishes sorted by order', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1];
        const dishes = store.dishesByCategory('cat-1');
        expect(dishes[0]?.order).toBeLessThan(dishes[1]?.order ?? 0);
      });
    });

    describe('getDishById', () => {
      it('returns dish when found', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1, mockCategory2];
        const dish = store.getDishById('dish-2');
        expect(dish).toBeDefined();
        expect(dish?.id).toBe('dish-2');
      });

      it('returns undefined when not found', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1];
        const dish = store.getDishById('non-existent');
        expect(dish).toBeUndefined();
      });
    });

    describe('isMenuLoaded', () => {
      it('returns false when restaurant is null', () => {
        const store = useMenuStore();
        store.categories = [mockCategory1];
        expect(store.isMenuLoaded).toBe(false);
      });

      it('returns false when categories are empty', () => {
        const store = useMenuStore();
        store.restaurant = mockRestaurant;
        expect(store.isMenuLoaded).toBe(false);
      });

      it('returns true when both restaurant and categories exist', () => {
        const store = useMenuStore();
        store.restaurant = mockRestaurant;
        store.categories = [mockCategory1];
        expect(store.isMenuLoaded).toBe(true);
      });
    });
  });

  describe('actions', () => {
    describe('setActiveCategory', () => {
      it('sets active category id', () => {
        const store = useMenuStore();
        store.setActiveCategory('cat-2');
        expect(store.activeCategoryId).toBe('cat-2');
      });
    });

    describe('setSearchQuery', () => {
      it('sets search query', () => {
        const store = useMenuStore();
        store.setSearchQuery('poulet');
        expect(store.searchQuery).toBe('poulet');
      });
    });

    describe('clearSearch', () => {
      it('clears search query', () => {
        const store = useMenuStore();
        store.searchQuery = 'poulet';
        store.clearSearch();
        expect(store.searchQuery).toBe('');
      });
    });

    describe('setFilter', () => {
      it('sets a filter value', () => {
        const store = useMenuStore();
        store.setFilter('isVegetarian', true);
        expect(store.filters.isVegetarian).toBe(true);
      });
    });

    describe('toggleFilter', () => {
      it('toggles a filter', () => {
        const store = useMenuStore();
        expect(store.filters.isSpicy).toBe(false);
        store.toggleFilter('isSpicy');
        expect(store.filters.isSpicy).toBe(true);
        store.toggleFilter('isSpicy');
        expect(store.filters.isSpicy).toBe(false);
      });
    });

    describe('clearFilters', () => {
      it('resets all filters to default', () => {
        const store = useMenuStore();
        store.filters.isVegetarian = true;
        store.filters.isSpicy = true;
        store.filters.isNew = true;
        store.filters.isPopular = true;
        store.clearFilters();
        expect(store.filters).toEqual({
          isVegetarian: false,
          isSpicy: false,
          isNew: false,
          isPopular: false,
        });
      });
    });

    describe('setSortBy', () => {
      it('sets sort option', () => {
        const store = useMenuStore();
        store.setSortBy('priceAsc');
        expect(store.sortBy).toBe('priceAsc');
      });
    });

    describe('resetFiltersAndSort', () => {
      it('resets filters and sort to default', () => {
        const store = useMenuStore();
        store.filters.isVegetarian = true;
        store.sortBy = 'priceDesc';
        store.resetFiltersAndSort();
        expect(store.filters.isVegetarian).toBe(false);
        expect(store.sortBy).toBe('default');
      });
    });

    describe('toggleDishAvailability', () => {
      it('toggles dish availability', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [{ ...mockDish1 }] }];
        expect(store.categories[0]?.dishes[0]?.isAvailable).toBe(true);
        store.toggleDishAvailability('dish-1');
        expect(store.categories[0]?.dishes[0]?.isAvailable).toBe(false);
        store.toggleDishAvailability('dish-1');
        expect(store.categories[0]?.dishes[0]?.isAvailable).toBe(true);
      });

      it('does nothing for non-existent dish', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [{ ...mockDish1 }] }];
        store.toggleDishAvailability('non-existent');
        expect(store.categories[0]?.dishes[0]?.isAvailable).toBe(true);
      });
    });

    describe('updateDish', () => {
      it('updates dish properties', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [{ ...mockDish1 }] }];
        store.updateDish('dish-1', { price: 3500, isPopular: false });
        expect(store.categories[0]?.dishes[0]?.price).toBe(3500);
        expect(store.categories[0]?.dishes[0]?.isPopular).toBe(false);
      });

      it('preserves other properties', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [{ ...mockDish1 }] }];
        store.updateDish('dish-1', { price: 3500 });
        expect(store.categories[0]?.dishes[0]?.name).toEqual(mockDish1.name);
        expect(store.categories[0]?.dishes[0]?.isAvailable).toBe(true);
      });
    });

    describe('addDish', () => {
      it('adds dish to category', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [] }];
        const newDish = createMockDish({
          id: 'new-dish',
          name: { fr: 'Nouveau Plat', en: 'New Dish' },
        });
        store.addDish('cat-1', newDish);
        expect(store.categories[0]?.dishes).toHaveLength(1);
        expect(store.categories[0]?.dishes[0]?.id).toBe('new-dish');
      });

      it('does nothing for non-existent category', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [] }];
        const newDish = createMockDish({ id: 'new-dish' });
        store.addDish('non-existent', newDish);
        expect(store.categories[0]?.dishes).toHaveLength(0);
      });
    });

    describe('deleteDish', () => {
      it('removes dish from category', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [{ ...mockDish1 }, { ...mockDish2 }] }];
        store.deleteDish('dish-1');
        expect(store.categories[0]?.dishes).toHaveLength(1);
        expect(store.categories[0]?.dishes[0]?.id).toBe('dish-2');
      });

      it('does nothing for non-existent dish', () => {
        const store = useMenuStore();
        store.categories = [{ ...mockCategory1, dishes: [{ ...mockDish1 }] }];
        store.deleteDish('non-existent');
        expect(store.categories[0]?.dishes).toHaveLength(1);
      });
    });
  });
});
