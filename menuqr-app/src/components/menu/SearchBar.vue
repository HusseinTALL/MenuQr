<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  clear: [];
}>();

const { t } = useI18n();

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <div class="relative" role="search">
    <!-- Search Icon -->
    <svg
      class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none transition-colors duration-200"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>

    <!-- Input -->
    <label for="menu-search" class="sr-only">{{ t('menu.search') }}</label>
    <input
      id="menu-search"
      type="search"
      :value="modelValue"
      :placeholder="t('menu.search')"
      :aria-label="t('menu.search')"
      autocomplete="off"
      class="w-full h-12 pl-12 pr-12 rounded-2xl bg-white text-base text-gray-900 placeholder-gray-500 border border-transparent focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 shadow-sm hover:shadow-md"
      @input="handleInput"
    />

    <!-- Clear Button (with smooth fade-in/out) -->
    <transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <button
        v-if="modelValue"
        type="button"
        class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all duration-200"
        :aria-label="t('menu.clearSearch')"
        @click="emit('clear')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </transition>
  </div>
</template>
