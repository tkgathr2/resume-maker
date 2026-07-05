// Lightweight i18n: React Context + JSON dictionaries (no external i18n lib).
// Supports Japanese (ja), Nepali (ne), and English (en).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ja from '@/locales/ja.json';
import en from '@/locales/en.json';
import ne from '@/locales/ne.json';

export type Locale = 'ja' | 'ne' | 'en';

export const LOCALES: Locale[] = ['ja', 'ne', 'en'];

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: '日本語',
  ne: 'नेपाली',
  en: 'English',
};

const DICTS: Record<Locale, Record<string, unknown>> = { ja, en, ne };

const STORAGE_KEY = 'resume-maker.locale';
const DEFAULT_LOCALE: Locale = 'ja';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Resolve a dot-path (e.g. "form.fields.fullName") within the active dictionary.
function resolve(dict: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key; // fall back to the key itself when missing
    }
  }
  return typeof cur === 'string' ? cur : key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Restore persisted locale on mount (client only).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && LOCALES.includes(saved)) {
        setLocaleState(saved);
      }
    } catch {
      // ignore storage errors (e.g. SSR / privacy mode)
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: string) => resolve(DICTS[locale], key), [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
