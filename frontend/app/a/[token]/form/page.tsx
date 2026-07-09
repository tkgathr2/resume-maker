'use client';

// 画面②: 自動入力済みフォーム。低confidence項目は黄色ハイライト。下書き自動保存。
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { useToast } from '@/lib/useToast';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Spinner from '@/components/Spinner';
import { EMPTY_RESUME, RESUME_FIELDS, REQUIRED_FIELDS, type ResumeData } from '@/lib/resumeFields';
import { fetchApplicant, saveDraft, submitResume } from '@/lib/applicantClient';

const LOW_CONFIDENCE = 0.9;

export default function ApplicantFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, setLocale } = useI18n();
  const router = useRouter();
  const { show: showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<ResumeData>(EMPTY_RESUME);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [ocrFailed, setOcrFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchApplicant(token).then((r) => {
      if ('error' in r) {
        setLoadError(r.error === 'http_404' ? 'notFound' : r.error);
        showToast(`Error: ${r.error}`, 'error');
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
    setServerErrors({});
    if (Object.keys(nextErrors).length > 0) {
      showToast(`${Object.keys(nextErrors).length} field(s) required`, 'error');
      const first = document.getElementById(Object.keys(nextErrors)[0]);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSending(true);
    const res = await submitResume(token, form);
    setSending(false);
    if (res.ok) {
      showToast('Resume submitted successfully', 'success');
      router.replace(`/a/${token}/done`);
    } else if (res.error) {
      showToast(`Error: ${res.error}`, 'error');
      if (res.fields?.length) {
        const fieldErrors: Record<string, string> = {};
        res.fields.forEach((f) => {
          fieldErrors[f] = 'Invalid or required';
        });
        setServerErrors(fieldErrors);
      }
    }
  };

  if (loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="rounded-lg bg-red-50 border border-red-300 text-red-700 px-6 py-4 text-center max-w-md">
          <h2 className="font-bold mb-2">{t('common.error')}</h2>
          <p className="text-sm">
            {loadError === 'notFound' ? 'Token not found or expired' : loadError}
          </p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner size="md" />
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
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

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4" noValidate>
        {RESUME_FIELDS.map(({ key, multiline, type }) => {
          const required = REQUIRED_FIELDS.includes(key);
          const low = isLowConfidence(key);
          const hasError = errors[key] || serverErrors[key];
          const errorMsg = serverErrors[key] || (errors[key] ? t('a.form.validationRequired') : '');
          const base = `w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-2 transition-all ${
            hasError
              ? 'border-red-400 bg-red-50 focus:ring-red-500'
              : low
                ? 'border-yellow-400 bg-yellow-50 focus:ring-brand'
                : 'border-gray-300 focus:ring-brand'
          }`;
          return (
            <div key={key}>
              <label htmlFor={key} className="block font-semibold mb-1 text-sm">
                {t(`form.fields.${key}`)}
                {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
              </label>
              {multiline ? (
                <textarea
                  id={key}
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={t(`form.placeholders.${key}`)}
                  rows={3}
                  className={`${base} resize-y`}
                  aria-invalid={!!hasError}
                  aria-describedby={hasError ? `${key}-error` : undefined}
                />
              ) : (
                <input
                  id={key}
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={t(`form.placeholders.${key}`)}
                  className={base}
                  aria-invalid={!!hasError}
                  aria-describedby={hasError ? `${key}-error` : low ? `${key}-confidence` : undefined}
                />
              )}
              {low && !hasError && (
                <p id={`${key}-confidence`} className="text-yellow-600 text-xs mt-1">
                  ⚠ {t('a.form.lowConfidence')}
                </p>
              )}
              {hasError && (
                <p id={`${key}-error`} className="text-red-500 text-xs mt-1">
                  {errorMsg}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={sending}
          className="mt-2 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 transition-colors flex items-center justify-center gap-2"
          aria-busy={sending}
        >
          {sending && <Spinner size="sm" />}
          {sending ? t('common.loading') : t('common.submit')}
        </button>
      </form>
    </main>
  );
}
