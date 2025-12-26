<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Category } from '@/types';
import { useLocale } from '@/composables/useI18n';

const props = defineProps<{
  categories: Category[];
  activeId: string | null;
}>();

const emit = defineEmits<{
  select: [categoryId: string];
}>();

const { localize } = useLocale();

// Icon name to SVG path mapping (matching admin icons)
const iconPaths: Record<string, string> = {
  utensils: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
  pizza: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  burger: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  drink: 'M3 2l2.01 18.23C5.13 21.23 5.97 22 7 22h10c1.03 0 1.87-.77 1.99-1.77L21 2H3zm9 17c-1.66 0-3-1.34-3-3 0-2 3-5.4 3-5.4s3 3.4 3 5.4c0 1.66-1.34 3-3 3zm6.33-11H5.67l-.44-4h13.53l-.43 4z',
  dessert: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
  salad: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
};

// Check if the icon is an emoji (not a named icon)
const isEmoji = (icon: string): boolean => {
  // Emojis typically have high code points or are multi-character
  return !iconPaths[icon] && icon.length <= 4;
};

// Get SVG path for named icons
const getIconPath = (icon: string): string | null => {
  return iconPaths[icon] || null;
};

const tabsRef = ref<HTMLElement | null>(null);

const scrollToCategory = (categoryId: string) => {
  emit('select', categoryId);

  // Scroll to category section
  const element = document.getElementById(`category-${categoryId}`);
  if (element) {
    const headerHeight = 56 + 60; // Header + search bar approximate height
    const y = element.getBoundingClientRect().top + window.pageYOffset - headerHeight;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};

// Keyboard navigation for arrow keys
const handleKeydown = (event: KeyboardEvent, currentIndex: number) => {
  const { key } = event;
  let newIndex = currentIndex;

  if (key === 'ArrowRight' || key === 'ArrowDown') {
    event.preventDefault();
    newIndex = currentIndex < props.categories.length - 1 ? currentIndex + 1 : 0;
  } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
    event.preventDefault();
    newIndex = currentIndex > 0 ? currentIndex - 1 : props.categories.length - 1;
  } else if (key === 'Home') {
    event.preventDefault();
    newIndex = 0;
  } else if (key === 'End') {
    event.preventDefault();
    newIndex = props.categories.length - 1;
  } else {
    return;
  }

  // Focus the new tab
  const tabs = tabsRef.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  const targetTab = tabs?.[newIndex];
  const targetCategory = props.categories[newIndex];
  if (targetTab && targetCategory) {
    targetTab.focus();
    scrollToCategory(targetCategory.id);
  }
};
</script>

<template>
  <div class="sticky top-[108px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
    <nav
      ref="tabsRef"
      class="overflow-x-auto scrollbar-hide px-4 py-3"
      role="tablist"
      aria-label="Catégories du menu"
    >
      <div class="flex gap-3 min-w-max">
        <button
          v-for="(category, index) in categories"
          :key="category.id"
          type="button"
          role="tab"
          :aria-selected="activeId === category.id"
          :aria-controls="`category-${category.id}`"
          :tabindex="activeId === category.id ? 0 : -1"
          class="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm whitespace-nowrap"
          :class="[
            activeId === category.id
              ? 'bg-primary-600 text-white shadow-md ring-4 ring-primary-100'
              : 'bg-white/90 text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-200/80',
          ]"
          @click="scrollToCategory(category.id)"
          @keydown="handleKeydown($event, index)"
        >
          <!-- SVG icon for named icons -->
          <svg
            v-if="category.icon && getIconPath(category.icon)"
            class="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path :d="getIconPath(category.icon)!" />
          </svg>
          <!-- Emoji for emoji icons -->
          <span v-else-if="category.icon && isEmoji(category.icon)" class="text-lg" aria-hidden="true">{{ category.icon }}</span>
          {{ localize(category.name) }}
        </button>
      </div>
    </nav>
  </div>
</template>
