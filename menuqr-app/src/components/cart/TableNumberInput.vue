<script setup lang="ts">
import { useLocale } from '@/composables/useI18n';

defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useLocale();

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <div class="mb-6">
    <label class="block text-base font-semibold text-gray-900 mb-2.5">
      {{ t('order.tableNumber') }}
    </label>
    <input
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      :value="modelValue || ''"
      :placeholder="t('order.selectTable')"
      class="w-full h-14 px-5 py-3.5 rounded-2xl bg-white text-base text-gray-900 placeholder-gray-500 border border-gray-200 shadow-sm focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 hover:shadow-md"
      @input="handleInput"
    />
  </div>
</template>
