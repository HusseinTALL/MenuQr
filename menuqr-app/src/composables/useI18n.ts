import { computed } from 'vue';
import { useI18n as useVueI18n } from 'vue-i18n';
import { useConfigStore } from '@/stores/configStore';
import type { LocalizedString } from '@/types';

/**
 * Composable for internationalization
 * Wraps vue-i18n with additional utilities
 */
export function useLocale() {
  const { t, locale, availableLocales, n, d } = useVueI18n();
  const configStore = useConfigStore();

  const currentLocale = computed(() => locale.value as 'fr' | 'en');

  const isFrench = computed(() => locale.value === 'fr');
  const isEnglish = computed(() => locale.value === 'en');

  /**
   * Toggle between French and English
   */
  const toggleLocale = () => {
    const newLocale = locale.value === 'fr' ? 'en' : 'fr';
    setLocale(newLocale);
  };

  /**
   * Set locale explicitly
   */
  const setLocale = (newLocale: 'fr' | 'en') => {
    locale.value = newLocale;
    configStore.setLocale(newLocale);
    document.documentElement.lang = newLocale;
  };

  /**
   * Get localized string from LocalizedString object
   */
  const localize = (localizedString: LocalizedString | undefined): string => {
    if (!localizedString) {
      return '';
    }
    return localizedString[currentLocale.value] || localizedString.fr || '';
  };

  /**
   * Format price with locale-specific formatting
   */
  const formatPrice = (amount: number): string => {
    return `${n(amount, 'currency')} FCFA`;
  };

  /**
   * Format date with locale-specific formatting
   */
  const formatDate = (date: Date | string, format: 'short' | 'long' = 'short'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return d(dateObj, format);
  };

  /**
   * Format time with locale-specific formatting
   */
  const formatTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return d(dateObj, 'time');
  };

  return {
    // Vue-i18n
    t,
    n,
    d,
    availableLocales,

    // State
    locale: currentLocale,
    isFrench,
    isEnglish,

    // Actions
    toggleLocale,
    setLocale,

    // Helpers
    localize,
    formatPrice,
    formatDate,
    formatTime,
  };
}

// Re-export for convenience
export { useLocale as useI18n };
