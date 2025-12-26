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

    it('renders label when provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', label: 'Email' },
      });
      expect(wrapper.find('label').text()).toContain('Email');
    });

    it('does not render label when not provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('label').exists()).toBe(false);
    });

    it('shows required indicator when required', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', label: 'Name', required: true },
      });
      expect(wrapper.find('label').text()).toContain('*');
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
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['new value']);
    });

    it('emits number for number type', async () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: 0, type: 'number' },
      });
      const input = wrapper.find('input');
      await input.setValue('42');
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([42]);
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

    it('applies password type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'password' },
      });
      expect(wrapper.find('input').attributes('type')).toBe('password');
    });

    it('applies tel type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'tel' },
      });
      expect(wrapper.find('input').attributes('type')).toBe('tel');
    });

    it('applies search type', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', type: 'search' },
      });
      expect(wrapper.find('input').attributes('type')).toBe('search');
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

    it('applies disabled styles', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', disabled: true },
      });
      expect(wrapper.find('input').classes()).toContain('disabled:bg-gray-100');
    });
  });

  // Error state tests
  describe('error state', () => {
    it('displays error message when error prop is provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', error: 'This field is required' },
      });
      expect(wrapper.find('p').text()).toBe('This field is required');
    });

    it('applies error border styles', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', error: 'Error message' },
      });
      expect(wrapper.find('input').classes()).toContain('border-red-500');
    });

    it('does not show error message when no error', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      expect(wrapper.find('p').exists()).toBe(false);
    });
  });

  // Icon tests
  describe('icon', () => {
    it('renders icon container when icon prop is provided', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', icon: 'search' },
      });
      expect(wrapper.findComponent({ name: 'BaseIcon' }).exists()).toBe(true);
    });

    it('applies left padding when icon is present', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', icon: 'search' },
      });
      expect(wrapper.find('input').classes()).toContain('pl-10');
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

  // Required tests
  describe('required', () => {
    it('applies required attribute', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '', required: true },
      });
      expect(wrapper.find('input').attributes('required')).toBeDefined();
    });
  });

  // Accessibility tests
  describe('accessibility', () => {
    it('has focus ring styles', () => {
      const wrapper = mount(BaseInput, {
        props: { modelValue: '' },
      });
      const classes = wrapper.find('input').classes().join(' ');
      expect(classes).toContain('focus:ring-2');
    });
  });
});
