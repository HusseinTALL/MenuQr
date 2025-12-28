import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import FulfillmentTypeSelector from '../FulfillmentTypeSelector.vue';

describe('FulfillmentTypeSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders header question', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
      },
    });

    expect(wrapper.text()).toContain('Comment souhaitez-vous recevoir votre commande ?');
  });

  it('renders pickup and delivery options when both enabled', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
        pickupEnabled: true,
        deliveryEnabled: true,
      },
    });

    expect(wrapper.text()).toContain('À emporter');
    expect(wrapper.text()).toContain('Livraison');
    expect(wrapper.text()).toContain('Venez récupérer votre commande au restaurant');
    expect(wrapper.text()).toContain('Nous livrons à votre adresse');
  });

  it('highlights pickup option when selected', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
      },
    });

    const buttons = wrapper.findAll('button');
    const pickupButton = buttons[0];

    expect(pickupButton.classes()).toContain('border-teal-500');
    expect(pickupButton.classes()).toContain('bg-teal-50');
  });

  it('highlights delivery option when selected', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'delivery',
      },
    });

    const buttons = wrapper.findAll('button');
    const deliveryButton = buttons[1];

    expect(deliveryButton.classes()).toContain('border-teal-500');
    expect(deliveryButton.classes()).toContain('bg-teal-50');
  });

  it('emits update:modelValue when pickup is clicked', async () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'delivery',
      },
    });

    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['pickup']);
  });

  it('emits update:modelValue when delivery is clicked', async () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
      },
    });

    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['delivery']);
  });

  it('only shows pickup when delivery disabled', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
        pickupEnabled: true,
        deliveryEnabled: false,
      },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(1);
    expect(wrapper.text()).toContain('À emporter');
    expect(wrapper.text()).not.toContain('Livraison');
  });

  it('only shows delivery when pickup disabled', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'delivery',
        pickupEnabled: false,
        deliveryEnabled: true,
      },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(1);
    expect(wrapper.text()).toContain('Livraison');
    expect(wrapper.text()).not.toContain('À emporter');
  });

  it('shows warning when no options available', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
        pickupEnabled: false,
        deliveryEnabled: false,
      },
    });

    expect(wrapper.text()).toContain('Les commandes planifiées ne sont pas disponibles actuellement');
    expect(wrapper.findAll('button').length).toBe(0);
  });

  it('uses 2-column grid when both options enabled', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
        pickupEnabled: true,
        deliveryEnabled: true,
      },
    });

    const grid = wrapper.find('.grid');
    expect(grid.classes()).toContain('grid-cols-2');
  });

  it('uses 1-column grid when only one option enabled', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
        pickupEnabled: true,
        deliveryEnabled: false,
      },
    });

    const grid = wrapper.find('.grid');
    expect(grid.classes()).toContain('grid-cols-1');
  });

  it('shows checkmark for selected option', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
      },
    });

    const buttons = wrapper.findAll('button');
    const pickupButton = buttons[0];

    const checkmark = pickupButton.find('.bg-teal-500');
    expect(checkmark.exists()).toBe(true);
  });

  it('defaults both options to enabled', () => {
    const wrapper = mount(FulfillmentTypeSelector, {
      props: {
        modelValue: 'pickup',
      },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(2);
  });
});
