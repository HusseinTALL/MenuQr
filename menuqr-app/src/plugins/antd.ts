/**
 * Ant Design Vue Configuration
 * Used only for Admin Panel components
 */
import type { App } from 'vue';
import {
  // Layout
  Layout,
  Menu,
  Breadcrumb,
  Row,
  Col,

  // Data Display
  Table,
  Card,
  Statistic,
  Tag,
  Badge,
  Descriptions,
  Empty,
  Timeline,
  Avatar,
  Image,
  Collapse,
  Tabs,
  Segmented,
  List,

  // Data Entry
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Switch,
  Checkbox,
  Radio,
  Upload,
  Rate,
  Slider,

  // Feedback
  Modal,
  Drawer,
  Popconfirm,
  Progress,
  Spin,
  Alert,
  Result,

  // Navigation
  Dropdown,
  Pagination,
  Steps,

  // General
  Button,
  Typography,
  Divider,
  Space,
  Tooltip,
  Popover,
  ConfigProvider,
} from 'ant-design-vue';

// Message and notification are standalone APIs, not components
import { message, notification } from 'ant-design-vue';

import frFR from 'ant-design-vue/es/locale/fr_FR';

// MenuQR Theme Configuration
export const menuQRTheme = {
  token: {
    // Primary colors (teal)
    colorPrimary: '#14b8a6',
    colorPrimaryBg: '#f0fdfa',
    colorPrimaryBgHover: '#ccfbf1',
    colorPrimaryBorder: '#5eead4',
    colorPrimaryBorderHover: '#2dd4bf',
    colorPrimaryHover: '#0d9488',
    colorPrimaryActive: '#0f766e',
    colorPrimaryTextHover: '#0d9488',
    colorPrimaryText: '#14b8a6',
    colorPrimaryTextActive: '#0f766e',

    // Semantic colors
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',

    // Layout
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // Typography
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,

    // Shadows
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  components: {
    Layout: {
      siderBg: '#111827',
      headerBg: '#ffffff',
      bodyBg: '#f3f4f6',
    },
    Menu: {
      darkItemBg: '#111827',
      darkItemSelectedBg: '#1f2937',
      darkItemHoverBg: '#1f2937',
    },
    Table: {
      headerBg: '#f9fafb',
      rowHoverBg: '#f0fdfa',
    },
    Card: {
      headerBg: '#ffffff',
    },
  },
};

// Components to register
const components = [
  Layout,
  Menu,
  Breadcrumb,
  Row,
  Col,
  Table,
  Card,
  Statistic,
  Tag,
  Badge,
  Descriptions,
  Empty,
  Timeline,
  Avatar,
  Image,
  Collapse,
  Tabs,
  Segmented,
  List,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Switch,
  Checkbox,
  Radio,
  Upload,
  Rate,
  Slider,
  Modal,
  Drawer,
  Popconfirm,
  Progress,
  Spin,
  Alert,
  Result,
  Dropdown,
  Pagination,
  Steps,
  Button,
  Typography,
  Divider,
  Space,
  Tooltip,
  Popover,
  ConfigProvider,
];

export function setupAntd(app: App) {
  // Register components
  components.forEach((component) => {
    app.use(component);
  });

  // Configure message and notification defaults
  message.config({
    top: '80px',
    duration: 3,
    maxCount: 3,
  });

  notification.config({
    placement: 'topRight',
    duration: 4,
  });
}

// Export utilities for use in components
export { message, notification };
export { frFR as antdLocale };
export default setupAntd;
