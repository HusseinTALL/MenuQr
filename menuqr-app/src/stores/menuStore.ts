import { defineStore } from 'pinia';
import type { Restaurant, Category, Dish, MenuData } from '@/types';
import { useOfflineStore } from './offlineStore';
import api from '@/services/api';

export type SortOption = 'default' | 'priceAsc' | 'priceDesc' | 'name' | 'popularity';

export interface MenuFilters {
  isVegetarian: boolean;
  isSpicy: boolean;
  isNew: boolean;
  isPopular: boolean;
}

interface MenuState {
  restaurant: Restaurant | null;
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  searchQuery: string;
  activeCategoryId: string | null;
  filters: MenuFilters;
  sortBy: SortOption;
}

const defaultFilters: MenuFilters = {
  isVegetarian: false,
  isSpicy: false,
  isNew: false,
  isPopular: false,
};

export const useMenuStore = defineStore('menu', {
  state: (): MenuState => ({
    restaurant: null,
    categories: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
    searchQuery: '',
    activeCategoryId: null,
    filters: { ...defaultFilters },
    sortBy: 'default',
  }),

  getters: {
    /**
     * Get all available dishes
     */
    allDishes: (state): Dish[] => {
      return state.categories.flatMap((cat) => cat.dishes);
    },

    /**
     * Get available dishes only
     */
    availableDishes: (state): Dish[] => {
      return state.categories
        .filter((cat) => cat.isActive)
        .flatMap((cat) => cat.dishes.filter((dish) => dish.isAvailable));
    },

    /**
     * Get popular dishes
     */
    popularDishes: (state): Dish[] => {
      return state.categories
        .flatMap((cat) => cat.dishes)
        .filter((dish) => dish.isPopular && dish.isAvailable);
    },

    /**
     * Get active categories only
     */
    activeCategories: (state): Category[] => {
      return state.categories.filter((cat) => cat.isActive).sort((a, b) => a.order - b.order);
    },

    /**
     * Check if any filter is active
     */
    hasActiveFilters: (state): boolean => {
      return (
        state.filters.isVegetarian ||
        state.filters.isSpicy ||
        state.filters.isNew ||
        state.filters.isPopular
      );
    },

    /**
     * Get dishes filtered by search query, filters and sorted
     */
    filteredDishes:
      (state) =>
      (locale: 'fr' | 'en' = 'fr'): Dish[] => {
        let dishes: Dish[] = [];
        const query = state.searchQuery.toLowerCase().trim();

        // Start with all available dishes from active categories
        if (query) {
          // Search mode: search across all categories
          dishes = state.categories.flatMap((cat) =>
            cat.dishes.filter((dish) => {
              const name = (dish.name[locale] || dish.name.fr).toLowerCase();
              const description = (
                dish.description?.[locale] ||
                dish.description?.fr ||
                ''
              ).toLowerCase();
              return name.includes(query) || description.includes(query);
            })
          );
        } else {
          // Normal mode: get available dishes
          dishes = state.categories
            .filter((cat) => cat.isActive)
            .flatMap((cat) => cat.dishes.filter((dish) => dish.isAvailable));
        }

        // Apply filters
        if (state.filters.isVegetarian) {
          dishes = dishes.filter((dish) => dish.isVegetarian);
        }
        if (state.filters.isSpicy) {
          dishes = dishes.filter((dish) => dish.isSpicy);
        }
        if (state.filters.isNew) {
          dishes = dishes.filter((dish) => dish.isNew);
        }
        if (state.filters.isPopular) {
          dishes = dishes.filter((dish) => dish.isPopular);
        }

        // Apply sorting
        switch (state.sortBy) {
          case 'priceAsc':
            dishes.sort((a, b) => a.price - b.price);
            break;
          case 'priceDesc':
            dishes.sort((a, b) => b.price - a.price);
            break;
          case 'name':
            dishes.sort((a, b) => {
              const nameA = (a.name[locale] || a.name.fr).toLowerCase();
              const nameB = (b.name[locale] || b.name.fr).toLowerCase();
              return nameA.localeCompare(nameB);
            });
            break;
          case 'popularity':
            dishes.sort((a, b) => {
              // Popular dishes first, then by order
              if (a.isPopular && !b.isPopular) {
                return -1;
              }
              if (!a.isPopular && b.isPopular) {
                return 1;
              }
              return a.order - b.order;
            });
            break;
          default:
            // Keep default order
            dishes.sort((a, b) => a.order - b.order);
        }

        return dishes;
      },

    /**
     * Get dishes by category ID
     */
    dishesByCategory:
      (state) =>
      (categoryId: string): Dish[] => {
        const category = state.categories.find((cat) => cat.id === categoryId);
        return category ? category.dishes.sort((a, b) => a.order - b.order) : [];
      },

    /**
     * Get dish by ID
     */
    getDishById:
      (state) =>
      (dishId: string): Dish | undefined => {
        for (const category of state.categories) {
          const dish = category.dishes.find((d) => d.id === dishId);
          if (dish) {
            return dish;
          }
        }
        return undefined;
      },

    /**
     * Check if menu is loaded
     */
    isMenuLoaded: (state): boolean => {
      return state.restaurant !== null && state.categories.length > 0;
    },
  },

  actions: {
    /**
     * Load menu data from API or local JSON
     * @param slug - Restaurant slug (required)
     */
    async loadMenu(slug: string) {
      if (!slug) {
        this.error = 'Aucun restaurant sélectionné.';
        return;
      }

      this.isLoading = true;
      this.error = null;

      // Initialize offline store
      const offlineStore = useOfflineStore();
      if (!offlineStore.isInitialized) {
        await offlineStore.initialize();
      }

      const restaurantSlug = slug;

      try {
        let menuData: MenuData;

        // Always try API first
        const response = await api.getPublicMenu(restaurantSlug);
        if (response.success && response.data) {
          const apiData = response.data;
          // Transform API response to MenuData format
          menuData = {
            restaurant: {
              id: apiData.restaurant.id,
              name: apiData.restaurant.name,
              slug: apiData.restaurant.slug,
              description: apiData.restaurant.description ? {
                fr: apiData.restaurant.description,
                en: apiData.restaurant.description,
              } : undefined,
              logo: apiData.restaurant.logo,
              address: apiData.restaurant.address?.street,
              city: apiData.restaurant.address?.city,
              tables: apiData.restaurant.settings?.tableCount || 15,
              currency: apiData.restaurant.settings?.currency || 'XOF',
              defaultLocale: apiData.restaurant.settings?.defaultLanguage || 'fr',
              whatsappNumber: apiData.restaurant.phone,
            },
            categories: apiData.categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              description: cat.description,
              icon: cat.icon,
              order: cat.order,
              isActive: cat.isActive !== false,
              dishes: cat.dishes.map(dish => ({
                id: dish.id,
                categoryId: cat.id,
                name: dish.name,
                description: dish.description,
                price: dish.price,
                image: dish.image,
                estimatedTime: dish.preparationTime,
                isAvailable: dish.isAvailable !== false,
                isPopular: dish.isPopular,
                isNew: dish.isNewDish,
                isVegetarian: dish.isVegetarian,
                isSpicy: dish.isSpicy,
                spicyLevel: dish.spicyLevel,
                order: dish.order,
                allergens: dish.allergens,
                options: dish.options || [],
              })),
            })),
            lastUpdated: apiData.lastUpdated || new Date().toISOString(),
          };
        } else {
          throw new Error('Failed to load menu from API');
        }

        this.restaurant = menuData.restaurant;
        this.categories = menuData.categories;
        this.lastUpdated = menuData.lastUpdated;

        // Set first category as active if none selected
        const firstCategory = this.categories[0];
        if (!this.activeCategoryId && firstCategory) {
          this.activeCategoryId = firstCategory.id;
        }

        // Cache in IndexedDB for offline access
        await offlineStore.cacheMenu(menuData);
      } catch (error) {
        console.warn('Failed to load menu from API, trying local fallback:', error);

        // Try local JSON file as fallback
        try {
          const menuModule = await import('@/data/menu.json');
          const localData = menuModule.default as MenuData;
          this.restaurant = localData.restaurant;
          this.categories = localData.categories;
          this.lastUpdated = localData.lastUpdated;

          const firstCategory = this.categories[0];
          if (!this.activeCategoryId && firstCategory) {
            this.activeCategoryId = firstCategory.id;
          }

          // Cache locally for offline access
          await offlineStore.cacheMenu(localData);
          console.info('[MenuStore] Loaded menu from local JSON fallback');
          return;
        } catch (localError) {
          console.error('Failed to load local menu, trying cache:', localError);
        }

        // Last resort: try to load from cache
        this.error = 'Impossible de charger le menu. Veuillez réessayer.';
        await this.loadFromCache();
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Load menu from cache (offline fallback)
     * Tries IndexedDB first, then falls back to localStorage
     */
    async loadFromCache() {
      const offlineStore = useOfflineStore();

      try {
        // Try IndexedDB first
        const cachedData = await offlineStore.getCachedMenu();

        if (cachedData) {
          this.restaurant = cachedData.restaurant;
          this.categories = cachedData.categories;
          this.lastUpdated = cachedData.lastUpdated;

          const firstCat = this.categories[0];
          if (!this.activeCategoryId && firstCat) {
            this.activeCategoryId = firstCat.id;
          }

          this.error = null;
          console.info('[MenuStore] Loaded menu from IndexedDB cache');
          return;
        }

        // Fallback to localStorage
        const localCached = localStorage.getItem('menuqr-menu-cache');
        if (localCached) {
          const data: MenuData = JSON.parse(localCached);
          this.restaurant = data.restaurant;
          this.categories = data.categories;
          this.lastUpdated = data.lastUpdated;

          const firstCat = this.categories[0];
          if (!this.activeCategoryId && firstCat) {
            this.activeCategoryId = firstCat.id;
          }

          this.error = null;
          console.info('[MenuStore] Loaded menu from localStorage cache');

          // Migrate to IndexedDB
          await offlineStore.cacheMenu(data);
        }
      } catch (error) {
        console.error('Failed to load from cache:', error);
      }
    },

    /**
     * Set active category
     */
    setActiveCategory(categoryId: string) {
      this.activeCategoryId = categoryId;
    },

    /**
     * Set search query
     */
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    /**
     * Clear search
     */
    clearSearch() {
      this.searchQuery = '';
    },

    /**
     * Set a filter value
     */
    setFilter(filter: keyof MenuFilters, value: boolean) {
      this.filters[filter] = value;
    },

    /**
     * Toggle a filter
     */
    toggleFilter(filter: keyof MenuFilters) {
      this.filters[filter] = !this.filters[filter];
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      this.filters = { ...defaultFilters };
    },

    /**
     * Set sort option
     */
    setSortBy(sortBy: SortOption) {
      this.sortBy = sortBy;
    },

    /**
     * Reset all filters and sort
     */
    resetFiltersAndSort() {
      this.filters = { ...defaultFilters };
      this.sortBy = 'default';
    },

    /**
     * Toggle dish availability (admin)
     */
    toggleDishAvailability(dishId: string) {
      for (const category of this.categories) {
        const dish = category.dishes.find((d) => d.id === dishId);
        if (dish) {
          dish.isAvailable = !dish.isAvailable;
          break;
        }
      }
    },

    /**
     * Update dish (admin)
     */
    updateDish(dishId: string, updates: Partial<Dish>) {
      for (const category of this.categories) {
        const dishIndex = category.dishes.findIndex((d) => d.id === dishId);
        const existingDish = category.dishes[dishIndex];
        if (dishIndex !== -1 && existingDish) {
          category.dishes[dishIndex] = { ...existingDish, ...updates };
          break;
        }
      }
    },

    /**
     * Add new dish (admin)
     */
    addDish(categoryId: string, dish: Dish) {
      const category = this.categories.find((c) => c.id === categoryId);
      if (category) {
        category.dishes.push(dish);
      }
    },

    /**
     * Delete dish (admin)
     */
    deleteDish(dishId: string) {
      for (const category of this.categories) {
        const index = category.dishes.findIndex((d) => d.id === dishId);
        if (index !== -1) {
          category.dishes.splice(index, 1);
          break;
        }
      }
    },
  },
});
