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
 * BaseTabs - Wrapper around Ant Design Tabs
 * Maintains backwards compatibility with existing API
 */
import { ref, provide, computed, watch } from 'vue';
import { Tabs } from 'ant-design-vue';

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

// Map variant to Ant Design type
const tabType = computed(() => {
  switch (props.variant) {
    case 'pills':
      return 'card';
    case 'underline':
      return 'line';
    default:
      return 'line';
  }
});

// Map size to Ant Design size
const antSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'small';
    case 'lg':
      return 'large';
    default:
      return 'middle';
  }
});

// Handle tab change
const handleChange = (key: string | number) => {
  setActiveTab(String(key));
};

// Generate tab items for Ant Design
const tabItems = computed(() => {
  return tabs.value.map((tab) => ({
    key: tab.id,
    label: tab.icon ? `${tab.icon} ${tab.label}` : tab.label,
    disabled: tab.disabled,
  }));
});
</script>

<template>
  <div
    class="base-tabs"
    :class="{
      'base-tabs--pills': variant === 'pills',
      'base-tabs--underline': variant === 'underline',
      'base-tabs--full-width': fullWidth,
    }"
  >
    <!-- Tab Headers using Ant Design -->
    <Tabs
      :active-key="activeTab"
      :type="tabType"
      :size="antSize"
      :items="tabItems"
      class="base-tabs__nav"
      @change="handleChange"
    />

    <!-- Tab Content (slot-based for backwards compatibility) -->
    <div class="base-tabs__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.base-tabs {
  width: 100%;
}

/* Override Ant Design tabs styling */
.base-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.base-tabs :deep(.ant-tabs-tab) {
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.base-tabs :deep(.ant-tabs-tab:hover) {
  color: #14b8a6;
}

.base-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #14b8a6;
}

.base-tabs :deep(.ant-tabs-ink-bar) {
  background: #14b8a6;
}

/* Pills variant */
.base-tabs--pills :deep(.ant-tabs-nav) {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
}

.base-tabs--pills :deep(.ant-tabs-tab) {
  border-radius: 8px;
  margin: 0 2px;
}

.base-tabs--pills :deep(.ant-tabs-tab-active) {
  background: #14b8a6;
}

.base-tabs--pills :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #fff;
}

.base-tabs--pills :deep(.ant-tabs-ink-bar) {
  display: none;
}

/* Underline variant */
.base-tabs--underline :deep(.ant-tabs-nav::before) {
  border-bottom: 1px solid #e5e7eb;
}

/* Full width */
.base-tabs--full-width :deep(.ant-tabs-nav-list) {
  width: 100%;
}

.base-tabs--full-width :deep(.ant-tabs-tab) {
  flex: 1;
  justify-content: center;
}

/* Size variants */
.base-tabs :deep(.ant-tabs-small .ant-tabs-tab) {
  padding: 6px 12px;
  font-size: 13px;
}

.base-tabs :deep(.ant-tabs-large .ant-tabs-tab) {
  padding: 12px 24px;
  font-size: 15px;
}

.base-tabs__content {
  margin-top: 0;
}
</style>
