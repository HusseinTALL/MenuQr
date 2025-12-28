<script setup lang="ts">
import { Input } from 'ant-design-vue';
import { useLocale } from '@/composables/useI18n';

/**
 * TableNumberInput - Input field for table number selection
 * Uses Ant Design Input with numeric keyboard on mobile
 */
defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useLocale();

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <div class="table-input">
    <label class="table-input__label">
      {{ t('order.tableNumber') }}
    </label>
    <Input
      :value="modelValue || ''"
      :placeholder="t('order.selectTable')"
      inputmode="numeric"
      size="large"
      class="table-input__field"
      @input="handleInput"
    />
  </div>
</template>

<style scoped>
.table-input {
  margin-bottom: 24px;
}

.table-input__label {
  display: block;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.table-input__field {
  height: 56px;
  border-radius: 16px;
  font-size: 16px;
}

.table-input__field :deep(.ant-input) {
  height: 56px;
  padding: 0 20px;
  border-radius: 16px;
}

.table-input__field:hover {
  border-color: #14b8a6;
}

.table-input__field:focus,
.table-input__field:focus-within {
  border-color: #14b8a6;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.1);
}
</style>
