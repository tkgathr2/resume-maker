'use client';

import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/lib/i18n';

interface ErrorScreenProps {
  errorKey: string; // i18n キー
  showHome?: boolean; // ホームへのリンクを表示
}

export default function ErrorScreen({ errorKey, showHome = true }: ErrorScreenProps) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-sm">
          <div className="rounded-lg bg-red-50 border-2 border-red-300 p-6 text-center">
            <h1 className="text-lg font-bold text-red-700 mb-2">⚠️ {t('common.error')}</h1>
            <p className="text-red-600 text-sm mb-6">
              {t(errorKey)}
            </p>
            {showHome && (
              <Link
                href="/"
                className="inline-block rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3 transition-colors"
              >
                {t('common.backHome')} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
