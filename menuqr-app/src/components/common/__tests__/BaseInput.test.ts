import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseInput from '../BaseInput.vue';

describe('BaseInput', () => {
  // Basic rendering tests
  describe('rendering', () => {
    it('renders input element', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('input').exists()).toBe(true);
    });

    it('wraps Ant Design Input component', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('.ant-input').exists()).toBe(true);
    });

    it('has base-input class on wrapper', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('.base-input').exists()).toBe(true);
    });

    it('renders label when provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', label: 'Email' },
      });
      expect(wrapper.find('.base-input__label').text()).toContain('Email');
    });

    it('does not render label when not provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('.base-input__label').exists()).toBe(false);
    });

    it('shows required indicator when required', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', label: 'Name', required: true },
      });
      expect(wrapper.find('.base-input__required').exists()).toBe(true);
      expect(wrapper.find('.base-input__required').text()).toBe('*');
    });
  });

  // Model value tests
  describe('v-model', () => {
    it('displays the modelValue', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: 'test value' },
      });
      expect(wrapper.find('input').element.value).toBe('test value');
    });

    it('emits update:modelValue on input', async () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      await wrapper.find('input').setValue('new value');
      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    });

    it('uses InputNumber for number type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: 0, type: 'number' },
      });
      expect(wrapper.find('.ant-input-number').exists()).toBe(true);
    });
  });

  // Input type tests
  describe('input types', () => {
    it('defaults to text type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('input').attributes('type')).toBe('text');
    });

    it('applies email type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'email' },
      });
      expect(wrapper.find('input').attributes('type')).toBe('email');
    });

    it('uses InputPassword for password type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'password' },
      });
      expect(wrapper.find('.ant-input-password').exists()).toBe(true);
    });

    it('applies tel type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'tel' },
      });
      expect(wrapper.find('input').attributes('type')).toBe('tel');
    });

    it('applies search type with allow-clear', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'search' },
      });
      expect(wrapper.find('.ant-input-affix-wrapper').exists()).toBe(true);
    });
  });

  // Placeholder tests
  describe('placeholder', () => {
    it('displays placeholder text', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', placeholder: 'Enter email' },
      });
      expect(wrapper.find('input').attributes('placeholder')).toBe('Enter email');
    });
  });

  // Disabled state tests
  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', disabled: true },
      });
      expect(wrapper.find('input').attributes('disabled')).toBeDefined();
    });

    it('applies disabled class from Ant Design', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', disabled: true },
      });
      expect(wrapper.find('.ant-input-disabled').exists()).toBe(true);
    });
  });

  // Error state tests
  describe('error state', () => {
    it('displays error message when error prop is provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', error: 'This field is required' },
      });
      expect(wrapper.find('.base-input__error').text()).toBe('This field is required');
    });

    it('applies error status from Ant Design', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', error: 'Error message' },
      });
      expect(wrapper.find('.ant-input-status-error').exists()).toBe(true);
    });

    it('does not show error message when no error', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('.base-input__error').exists()).toBe(false);
    });
  });

  // Icon tests
  describe('icon', () => {
    it('renders icon prefix when icon prop is provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', icon: 'search' },
      });
      expect(wrapper.find('.ant-input-prefix').exists()).toBe(true);
    });

    it('auto-detects icon from type (email)', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'email' },
      });
      expect(wrapper.find('.ant-input-prefix').exists()).toBe(true);
    });

    it('auto-detects icon from type (search)', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'search' },
      });
      expect(wrapper.find('.ant-input-prefix').exists()).toBe(true);
    });
  });

  // Maxlength tests
  describe('maxlength', () => {
    it('applies maxlength attribute', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', maxlength: 50 },
      });
      expect(wrapper.find('input').attributes('maxlength')).toBe('50');
    });
  });

  // Size tests
  describe('size', () => {
    it('applies small size', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', size: 'sm' },
      });
      expect(wrapper.find('.ant-input-sm').exists()).toBe(true);
    });

    it('applies large size', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', size: 'lg' },
      });
      expect(wrapper.find('.ant-input-lg').exists()).toBe(true);
    });
  });
});
