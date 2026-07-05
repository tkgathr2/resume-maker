import React from 'react';
import { LOCALES, LOCALE_LABELS, useI18n, type Locale } from '@/lib/i18n';

// 3-language switcher (日本語 / नेपाली / English).
export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-sm">
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            locale === l ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-pressed={locale === l}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
