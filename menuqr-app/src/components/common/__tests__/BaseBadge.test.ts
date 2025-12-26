import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseBadge from '../BaseBadge.vue';

describe('BaseBadge', () => {
  // Basic rendering tests
  describe('rendering', () => {
    it('renders slot content', () => {
      const wrapper = mount(BaseBadge, {
        slots: {
          default: 'New',
        },
      });
      expect(wrapper.text()).toBe('New');
    });

    it('renders as a span element', () => {
      const wrapper = mount(BaseBadge);
      expect(wrapper.element.tagName).toBe('SPAN');
    });

    it('has base badge styles', () => {
      const wrapper = mount(BaseBadge);
      expect(wrapper.classes()).toContain('inline-flex');
      expect(wrapper.classes()).toContain('items-center');
      expect(wrapper.classes()).toContain('font-medium');
    });
  });

  // Variant tests
  describe('variants', () => {
    it('applies primary variant styles by default', () => {
      const wrapper = mount(BaseBadge);
      expect(wrapper.classes()).toContain('bg-primary-100');
      expect(wrapper.classes()).toContain('text-primary-800');
    });

    it('applies success variant styles', () => {
      const wrapper = mount(BaseBadge, {
        props: { variant: 'success' },
      });
      expect(wrapper.classes()).toContain('bg-green-100');
      expect(wrapper.classes()).toContain('text-green-800');
    });

    it('applies warning variant styles', () => {
      const wrapper = mount(BaseBadge, {
        props: { variant: 'warning' },
      });
      expect(wrapper.classes()).toContain('bg-yellow-100');
      expect(wrapper.classes()).toContain('text-yellow-800');
    });

    it('applies danger variant styles', () => {
      const wrapper = mount(BaseBadge, {
        props: { variant: 'danger' },
      });
      expect(wrapper.classes()).toContain('bg-red-100');
      expect(wrapper.classes()).toContain('text-red-800');
    });

    it('applies info variant styles', () => {
      const wrapper = mount(BaseBadge, {
        props: { variant: 'info' },
      });
      expect(wrapper.classes()).toContain('bg-blue-100');
      expect(wrapper.classes()).toContain('text-blue-800');
    });

    it('applies gray variant styles', () => {
      const wrapper = mount(BaseBadge, {
        props: { variant: 'gray' },
      });
      expect(wrapper.classes()).toContain('bg-gray-100');
      expect(wrapper.classes()).toContain('text-gray-800');
    });
  });

  // Size tests
  describe('sizes', () => {
    it('applies default (md) size', () => {
      const wrapper = mount(BaseBadge);
      expect(wrapper.classes()).toContain('px-2.5');
      expect(wrapper.classes()).toContain('py-1');
      expect(wrapper.classes()).toContain('text-sm');
    });

    it('applies small size', () => {
      const wrapper = mount(BaseBadge, {
        props: { size: 'sm' },
      });
      expect(wrapper.classes()).toContain('px-2');
      expect(wrapper.classes()).toContain('py-0.5');
      expect(wrapper.classes()).toContain('text-xs');
    });

    it('applies large size', () => {
      const wrapper = mount(BaseBadge, {
        props: { size: 'lg' },
      });
      expect(wrapper.classes()).toContain('px-3');
      expect(wrapper.classes()).toContain('py-1.5');
      expect(wrapper.classes()).toContain('text-base');
    });
  });

  // Rounded tests
  describe('rounded', () => {
    it('applies rounded-md by default', () => {
      const wrapper = mount(BaseBadge);
      expect(wrapper.classes()).toContain('rounded-md');
    });

    it('applies rounded-full when rounded is true', () => {
      const wrapper = mount(BaseBadge, {
        props: { rounded: true },
      });
      expect(wrapper.classes()).toContain('rounded-full');
    });
  });

  // Dot tests
  describe('dot', () => {
    it('applies dot styles when dot is true', () => {
      const wrapper = mount(BaseBadge, {
        props: { dot: true },
      });
      expect(wrapper.classes()).toContain('w-2');
      expect(wrapper.classes()).toContain('h-2');
      expect(wrapper.classes()).toContain('p-0');
    });

    it('hides slot content when dot is true', () => {
      const wrapper = mount(BaseBadge, {
        props: { dot: true },
        slots: {
          default: 'Hidden',
        },
      });
      expect(wrapper.text()).not.toContain('Hidden');
    });

    it('shows slot content when dot is false', () => {
      const wrapper = mount(BaseBadge, {
        props: { dot: false },
        slots: {
          default: 'Visible',
        },
      });
      expect(wrapper.text()).toBe('Visible');
    });
  });

  // Combined props tests
  describe('combined props', () => {
    it('applies multiple props correctly', () => {
      const wrapper = mount(BaseBadge, {
        props: {
          variant: 'success',
          size: 'lg',
          rounded: true,
        },
      });
      expect(wrapper.classes()).toContain('bg-green-100');
      expect(wrapper.classes()).toContain('px-3');
      expect(wrapper.classes()).toContain('rounded-full');
    });
  });
});
