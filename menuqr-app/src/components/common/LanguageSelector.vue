<script setup lang="ts">
import { useLocale } from '@/composables/useI18n';

const { locale, toggleLocale, isFrench } = useLocale();
</script>

<template>
  <button
    class="tap-target flex items-center justify-center px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
    @click="toggleLocale"
  >
    <span class="flex items-center gap-1">
      <span v-if="isFrench">🇫🇷</span>
      <span v-else>🇬🇧</span>
      <span class="hidden sm:inline">{{ locale.toUpperCase() }}</span>
    </span>
  </button>
</template>
