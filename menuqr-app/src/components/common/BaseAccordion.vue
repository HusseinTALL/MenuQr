<script lang="ts">
import { type InjectionKey } from 'vue';

export interface AccordionContext {
  activeItems: string[];
  toggle: (id: string) => void;
  isOpen: (id: string) => boolean;
  multiple: boolean;
}

export const ACCORDION_KEY: InjectionKey<AccordionContext> = Symbol('accordion');
</script>

<script setup lang="ts">
/**
 * BaseAccordion component
 * Expandable/collapsible content sections
 */
import { ref, provide } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string | string[];
    multiple?: boolean;
  }>(),
  {
    multiple: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]];
}>();

const activeItems = ref<string[]>(
  Array.isArray(props.modelValue) ? props.modelValue : props.modelValue ? [props.modelValue] : []
);

const toggle = (id: string) => {
  if (props.multiple) {
    const index = activeItems.value.indexOf(id);
    if (index === -1) {
      activeItems.value.push(id);
    } else {
      activeItems.value.splice(index, 1);
    }
    emit('update:modelValue', [...activeItems.value]);
  } else {
    if (activeItems.value.includes(id)) {
      activeItems.value = [];
      emit('update:modelValue', '');
    } else {
      activeItems.value = [id];
      emit('update:modelValue', id);
    }
  }
};

const isOpen = (id: string) => activeItems.value.includes(id);

provide(ACCORDION_KEY, {
  activeItems: activeItems.value,
  toggle,
  isOpen,
  multiple: props.multiple,
});
</script>

<template>
  <div class="divide-y divide-gray-200 rounded-lg border border-gray-200 overflow-hidden">
    <slot />
  </div>
</template>
