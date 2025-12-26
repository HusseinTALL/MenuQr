<script setup lang="ts">
/**
 * BaseTabItem component
 * Individual tab panel content
 */
import { inject, onMounted, onUnmounted, computed } from 'vue';
import { TABS_KEY } from './BaseTabs.vue';

const props = defineProps<{
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}>();

const tabsContext = inject(TABS_KEY);

onMounted(() => {
  tabsContext?.registerTab(props.id, props.label, props.icon, props.disabled);
});

onUnmounted(() => {
  tabsContext?.unregisterTab(props.id);
});

const isActive = computed(() => {
  return tabsContext?.activeTab.value === props.id;
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-1"
    mode="out-in"
  >
    <div v-if="isActive" :key="id" class="tab-panel">
      <slot />
    </div>
  </Transition>
</template>
