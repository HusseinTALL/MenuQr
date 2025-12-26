import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWhatsApp } from '../useWhatsApp';
import { useCartStore } from '@/stores/cartStore';
import { useMenuStore } from '@/stores/menuStore';
import { useConfigStore } from '@/stores/configStore';
import type { Dish, Restaurant } from '@/types';

const mockDish: Dish = {
  id: 'dish-1',
  categoryId: 'cat-1',
  name: { fr: 'Poulet Braisé', en: 'Grilled Chicken' },
  description: { fr: 'Délicieux poulet', en: 'Delicious chicken' },
  price: 2500,
  image: 'chicken.jpg',
  isAvailable: true,
  isPopular: true,
  isNew: false,
  isVegetarian: false,
  isSpicy: false,
  order: 1,
  estimatedTime: 15,
};

const mockRestaurant: Restaurant = {
  id: 'resto-1',
  name: 'Maquis du Bonheur',
  slug: 'maquis-bonheur',
  description: { fr: 'Restaurant africain', en: 'African restaurant' },
  logo: 'logo.png',
  coverImage: 'cover.jpg',
  currency: 'XOF',
  phone: '+225 07 00 00 00 00',
  whatsappNumber: '+22507000000',
  address: { fr: "Abidjan, Côte d'Ivoire", en: 'Abidjan, Ivory Coast' },
  openingHours: {
    monday: { open: '08:00', close: '22:00', isClosed: false },
    tuesday: { open: '08:00', close: '22:00', isClosed: false },
    wednesday: { open: '08:00', close: '22:00', isClosed: false },
    thursday: { open: '08:00', close: '22:00', isClosed: false },
    friday: { open: '08:00', close: '23:00', isClosed: false },
    saturday: { open: '10:00', close: '23:00', isClosed: false },
    sunday: { open: '10:00', close: '22:00', isClosed: false },
  },
  socialMedia: {},
  features: { hasDelivery: false, hasTakeaway: true, hasTableService: true },
};

