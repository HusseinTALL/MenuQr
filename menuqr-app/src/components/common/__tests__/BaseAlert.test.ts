import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseAlert from '../BaseAlert.vue';

describe('BaseAlert', () => {
  // Basic rendering tests
  describe('rendering', () => {
    it('renders slot content', () => {
      const wrapper = mount(BaseAlert, {
        slots: {
          default: 'Alert message',
        },
      });
      expect(wrapper.text()).toContain('Alert message');
    });

    it('wraps Ant Design Alert component', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.find('.ant-alert').exists()).toBe(true);
    });

    it('has base-alert class', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.find('.base-alert').exists()).toBe(true);
    });
  });

  // Variant tests
  describe('variants', () => {
    it('applies info variant by default', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.find('.ant-alert-info').exists()).toBe(true);
    });

    it('applies info variant explicitly', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'info' },
      });
      expect(wrapper.find('.ant-alert-info').exists()).toBe(true);
    });

    it('applies success variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'success' },
      });
      expect(wrapper.find('.ant-alert-success').exists()).toBe(true);
    });

    it('applies warning variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'warning' },
      });
      expect(wrapper.find('.ant-alert-warning').exists()).toBe(true);
    });

    it('applies error variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'error' },
      });
      expect(wrapper.find('.ant-alert-error').exists()).toBe(true);
    });
  });

  // Title tests
  describe('title', () => {
    it('renders title when provided', () => {
      const wrapper = mount(BaseAlert, {
        props: { title: 'Alert Title' },
      });
      expect(wrapper.text()).toContain('Alert Title');
    });

    it('shows title in message slot', () => {
      const wrapper = mount(BaseAlert, {
        props: { title: 'Alert Title' },
      });
      expect(wrapper.find('.ant-alert-message').text()).toContain('Alert Title');
    });
  });

  // Icon tests
  describe('icon', () => {
    it('shows icon by default', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.find('.ant-alert-icon').exists()).toBe(true);
    });

    it('renders info icon for info variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'info' },
      });
      const icon = wrapper.find('.ant-alert-icon');
      expect(icon.exists()).toBe(true);
    });

    it('renders success icon for success variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'success' },
      });
      const icon = wrapper.find('.ant-alert-icon');
      expect(icon.exists()).toBe(true);
    });

    it('renders warning icon for warning variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'warning' },
      });
      const icon = wrapper.find('.ant-alert-icon');
      expect(icon.exists()).toBe(true);
    });

    it('renders error icon for error variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'error' },
      });
      const icon = wrapper.find('.ant-alert-icon');
      expect(icon.exists()).toBe(true);
    });
  });

  // Dismissible tests
  describe('dismissible', () => {
    it('does not show close button by default', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.find('.ant-alert-close-icon').exists()).toBe(false);
    });

    it('shows close button when dismissible is true', () => {
      const wrapper = mount(BaseAlert, {
        props: { dismissible: true },
      });
      expect(wrapper.find('.ant-alert-close-icon').exists()).toBe(true);
    });

    it('emits dismiss event when close button is clicked', async () => {
      const wrapper = mount(BaseAlert, {
        props: { dismissible: true },
      });
      await wrapper.find('.ant-alert-close-icon').trigger('click');
      expect(wrapper.emitted('dismiss')).toBeTruthy();
    });
  });

  // Description slot tests
  describe('description slot', () => {
    it('renders content in description slot', () => {
      const wrapper = mount(BaseAlert, {
        slots: {
          default: 'Alert description content',
        },
      });
      expect(wrapper.find('.ant-alert-description').text()).toContain('Alert description content');
    });
  });
});
