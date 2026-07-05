// Client-side resume draft store, persisted to localStorage.
// Lets the form page hand its data to the preview page without a backend round-trip.
import type { Locale } from '@/lib/i18n';

// The 8 standard resume fields (basic Japanese-style rirekisho items).
export interface ResumeData {
  fullName: string; // 氏名
  birthDate: string; // 生年月日
  address: string; // 住所
  phone: string; // 電話番号
  email: string; // メールアドレス
  education: string; // 学歴
  workHistory: string; // 職歴
  motivation: string; // 志望動機
}

export const EMPTY_RESUME: ResumeData = {
  fullName: '',
  birthDate: '',
  address: '',
  phone: '',
  email: '',
  education: '',
  workHistory: '',
  motivation: '',
};

// Ordered list of the 8 fields, used to render form + preview consistently.
export const RESUME_FIELDS: Array<{ key: keyof ResumeData; multiline: boolean }> = [
  { key: 'fullName', multiline: false },
  { key: 'birthDate', multiline: false },
  { key: 'address', multiline: false },
  { key: 'phone', multiline: false },
  { key: 'email', multiline: false },
  { key: 'education', multiline: true },
  { key: 'workHistory', multiline: true },
  { key: 'motivation', multiline: true },
];

const STORAGE_KEY = 'resume-maker.draft';

export function saveResume(data: ResumeData, locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, locale }));
  } catch {
    // ignore storage errors
  }
}

export function loadResume(): { data: ResumeData; locale: Locale } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data) {
      return { data: { ...EMPTY_RESUME, ...parsed.data }, locale: parsed.locale ?? 'ja' };
    }
    return null;
  } catch {
    return null;
  }
}
