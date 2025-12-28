<script setup lang="ts">
import { computed } from 'vue';
import { Input, InputNumber, InputPassword } from 'ant-design-vue';
import {
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  UserOutlined,
  LinkOutlined,
} from '@ant-design/icons-vue';

/**
 * BaseInput - Wrapper around Ant Design Input
 * Maintains backwards compatibility with existing API
 */
const props = defineProps<{
  modelValue: string | number;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'search' | 'url';
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: string;
  maxlength?: number;
  size?: 'sm' | 'md' | 'lg';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

// Validation status for Ant Design
const validationStatus = computed(() => {
  return props.error ? 'error' : '';
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

// Map icon name to Ant Design icon component
const iconComponent = computed(() => {
  if (!props.icon) {return null;}

  const iconMap: Record<string, any> = {
    search: SearchOutlined,
    email: MailOutlined,
    mail: MailOutlined,
    phone: PhoneOutlined,
    tel: PhoneOutlined,
    lock: LockOutlined,
    password: LockOutlined,
    user: UserOutlined,
    link: LinkOutlined,
    url: LinkOutlined,
  };

  return iconMap[props.icon.toLowerCase()] || null;
});

// Auto-detect icon based on type if no icon specified
const autoIcon = computed(() => {
  if (props.icon) {return iconComponent.value;}

  switch (props.type) {
    case 'email':
      return MailOutlined;
    case 'tel':
      return PhoneOutlined;
    case 'password':
      return LockOutlined;
    case 'search':
      return SearchOutlined;
    case 'url':
      return LinkOutlined;
    default:
      return null;
  }
});

// Handle input change
const handleChange = (value: string | number | null) => {
  if (props.type === 'number') {
    emit('update:modelValue', value ?? 0);
  } else {
    emit('update:modelValue', value as string);
  }
};

// Handle regular input events
const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <div class="base-input">
    <!-- Label -->
    <label v-if="label" class="base-input__label">
      {{ label }}
      <span v-if="required" class="base-input__required">*</span>
    </label>

    <!-- Number Input -->
    <InputNumber
      v-if="type === 'number'"
      :value="modelValue as number"
      :placeholder="placeholder"
      :disabled="disabled"
      :size="antSize"
      :status="validationStatus"
      :controls="false"
      class="base-input__field base-input__field--number"
      @change="handleChange"
    />

    <!-- Password Input -->
    <InputPassword
      v-else-if="type === 'password'"
      :value="modelValue as string"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :size="antSize"
      :status="validationStatus"
      class="base-input__field"
      @input="handleInput"
    >
      <template v-if="autoIcon" #prefix>
        <component :is="autoIcon" class="base-input__icon" />
      </template>
    </InputPassword>

    <!-- Search Input -->
    <Input
      v-else-if="type === 'search'"
      :value="modelValue as string"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :size="antSize"
      :status="validationStatus"
      allow-clear
      class="base-input__field"
      @input="handleInput"
    >
      <template #prefix>
        <SearchOutlined class="base-input__icon" />
      </template>
    </Input>

    <!-- Regular Input -->
    <Input
      v-else
      :value="modelValue as string"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :size="antSize"
      :status="validationStatus"
      :type="type || 'text'"
      class="base-input__field"
      @input="handleInput"
    >
      <template v-if="autoIcon" #prefix>
        <component :is="autoIcon" class="base-input__icon" />
      </template>
    </Input>

    <!-- Error message -->
    <p v-if="error" class="base-input__error">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.base-input {
  width: 100%;
}

.base-input__label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.base-input__required {
  color: #ef4444;
  margin-left: 2px;
}

.base-input__field {
  width: 100%;
  border-radius: 12px;
}

.base-input__field--number {
  width: 100%;
}

.base-input__field :deep(.ant-input) {
  border-radius: 12px;
  min-height: 44px;
  padding: 8px 12px;
}

.base-input__field :deep(.ant-input-prefix) {
  margin-right: 8px;
}

.base-input__field :deep(.ant-input-number-input) {
  min-height: 44px;
  padding: 8px 12px;
}

/* Size variants */
.base-input__field.ant-input-sm :deep(.ant-input),
.base-input__field.ant-input-number-sm :deep(.ant-input-number-input) {
  min-height: 36px;
  padding: 4px 10px;
}

.base-input__field.ant-input-lg :deep(.ant-input),
.base-input__field.ant-input-number-lg :deep(.ant-input-number-input) {
  min-height: 52px;
  padding: 12px 16px;
  font-size: 16px;
}

.base-input__icon {
  color: #9ca3af;
  font-size: 16px;
}

.base-input__error {
  margin-top: 6px;
  font-size: 13px;
  color: #ef4444;
}

/* Focus styles */
.base-input__field:focus-within {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}

/* Error state icon color */
.base-input__field.ant-input-status-error .base-input__icon {
  color: #ef4444;
}
</style>
