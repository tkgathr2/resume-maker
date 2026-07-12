'use client';

// 「後から修正」本人ページ: 提出済み内容をプリフィル表示し、上書き保存できる。
import { use, useEffect, useState } from 'react';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { useToast } from '@/lib/useToast';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Spinner from '@/components/Spinner';
import ErrorScreen from '@/components/ErrorScreen';
import { EMPTY_RESUME, RESUME_FIELDS, REQUIRED_FIELDS, type ResumeData } from '@/lib/resumeFields';

export default function MyEditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, setLocale } = useI18n();
  const { show: showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<ResumeData>(EMPTY_RESUME);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/my/${token}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          setLoadError(true);
          return;
        }
        const json = await res.json();
        if (LOCALES.includes(json.locale as Locale)) setLocale(json.locale as Locale);
        setForm({ ...EMPTY_RESUME, ...json.data });
        setReady(true);
      })
      .catch(() => setLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const update =
    (key: keyof ResumeData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, boolean> = {};
    for (const key of REQUIRED_FIELDS) {
      if (!form[key].trim()) nextErrors[key] = true;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast(`${Object.keys(nextErrors).length} field(s) required`, 'error');
      const first = document.getElementById(Object.keys(nextErrors)[0]);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/my/${token}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(t('my.form.saved'), 'success');
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(`Error: ${body.error ?? res.status}`, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return <ErrorScreen errorKey="my.invalid.message" showHome={true} />;
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

  return (
    <main className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('my.form.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-gray-600 text-sm mb-4">{t('my.form.subtitle')}</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-6" noValidate>
        {RESUME_FIELDS.map(({ key, multiline, type }) => {
          const required = REQUIRED_FIELDS.includes(key);
          const hasError = errors[key];
          const base = `w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-2 transition-all ${
            hasError ? 'border-red-400 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-brand'
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
                />
              )}
              {hasError && <p className="text-red-500 text-xs mt-1">{t('a.form.validationRequired')}</p>}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 transition-colors flex items-center justify-center gap-2"
          aria-busy={saving}
        >
          {saving && <Spinner size="sm" />}
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </form>
    </main>
  );
}
