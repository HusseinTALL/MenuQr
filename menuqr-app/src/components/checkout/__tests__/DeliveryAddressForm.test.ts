import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import DeliveryAddressForm from '../DeliveryAddressForm.vue';

describe('DeliveryAddressForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.find('#street').exists()).toBe(true);
    expect(wrapper.find('#apartment').exists()).toBe(true);
    expect(wrapper.find('#city').exists()).toBe(true);
    expect(wrapper.find('#postalCode').exists()).toBe(true);
    expect(wrapper.find('#instructions').exists()).toBe(true);
  });

  it('renders header', () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.text()).toContain('Adresse de livraison');
  });

  it('shows required indicators for street and city', () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    const labels = wrapper.findAll('label');
    const streetLabel = labels.find(l => l.text().includes('Adresse'));
    const cityLabel = labels.find(l => l.text().includes('Ville'));

    expect(streetLabel?.text()).toContain('*');
    expect(cityLabel?.text()).toContain('*');
  });

  it('populates fields from modelValue', () => {
    const address = {
      street: '123 Main Street',
      city: 'Paris',
      postalCode: '75001',
      apartment: 'Apt 4B',
      instructions: 'Ring doorbell',
    };

    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: address,
      },
    });

    expect((wrapper.find('#street').element as HTMLInputElement).value).toBe('123 Main Street');
    expect((wrapper.find('#city').element as HTMLInputElement).value).toBe('Paris');
    expect((wrapper.find('#postalCode').element as HTMLInputElement).value).toBe('75001');
    expect((wrapper.find('#apartment').element as HTMLInputElement).value).toBe('Apt 4B');
    expect((wrapper.find('#instructions').element as HTMLTextAreaElement).value).toBe('Ring doorbell');
  });

  it('emits update:modelValue when street is entered', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    await wrapper.find('#street').setValue('123 Main St');
    await wrapper.find('#city').setValue('Paris');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    const emitted = wrapper.emitted('update:modelValue');
    const lastEmit = emitted![emitted!.length - 1][0];
    expect(lastEmit).toEqual(expect.objectContaining({
      street: '123 Main St',
      city: 'Paris',
    }));
  });

  it('emits null when form is invalid (no street)', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: { street: '123 Main St', city: 'Paris' },
      },
    });

    await wrapper.find('#street').setValue('');

    const emitted = wrapper.emitted('update:modelValue');
    const lastEmit = emitted![emitted!.length - 1][0];
    expect(lastEmit).toBeNull();
  });

  it('emits null when form is invalid (no city)', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: { street: '123 Main St', city: 'Paris' },
      },
    });

    await wrapper.find('#city').setValue('');

    const emitted = wrapper.emitted('update:modelValue');
    const lastEmit = emitted![emitted!.length - 1][0];
    expect(lastEmit).toBeNull();
  });

  it('shows validation hint when partially filled', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    await wrapper.find('#street').setValue('123 Main St');
    // City is empty, so validation should show

    expect(wrapper.text()).toContain("Veuillez renseigner l'adresse et la ville");
  });

  it('hides validation hint when fully valid', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    await wrapper.find('#street').setValue('123 Main St');
    await wrapper.find('#city').setValue('Paris');

    expect(wrapper.text()).not.toContain("Veuillez renseigner l'adresse et la ville");
  });

  it('includes optional fields in emitted value', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    await wrapper.find('#street').setValue('123 Main St');
    await wrapper.find('#city').setValue('Paris');
    await wrapper.find('#postalCode').setValue('75001');
    await wrapper.find('#apartment').setValue('Apt 4B');
    await wrapper.find('#instructions').setValue('Ring doorbell');

    const emitted = wrapper.emitted('update:modelValue');
    const lastEmit = emitted![emitted!.length - 1][0];

    expect(lastEmit).toEqual(expect.objectContaining({
      street: '123 Main St',
      city: 'Paris',
      postalCode: '75001',
      apartment: 'Apt 4B',
      instructions: 'Ring doorbell',
    }));
  });

  it('trims whitespace from values', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    await wrapper.find('#street').setValue('  123 Main St  ');
    await wrapper.find('#city').setValue('  Paris  ');

    const emitted = wrapper.emitted('update:modelValue');
    const lastEmit = emitted![emitted!.length - 1][0];

    expect(lastEmit.street).toBe('123 Main St');
    expect(lastEmit.city).toBe('Paris');
  });

  it('disables inputs when loading', () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
        loading: true,
      },
    });

    expect(wrapper.find('#street').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#city').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#postalCode').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#apartment').attributes('disabled')).toBeDefined();
    expect(wrapper.find('#instructions').attributes('disabled')).toBeDefined();
  });

  it('shows geolocation button', () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: null,
      },
    });

    const button = wrapper.find('button');
    expect(button.exists()).toBe(true);
    expect(button.text()).toContain('Utiliser ma position');
  });

  it('shows "Position enregistrée" when coordinates exist', () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: {
          street: '123 Main St',
          city: 'Paris',
          coordinates: { latitude: 48.8566, longitude: 2.3522 },
        },
      },
    });

    expect(wrapper.text()).toContain('Position enregistrée');
  });

  describe('geolocation', () => {
    it('shows error when geolocation not supported', async () => {
      // Mock navigator.geolocation as undefined
      const originalGeolocation = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
      });

      const wrapper = mount(DeliveryAddressForm, {
        props: {
          modelValue: null,
        },
      });

      await wrapper.find('button').trigger('click');

      expect(wrapper.text()).toContain("La géolocalisation n'est pas supportée par votre navigateur");

      // Restore
      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
      });
    });

    it('shows loading state during geolocation', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, _error) => {
          // Don't resolve - keep it pending
        }),
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      });

      const wrapper = mount(DeliveryAddressForm, {
        props: {
          modelValue: null,
        },
      });

      await wrapper.find('button').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('Localisation...');
    });

    it('updates address with coordinates on successful geolocation', async () => {
      const mockPosition = {
        coords: {
          latitude: 48.8566,
          longitude: 2.3522,
        },
      };

      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success(mockPosition);
        }),
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      });

      const wrapper = mount(DeliveryAddressForm, {
        props: {
          modelValue: { street: '123 Main St', city: 'Paris' },
        },
      });

      await wrapper.find('button').trigger('click');
      await flushPromises();

      const emitted = wrapper.emitted('update:modelValue');
      const lastEmit = emitted![emitted!.length - 1][0];

      expect(lastEmit.coordinates).toEqual({
        latitude: 48.8566,
        longitude: 2.3522,
      });
    });

    it('shows permission denied error', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 1, PERMISSION_DENIED: 1 });
        }),
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      });

      const wrapper = mount(DeliveryAddressForm, {
        props: {
          modelValue: null,
        },
      });

      await wrapper.find('button').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('Accès à la localisation refusé');
    });

    it('shows position unavailable error', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 2, POSITION_UNAVAILABLE: 2 });
        }),
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      });

      const wrapper = mount(DeliveryAddressForm, {
        props: {
          modelValue: null,
        },
      });

      await wrapper.find('button').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('Position non disponible');
    });

    it('shows timeout error', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 3, TIMEOUT: 3 });
        }),
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      });

      const wrapper = mount(DeliveryAddressForm, {
        props: {
          modelValue: null,
        },
      });

      await wrapper.find('button').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('Délai de localisation dépassé');
    });
  });

  it('syncs with modelValue changes', async () => {
    const wrapper = mount(DeliveryAddressForm, {
      props: {
        modelValue: { street: 'Old Street', city: 'Old City' },
      },
    });

    expect((wrapper.find('#street').element as HTMLInputElement).value).toBe('Old Street');

    await wrapper.setProps({
      modelValue: { street: 'New Street', city: 'New City' },
    });

    expect((wrapper.find('#street').element as HTMLInputElement).value).toBe('New Street');
    expect((wrapper.find('#city').element as HTMLInputElement).value).toBe('New City');
  });
});
