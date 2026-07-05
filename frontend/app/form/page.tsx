'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  EMPTY_RESUME,
  RESUME_FIELDS,
  loadResume,
  saveResume,
  type ResumeData,
} from '@/lib/resumeStore';

// 8-item resume form (task: pages/form.tsx). Multilingual via i18n.
// The 8 fields are the standard rirekisho basics:
// 氏名 / 生年月日 / 住所 / 電話番号 / メール / 学歴 / 職歴 / 志望動機.
export default function FormPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState<ResumeData>(EMPTY_RESUME);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Rehydrate any previously saved draft.
  useEffect(() => {
    const saved = loadResume();
    if (saved) setForm(saved.data);
  }, []);

  const update =
    (key: keyof ResumeData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Minimal validation: name + email required.
    const nextErrors: Record<string, boolean> = {};
    if (!form.fullName.trim()) nextErrors.fullName = true;
    if (!form.email.trim()) nextErrors.email = true;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    saveResume(form, locale);
    router.push('/preview');
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('form.title')}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-gray-500 mb-6">{t('form.subtitle')}</p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-md p-7 flex flex-col gap-5"
      >
        {RESUME_FIELDS.map(({ key, multiline }) => {
          const required = key === 'fullName' || key === 'email';
          return (
            <div key={key}>
              <label htmlFor={key} className="block font-semibold mb-1.5">
                {t(`form.fields.${key}`)}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {multiline ? (
                <textarea
                  id={key}
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={t(`form.placeholders.${key}`)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-brand"
                />
              ) : (
                <input
                  id={key}
                  type={key === 'email' ? 'email' : key === 'birthDate' ? 'date' : 'text'}
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={t(`form.placeholders.${key}`)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              )}
              {errors[key] && (
                <p className="text-red-500 text-sm mt-1">{t('form.validationRequired')}</p>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          className="mt-2 self-end rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-2.5 transition-colors"
        >
          {t('form.preview')}
        </button>
      </form>
    </main>
  );
}
