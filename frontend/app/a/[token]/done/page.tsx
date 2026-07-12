'use client';

// 完了画面（母語）。
import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { fetchApplicant } from '@/lib/applicantClient';
import { SELF_EDIT_ENABLED } from '@/lib/featureFlags';

export default function DonePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, setLocale } = useI18n();
  const searchParams = useSearchParams();
  const editUrl = searchParams.get('editUrl');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApplicant(token).then((r) => {
      if (!('error' in r) && LOCALES.includes(r.locale as Locale)) setLocale(r.locale as Locale);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const copyUrl = () => {
    if (!editUrl) return;
    navigator.clipboard.writeText(editUrl).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <span className="text-4xl">✓</span>
      </div>
      <h1 className="text-2xl font-bold mb-3">{t('a.done.title')}</h1>
      <p className="text-gray-500 max-w-sm">{t('a.done.message')}</p>

      {SELF_EDIT_ENABLED && editUrl ? (
        <div className="w-full max-w-sm mt-6 bg-white rounded-2xl shadow-md p-5 text-left">
          <p className="font-semibold text-sm mb-1">{t('my.done.urlLabel')}</p>
          <p className="text-xs text-red-600 font-semibold mb-3">⚠ {t('my.done.urlNote')}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs break-all flex-1">{editUrl}</code>
            <button
              onClick={copyUrl}
              className="text-sm font-semibold text-brand shrink-0"
            >
              {copied ? t('my.done.copied') : t('my.done.copyUrl')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 max-w-sm mt-6">{t('my.done.fallbackMessage')}</p>
      )}
    </main>
  );
}
