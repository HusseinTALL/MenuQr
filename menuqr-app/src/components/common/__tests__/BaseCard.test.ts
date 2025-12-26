import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseCard from '../BaseCard.vue';

describe('BaseCard', () => {
  // Basic rendering tests
  describe('rendering', () => {
    it('renders slot content', () => {
      const wrapper = mount(BaseCard, {
        slots: {
          default: '<p>Card content</p>',
        },
      });
      expect(wrapper.text()).toContain('Card content');
    });

    it('renders as a div element', () => {
      const wrapper = mount(BaseCard);
      expect(wrapper.element.tagName).toBe('DIV');
    });

    it('has base card styles', () => {
      const wrapper = mount(BaseCard);
      expect(wrapper.classes()).toContain('bg-white');
      expect(wrapper.classes()).toContain('rounded-lg');
      expect(wrapper.classes()).toContain('border');
    });
  });

  // Padding tests
  describe('padding', () => {
    it('applies default (md) padding', () => {
      const wrapper = mount(BaseCard);
      expect(wrapper.classes()).toContain('p-4');
    });

    it('applies no padding when padding="none"', () => {
      const wrapper = mount(BaseCard, {
        props: { padding: 'none' },
      });
      expect(wrapper.classes()).toContain('p-0');
    });

    it('applies small padding when padding="sm"', () => {
      const wrapper = mount(BaseCard, {
        props: { padding: 'sm' },
      });
      expect(wrapper.classes()).toContain('p-3');
    });

    it('applies large padding when padding="lg"', () => {
      const wrapper = mount(BaseCard, {
        props: { padding: 'lg' },
      });
      expect(wrapper.classes()).toContain('p-6');
    });
  });

  // Shadow tests
  describe('shadow', () => {
    it('applies default (sm) shadow', () => {
      const wrapper = mount(BaseCard);
      expect(wrapper.classes()).toContain('shadow-sm');
    });

    it('applies no shadow when shadow="none"', () => {
      const wrapper = mount(BaseCard, {
        props: { shadow: 'none' },
      });
      expect(wrapper.classes()).toContain('shadow-none');
    });

    it('applies medium shadow when shadow="md"', () => {
      const wrapper = mount(BaseCard, {
        props: { shadow: 'md' },
      });
      expect(wrapper.classes()).toContain('shadow-md');
    });

    it('applies large shadow when shadow="lg"', () => {
      const wrapper = mount(BaseCard, {
        props: { shadow: 'lg' },
      });
      expect(wrapper.classes()).toContain('shadow-lg');
    });
  });

  // Hover tests
  describe('hover', () => {
    it('applies hover styles when hover prop is true', () => {
      const wrapper = mount(BaseCard, {
        props: { hover: true },
      });
      expect(wrapper.classes()).toContain('hover:shadow-lg');
      expect(wrapper.classes()).toContain('cursor-pointer');
    });

    it('does not apply hover styles by default', () => {
      const wrapper = mount(BaseCard);
      expect(wrapper.classes()).not.toContain('hover:shadow-lg');
      expect(wrapper.classes()).not.toContain('cursor-pointer');
    });
  });

  // Combined props tests
  describe('combined props', () => {
    it('applies multiple props correctly', () => {
      const wrapper = mount(BaseCard, {
        props: {
          padding: 'lg',
          shadow: 'md',
          hover: true,
        },
      });
      expect(wrapper.classes()).toContain('p-6');
      expect(wrapper.classes()).toContain('shadow-md');
      expect(wrapper.classes()).toContain('hover:shadow-lg');
    });
  });

  // Transition tests
  describe('transitions', () => {
    it('has transition class for shadow changes', () => {
      const wrapper = mount(BaseCard);
      expect(wrapper.classes()).toContain('transition-shadow');
    });
  });
});
