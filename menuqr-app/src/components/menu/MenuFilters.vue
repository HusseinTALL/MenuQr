<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMenu } from '@/composables/useMenu';
import { useLocale } from '@/composables/useI18n';
import type { SortOption, MenuFilters } from '@/stores/menuStore';

const { filters, sortBy, hasActiveFilters, toggleFilter, clearFilters, setSortBy } = useMenu();
const { t } = useLocale();

const isExpanded = ref(false);
const showSortDropdown = ref(false);

const sortOptions: { value: SortOption; labelKey: string }[] = [
  { value: 'default', labelKey: 'menu.sortDefault' },
  { value: 'priceAsc', labelKey: 'menu.sortPriceAsc' },
  { value: 'priceDesc', labelKey: 'menu.sortPriceDesc' },
  { value: 'name', labelKey: 'menu.sortName' },
  { value: 'popularity', labelKey: 'menu.sortPopularity' },
];

const filterButtons: { key: keyof MenuFilters; labelKey: string; icon: string }[] = [
  { key: 'isVegetarian', labelKey: 'menu.filterVegetarian', icon: '🥬' },
  { key: 'isSpicy', labelKey: 'menu.filterSpicy', icon: '🌶️' },
  { key: 'isNew', labelKey: 'menu.filterNew', icon: '✨' },
  { key: 'isPopular', labelKey: 'menu.filterPopular', icon: '🔥' },
];

const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.value.isVegetarian) {
    count++;
  }
  if (filters.value.isSpicy) {
    count++;
  }
  if (filters.value.isNew) {
    count++;
  }
  if (filters.value.isPopular) {
    count++;
  }
  return count;
});

const currentSortLabel = computed(() => {
  const option = sortOptions.find((o) => o.value === sortBy.value);
  return option ? t(option.labelKey) : t('menu.sortDefault');
});

const handleSortChange = (option: SortOption) => {
  setSortBy(option);
  showSortDropdown.value = false;
};

const handleClearFilters = () => {
  clearFilters();
};
</script>

<template>
  <div class="bg-white border-b border-gray-100">
    <!-- Compact Filter Bar -->
    <div class="flex items-center gap-2 px-4 py-2">
      <!-- Filter Toggle Button -->
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="[
          hasActiveFilters
            ? 'bg-primary-100 text-primary-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ]"
        @click="isExpanded = !isExpanded"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span>{{ t('menu.filters') }}</span>
        <span
          v-if="activeFilterCount > 0"
          class="w-5 h-5 flex items-center justify-center bg-primary-600 text-white text-xs rounded-full"
        >
          {{ activeFilterCount }}
        </span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-180': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <!-- Sort Dropdown -->
      <div class="relative ml-auto">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          @click="showSortDropdown = !showSortDropdown"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          <span class="max-w-24 truncate">{{ currentSortLabel }}</span>
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-180': showSortDropdown }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <!-- Sort Options Dropdown -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
        >
          <div
            v-if="showSortDropdown"
            class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
          >
            <button
              v-for="option in sortOptions"
              :key="option.value"
              class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
              :class="{ 'text-primary-600 bg-primary-50': sortBy === option.value }"
              @click="handleSortChange(option.value)"
            >
              <span>{{ t(option.labelKey) }}</span>
              <svg
                v-if="sortBy === option.value"
                class="w-4 h-4 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Expanded Filter Panel -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 -translate-y-2"
      enter-to-class="transform opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="transform opacity-100 translate-y-0"
      leave-to-class="transform opacity-0 -translate-y-2"
    >
      <div v-if="isExpanded" class="px-4 pb-3 border-t border-gray-100 pt-3">
        <div class="flex flex-wrap gap-2">
          <!-- Filter Buttons -->
          <button
            v-for="filter in filterButtons"
            :key="filter.key"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            :class="[
              filters[filter.key]
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            ]"
            @click="toggleFilter(filter.key)"
          >
            <span>{{ filter.icon }}</span>
            <span>{{ t(filter.labelKey) }}</span>
          </button>

          <!-- Clear Filters -->
          <button
            v-if="hasActiveFilters"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            @click="handleClearFilters"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>{{ t('menu.clearFilters') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Backdrop for sort dropdown -->
  <div v-if="showSortDropdown" class="fixed inset-0 z-40" @click="showSortDropdown = false" />
</template>
