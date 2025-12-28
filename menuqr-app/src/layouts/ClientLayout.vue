<script setup lang="ts">
import { computed } from 'vue';
import { ConfigProvider } from 'ant-design-vue';
import { menuQRTheme } from '@/plugins/antd';
import frFR from 'ant-design-vue/es/locale/fr_FR';

// Client-specific theme adjustments (mobile-optimized)
 
const clientTheme = computed(() => ({
  ...menuQRTheme,
  token: {
    ...menuQRTheme.token,
    // Slightly larger touch targets for mobile
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    // More rounded for friendly mobile feel
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
  },
  components: {
    ...menuQRTheme.components,
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f8fafc',
      footerBg: '#ffffff',
    },
    Card: {
      paddingLG: 16,
      borderRadiusLG: 16,
    },
    Button: {
      borderRadius: 12,
      borderRadiusLG: 14,
      borderRadiusSM: 10,
    },
    Modal: {
      borderRadiusLG: 20,
    },
    Drawer: {
      borderRadiusLG: 20,
    },
  },
}) as any);
</script>

<template>
  <div class="client-wrapper">
    <ConfigProvider :theme="clientTheme" :locale="frFR">
      <a-layout class="client-layout">
        <a-layout-content class="client-content">
          <router-view />
        </a-layout-content>
      </a-layout>
    </ConfigProvider>
  </div>
</template>

<style scoped>
.client-wrapper {
  min-height: 100dvh;
}

.client-layout {
  min-height: 100dvh;
  background: #f8fafc;
}

.client-content {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

/* Safe area support for iOS devices */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .client-layout {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>

<style>
/* Global client styles - unscoped to affect child components */

/* Touch-friendly targets */
.client-layout .ant-btn {
  min-height: 44px;
  font-weight: 500;
}

.client-layout .ant-btn-sm {
  min-height: 36px;
}

.client-layout .ant-btn-lg {
  min-height: 52px;
}

/* Input touch targets */
.client-layout .ant-input,
.client-layout .ant-select-selector,
.client-layout .ant-picker {
  min-height: 44px;
}

.client-layout .ant-input-lg,
.client-layout .ant-select-lg .ant-select-selector,
.client-layout .ant-picker-large {
  min-height: 52px;
}

/* Card mobile optimizations */
@media (max-width: 575px) {
  .client-layout .ant-card-body {
    padding: 12px;
  }

  .client-layout .ant-card-head {
    padding: 0 12px;
    min-height: 44px;
  }

  .client-layout .ant-card-head-title {
    padding: 12px 0;
  }
}

/* Modal mobile optimizations */
@media (max-width: 575px) {
  .client-layout .ant-modal {
    max-width: calc(100vw - 16px) !important;
    margin: 8px auto !important;
  }

  .client-layout .ant-modal-content {
    border-radius: 20px;
  }

  .client-layout .ant-modal-header {
    padding: 16px 16px 12px;
    border-radius: 20px 20px 0 0;
  }

  .client-layout .ant-modal-body {
    padding: 12px 16px 16px;
  }

  .client-layout .ant-modal-footer {
    padding: 12px 16px 16px;
  }
}

/* Drawer as bottom sheet on mobile */
.client-layout .ant-drawer-bottom .ant-drawer-content-wrapper {
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.client-layout .ant-drawer-bottom .ant-drawer-header {
  border-bottom: none;
  padding: 16px 16px 8px;
}

.client-layout .ant-drawer-bottom .ant-drawer-body {
  padding: 8px 16px 16px;
}

/* Form items spacing */
.client-layout .ant-form-item {
  margin-bottom: 16px;
}

/* List items touch-friendly */
.client-layout .ant-list-item {
  padding: 12px 0;
}

/* Tags/badges */
.client-layout .ant-tag {
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 500;
}

/* Rate component */
.client-layout .ant-rate {
  font-size: 18px;
}

/* Segmented control */
.client-layout .ant-segmented {
  border-radius: 12px;
  padding: 4px;
}

.client-layout .ant-segmented-item {
  border-radius: 10px;
  min-height: 36px;
}

.client-layout .ant-segmented-item-label {
  min-height: 36px;
  line-height: 36px;
  padding: 0 16px;
}

/* Empty state */
.client-layout .ant-empty-description {
  color: #64748b;
}

/* Progress bar */
.client-layout .ant-progress-inner {
  border-radius: 8px;
}

/* Spin loading */
.client-layout .ant-spin-dot-item {
  background-color: #14b8a6;
}

/* Skeleton loading */
.client-layout .ant-skeleton-content .ant-skeleton-title,
.client-layout .ant-skeleton-content .ant-skeleton-paragraph > li {
  border-radius: 8px;
}

/* Image preview */
.client-layout .ant-image-preview-img {
  border-radius: 12px;
}

/* Float button (Cart FAB) */
.client-layout .ant-float-btn {
  width: 56px;
  height: 56px;
}

.client-layout .ant-float-btn-body {
  border-radius: 50%;
}

/* InputNumber */
.client-layout .ant-input-number {
  border-radius: 12px;
}

.client-layout .ant-input-number-handler-wrap {
  border-radius: 0 12px 12px 0;
}

/* DatePicker / TimePicker */
.client-layout .ant-picker {
  border-radius: 12px;
}

/* Checkbox / Radio larger hit area */
.client-layout .ant-checkbox-wrapper,
.client-layout .ant-radio-wrapper {
  padding: 8px 0;
}

.client-layout .ant-checkbox-inner,
.client-layout .ant-radio-inner {
  width: 20px;
  height: 20px;
}

/* Collapse/Accordion */
.client-layout .ant-collapse {
  border-radius: 12px;
}

.client-layout .ant-collapse-item:first-child {
  border-radius: 12px 12px 0 0;
}

.client-layout .ant-collapse-item:last-child {
  border-radius: 0 0 12px 12px;
}

/* Tabs for mobile */
@media (max-width: 575px) {
  .client-layout .ant-tabs-nav {
    padding: 0 12px;
  }

  .client-layout .ant-tabs-tab {
    padding: 12px 8px;
  }
}

/* Alert */
.client-layout .ant-alert {
  border-radius: 12px;
}

/* Message/Notification */
.ant-message-notice-content {
  border-radius: 12px;
  padding: 12px 16px;
}

.ant-notification-notice {
  border-radius: 16px;
}
</style>
