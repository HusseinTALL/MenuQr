import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatPrice,
  formatNumber,
  getLocalizedString,
  formatPhoneNumber,
  formatPhoneForWhatsApp,
  formatDate,
  formatTime,
  formatRelativeTime,
  truncate,
  capitalize,
  slugify,
} from './formatters';

describe('formatters', () => {
  describe('formatPrice', () => {
    it('formats positive integers correctly', () => {
      expect(formatPrice(1000)).toBe('1 000 FCFA');
      expect(formatPrice(500)).toBe('500 FCFA');
      expect(formatPrice(25000)).toBe('25 000 FCFA');
    });

    it('formats zero correctly', () => {
      expect(formatPrice(0)).toBe('0 FCFA');
    });

    it('formats large numbers correctly', () => {
      expect(formatPrice(1000000)).toBe('1 000 000 FCFA');
    });

    it('rounds decimal values', () => {
      expect(formatPrice(1500.75)).toBe('1 501 FCFA');
      expect(formatPrice(999.49)).toBe('999 FCFA');
    });

    it('handles negative numbers', () => {
      expect(formatPrice(-500)).toBe('-500 FCFA');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers without currency suffix', () => {
      expect(formatNumber(1000)).toBe('1 000');
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(25000)).toBe('25 000');
    });

    it('formats zero correctly', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('getLocalizedString', () => {
    it('returns French text for fr locale', () => {
      const text = { fr: 'Bonjour', en: 'Hello' };
      expect(getLocalizedString(text, 'fr')).toBe('Bonjour');
    });

    it('returns English text for en locale', () => {
      const text = { fr: 'Bonjour', en: 'Hello' };
      expect(getLocalizedString(text, 'en')).toBe('Hello');
    });

    it('falls back to French when locale not available', () => {
      const text = { fr: 'Bonjour' };
      expect(getLocalizedString(text, 'en')).toBe('Bonjour');
    });

    it('returns empty string for undefined input', () => {
      expect(getLocalizedString(undefined, 'fr')).toBe('');
    });

    it('defaults to French locale', () => {
      const text = { fr: 'Bonjour', en: 'Hello' };
      expect(getLocalizedString(text)).toBe('Bonjour');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 8-digit local number', () => {
      expect(formatPhoneNumber('70123456')).toBe('70 12 34 56');
      expect(formatPhoneNumber('65432109')).toBe('65 43 21 09');
    });

    it('formats 11-digit number with country code', () => {
      expect(formatPhoneNumber('22670123456')).toBe('+226 70 12 34 56');
    });

    it('handles number with spaces', () => {
      expect(formatPhoneNumber('70 12 34 56')).toBe('70 12 34 56');
    });

    it('handles number with dashes', () => {
      expect(formatPhoneNumber('70-12-34-56')).toBe('70 12 34 56');
    });

    it('returns original string for non-standard format', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('abc')).toBe('abc');
    });
  });

  describe('formatPhoneForWhatsApp', () => {
    it('adds country code to 8-digit number', () => {
      expect(formatPhoneForWhatsApp('70123456')).toBe('22670123456');
    });

    it('keeps country code if already present', () => {
      expect(formatPhoneForWhatsApp('22670123456')).toBe('22670123456');
    });

    it('removes non-digit characters', () => {
      expect(formatPhoneForWhatsApp('+226 70 12 34 56')).toBe('22670123456');
      expect(formatPhoneForWhatsApp('70-12-34-56')).toBe('22670123456');
    });
  });

  describe('formatDate', () => {
    it('formats date in French locale', () => {
      const date = new Date('2024-12-25');
      const result = formatDate(date, 'fr');
      expect(result).toMatch(/25\/12\/2024/);
    });

    it('formats date in English locale', () => {
      const date = new Date('2024-12-25');
      const result = formatDate(date, 'en');
      expect(result).toMatch(/12\/25\/2024/);
    });

    it('handles string date input', () => {
      const result = formatDate('2024-12-25', 'fr');
      expect(result).toMatch(/25\/12\/2024/);
    });
  });

  describe('formatTime', () => {
    it('formats time in French locale', () => {
      const date = new Date('2024-12-25T14:30:00');
      const result = formatTime(date, 'fr');
      expect(result).toMatch(/14:30/);
    });

    it('handles string date input', () => {
      const result = formatTime('2024-12-25T14:30:00', 'fr');
      expect(result).toMatch(/14:30/);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "À l\'instant" for recent time in French', () => {
      const now = new Date('2024-12-25T12:00:00');
      vi.setSystemTime(now);
      const justNow = new Date('2024-12-25T11:59:50');
      expect(formatRelativeTime(justNow, 'fr')).toBe("À l'instant");
    });

    it('returns "Just now" for recent time in English', () => {
      const now = new Date('2024-12-25T12:00:00');
      vi.setSystemTime(now);
      const justNow = new Date('2024-12-25T11:59:50');
      expect(formatRelativeTime(justNow, 'en')).toBe('Just now');
    });

    it('returns minutes ago in French', () => {
      const now = new Date('2024-12-25T12:00:00');
      vi.setSystemTime(now);
      const fiveMinAgo = new Date('2024-12-25T11:55:00');
      expect(formatRelativeTime(fiveMinAgo, 'fr')).toBe('Il y a 5 min');
    });

    it('returns minutes ago in English', () => {
      const now = new Date('2024-12-25T12:00:00');
      vi.setSystemTime(now);
      const fiveMinAgo = new Date('2024-12-25T11:55:00');
      expect(formatRelativeTime(fiveMinAgo, 'en')).toBe('5 min ago');
    });

    it('returns hours ago for times within 24 hours', () => {
      const now = new Date('2024-12-25T12:00:00');
      vi.setSystemTime(now);
      const twoHoursAgo = new Date('2024-12-25T10:00:00');
      expect(formatRelativeTime(twoHoursAgo, 'fr')).toBe('Il y a 2h');
      expect(formatRelativeTime(twoHoursAgo, 'en')).toBe('2h ago');
    });

    it('returns days ago for times within 7 days', () => {
      const now = new Date('2024-12-25T12:00:00');
      vi.setSystemTime(now);
      const threeDaysAgo = new Date('2024-12-22T12:00:00');
      expect(formatRelativeTime(threeDaysAgo, 'fr')).toBe('Il y a 3 jours');
      expect(formatRelativeTime(threeDaysAgo, 'en')).toBe('3 days ago');
    });

    it('handles singular day', () => {
      const now = new Date('2024-12-25T12:00:00');
      vi.setSystemTime(now);
      const oneDayAgo = new Date('2024-12-24T12:00:00');
      expect(formatRelativeTime(oneDayAgo, 'fr')).toBe('Il y a 1 jour');
      expect(formatRelativeTime(oneDayAgo, 'en')).toBe('1 day ago');
    });
  });

  describe('truncate', () => {
    it('returns original text if shorter than max length', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('truncates text longer than max length', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(truncate('', 10)).toBe('');
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('handles single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('lowercases rest of string', () => {
      expect(capitalize('hELLO WORLD')).toBe('Hello world');
    });
  });

  describe('slugify', () => {
    it('converts text to slug format', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes accents', () => {
      expect(slugify('Café Résumé')).toBe('cafe-resume');
    });

    it('removes special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('handles multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
    });

    it('removes leading and trailing hyphens', () => {
      expect(slugify('---Hello World---')).toBe('hello-world');
    });

    it('handles numbers', () => {
      expect(slugify('Product 123')).toBe('product-123');
    });
  });
});