describe('useWhatsApp', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('generateOrderNumber', () => {
    it('generates order number in correct format', () => {
      const { generateOrderNumber } = useWhatsApp();
      const orderNumber = generateOrderNumber();

      // Format: CMD-YYYYMMDD-XXXX[A-Z]{3}
      expect(orderNumber).toMatch(/^CMD-\d{8}-\d{4}[A-Z0-9]{3}$/);
    });

    it('generates unique order numbers', () => {
      const { generateOrderNumber } = useWhatsApp();
      const orderNumbers = new Set<string>();

      for (let i = 0; i < 100; i++) {
        orderNumbers.add(generateOrderNumber());
      }

      // Most should be unique (allowing for potential collision in random part)
      expect(orderNumbers.size).toBeGreaterThan(90);
    });
  });

  describe('checkWhatsAppAvailability', () => {
    it('returns availability object', () => {
      const { checkWhatsAppAvailability } = useWhatsApp();
      const availability = checkWhatsAppAvailability();

      expect(availability).toHaveProperty('isAvailable');
      expect(availability).toHaveProperty('isMobile');
      expect(availability).toHaveProperty('isIOS');
      expect(availability).toHaveProperty('isAndroid');
      expect(availability).toHaveProperty('preferredMethod');
    });

    it('detects desktop correctly', () => {
      // Default user agent in test env is desktop-like
      const { checkWhatsAppAvailability } = useWhatsApp();
      const availability = checkWhatsAppAvailability();

      expect(availability.isMobile).toBe(false);
      expect(availability.preferredMethod).toBe('web');
    });

    it('always reports WhatsApp as available', () => {
      const { checkWhatsAppAvailability } = useWhatsApp();
      const availability = checkWhatsAppAvailability();

      expect(availability.isAvailable).toBe(true);
    });
  });

  describe('estimatedTime', () => {
    it('returns 5 for empty cart (base time)', () => {
      const { estimatedTime } = useWhatsApp();
      expect(estimatedTime.value).toBe(5);
    });

    it('calculates based on dish estimated time', () => {
      const cartStore = useCartStore();
      cartStore.addItem(mockDish, 1);

      const { estimatedTime } = useWhatsApp();
      // (15 * 1) + 5 = 20
      expect(estimatedTime.value).toBe(20);
    });

    it('uses max time for multiple items', () => {
      const cartStore = useCartStore();
      cartStore.addItem(mockDish, 2);
      cartStore.addItem({ ...mockDish, id: 'dish-2', estimatedTime: 10 }, 1);

      const { estimatedTime } = useWhatsApp();
      // max(15*2, 10*1) + 5 = 35
      expect(estimatedTime.value).toBe(35);
    });
  });

  describe('formatOrderMessage', () => {
    it('includes restaurant name', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);

      const { formatOrderMessage } = useWhatsApp();
      expect(formatOrderMessage.value).toContain('Maquis du Bonheur');
    });

    it('includes dish name and quantity', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 2);

      const { formatOrderMessage } = useWhatsApp();
      expect(formatOrderMessage.value).toContain('2x Poulet Braisé');
    });

    it('includes total price', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 2); // 2500 * 2 = 5000

      const { formatOrderMessage } = useWhatsApp();
      expect(formatOrderMessage.value).toContain('5 000 FCFA');
    });

    it('includes table number when set', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);
      cartStore.setTableNumber(5);

      const { formatOrderMessage } = useWhatsApp();
      expect(formatOrderMessage.value).toContain('Table 5');
    });

    it('shows takeaway when no table number', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);

      const { formatOrderMessage } = useWhatsApp();
      expect(formatOrderMessage.value).toContain('À emporter');
    });

    it('includes order notes when provided', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);
      cartStore.setOrderNotes('Please rush this order');

      const { formatOrderMessage } = useWhatsApp();
      expect(formatOrderMessage.value).toContain('Please rush this order');
    });

    it('uses English when locale is en', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();
      const configStore = useConfigStore();

      configStore.locale = 'en';
      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);

      const { formatOrderMessage } = useWhatsApp();
      expect(formatOrderMessage.value).toContain('NEW ORDER');
      expect(formatOrderMessage.value).toContain('Takeaway');
    });
  });

  describe('whatsappUrl', () => {
    it('returns wa.me URL with phone and message', () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);

      const { whatsappUrl } = useWhatsApp();

      expect(whatsappUrl.value).toContain('https://wa.me/22507000000');
      expect(whatsappUrl.value).toContain('text=');
    });
  });

  describe('sendOrder', () => {
    it('returns failure when cart is empty', async () => {
      const { sendOrder } = useWhatsApp();
      const result = await sendOrder();

      expect(result.success).toBe(false);
      expect(result.error).toBe('cart_empty');
      expect(result.method).toBe('failed');
    });

    it('returns success with order number when cart has items', async () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);

      // Mock window.open
      vi.spyOn(window, 'open').mockImplementation(() => null);

      const { sendOrder } = useWhatsApp();
      const result = await sendOrder();

      expect(result.success).toBe(true);
      expect(result.orderNumber).toMatch(/^CMD-/);
      expect(result.method).toBe('whatsapp_web');
    });

    it('includes location when provided', async () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);

      vi.spyOn(window, 'open').mockImplementation(() => null);

      const { sendOrder, formatOrderMessage } = useWhatsApp();
      await sendOrder({ latitude: 5.3, longitude: -4.0, accuracy: 10 });

      expect(formatOrderMessage.value).toContain('maps.google.com');
    });
  });

  describe('copyOrderToClipboard', () => {
    it('copies order message to clipboard', async () => {
      const cartStore = useCartStore();
      const menuStore = useMenuStore();

      menuStore.restaurant = mockRestaurant;
      cartStore.addItem(mockDish, 1);

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });

      const { copyOrderToClipboard, formatOrderMessage } = useWhatsApp();
      const result = await copyOrderToClipboard();

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(formatOrderMessage.value);
    });
  });

  describe('customerLocation', () => {
    it('starts as null', () => {
      const { customerLocation } = useWhatsApp();
      expect(customerLocation.value).toBeNull();
    });

    it('can be set', () => {
      const { setCustomerLocation, customerLocation } = useWhatsApp();
      setCustomerLocation({ latitude: 5.3, longitude: -4.0, accuracy: 10 });
      expect(customerLocation.value).toEqual({ latitude: 5.3, longitude: -4.0, accuracy: 10 });
    });

    it('can be cleared', () => {
      const { setCustomerLocation, clearCustomerLocation, customerLocation } = useWhatsApp();
      setCustomerLocation({ latitude: 5.3, longitude: -4.0, accuracy: 10 });
      clearCustomerLocation();
      expect(customerLocation.value).toBeNull();
    });
  });

  describe('displayPhoneNumber', () => {
    it('formats phone number for display', () => {
      const menuStore = useMenuStore();
      menuStore.restaurant = { ...mockRestaurant, whatsappNumber: '+22607123456' };

      const { displayPhoneNumber } = useWhatsApp();
      expect(displayPhoneNumber.value).toBe('+226 07 12 34 56');
    });

    it('returns raw number if not matching format', () => {
      const menuStore = useMenuStore();
      menuStore.restaurant = { ...mockRestaurant, whatsappNumber: '+1234567890' };

      const { displayPhoneNumber } = useWhatsApp();
      expect(displayPhoneNumber.value).toBe('+1234567890');
    });
  });
});
