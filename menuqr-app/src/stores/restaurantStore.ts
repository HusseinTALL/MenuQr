import { defineStore } from 'pinia';
import api from '@/services/api';

export interface RestaurantListItem {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

interface RestaurantState {
  restaurants: RestaurantListItem[];
  selectedRestaurant: RestaurantListItem | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useRestaurantStore = defineStore('restaurant', {
  state: (): RestaurantState => ({
    restaurants: [],
    selectedRestaurant: null,
    isLoading: false,
    error: null,
    searchQuery: '',
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  }),

  getters: {
    /**
     * Check if a restaurant is selected
     */
    hasSelectedRestaurant: (state): boolean => {
      return state.selectedRestaurant !== null;
    },

    /**
     * Get selected restaurant slug
     */
    selectedSlug: (state): string | null => {
      return state.selectedRestaurant?.slug ?? null;
    },

    /**
     * Get selected restaurant name
     */
    selectedName: (state): string | null => {
      return state.selectedRestaurant?.name ?? null;
    },

    /**
     * Filter restaurants by search query
     */
    filteredRestaurants: (state): RestaurantListItem[] => {
      if (!state.searchQuery.trim()) {
        return state.restaurants;
      }
      const query = state.searchQuery.toLowerCase().trim();
      return state.restaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.address?.city?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
      );
    },

    /**
     * Check if there are more pages to load
     */
    hasMorePages: (state): boolean => {
      return state.pagination.page < state.pagination.pages;
    },
  },

  actions: {
    /**
     * Fetch restaurants list from API
     */
    async fetchRestaurants(params?: { page?: number; limit?: number; search?: string }) {
      this.isLoading = true;
      this.error = null;

      try {
        const response = await api.getRestaurants({
          page: params?.page || 1,
          limit: params?.limit || 20,
          search: params?.search,
        });

        if (response.success && response.data) {
          // Transform API response
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const restaurants = response.data.restaurants.map((r: any) => ({
            id: r._id || r.id,
            name: r.name,
            slug: r.slug,
            logo: r.logo,
            description: r.description,
            address: r.address,
          })) as RestaurantListItem[];

          if (params?.page && params.page > 1) {
            // Append for infinite scroll
            this.restaurants = [...this.restaurants, ...restaurants];
          } else {
            // Replace for fresh load
            this.restaurants = restaurants;
          }

          this.pagination = response.data.pagination;
        }
      } catch (_error) {
        console.error('Failed to fetch restaurants:', error);
        this.error = 'Impossible de charger les restaurants. Veuillez réessayer.';
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Load more restaurants (for infinite scroll)
     */
    async loadMore() {
      if (this.hasMorePages && !this.isLoading) {
        await this.fetchRestaurants({
          page: this.pagination.page + 1,
          limit: this.pagination.limit,
          search: this.searchQuery || undefined,
        });
      }
    },

    /**
     * Select a restaurant by slug
     */
    async selectRestaurant(slug: string) {
      // First check if already in list
      const found = this.restaurants.find((r) => r.slug === slug);
      if (found) {
        this.selectedRestaurant = found;
        return true;
      }

      // Otherwise fetch from API
      try {
        const response = await api.getRestaurantBySlug(slug);
        if (response.success && response.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = response.data as any;
          this.selectedRestaurant = {
            id: r._id || r.id,
            name: r.name,
            slug: r.slug,
            logo: r.logo,
            description: r.description,
            address: r.address,
          };
          return true;
        }
      } catch (_error) {
        console.error('Failed to select restaurant:', error);
        this.error = 'Restaurant introuvable.';
      }
      return false;
    },

    /**
     * Select a restaurant from object
     */
    setSelectedRestaurant(restaurant: RestaurantListItem | null) {
      this.selectedRestaurant = restaurant;
    },

    /**
     * Clear selected restaurant
     */
    clearSelection() {
      this.selectedRestaurant = null;
    },

    /**
     * Set search query
     */
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    /**
     * Clear search and reload
     */
    async clearSearch() {
      this.searchQuery = '';
      await this.fetchRestaurants();
    },

    /**
     * Search restaurants
     */
    async search(query: string) {
      this.searchQuery = query;
      await this.fetchRestaurants({ search: query });
    },

    /**
     * Reset store state
     */
    reset() {
      this.restaurants = [];
      this.selectedRestaurant = null;
      this.isLoading = false;
      this.error = null;
      this.searchQuery = '';
      this.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      };
    },
  },

  persist: {
    key: 'menuqr-restaurant',
    storage: localStorage,
    pick: ['selectedRestaurant'],
  },
});
