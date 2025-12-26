/**
 * Validate phone number (Burkina Faso format)
 * Accepts: 70123456, 226 70 12 34 56, +226 70 12 34 56
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');

  // Local number (8 digits starting with 5, 6, 7, or 0)
  if (digits.length === 8 && /^[0567]/.test(digits)) {
    return true;
  }

  // With country code (11 digits starting with 226)
  if (digits.length === 11 && digits.startsWith('226')) {
    return true;
  }

  return false;
}

/**
 * Validate price (positive number)
 */
export function isValidPrice(price: number | string): boolean {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(num) && num >= 0;
}

/**
 * Validate required field
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

/**
 * Validate minimum length
 */
export function minLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

/**
 * Validate maximum length
 */
export function maxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate slug format (lowercase, alphanumeric, hyphens)
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Validate image file type
 */
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
}

/**
 * Validate file size (in bytes)
 */
export function isValidFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Validate table number
 */
export function isValidTableNumber(tableNumber: number, maxTables: number): boolean {
  return Number.isInteger(tableNumber) && tableNumber >= 1 && tableNumber <= maxTables;
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Validate form and return errors
 */
export interface ValidationRule {
  validator: (value: unknown) => boolean;
  message: string;
}

export function validateField(value: unknown, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.validator(value)) {
      return rule.message;
    }
  }
  return null;
}

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  schema: Record<keyof T, ValidationRule[]>
): Record<keyof T, string | null> {
  const errors = {} as Record<keyof T, string | null>;

  for (const key of Object.keys(schema) as Array<keyof T>) {
    errors[key] = validateField(data[key], schema[key]);
  }

  return errors;
}

export function hasErrors<T extends Record<string, unknown>>(
  errors: Record<keyof T, string | null>
): boolean {
  return Object.values(errors).some((error) => error !== null);
}
