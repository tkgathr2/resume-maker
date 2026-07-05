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
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-gray-500 mb-6">{t('admin.subtitle')}</p>

      {/* 新規登録 */}
      <form onSubmit={create} className="bg-white rounded-2xl shadow-md p-5 mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-52">
          <label className="block text-sm font-semibold mb-1">{t('admin.newApplicant')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.namePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">{t('admin.columns.language')}</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
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
          className="rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-6 py-2.5"
        >
          {t('admin.create')}
        </button>
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
      <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
        {loading ? (
          <p className="p-6 text-gray-400">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-gray-400">{t('admin.empty')}</p>
        ) : (
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
                  <td className="px-4 py-3 text-gray-500">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString('ja-JP') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/${r.id}`} className="text-brand font-semibold hover:underline">
                      {t('admin.detail')} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
