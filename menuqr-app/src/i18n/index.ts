import { createI18n } from 'vue-i18n';
import fr from './fr.json';
import en from './en.json';

// Get saved locale or default to French
const savedLocale = localStorage.getItem('menuqr-config');
let defaultLocale: 'fr' | 'en' = 'fr';

if (savedLocale) {
  try {
    const config = JSON.parse(savedLocale);
    if (config.locale === 'en') {
      defaultLocale = 'en';
    }
  } catch {
    // Use default
  }
}

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: defaultLocale,
  fallbackLocale: 'fr',
  messages: {
    fr,
    en,
  },
  // Number formatting for FCFA currency
  numberFormats: {
    fr: {
      currency: {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
      },
    },
    en: {
      currency: {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
      },
    },
  },
  // Date/time formatting
  datetimeFormats: {
    fr: {
      short: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      },
      time: {
        hour: '2-digit',
        minute: '2-digit',
      },
    },
    en: {
      short: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      },
      time: {
        hour: '2-digit',
        minute: '2-digit',
      },
    },
  },
});

export default i18n;
