'use client';

// スタッフ管理画面: 求職者一覧 + 登録・招待URL発行。
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface Row {
  id: string;
  displayName: string;
  status: string;
  locale: string;
  ocrStatus: string;
  workRestriction: string | null;
  submittedAt: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  invited: 'bg-gray-100 text-gray-600',
  opened: 'bg-blue-50 text-blue-600',
  card_uploaded: 'bg-indigo-50 text-indigo-600',
  submitted: 'bg-green-50 text-green-700',
  completed: 'bg-green-600 text-white',
};

export default function AdminPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [locale, setLocale] = useState('ja');
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch('/api/admin/applicants', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      setRows(json.applicants ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch('/api/admin/applicants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: name.trim(), locale }),
    });
    setCreating(false);
    if (res.ok) {
      const json = await res.json();
      setIssuedUrl(json.url);
      setCopied(false);
      setName('');
      void reload();
    }
  };

  const copy = async () => {
    if (!issuedUrl) return;
    await navigator.clipboard.writeText(issuedUrl);
    setCopied(true);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('admin.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-gray-500 text-sm sm:text-base mb-6">{t('admin.subtitle')}</p>

      {/* 新規登録 */}
      <form onSubmit={create} className="bg-white rounded-2xl shadow-md p-4 md:p-5 mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1">{t('admin.newApplicant')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.namePlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-semibold mb-1">{t('admin.columns.language')}</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ja">日本語</option>
              <option value="ne">नेपाली</option>
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full sm:w-auto rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-4 sm:px-6 py-2.5 text-sm"
          >
            {t('admin.create')}
          </button>
        </div>
        {issuedUrl && (
          <div className="w-full flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <code className="text-xs break-all flex-1">{issuedUrl}</code>
            <button type="button" onClick={copy} className="shrink-0 text-sm font-semibold text-brand">
              {copied ? `✓ ${t('admin.copied')}` : t('admin.copyUrl')}
            </button>
          </div>
        )}
      </form>

      {/* 一覧 */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-gray-400 text-sm">{t('admin.empty')}</p>
        </div>
      ) : (
        <>
          {/* テーブル（デスクトップ） */}
          <div className="hidden md:block bg-white rounded-2xl shadow-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-3">{t('admin.columns.name')}</th>
                  <th className="px-4 py-3">{t('admin.columns.status')}</th>
                  <th className="px-4 py-3">{t('admin.columns.language')}</th>
                  <th className="px-4 py-3">{t('admin.columns.submittedAt')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">
                      {r.displayName}
                      {r.workRestriction?.includes('不可') && (
                        <span className="ml-2 text-xs bg-red-600 text-white rounded px-1.5 py-0.5">
                          {t('admin.workForbidden')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[r.status] ?? ''}`}>
                        {t(`admin.status.${r.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.locale}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString('ja-JP') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/${r.id}`} className="text-brand font-semibold hover:underline text-sm">
                        {t('admin.detail')} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* カード（モバイル） */}
          <div className="md:hidden space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {r.displayName}
                      {r.workRestriction?.includes('不可') && (
                        <span className="text-xs bg-red-600 text-white rounded px-1.5 py-0.5">
                          {t('admin.workForbidden')}
                        </span>
                      )}
                    </h3>
                  </div>
                  <Link href={`/admin/${r.id}`} className="text-brand font-semibold text-sm shrink-0 hover:underline">
                    {t('admin.detail')} →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500">{t('admin.columns.status')}</p>
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold mt-1 ${STATUS_COLOR[r.status] ?? ''}`}>
                      {t(`admin.status.${r.status}`)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('admin.columns.language')}</p>
                    <p className="mt-1 font-medium">{r.locale}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">{t('admin.columns.submittedAt')}</p>
                    <p className="mt-1 text-gray-600">{r.submittedAt ? new Date(r.submittedAt).toLocaleString('ja-JP') : '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
