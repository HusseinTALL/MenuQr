import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseButton from '../BaseButton.vue';

describe('BaseButton', () => {
  // Basic rendering tests
  describe('rendering', () => {
    it('renders slot content', () => {
      const wrapper = mount(BaseButton, {
        slots: {
          default: 'Click me',
        },
      });
      expect(wrapper.text()).toContain('Click me');
    });

    it('wraps Ant Design Button component', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.find('.ant-btn').exists()).toBe(true);
    });

    it('has base-button class', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.find('.base-button').exists()).toBe(true);
    });
  });

  // Variants tests
  describe('variants', () => {
    it('applies primary variant by default', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.find('.ant-btn-primary').exists()).toBe(true);
    });

    it('applies secondary variant (default type)', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'secondary' },
      });
      expect(wrapper.find('.ant-btn-default').exists()).toBe(true);
    });

    it('applies whatsapp variant', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'whatsapp' },
      });
      expect(wrapper.find('.base-button--whatsapp').exists()).toBe(true);
    });

    it('applies outline variant', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'outline' },
      });
      expect(wrapper.find('.base-button--outline').exists()).toBe(true);
    });

    it('applies ghost variant (text type)', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'ghost' },
      });
      expect(wrapper.find('.ant-btn-text').exists()).toBe(true);
    });

    it('applies danger variant', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'danger' },
      });
      expect(wrapper.find('.ant-btn-dangerous').exists()).toBe(true);
    });
  });

  // Size tests
  describe('sizes', () => {
    it('applies medium size by default', () => {
      const wrapper = mount(BaseButton);
      // Medium is default, no size class needed
      expect(wrapper.find('.ant-btn').exists()).toBe(true);
    });

    it('applies small size', () => {
      const wrapper = mount(BaseButton, {
        props: { size: 'sm' },
      });
      expect(wrapper.find('.ant-btn-sm').exists()).toBe(true);
    });

    it('applies large size', () => {
      const wrapper = mount(BaseButton, {
        props: { size: 'lg' },
      });
      expect(wrapper.find('.ant-btn-lg').exists()).toBe(true);
    });
  });

  // Icon button tests
  describe('icon button', () => {
    it('applies circle shape when icon prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { icon: true },
      });
      expect(wrapper.find('.ant-btn-circle').exists()).toBe(true);
    });

    it('applies icon button custom class', () => {
      const wrapper = mount(BaseButton, {
        props: { icon: true },
      });
      expect(wrapper.find('.base-button--icon').exists()).toBe(true);
    });
  });

  // Full width tests
  describe('fullWidth', () => {
    it('applies full width class when fullWidth prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { fullWidth: true },
      });
      expect(wrapper.find('.base-button--full-width').exists()).toBe(true);
    });

    it('uses block prop from Ant Design', () => {
      const wrapper = mount(BaseButton, {
        props: { fullWidth: true },
      });
      expect(wrapper.find('.ant-btn-block').exists()).toBe(true);
    });
  });

  // Disabled state tests
  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { disabled: true },
      });
      expect(wrapper.find('.ant-btn').attributes('disabled')).toBeDefined();
    });

    it('is not disabled by default', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.find('.ant-btn').attributes('disabled')).toBeUndefined();
    });
  });

  // Loading state tests
  describe('loading state', () => {
    it('shows loading state when loading prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { loading: true },
      });
      expect(wrapper.find('.ant-btn-loading').exists()).toBe(true);
    });

    it('shows loading icon when loading', () => {
      const wrapper = mount(BaseButton, {
        props: { loading: true },
      });
      expect(wrapper.find('.ant-btn-loading-icon').exists()).toBe(true);
    });
  });

  // Event tests
  describe('events', () => {
    it('emits click event when clicked', async () => {
      const wrapper = mount(BaseButton);
      await wrapper.find('.ant-btn').trigger('click');
      expect(wrapper.emitted('click')).toBeTruthy();
      expect(wrapper.emitted('click')?.length).toBe(1);
    });

    it('passes MouseEvent to click handler', async () => {
      const wrapper = mount(BaseButton);
      await wrapper.find('.ant-btn').trigger('click');
      const emitted = wrapper.emitted('click');
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toBeInstanceOf(MouseEvent);
    });
  });

  // HTML type tests
  describe('htmlType', () => {
    it('defaults to button type', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.find('.ant-btn').attributes('type')).toBe('button');
    });

    it('applies submit type', () => {
      const wrapper = mount(BaseButton, {
        props: { htmlType: 'submit' },
      });
      expect(wrapper.find('.ant-btn').attributes('type')).toBe('submit');
    });

    it('applies reset type', () => {
      const wrapper = mount(BaseButton, {
        props: { htmlType: 'reset' },
      });
      expect(wrapper.find('.ant-btn').attributes('type')).toBe('reset');
    });
  });
});
