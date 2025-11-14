/**
 * Internationalization (i18n) System
 * Supports multiple languages with dynamic loading
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'zh';

export interface Translation {
  [key: string]: string | Translation;
}

export interface I18nStore {
  locale: Locale;
  translations: Record<Locale, Translation>;
  loading: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
}

// Translation files
const translations: Record<Locale, () => Promise<{ default: Translation }>> = {
  en: () => import('./locales/en.json'),
  fr: () => import('./locales/fr.json'),
  es: () => import('./locales/es.json'),
  de: () => import('./locales/de.json'),
  it: () => import('./locales/it.json'),
  pt: () => import('./locales/pt.json'),
  ja: () => import('./locales/ja.json'),
  zh: () => import('./locales/zh.json')
};

const fallbackTranslations: Translation = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    update: 'Update',
    search: 'Search',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success'
  },
  workflow: {
    title: 'Workflows',
    create: 'Create Workflow',
    edit: 'Edit Workflow',
    delete: 'Delete Workflow',
    execute: 'Execute Workflow',
    save: 'Save Workflow'
  },
  node: {
    add: 'Add Node',
    configure: 'Configure Node',
    delete: 'Delete Node'
  }
};

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      locale: detectLocale(),
      translations: { en: fallbackTranslations } as Record<Locale, Translation>,
      loading: false,

      setLocale: async (locale: Locale) => {
        set({ loading: true });

        try {
          // Load translation file if not already loaded
          const current = get().translations;
          if (!current[locale]) {
            const module = await translations[locale]();
            set({
              translations: {
                ...current,
                [locale]: module.default
              }
            });
          }

          set({ locale, loading: false });

          // Update HTML lang attribute
          document.documentElement.lang = locale;
        } catch (error) {
          console.error(`Failed to load locale: ${locale}`, error);
          set({ loading: false });
        }
      },

      t: (key: string, params?: Record<string, string>) => {
        const { locale, translations } = get();
        const translation = getNestedTranslation(translations[locale] || translations.en, key);

        if (!translation) {
          console.warn(`Translation missing for key: ${key}`);
          return key;
        }

        // Replace parameters
        if (params) {
          return Object.entries(params).reduce(
            (text, [param, value]) => text.replace(`{{${param}}}`, value),
            translation
          );
        }

        return translation;
      }
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ locale: state.locale })
    }
  )
);

// Helper function to get nested translation
function getNestedTranslation(obj: Translation, path: string): string {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current[key] === undefined) {
      return '';
    }
    current = current[key];
  }

  return typeof current === 'string' ? current : '';
}

// Detect user's preferred locale
function detectLocale(): Locale {
  const browserLang = navigator.language.split('-')[0];
  const supportedLocales: Locale[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'zh'];

  return supportedLocales.includes(browserLang as Locale)
    ? (browserLang as Locale)
    : 'en';
}

// Format numbers according to locale
export function formatNumber(num: number, locale?: Locale): string {
  const currentLocale = locale || useI18n.getState().locale;
  return new Intl.NumberFormat(currentLocale).format(num);
}

// Format dates according to locale
export function formatDate(date: Date | string, locale?: Locale, options?: Intl.DateTimeFormatOptions): string {
  const currentLocale = locale || useI18n.getState().locale;
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(currentLocale, options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);
}

// Format currency according to locale
export function formatCurrency(amount: number, currency: string = 'USD', locale?: Locale): string {
  const currentLocale = locale || useI18n.getState().locale;

  return new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency
  }).format(amount);
}

// React hook for easy translation
export function useTranslation() {
  const { t, locale, setLocale, loading } = useI18n();

  return {
    t,
    locale,
    setLocale,
    loading,
    formatNumber,
    formatDate,
    formatCurrency
  };
}
