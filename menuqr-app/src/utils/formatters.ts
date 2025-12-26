import type { LocalizedString } from '@/types';

/**
 * Currency configuration for supported currencies
 */
const currencyConfig: Record<string, { symbol: string; position: 'before' | 'after'; decimals: number; locale: string }> = {
  XOF: { symbol: 'FCFA', position: 'after', decimals: 0, locale: 'fr-FR' },
  EUR: { symbol: '€', position: 'after', decimals: 2, locale: 'fr-FR' },
  USD: { symbol: '$', position: 'before', decimals: 2, locale: 'en-US' },
  GBP: { symbol: '£', position: 'before', decimals: 2, locale: 'en-GB' },
  MAD: { symbol: 'DH', position: 'after', decimals: 2, locale: 'fr-MA' },
  TND: { symbol: 'DT', position: 'after', decimals: 3, locale: 'fr-TN' },
  XAF: { symbol: 'FCFA', position: 'after', decimals: 0, locale: 'fr-FR' },
};

/**
 * Format price with the specified currency
 * @param amount - The price amount
 * @param currency - Currency code (default: XOF)
 */
export function formatPrice(amount: number, currency: string = 'XOF'): string {
  const config = currencyConfig[currency] || currencyConfig.XOF;

  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'decimal',
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  })
    .format(amount)
    .replace(/\s/g, ' ');

  if (config.position === 'before') {
    return `${config.symbol}${formatted}`;
  }
  return `${formatted} ${config.symbol}`;
}

/**
 * Format price without currency suffix
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, ' ');
}

/**
 * Get localized string based on current locale
 */
export function getLocalizedString(
  localizedString: LocalizedString | undefined,
  locale: 'fr' | 'en' = 'fr'
): string {
  if (!localizedString) {
    return '';
  }
  return localizedString[locale] || localizedString.fr || '';
}

/**
 * Format phone number for display (Burkina Faso format)
 * +226 XX XX XX XX
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // If starts with 226, format with country code
  if (digits.startsWith('226') && digits.length === 11) {
    return `+226 ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }

  // If 8 digits, assume local number
  if (digits.length === 8) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Format phone number for WhatsApp link (no spaces, with country code)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // If doesn't start with country code, add Burkina Faso code
  if (!digits.startsWith('226') && digits.length === 8) {
    return '226' + digits;
  }

  return digits;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, locale: 'fr' | 'en' = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string, locale: 'fr' | 'en' = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "il y a 5 minutes")
 */
export function formatRelativeTime(date: Date | string, locale: 'fr' | 'en' = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'fr') {
    if (diffMins < 1) {
      return "À l'instant";
    }
    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    }
    if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
    return formatDate(d, locale);
  } else {
    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    return formatDate(d, locale);
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) {
    return '';
  }
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Generate slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
