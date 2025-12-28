import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import OrderTypeSelector from '../OrderTypeSelector.vue';

describe('OrderTypeSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders immediate and scheduled options', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
      },
    });

    expect(wrapper.text()).toContain('Maintenant');
    expect(wrapper.text()).toContain('Planifier');
    expect(wrapper.text()).toContain('Commander pour tout de suite');
    expect(wrapper.text()).toContain('Choisir une date et heure');
  });

  it('shows header question', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
      },
    });

    expect(wrapper.text()).toContain('Quand souhaitez-vous votre commande ?');
  });

  it('highlights immediate option when selected', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
      },
    });

    const buttons = wrapper.findAll('button');
    const immediateButton = buttons[0];

    expect(immediateButton.classes()).toContain('border-teal-500');
    expect(immediateButton.classes()).toContain('bg-teal-50');
  });

  it('highlights scheduled option when selected', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'scheduled',
      },
    });

    const buttons = wrapper.findAll('button');
    const scheduledButton = buttons[1];

    expect(scheduledButton.classes()).toContain('border-teal-500');
    expect(scheduledButton.classes()).toContain('bg-teal-50');
  });

  it('emits update:modelValue when immediate is clicked', async () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'scheduled',
      },
    });

    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['immediate']);
  });

  it('emits update:modelValue when scheduled is clicked', async () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
      },
    });

    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['scheduled']);
  });

  it('disables scheduled option when scheduledOrdersEnabled is false', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
        scheduledOrdersEnabled: false,
      },
    });

    const buttons = wrapper.findAll('button');
    const scheduledButton = buttons[1];

    expect(scheduledButton.attributes('disabled')).toBeDefined();
    expect(scheduledButton.classes()).toContain('opacity-60');
    expect(scheduledButton.classes()).toContain('cursor-not-allowed');
  });

  it('shows "Non disponible" when scheduled orders disabled', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
        scheduledOrdersEnabled: false,
      },
    });

    expect(wrapper.text()).toContain('Non disponible');
  });

  it('does not emit when clicking disabled scheduled button', async () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
        scheduledOrdersEnabled: false,
      },
    });

    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('shows checkmark for selected immediate option', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
      },
    });

    const buttons = wrapper.findAll('button');
    const immediateButton = buttons[0];
    const scheduledButton = buttons[1];

    // Checkmark should be in immediate button
    expect(immediateButton.find('svg').exists()).toBe(true);
    // No checkmark div in scheduled button (since it's not selected)
    const scheduledCheckmark = scheduledButton.findAll('.bg-teal-500.rounded-full');
    expect(scheduledCheckmark.length).toBe(0);
  });

  it('shows checkmark for selected scheduled option', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'scheduled',
        scheduledOrdersEnabled: true,
      },
    });

    const buttons = wrapper.findAll('button');
    const scheduledButton = buttons[1];

    // Checkmark should be present in scheduled button
    const checkmark = scheduledButton.find('.bg-teal-500');
    expect(checkmark.exists()).toBe(true);
  });

  it('defaults scheduledOrdersEnabled to true', () => {
    const wrapper = mount(OrderTypeSelector, {
      props: {
        modelValue: 'immediate',
      },
    });

    const buttons = wrapper.findAll('button');
    const scheduledButton = buttons[1];

    expect(scheduledButton.attributes('disabled')).toBeUndefined();
  });
});
