'use client';

// スタッフ用 求職者詳細: 提出データ確認・修正・カード画像・PDF・URL再発行。
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { EMPTY_RESUME, RESUME_FIELDS, type ResumeData } from '@/lib/resumeFields';

interface Detail {
  id: string;
  displayName: string;
  status: string;
  locale: string;
  token: string;
  tokenExpiresAt: string;
  ocrStatus: string;
  workRestriction: string | null;
  cardNumberLast4: string | null;
  cardExpiryDate: string | null;
  cardUploadedAt: string | null;
  draft: Partial<ResumeData> | null;
  submittedData: Partial<ResumeData> | null;
  submittedAt: string | null;
  caId: string | null;
  createdAt: string;
}

interface CA {
  id: string;
  name: string;
}

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<ResumeData>(EMPTY_RESUME);
  const [cas, setCas] = useState<CA[]>([]);
  const [selectedCaId, setSelectedCaId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savingCa, setSavingCa] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [reissuedUrl, setReissuedUrl] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);

  const reload = useCallback(async () => {
    // CA 一覧取得
    const casRes = await fetch('/api/admin/cas', { cache: 'no-store' });
    if (casRes.ok) {
      const casJson = await casRes.json();
      setCas(casJson.cas ?? []);
    }

    // 求職者詳細取得
    const res = await fetch(`/api/admin/applicants/${id}`, { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    const d: Detail = json.applicant;
    setDetail(d);
    setForm({ ...EMPTY_RESUME, ...(d.submittedData ?? d.draft ?? {}) });
    setSelectedCaId(d.caId ?? '');
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveEdit = async () => {
    setSaving(true);
    await fetch(`/api/admin/applicants/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'update', data: form }),
    });
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const saveCa = async () => {
    setSavingCa(true);
    await fetch(`/api/admin/applicants/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'update_ca', caId: selectedCaId || null }),
    });
    setSavingCa(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const reissue = async () => {
    const res = await fetch(`/api/admin/applicants/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reissue' }),
    });
    if (res.ok) {
      const json = await res.json();
      setReissuedUrl(json.url);
      void reload();
    }
  };

  if (!detail) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-gray-400">{t('common.loading')}</p>
      </main>
    );
  }

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/a/${detail.token}`;
  const workForbidden = detail.workRestriction?.includes('不可');

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← {t('common.back')}
      </Link>
      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="text-2xl font-bold">{detail.displayName}</h1>
        <span className="text-sm text-gray-500">{t(`admin.status.${detail.status}`)}</span>
      </div>

      {workForbidden && (
        <div className="mb-4 rounded-xl bg-red-600 text-white px-4 py-3 font-bold">
          {t('admin.workAlert')}
          {detail.workRestriction}
        </div>
      )}
      {detail.workRestriction && !workForbidden && (
        <p className="mb-4 text-sm text-gray-600">
          {t('admin.workAlert')}
          {detail.workRestriction}
        </p>
      )}

      {/* 招待URL */}
      <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs break-all flex-1">{reissuedUrl ?? inviteUrl}</code>
          <button
            onClick={() => navigator.clipboard.writeText(reissuedUrl ?? inviteUrl)}
            className="text-sm font-semibold text-brand shrink-0"
          >
            {t('admin.copyUrl')}
          </button>
          <button onClick={reissue} className="text-sm font-semibold text-orange-600 shrink-0">
            {t('admin.reissue')}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {t('admin.columns.createdAt')}: {new Date(detail.createdAt).toLocaleString('ja-JP')} / expires:{' '}
          {new Date(detail.tokenExpiresAt).toLocaleDateString('ja-JP')}
          {detail.cardNumberLast4 && <> / card: ****{detail.cardNumberLast4}</>}
        </p>
      </div>

      {/* CA 選択 */}
      <div className="bg-white rounded-2xl shadow-md p-5 mb-6 flex flex-col gap-3">
        <label className="block text-sm font-semibold">CA 選択</label>
        <select
          value={selectedCaId}
          onChange={(e) => setSelectedCaId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="">未設定</option>
          {cas.map((ca) => (
            <option key={ca.id} value={ca.id}>
              {ca.name}
            </option>
          ))}
        </select>
        <button
          onClick={saveCa}
          disabled={savingCa}
          className="rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-6 py-2.5 w-fit"
        >
          {t('common.save')}
        </button>
      </div>

      {/* カード画像（スタッフ確認用） */}
      {detail.cardUploadedAt && (
        <div className="mb-6">
          <button onClick={() => setShowCard(!showCard)} className="text-sm font-semibold text-brand">
            {showCard ? '▼' : '▶'} 在留カード画像
          </button>
          {showCard && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/admin/applicants/${id}/card`}
              alt="residence card"
              className="mt-2 rounded-xl shadow-md max-h-72"
            />
          )}
        </div>
      )}

      {/* データ編集 */}
      <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
        {RESUME_FIELDS.map(({ key, multiline }) => (
          <div key={key}>
            <label className="block text-sm font-semibold mb-1">{t(`form.fields.${key}`)}</label>
            {multiline ? (
              <textarea
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 resize-y"
              />
            ) : (
              <input
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            )}
          </div>
        ))}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={saveEdit}
            disabled={saving}
            className="rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-6 py-2.5"
          >
            {t('common.save')}
          </button>
          {savedMsg && <span className="text-green-600 text-sm font-semibold">✓ {t('a.form.saved')}</span>}
          <a
            href={`/api/admin/applicants/${id}/pdf`}
            className="ml-auto rounded-lg border border-brand text-brand font-semibold px-6 py-2.5 hover:bg-brand/5"
          >
            ⬇ {t('admin.pdf')}
          </a>
        </div>
      </div>
    </main>
  );
}
