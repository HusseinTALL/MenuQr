<script lang="ts">
import { type InjectionKey, type Ref } from 'vue';

export interface TabInfo {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface TabsContext {
  activeTab: Ref<string>;
  registerTab: (id: string, label: string, icon?: string, disabled?: boolean) => void;
  unregisterTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const TABS_KEY: InjectionKey<TabsContext> = Symbol('tabs');
</script>

<script setup lang="ts">
/**
 * BaseTabs component
 * Tab navigation container with animated indicator
 */
import { ref, provide, computed, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    variant?: 'default' | 'pills' | 'underline';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
  }>(),
  {
    variant: 'default',
    size: 'md',
    fullWidth: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const tabs = ref<TabInfo[]>([]);
const activeTab = ref(props.modelValue || '');

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== undefined) {
      activeTab.value = newVal;
    }
  }
);

const registerTab = (id: string, label: string, icon?: string, disabled?: boolean) => {
  if (!tabs.value.find((t) => t.id === id)) {
    tabs.value.push({ id, label, icon, disabled });
    // Set first tab as active if none selected
    if (!activeTab.value && tabs.value.length === 1) {
      activeTab.value = id;
      emit('update:modelValue', id);
    }
  }
};

const unregisterTab = (id: string) => {
  const index = tabs.value.findIndex((t) => t.id === id);
  if (index !== -1) {
    tabs.value.splice(index, 1);
  }
};

const setActiveTab = (id: string) => {
  const tab = tabs.value.find((t) => t.id === id);
  if (tab && !tab.disabled) {
    activeTab.value = id;
    emit('update:modelValue', id);
  }
};

provide(TABS_KEY, {
  activeTab,
  registerTab,
  unregisterTab,
  setActiveTab,
});

const tabClasses = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return `${base} ${sizes[props.size]}`;
});

const getTabStateClasses = (tab: TabInfo) => {
  const isActive = activeTab.value === tab.id;

  if (tab.disabled) {
    return 'text-gray-400 cursor-not-allowed';
  }

  if (props.variant === 'pills') {
    return isActive
      ? 'bg-primary-600 text-white shadow-sm'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
  }

  if (props.variant === 'underline') {
    return isActive
      ? 'text-primary-600 border-b-2 border-primary-600'
      : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent';
  }

  // Default
  return isActive
    ? 'text-primary-600 bg-primary-50 border-primary-600'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent';
};

const containerClasses = computed(() => {
  if (props.variant === 'pills') {
    return 'inline-flex gap-1 p-1 bg-gray-100 rounded-lg';
  }

  if (props.variant === 'underline') {
    return 'flex border-b border-gray-200';
  }

  return 'inline-flex gap-1 p-1 border border-gray-200 rounded-lg bg-gray-50';
});
</script>

<template>
  <div>
    <!-- Tab Headers -->
    <div :class="[containerClasses, fullWidth ? 'w-full' : '']">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :disabled="tab.disabled"
        :class="[
          tabClasses,
          getTabStateClasses(tab),
          variant === 'pills' ? 'rounded-md' : '',
          variant === 'default' ? 'rounded-md border' : '',
          fullWidth ? 'flex-1' : '',
        ]"
        @click="setActiveTab(tab.id)"
      >
        <span v-if="tab.icon" class="text-lg">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="mt-4">
      <slot />
    </div>
  </div>
</template>
