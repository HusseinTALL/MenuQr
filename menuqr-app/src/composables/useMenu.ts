import { computed, onMounted, ref } from 'vue';
import { useMenuStore, type MenuFilters, type SortOption } from '@/stores/menuStore';
import { useConfigStore } from '@/stores/configStore';
import { getLocalizedString } from '@/utils/formatters';
import type { Dish, Category } from '@/types';

// Debounce delay for search (ms)
const SEARCH_DEBOUNCE_DELAY = 250;

/**
 * Composable for menu operations
 * Provides a clean API for menu interactions in components
 */
export function useMenu() {
  const menuStore = useMenuStore();
  const configStore = useConfigStore();

  // Reactive getters
  const restaurant = computed(() => menuStore.restaurant);
  const categories = computed(() => menuStore.activeCategories);
  const allDishes = computed(() => menuStore.allDishes);
  const popularDishes = computed(() => menuStore.popularDishes);
  const isLoading = computed(() => menuStore.isLoading);
  const error = computed(() => menuStore.error);
  const isMenuLoaded = computed(() => menuStore.isMenuLoaded);
  const searchQuery = computed(() => menuStore.searchQuery);
  const activeCategoryId = computed(() => menuStore.activeCategoryId);
  const filters = computed(() => menuStore.filters);
  const sortBy = computed(() => menuStore.sortBy);
  const hasActiveFilters = computed(() => menuStore.hasActiveFilters);

  /**
   * Get localized name of a dish
   */
  const getDishName = (dish: Dish) => {
    return getLocalizedString(dish.name, configStore.locale);
  };

  /**
   * Get localized description of a dish
   */
  const getDishDescription = (dish: Dish) => {
    return getLocalizedString(dish.description, configStore.locale);
  };

  /**
   * Get localized name of a category
   */
  const getCategoryName = (category: Category) => {
    return getLocalizedString(category.name, configStore.locale);
  };

  /**
   * Get dishes by category
   */
  const getDishesByCategory = (categoryId: string) => {
    return menuStore.dishesByCategory(categoryId);
  };

  /**
   * Get dish by ID
   */
  const getDishById = (dishId: string) => {
    return menuStore.getDishById(dishId);
  };

  /**
   * Get filtered dishes based on search
   */
  const filteredDishes = computed(() => {
    return menuStore.filteredDishes(configStore.locale);
  });

  /**
   * Set active category
   */
  const setActiveCategory = (categoryId: string) => {
    menuStore.setActiveCategory(categoryId);
  };

  // Local search input state (updates immediately)
  const searchInput = ref(menuStore.searchQuery);
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Set search query with debounce for performance
   * The local input updates immediately for responsive UI,
   * while the store is updated after a delay
   */
  const setSearchQuery = (query: string) => {
    searchInput.value = query;

    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // Debounce the store update
    searchDebounceTimer = setTimeout(() => {
      menuStore.setSearchQuery(query);
    }, SEARCH_DEBOUNCE_DELAY);
  };

  /**
   * Clear search
   */
  const clearSearch = () => {
    searchInput.value = '';
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    menuStore.clearSearch();
  };

  /**
   * Set a filter value
   */
  const setFilter = (filter: keyof MenuFilters, value: boolean) => {
    menuStore.setFilter(filter, value);
  };

  /**
   * Toggle a filter
   */
  const toggleFilter = (filter: keyof MenuFilters) => {
    menuStore.toggleFilter(filter);
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    menuStore.clearFilters();
  };

  /**
   * Set sort option
   */
  const setSortBy = (option: SortOption) => {
    menuStore.setSortBy(option);
  };

  /**
   * Reset filters and sort
   */
  const resetFiltersAndSort = () => {
    menuStore.resetFiltersAndSort();
  };

  /**
   * Load menu data
   */
  const loadMenu = async (slug?: string) => {
    if (slug) {
      await menuStore.loadMenu(slug);
    } else if (menuStore.restaurant?.slug) {
      await menuStore.loadMenu(menuStore.restaurant.slug);
    }
  };

  /**
   * Refresh menu data
   */
  const refreshMenu = async () => {
    if (menuStore.restaurant?.slug) {
      await menuStore.loadMenu(menuStore.restaurant.slug);
    }
  };

  // Auto-load menu on mount if not loaded
  onMounted(() => {
    if (!menuStore.isMenuLoaded && menuStore.restaurant?.slug) {
      menuStore.loadMenu(menuStore.restaurant.slug);
    }
  });

  return {
    // State
    restaurant,
    categories,
    allDishes,
    popularDishes,
    isLoading,
    error,
    isMenuLoaded,
    searchQuery,
    activeCategoryId,
    filteredDishes,
    filters,
    sortBy,
    hasActiveFilters,

    // Helpers
    getDishName,
    getDishDescription,
    getCategoryName,
    getDishesByCategory,
    getDishById,

    // Actions
    setActiveCategory,
    setSearchQuery,
    clearSearch,
    setFilter,
    toggleFilter,
    clearFilters,
    setSortBy,
    resetFiltersAndSort,
    loadMenu,
    refreshMenu,
  };
}
