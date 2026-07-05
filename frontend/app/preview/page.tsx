'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { RESUME_FIELDS, loadResume, type ResumeData } from '@/lib/resumeStore';

// Resume preview screen (task: pages/preview.tsx). Renders the saved draft.
export default function PreviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<ResumeData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadResume();
    setData(saved?.data ?? null);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-gray-500">{t('common.loading')}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center gap-4">
        <p className="text-gray-500">{t('preview.empty')}</p>
        <button
          onClick={() => router.push('/form')}
          className="rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-2.5"
        >
          {t('preview.edit')}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6 no-print">
        <h1 className="text-2xl font-bold">{t('preview.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-gray-500 mb-6 no-print">{t('preview.subtitle')}</p>

      <div className="bg-white rounded-2xl shadow-md p-8">
        <table className="w-full border-collapse">
          <tbody>
            {RESUME_FIELDS.map(({ key }) => (
              <tr key={key} className="border-b border-gray-200 last:border-0">
                <th className="text-left align-top py-3 pr-4 w-40 font-semibold text-gray-600">
                  {t(`form.fields.${key}`)}
                </th>
                <td className="py-3 whitespace-pre-wrap break-words">
                  {data[key] || <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-3 no-print">
        <button
          onClick={() => router.push('/form')}
          className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold px-6 py-2.5"
        >
          {t('preview.edit')}
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-2.5"
        >
          {t('preview.print')}
        </button>
      </div>
    </main>
  );
}
