'use client';

// 画面②: 自動入力済みフォーム。低confidence項目は黄色ハイライト。下書き自動保存。
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { EMPTY_RESUME, RESUME_FIELDS, REQUIRED_FIELDS, type ResumeData } from '@/lib/resumeFields';
import { fetchApplicant, saveDraft, submitResume } from '@/lib/applicantClient';

const LOW_CONFIDENCE = 0.9;

export default function ApplicantFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, setLocale } = useI18n();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<ResumeData>(EMPTY_RESUME);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [ocrFailed, setOcrFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchApplicant(token).then((r) => {
      if ('error' in r) {
        router.replace(`/a/${token}`);
        return;
      }
      if (r.submitted) {
        router.replace(`/a/${token}/done`);
        return;
      }
      if (LOCALES.includes(r.locale as Locale)) setLocale(r.locale as Locale);
      setForm({ ...EMPTY_RESUME, ...r.prefill });
      setConfidence(r.confidence ?? {});
      setOcrFailed(r.ocrStatus === 'failed');
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 下書き自動保存（1.5秒デバウンス）
  const scheduleSave = useCallback(
    (next: ResumeData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void saveDraft(token, next), 1500);
    },
    [token]
  );

  const update =
    (key: keyof ResumeData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => {
        const next = { ...prev, [key]: e.target.value };
        scheduleSave(next);
        return next;
      });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, boolean> = {};
    for (const key of REQUIRED_FIELDS) {
      if (!form[key].trim()) nextErrors[key] = true;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = document.getElementById(Object.keys(nextErrors)[0]);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSending(true);
    const res = await submitResume(token, form);
    setSending(false);
    if (res.ok) router.replace(`/a/${token}/done`);
  };

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">{t('common.loading')}</p>
      </main>
    );
  }

  // OCRで値が入り、かつ確度が低い項目 → 黄色ハイライト
  const isLowConfidence = (key: string) =>
    key in confidence && confidence[key] < LOW_CONFIDENCE && !!form[key as keyof ResumeData];

  return (
    <main className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('a.form.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-gray-500 text-sm mb-4">{t('a.form.subtitle')}</p>
      {ocrFailed && (
        <p className="mb-4 rounded-lg bg-orange-50 border border-orange-300 text-orange-700 text-sm px-4 py-3">
          {t('a.ocrFailed')}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
        {RESUME_FIELDS.map(({ key, multiline, type }) => {
          const required = REQUIRED_FIELDS.includes(key);
          const low = isLowConfidence(key);
          const base = `w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand ${
            low ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
          }`;
          return (
            <div key={key}>
              <label htmlFor={key} className="block font-semibold mb-1 text-sm">
                {t(`form.fields.${key}`)}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {multiline ? (
                <textarea
                  id={key}
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={t(`form.placeholders.${key}`)}
                  rows={3}
                  className={`${base} resize-y`}
                />
              ) : (
                <input
                  id={key}
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={t(`form.placeholders.${key}`)}
                  className={base}
                />
              )}
              {low && <p className="text-yellow-600 text-xs mt-1">⚠ {t('a.form.lowConfidence')}</p>}
              {errors[key] && <p className="text-red-500 text-xs mt-1">{t('a.form.validationRequired')}</p>}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={sending}
          className="mt-2 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-50 text-white text-lg font-bold py-4 transition-colors"
        >
          {sending ? t('common.loading') : t('common.submit')}
        </button>
      </form>
    </main>
  );
}
