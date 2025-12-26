import { describe, it, expect } from 'vitest';
import {
  isValidPhoneNumber,
  isValidPrice,
  isRequired,
  minLength,
  maxLength,
  isValidEmail,
  isValidUrl,
  isValidSlug,
  isValidTableNumber,
  isValidImageType,
  isValidFileSize,
  sanitizeHtml,
  validateField,
  validateForm,
  hasErrors,
  type ValidationRule,
} from './validators';

describe('validators', () => {
  describe('isValidPhoneNumber', () => {
    it('validates 8-digit local numbers starting with 7', () => {
      expect(isValidPhoneNumber('70123456')).toBe(true);
      expect(isValidPhoneNumber('71234567')).toBe(true);
      expect(isValidPhoneNumber('78901234')).toBe(true);
    });

    it('validates 8-digit local numbers starting with 5, 6, 0', () => {
      expect(isValidPhoneNumber('50123456')).toBe(true);
      expect(isValidPhoneNumber('60123456')).toBe(true);
      expect(isValidPhoneNumber('01234567')).toBe(true);
    });

    it('validates 11-digit numbers with country code', () => {
      expect(isValidPhoneNumber('22670123456')).toBe(true);
      expect(isValidPhoneNumber('22650987654')).toBe(true);
    });

    it('validates formatted numbers', () => {
      expect(isValidPhoneNumber('+226 70 12 34 56')).toBe(true);
      expect(isValidPhoneNumber('70-12-34-56')).toBe(true);
      expect(isValidPhoneNumber('70 12 34 56')).toBe(true);
    });

    it('rejects invalid numbers', () => {
      expect(isValidPhoneNumber('1234567')).toBe(false); // Too short
      expect(isValidPhoneNumber('123456789')).toBe(false); // Wrong length
      expect(isValidPhoneNumber('80123456')).toBe(false); // Invalid prefix
      expect(isValidPhoneNumber('22780123456')).toBe(false); // Wrong country code
      expect(isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('isValidPrice', () => {
    it('validates positive numbers', () => {
      expect(isValidPrice(100)).toBe(true);
      expect(isValidPrice(0)).toBe(true);
      expect(isValidPrice(99.99)).toBe(true);
    });

    it('validates string numbers', () => {
      expect(isValidPrice('100')).toBe(true);
      expect(isValidPrice('0')).toBe(true);
      expect(isValidPrice('99.99')).toBe(true);
    });

    it('rejects negative numbers', () => {
      expect(isValidPrice(-1)).toBe(false);
      expect(isValidPrice('-100')).toBe(false);
    });

    it('rejects non-numeric strings', () => {
      expect(isValidPrice('abc')).toBe(false);
      expect(isValidPrice('NaN')).toBe(false);
    });
  });

  describe('isRequired', () => {
    it('returns true for non-empty strings', () => {
      expect(isRequired('hello')).toBe(true);
      expect(isRequired('  hello  ')).toBe(true);
    });

    it('returns false for empty strings', () => {
      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
    });

    it('returns true for non-empty arrays', () => {
      expect(isRequired([1, 2, 3])).toBe(true);
      expect(isRequired(['a'])).toBe(true);
    });

    it('returns false for empty arrays', () => {
      expect(isRequired([])).toBe(false);
    });

    it('returns false for null and undefined', () => {
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
    });

    it('returns true for numbers and booleans', () => {
      expect(isRequired(0)).toBe(true);
      expect(isRequired(false)).toBe(true);
    });
  });

  describe('minLength', () => {
    it('returns true for strings meeting minimum length', () => {
      expect(minLength('hello', 3)).toBe(true);
      expect(minLength('hello', 5)).toBe(true);
    });

    it('returns false for strings below minimum length', () => {
      expect(minLength('hi', 3)).toBe(false);
      expect(minLength('', 1)).toBe(false);
    });

    it('trims whitespace before checking', () => {
      expect(minLength('  hi  ', 3)).toBe(false);
      expect(minLength('  hello  ', 5)).toBe(true);
    });
  });

  describe('maxLength', () => {
    it('returns true for strings within maximum length', () => {
      expect(maxLength('hi', 5)).toBe(true);
      expect(maxLength('hello', 5)).toBe(true);
    });

    it('returns false for strings exceeding maximum length', () => {
      expect(maxLength('hello world', 5)).toBe(false);
    });

    it('trims whitespace before checking', () => {
      expect(maxLength('  hi  ', 3)).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    it('validates correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@sub.domain.com')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user domain@email.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('validates correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isValidSlug', () => {
    it('validates correct slugs', () => {
      expect(isValidSlug('hello-world')).toBe(true);
      expect(isValidSlug('product-123')).toBe(true);
      expect(isValidSlug('abc')).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(isValidSlug('Hello-World')).toBe(false); // Uppercase
      expect(isValidSlug('hello_world')).toBe(false); // Underscore
      expect(isValidSlug('hello--world')).toBe(false); // Double hyphen
      expect(isValidSlug('-hello')).toBe(false); // Leading hyphen
      expect(isValidSlug('hello-')).toBe(false); // Trailing hyphen
      expect(isValidSlug('')).toBe(false);
    });
  });

  describe('isValidTableNumber', () => {
    it('validates table numbers within range', () => {
      expect(isValidTableNumber(1, 20)).toBe(true);
      expect(isValidTableNumber(10, 20)).toBe(true);
      expect(isValidTableNumber(20, 20)).toBe(true);
    });

    it('rejects table numbers outside range', () => {
      expect(isValidTableNumber(0, 20)).toBe(false);
      expect(isValidTableNumber(21, 20)).toBe(false);
      expect(isValidTableNumber(-1, 20)).toBe(false);
    });

    it('rejects non-integer values', () => {
      expect(isValidTableNumber(1.5, 20)).toBe(false);
      expect(isValidTableNumber(NaN, 20)).toBe(false);
    });
  });

  describe('isValidImageType', () => {
    it('accepts valid image types', () => {
      expect(isValidImageType(new File([''], 'test.jpg', { type: 'image/jpeg' }))).toBe(true);
      expect(isValidImageType(new File([''], 'test.png', { type: 'image/png' }))).toBe(true);
      expect(isValidImageType(new File([''], 'test.webp', { type: 'image/webp' }))).toBe(true);
      expect(isValidImageType(new File([''], 'test.gif', { type: 'image/gif' }))).toBe(true);
    });

    it('rejects invalid image types', () => {
      expect(isValidImageType(new File([''], 'test.pdf', { type: 'application/pdf' }))).toBe(false);
      expect(isValidImageType(new File([''], 'test.txt', { type: 'text/plain' }))).toBe(false);
      expect(isValidImageType(new File([''], 'test.svg', { type: 'image/svg+xml' }))).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('accepts files within size limit', () => {
      const smallFile = new File(['a'.repeat(100)], 'test.txt');
      expect(isValidFileSize(smallFile, 1000)).toBe(true);
    });

    it('accepts files exactly at size limit', () => {
      const exactFile = new File(['a'.repeat(100)], 'test.txt');
      expect(isValidFileSize(exactFile, exactFile.size)).toBe(true);
    });

    it('rejects files exceeding size limit', () => {
      const largeFile = new File(['a'.repeat(1000)], 'test.txt');
      expect(isValidFileSize(largeFile, 100)).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes HTML tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert("xss")&lt;/script&gt;'
      );
    });

    it('escapes HTML entities', () => {
      expect(sanitizeHtml('<div class="test">')).toBe('&lt;div class="test"&gt;');
    });

    it('returns plain text unchanged', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });

    it('escapes ampersands', () => {
      expect(sanitizeHtml('A & B')).toBe('A &amp; B');
    });
  });

  describe('validateField', () => {
    it('returns null when all rules pass', () => {
      const rules: ValidationRule[] = [
        { validator: (v) => typeof v === 'string', message: 'Must be string' },
        { validator: (v) => (v as string).length >= 3, message: 'Min 3 chars' },
      ];
      expect(validateField('hello', rules)).toBe(null);
    });

    it('returns first error message when a rule fails', () => {
      const rules: ValidationRule[] = [
        { validator: (v) => typeof v === 'string', message: 'Must be string' },
        { validator: (v) => (v as string).length >= 3, message: 'Min 3 chars' },
      ];
      expect(validateField('hi', rules)).toBe('Min 3 chars');
    });

    it('returns first failing rule message', () => {
      const rules: ValidationRule[] = [
        { validator: () => false, message: 'First error' },
        { validator: () => false, message: 'Second error' },
      ];
      expect(validateField('test', rules)).toBe('First error');
    });
  });

  describe('validateForm', () => {
    it('validates entire form and returns errors object', () => {
      const data = { name: 'Jo', email: 'invalid' };
      const schema = {
        name: [{ validator: (v: unknown) => minLength(v as string, 3), message: 'Min 3 chars' }],
        email: [{ validator: (v: unknown) => isValidEmail(v as string), message: 'Invalid email' }],
      };

      const errors = validateForm(data, schema);
      expect(errors.name).toBe('Min 3 chars');
      expect(errors.email).toBe('Invalid email');
    });

    it('returns null for valid fields', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const schema = {
        name: [{ validator: (v: unknown) => minLength(v as string, 3), message: 'Min 3 chars' }],
        email: [{ validator: (v: unknown) => isValidEmail(v as string), message: 'Invalid email' }],
      };

      const errors = validateForm(data, schema);
      expect(errors.name).toBe(null);
      expect(errors.email).toBe(null);
    });
  });

  describe('hasErrors', () => {
    it('returns true when there are errors', () => {
      const errors = { name: 'Required', email: null };
      expect(hasErrors(errors)).toBe(true);
    });

    it('returns false when there are no errors', () => {
      const errors = { name: null, email: null };
      expect(hasErrors(errors)).toBe(false);
    });
  });
});
