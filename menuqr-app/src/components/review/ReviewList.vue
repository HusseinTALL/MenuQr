<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Review, ReviewQueryParams, ReviewPagination } from '@/types/review';
import ReviewCard from './ReviewCard.vue';

interface Props {
  reviews: Review[];
  pagination?: ReviewPagination;
  loading?: boolean;
  isAdmin?: boolean;
  showFilters?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  isAdmin: false,
  showFilters: true,
});

const emit = defineEmits<{
  (e: 'filter', params: ReviewQueryParams): void;
  (e: 'loadMore'): void;
  (e: 'helpful', id: string): void;
  (e: 'report', id: string): void;
  (e: 'approve', id: string): void;
  (e: 'reject', id: string): void;
  (e: 'respond', id: string): void;
  (e: 'delete', id: string): void;
}>();

const sortOption = ref<string>('recent');
const ratingFilter = ref<number | null>(null);

const sortOptions = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'rating_high', label: 'Meilleures notes' },
  { value: 'rating_low', label: 'Notes les plus basses' },
  { value: 'helpful', label: 'Plus utiles' },
];

const ratingOptions = [
  { value: null, label: 'Toutes les notes' },
  { value: 5, label: '5 étoiles' },
  { value: 4, label: '4 étoiles' },
  { value: 3, label: '3 étoiles' },
  { value: 2, label: '2 étoiles' },
  { value: 1, label: '1 étoile' },
];

const hasMore = computed(() => {
  if (!props.pagination) return false;
  return props.pagination.page < props.pagination.pages;
});

const handleFilterChange = () => {
  const params: ReviewQueryParams = {
    sort: sortOption.value as ReviewQueryParams['sort'],
    page: 1,
  };
  if (ratingFilter.value) {
    params.rating = ratingFilter.value;
  }
  emit('filter', params);
};

watch([sortOption, ratingFilter], handleFilterChange);
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div v-if="showFilters" class="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <!-- Sort -->
      <div class="flex items-center gap-2">
        <label for="sort" class="text-sm text-gray-600">Trier par:</label>
        <select
          id="sort"
          v-model="sortOption"
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Rating filter -->
      <div class="flex items-center gap-2">
        <label for="rating" class="text-sm text-gray-600">Filtrer:</label>
        <select
          id="rating"
          v-model="ratingFilter"
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option v-for="option in ratingOptions" :key="String(option.value)" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Results count -->
      <div v-if="pagination" class="ml-auto text-sm text-gray-500">
        {{ pagination.total }} avis
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading && reviews.length === 0" class="space-y-4">
      <div
        v-for="i in 3"
        :key="i"
        class="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gray-200" />
          <div class="space-y-2">
            <div class="h-4 w-24 bg-gray-200 rounded" />
            <div class="h-3 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        <div class="space-y-2">
          <div class="h-4 w-3/4 bg-gray-200 rounded" />
          <div class="h-4 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && reviews.length === 0"
      class="text-center py-12 bg-white rounded-lg border border-gray-200"
    >
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-1">Aucun avis</h3>
      <p class="text-gray-500">
        {{ ratingFilter ? 'Aucun avis avec cette note' : 'Soyez le premier à donner votre avis !' }}
      </p>
    </div>

    <!-- Reviews list -->
    <div v-else class="space-y-4">
      <ReviewCard
        v-for="review in reviews"
        :key="review._id"
        :review="review"
        :is-admin="isAdmin"
        @helpful="emit('helpful', $event)"
        @report="emit('report', $event)"
        @approve="emit('approve', $event)"
        @reject="emit('reject', $event)"
        @respond="emit('respond', $event)"
        @delete="emit('delete', $event)"
      />

      <!-- Load more -->
      <div v-if="hasMore" class="text-center pt-4">
        <button
          :disabled="loading"
          class="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          @click="emit('loadMore')"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Chargement...
          </span>
          <span v-else>Voir plus d'avis</span>
        </button>
      </div>

      <!-- Loading indicator for load more -->
      <div v-if="loading && reviews.length > 0" class="text-center py-4">
        <svg class="w-6 h-6 mx-auto text-teal-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>
