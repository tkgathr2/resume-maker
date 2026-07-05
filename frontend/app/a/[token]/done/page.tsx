'use client';

// 完了画面（母語）。
import { use, useEffect } from 'react';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { fetchApplicant } from '@/lib/applicantClient';

export default function DonePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, setLocale } = useI18n();

  useEffect(() => {
    fetchApplicant(token).then((r) => {
      if (!('error' in r) && LOCALES.includes(r.locale as Locale)) setLocale(r.locale as Locale);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <span className="text-4xl">✓</span>
      </div>
      <h1 className="text-2xl font-bold mb-3">{t('a.done.title')}</h1>
      <p className="text-gray-500 max-w-sm">{t('a.done.message')}</p>
    </main>
  );
}
