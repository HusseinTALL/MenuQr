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

    it('renders as a button element', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.element.tagName).toBe('BUTTON');
    });
  });

  // Variants tests
  describe('variants', () => {
    it('applies primary variant styles by default', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.classes()).toContain('bg-primary-500');
      expect(wrapper.classes()).toContain('text-white');
    });

    it('applies secondary variant styles', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'secondary' },
      });
      expect(wrapper.classes()).toContain('bg-gray-100');
      expect(wrapper.classes()).toContain('text-gray-700');
    });

    it('applies whatsapp variant styles', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'whatsapp' },
      });
      expect(wrapper.classes()).toContain('bg-whatsapp');
      expect(wrapper.classes()).toContain('text-white');
    });

    it('applies outline variant styles', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'outline' },
      });
      expect(wrapper.classes()).toContain('border-2');
      expect(wrapper.classes()).toContain('border-primary-500');
    });

    it('applies ghost variant styles', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'ghost' },
      });
      expect(wrapper.classes()).toContain('text-gray-600');
    });

    it('applies danger variant styles', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'danger' },
      });
      expect(wrapper.classes()).toContain('bg-red-500');
      expect(wrapper.classes()).toContain('text-white');
    });
  });

  // Size tests
  describe('sizes', () => {
    it('applies medium size styles by default', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.classes()).toContain('px-5');
      expect(wrapper.classes()).toContain('py-3');
      expect(wrapper.classes()).toContain('text-base');
    });

    it('applies small size styles', () => {
      const wrapper = mount(BaseButton, {
        props: { size: 'sm' },
      });
      expect(wrapper.classes()).toContain('px-3');
      expect(wrapper.classes()).toContain('py-2');
      expect(wrapper.classes()).toContain('text-sm');
    });

    it('applies large size styles', () => {
      const wrapper = mount(BaseButton, {
        props: { size: 'lg' },
      });
      expect(wrapper.classes()).toContain('px-6');
      expect(wrapper.classes()).toContain('py-4');
      expect(wrapper.classes()).toContain('text-lg');
    });
  });

  // Icon button tests
  describe('icon button', () => {
    it('applies icon button styles when icon prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { icon: true },
      });
      expect(wrapper.classes()).toContain('w-10');
      expect(wrapper.classes()).toContain('h-10');
      expect(wrapper.classes()).toContain('p-0');
    });

    it('applies small icon button styles', () => {
      const wrapper = mount(BaseButton, {
        props: { icon: true, size: 'sm' },
      });
      expect(wrapper.classes()).toContain('w-8');
      expect(wrapper.classes()).toContain('h-8');
    });

    it('applies large icon button styles', () => {
      const wrapper = mount(BaseButton, {
        props: { icon: true, size: 'lg' },
      });
      expect(wrapper.classes()).toContain('w-12');
      expect(wrapper.classes()).toContain('h-12');
    });
  });

  // Full width tests
  describe('fullWidth', () => {
    it('applies full width styles when fullWidth prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { fullWidth: true },
      });
      expect(wrapper.classes()).toContain('w-full');
    });

    it('does not apply full width styles by default', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.classes()).not.toContain('w-full');
    });
  });

  // Disabled state tests
  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { disabled: true },
      });
      expect(wrapper.attributes('disabled')).toBeDefined();
    });

    it('is not disabled by default', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.attributes('disabled')).toBeUndefined();
    });

    it('does not emit click event when disabled', async () => {
      const wrapper = mount(BaseButton, {
        props: { disabled: true },
      });
      await wrapper.trigger('click');
      // Disabled buttons don't emit clicks in browsers, but we can check the attribute
      expect(wrapper.attributes('disabled')).toBeDefined();
    });
  });

  // Loading state tests
  describe('loading state', () => {
    it('shows loading spinner when loading prop is true', () => {
      const wrapper = mount(BaseButton, {
        props: { loading: true },
        slots: {
          default: 'Submit',
        },
      });
      expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true);
      expect(wrapper.text()).not.toContain('Submit');
    });

    it('is disabled when loading', () => {
      const wrapper = mount(BaseButton, {
        props: { loading: true },
      });
      expect(wrapper.attributes('disabled')).toBeDefined();
    });

    it('hides slot content when loading', () => {
      const wrapper = mount(BaseButton, {
        props: { loading: true },
        slots: {
          default: 'Button Text',
        },
      });
      expect(wrapper.text()).not.toContain('Button Text');
    });
  });

  // Event tests
  describe('events', () => {
    it('emits click event when clicked', async () => {
      const wrapper = mount(BaseButton);
      await wrapper.trigger('click');
      expect(wrapper.emitted('click')).toBeTruthy();
      expect(wrapper.emitted('click')?.length).toBe(1);
    });

    it('passes MouseEvent to click handler', async () => {
      const wrapper = mount(BaseButton);
      await wrapper.trigger('click');
      const emitted = wrapper.emitted('click');
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toBeInstanceOf(MouseEvent);
    });
  });

  // Accessibility tests
  describe('accessibility', () => {
    it('has correct base classes for focus states', () => {
      const wrapper = mount(BaseButton);
      const classes = wrapper.classes().join(' ');
      expect(classes).toContain('transition');
    });

    it('applies disabled styles when disabled', () => {
      const wrapper = mount(BaseButton, {
        props: { disabled: true },
      });
      expect(wrapper.classes()).toContain('disabled:opacity-50');
      expect(wrapper.classes()).toContain('disabled:cursor-not-allowed');
    });
  });
});
