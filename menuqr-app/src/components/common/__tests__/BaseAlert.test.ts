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

    it('has role="alert" for accessibility', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.attributes('role')).toBe('alert');
    });

    it('has base alert styles', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.classes()).toContain('flex');
      expect(wrapper.classes()).toContain('rounded-lg');
      expect(wrapper.classes()).toContain('border');
    });
  });

  // Variant tests
  describe('variants', () => {
    it('applies info variant styles by default', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.classes()).toContain('bg-blue-50');
      expect(wrapper.classes()).toContain('border-blue-200');
    });

    it('applies info variant styles explicitly', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'info' },
      });
      expect(wrapper.classes()).toContain('bg-blue-50');
      expect(wrapper.classes()).toContain('border-blue-200');
    });

    it('applies success variant styles', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'success' },
      });
      expect(wrapper.classes()).toContain('bg-green-50');
      expect(wrapper.classes()).toContain('border-green-200');
    });

    it('applies warning variant styles', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'warning' },
      });
      expect(wrapper.classes()).toContain('bg-yellow-50');
      expect(wrapper.classes()).toContain('border-yellow-200');
    });

    it('applies error variant styles', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'error' },
      });
      expect(wrapper.classes()).toContain('bg-red-50');
      expect(wrapper.classes()).toContain('border-red-200');
    });
  });

  // Title tests
  describe('title', () => {
    it('renders title when provided', () => {
      const wrapper = mount(BaseAlert, {
        props: { title: 'Alert Title' },
      });
      expect(wrapper.find('h3').text()).toBe('Alert Title');
    });

    it('does not render title when not provided', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.find('h3').exists()).toBe(false);
    });

    it('applies correct title color for each variant', () => {
      const variants = ['info', 'success', 'warning', 'error'] as const;
      const colors = ['text-blue-900', 'text-green-900', 'text-yellow-900', 'text-red-900'];

      variants.forEach((variant, index) => {
        const wrapper = mount(BaseAlert, {
          props: { variant, title: 'Test' },
        });
        expect(wrapper.find('h3').classes()).toContain(colors[index]);
      });
    });
  });

  // Icon tests
  describe('icon', () => {
    it('renders icon component', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.findComponent({ name: 'BaseIcon' }).exists()).toBe(true);
    });

    it('renders info icon by default', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.findComponent({ name: 'BaseIcon' }).props('name')).toBe('info');
    });

    it('renders check icon for success variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'success' },
      });
      expect(wrapper.findComponent({ name: 'BaseIcon' }).props('name')).toBe('check');
    });

    it('renders warning icon for warning variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'warning' },
      });
      expect(wrapper.findComponent({ name: 'BaseIcon' }).props('name')).toBe('warning');
    });

    it('renders error icon for error variant', () => {
      const wrapper = mount(BaseAlert, {
        props: { variant: 'error' },
      });
      expect(wrapper.findComponent({ name: 'BaseIcon' }).props('name')).toBe('error');
    });
  });

  // Dismissible tests
  describe('dismissible', () => {
    it('does not show dismiss button by default', () => {
      const wrapper = mount(BaseAlert);
      expect(wrapper.find('button').exists()).toBe(false);
    });

    it('shows dismiss button when dismissible is true', () => {
      const wrapper = mount(BaseAlert, {
        props: { dismissible: true },
      });
      expect(wrapper.find('button').exists()).toBe(true);
    });

    it('emits dismiss event when dismiss button is clicked', async () => {
      const wrapper = mount(BaseAlert, {
        props: { dismissible: true },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.emitted('dismiss')).toBeTruthy();
      expect(wrapper.emitted('dismiss')?.length).toBe(1);
    });

    it('dismiss button has correct color for each variant', () => {
      const variants = ['info', 'success', 'warning', 'error'] as const;
      const colors = ['text-blue-600', 'text-green-600', 'text-yellow-600', 'text-red-600'];

      variants.forEach((variant, index) => {
        const wrapper = mount(BaseAlert, {
          props: { variant, dismissible: true },
        });
        expect(wrapper.find('button').classes()).toContain(colors[index]);
      });
    });
  });

  // Content color tests
  describe('content colors', () => {
    it('applies correct text color for each variant', () => {
      const variants = ['info', 'success', 'warning', 'error'] as const;
      const colors = ['text-blue-800', 'text-green-800', 'text-yellow-800', 'text-red-800'];

      variants.forEach((variant, index) => {
        const wrapper = mount(BaseAlert, {
          props: { variant },
          slots: { default: 'Content' },
        });
        const content = wrapper.find('.text-sm');
        expect(content.classes()).toContain(colors[index]);
      });
    });
  });
});
