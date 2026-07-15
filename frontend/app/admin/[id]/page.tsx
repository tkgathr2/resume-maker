'use client';

// スタッフ用 求職者詳細: 提出データ確認・修正・カード画像・PDF・URL再発行。
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import {
  EMPTY_RESUME,
  EMPTY_JIS_EXTRA,
  EMPTY_JIS_HISTORY,
  EMPTY_HISTORY_ROW,
  RESUME_FIELDS,
  type ResumeData,
  type JisExtraFields,
  type JisHistoryFields,
  type HistoryRow,
} from '@/lib/resumeFields';

// admin画面が扱う全項目（求職者向けフォームには出さないJIS追加項目を含む）。
type AdminFormData = ResumeData & JisExtraFields & JisHistoryFields;

// RESUME_FIELDS のうち、通常のテキスト入力ではなく行リストエディタで扱うキー
// → 対応する行リスト配列のキーへのマッピング。
const HISTORY_ARRAY_KEY: Partial<Record<keyof ResumeData, keyof JisHistoryFields>> = {
  education: 'educationHistory',
  workHistory: 'workHistoryRows',
  qualifications: 'qualificationRows',
};

// admin専用のJIS追加項目（4項目）のラベル。求職者向け画面には出さないため
// 多言語locale側は変更せず、この画面内だけの日本語固定ラベルとする。
const ADMIN_EXTRA_LABELS: Record<keyof JisExtraFields, string> = {
  commuteTime: '通勤時間',
  dependents: '扶養家族数（配偶者を除く）',
  maritalStatus: '配偶者',
  requests: '本人希望記入欄',
};

// 既存の自由記述文字列（改行区切り）を行リストの初期値として取り込む。
// すでに行リストがあればそれを優先し、無ければ従来の文字列から1行=1行として復元する
// （提出済みデータの内容をCA画面上で失わないようにするための橋渡し）。
function seedRows(rows: HistoryRow[] | undefined, legacyText: string | undefined): HistoryRow[] {
  if (rows && rows.length > 0) return rows;
  const lines = (legacyText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [{ ...EMPTY_HISTORY_ROW }];
  return lines.map((line) => ({ ...EMPTY_HISTORY_ROW, content: line }));
}

function historyRowsToText(rows?: HistoryRow[]): string {
  if (!rows || rows.length === 0) return '';
  return rows
    .filter((r) => r.year || r.month || r.content)
    .map((r) => [r.year && `${r.year}年`, r.month && `${r.month}月`, r.content].filter(Boolean).join(' '))
    .join('\n');
}

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
  draft: Partial<AdminFormData> | null;
  submittedData: Partial<AdminFormData> | null;
  submittedAt: string | null;
  caId: string | null;
  createdAt: string;
}

interface CA {
  id: string;
  name: string;
}

interface Revision {
  id: string;
  snapshot: Partial<AdminFormData>;
  changedBy: string;
  createdAt: string;
}

