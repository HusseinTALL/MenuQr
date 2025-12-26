<script setup lang="ts">
/**
 * BaseDropdownItem component
 * Individual dropdown menu item
 */
const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    danger?: boolean;
    icon?: string;
    href?: string;
  }>(),
  {
    disabled: false,
    danger: false,
  }
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event);
  }
};
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    type="button"
    class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
    :class="{
      'cursor-not-allowed text-gray-400': disabled,
      'text-red-600 hover:bg-red-50': danger && !disabled,
      'text-gray-700 hover:bg-gray-50': !danger && !disabled,
    }"
    :disabled="disabled"
    @click="handleClick"
  >
    <span v-if="icon" class="text-lg flex-shrink-0">{{ icon }}</span>
    <span class="flex-1">
      <slot />
    </span>
  </component>
</template>
