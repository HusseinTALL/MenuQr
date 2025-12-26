<script setup lang="ts">
/**
 * BaseAccordionItem component
 * Individual accordion panel with header and content
 */
import { inject, computed, type InjectionKey } from 'vue';

interface AccordionContext {
  toggle: (id: string) => void;
  isOpen: (id: string) => boolean;
}

const ACCORDION_KEY: InjectionKey<AccordionContext> = Symbol('accordion');

const props = defineProps<{
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
}>();

const accordion = inject(ACCORDION_KEY);

const isOpen = computed(() => accordion?.isOpen(props.id) ?? false);

const toggle = () => {
  if (!props.disabled && accordion) {
    accordion.toggle(props.id);
  }
};
</script>

<template>
  <div class="bg-white">
    <!-- Header -->
    <button
      type="button"
      class="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      :class="{
        'cursor-not-allowed opacity-50': disabled,
        'bg-gray-50': isOpen,
      }"
      :disabled="disabled"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <div class="flex items-center gap-3">
        <span v-if="icon" class="text-xl">{{ icon }}</span>
        <span class="text-sm font-medium text-gray-900">{{ title }}</span>
      </div>
      <svg
        class="h-5 w-5 text-gray-500 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Content -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-show="isOpen" class="px-4 pb-4">
        <div class="text-sm text-gray-600">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>