// 学歴・職歴・免許資格の「年・月・内容」行を追加/削除できる動的リストエディタ。
function HistoryRowEditor({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: HistoryRow[];
  onChange: (rows: HistoryRow[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}（年・月・内容）</label>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              value={row.year}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], year: e.target.value };
                onChange(next);
              }}
              placeholder="年"
              className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm"
            />
            <input
              value={row.month}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], month: e.target.value };
                onChange(next);
              }}
              placeholder="月"
              className="w-14 rounded-lg border border-gray-300 px-2 py-2 text-sm"
            />
            <input
              value={row.content}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], content: e.target.value };
                onChange(next);
              }}
              placeholder="内容（例: 〇〇高等学校 卒業）"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                onChange(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ ...EMPTY_HISTORY_ROW }])
              }
              className="text-xs text-red-500 shrink-0 py-2"
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...rows, { ...EMPTY_HISTORY_ROW }])}
          className="text-xs font-semibold text-brand w-fit"
        >
          + 行を追加
        </button>
      </div>
    </div>
  );
}

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<AdminFormData>({ ...EMPTY_RESUME, ...EMPTY_JIS_EXTRA, ...EMPTY_JIS_HISTORY });
  const [cas, setCas] = useState<CA[]>([]);
  const [selectedCaId, setSelectedCaId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savingCa, setSavingCa] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [reissuedUrl, setReissuedUrl] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [expandedRevisionId, setExpandedRevisionId] = useState<string | null>(null);

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

    const submitted = (d.submittedData ?? d.draft ?? {}) as Partial<AdminFormData>;
    setForm({
      ...EMPTY_RESUME,
      ...EMPTY_JIS_EXTRA,
      ...EMPTY_JIS_HISTORY,
      ...submitted,
      educationHistory: seedRows(submitted.educationHistory, submitted.education),
      workHistoryRows: seedRows(submitted.workHistoryRows, submitted.workHistory),
      qualificationRows: seedRows(submitted.qualificationRows, submitted.qualifications),
    });
    setSelectedCaId(d.caId ?? '');

    // 修正履歴取得
    const revRes = await fetch(`/api/admin/applicants/${id}/revisions`, { cache: 'no-store' });
    if (revRes.ok) {
      const revJson = await revRes.json();
      setRevisions(revJson.revisions ?? []);
    }
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
        {RESUME_FIELDS.map(({ key, multiline }) => {
          const historyKey = HISTORY_ARRAY_KEY[key];
          if (historyKey) {
            return (
              <HistoryRowEditor
                key={key}
                label={t(`form.fields.${key}`)}
                rows={form[historyKey]}
                onChange={(rows) => setForm((p) => ({ ...p, [historyKey]: rows }))}
              />
            );
          }
          return (
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
          );
        })}

        {/* JIS履歴書 追加項目（CA専用・求職者向けフォームには出さない） */}
        <div className="border-t border-gray-200 pt-3 mt-1 flex flex-col gap-3">
          <p className="text-xs text-gray-400">JIS履歴書 追加項目（CA入力）</p>
          <div>
            <label className="block text-sm font-semibold mb-1">{ADMIN_EXTRA_LABELS.commuteTime}</label>
            <input
              value={form.commuteTime}
              onChange={(e) => setForm((p) => ({ ...p, commuteTime: e.target.value }))}
              placeholder="例: 約45分"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{ADMIN_EXTRA_LABELS.dependents}</label>
            <input
              value={form.dependents}
              onChange={(e) => setForm((p) => ({ ...p, dependents: e.target.value }))}
              placeholder="例: 0人"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{ADMIN_EXTRA_LABELS.maritalStatus}</label>
            <select
              value={form.maritalStatus}
              onChange={(e) => setForm((p) => ({ ...p, maritalStatus: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="">未入力</option>
              <option value="有">有</option>
              <option value="無">無</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{ADMIN_EXTRA_LABELS.requests}</label>
            <textarea
              value={form.requests}
              onChange={(e) => setForm((p) => ({ ...p, requests: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 resize-y"
            />
          </div>
        </div>

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
            href={`/api/pdf/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-lg border border-brand text-brand font-semibold px-6 py-2.5 hover:bg-brand/5"
          >
            ⬇ {t('admin.pdf')}
          </a>
        </div>
      </div>

      {/* 修正履歴 */}
      <div className="bg-white rounded-2xl shadow-md p-5 mt-6">
        <h2 className="text-lg font-bold mb-3">{t('admin.history.title')}</h2>
        {revisions.length === 0 ? (
          <p className="text-gray-400 text-sm">{t('admin.history.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {revisions.map((rev) => {
              const expanded = expandedRevisionId === rev.id;
              return (
                <li key={rev.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">
                        {rev.changedBy === 'self' ? t('admin.history.self') : rev.changedBy}
                      </span>
                      <span className="text-gray-400 ml-2">
                        {new Date(rev.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedRevisionId(expanded ? null : rev.id)}
                      className="text-xs font-semibold text-brand"
                    >
                      {expanded ? t('admin.history.collapse') : t('admin.history.expand')}
                    </button>
                  </div>
                  {expanded && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {RESUME_FIELDS.filter(({ key }) => !HISTORY_ARRAY_KEY[key]).map(({ key }) => (
                        <div key={key} className="text-xs">
                          <p className="text-gray-500">{t(`form.fields.${key}`)}</p>
                          <p className="break-words">{rev.snapshot[key] || '—'}</p>
                        </div>
                      ))}
                      {(['educationHistory', 'workHistoryRows', 'qualificationRows'] as const).map((key) => (
                        <div key={key} className="text-xs">
                          <p className="text-gray-500">
                            {t(`form.fields.${key === 'educationHistory' ? 'education' : key === 'workHistoryRows' ? 'workHistory' : 'qualifications'}`)}
                          </p>
                          <p className="break-words whitespace-pre-wrap">
                            {historyRowsToText(rev.snapshot[key]) || '—'}
                          </p>
                        </div>
                      ))}
                      {(Object.keys(ADMIN_EXTRA_LABELS) as Array<keyof JisExtraFields>).map((key) => (
                        <div key={key} className="text-xs">
                          <p className="text-gray-500">{ADMIN_EXTRA_LABELS[key]}</p>
                          <p className="break-words">{rev.snapshot[key] || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
