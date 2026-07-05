'use client';

import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type GenStatus = 'pending' | 'generating' | 'completed' | 'failed';

interface Applicant {
  id: string;
  name: string;
  email: string;
  language: 'ja' | 'ne' | 'en';
  status: GenStatus;
  updatedAt: string;
}

// Placeholder applicant data. In production this comes from the backend
// (GET /resume list); wire an SWR/fetch call here once the API is live.
const MOCK_APPLICANTS: Applicant[] = [
  {
    id: '1',
    name: '山田 太郎',
    email: 'taro@example.com',
    language: 'ja',
    status: 'completed',
    updatedAt: '2026-07-05 10:20',
  },
  {
    id: '2',
    name: 'Bishnu Thapa',
    email: 'bishnu@example.com',
    language: 'ne',
    status: 'generating',
    updatedAt: '2026-07-05 10:45',
  },
  {
    id: '3',
    name: 'John Smith',
    email: 'john@example.com',
    language: 'en',
    status: 'pending',
    updatedAt: '2026-07-05 09:58',
  },
  {
    id: '4',
    name: '佐藤 花子',
    email: 'hanako@example.com',
    language: 'ja',
    status: 'failed',
    updatedAt: '2026-07-05 08:30',
  },
];

const STATUS_STYLES: Record<GenStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  generating: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

// CS admin dashboard (task: pages/admin.tsx): applicant list + generation status.
export default function AdminPage() {
  const { t } = useI18n();
  const applicants = MOCK_APPLICANTS;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-gray-500 mb-6">{t('admin.subtitle')}</p>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {applicants.length === 0 ? (
          <p className="p-8 text-center text-gray-400">{t('admin.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-semibold">{t('admin.columns.name')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.columns.email')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.columns.language')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.columns.status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.columns.updatedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email}</td>
                    <td className="px-4 py-3 uppercase text-gray-500">{a.language}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[a.status]}`}
                      >
                        {t(`admin.status.${a.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
