// 履歴書フィールド定義（v2.1）。在留カードOCRで自動入力される項目と本人入力項目。
export interface ResumeData {
  // === 在留カード情報セクション（6項目）===
  fullName: string; // 氏名（カードから）
  birthDate: string; // 生年月日（カードから）
  nationality: string; // 国籍（カードから）
  visaStatus: string; // 在留資格（カードから）
  visaExpiry: string; // 在留期限（カードから）
  workRestriction: string; // 就労制限（カードから）

  // === その他基本情報 ===
  furigana: string; // ふりがな（本人）
  gender: string; // 性別（カードから）
  address: string; // 住所（カードから）
  phone: string; // 電話番号（本人）
  email: string; // メール（本人）

  // === 職務経歴・スキル ===
  education: string; // 学歴（本人）
  workHistory: string; // 職歴（本人）
  qualifications: string; // 免許・資格（本人）
  motivation: string; // 志望動機（本人）
}

export const EMPTY_RESUME: ResumeData = {
  fullName: '',
  birthDate: '',
  nationality: '',
  visaStatus: '',
  visaExpiry: '',
  workRestriction: '',
  furigana: '',
  gender: '',
  address: '',
  phone: '',
  email: '',
  education: '',
  workHistory: '',
  qualifications: '',
  motivation: '',
};

// フォーム描画順。ocr=true はカード自動入力対象（低confidenceで黄色ハイライト）。
export const RESUME_FIELDS: Array<{ key: keyof ResumeData; multiline: boolean; ocr: boolean; type?: string; section?: string }> = [
  // === 在留カード情報セクション（6項目） ===
  { key: 'fullName', multiline: false, ocr: true, section: 'visa' },
  { key: 'birthDate', multiline: false, ocr: true, type: 'date', section: 'visa' },
  { key: 'nationality', multiline: false, ocr: true, section: 'visa' },
  { key: 'visaStatus', multiline: false, ocr: true, section: 'visa' },
  { key: 'visaExpiry', multiline: false, ocr: true, type: 'date', section: 'visa' },
  { key: 'workRestriction', multiline: false, ocr: true, section: 'visa' },

  // === その他基本情報 ===
  { key: 'furigana', multiline: false, ocr: false },
  { key: 'gender', multiline: false, ocr: true },
  { key: 'address', multiline: false, ocr: true },
  { key: 'phone', multiline: false, ocr: false, type: 'tel' },
  { key: 'email', multiline: false, ocr: false, type: 'email' },

  // === 職務経歴・スキル ===
  { key: 'education', multiline: true, ocr: false },
  { key: 'workHistory', multiline: true, ocr: false },
  { key: 'qualifications', multiline: true, ocr: false },
  { key: 'motivation', multiline: true, ocr: false },
];

export const REQUIRED_FIELDS: Array<keyof ResumeData> = ['fullName', 'birthDate', 'nationality', 'visaStatus', 'visaExpiry'];

// === JIS履歴書 追加項目（CA専用・管理画面のみで入力） ===
// Applicant に対応する Prisma 列は無く、submittedData/draft の JSON blob 内の
// キーとしてのみ存在する（= migration 不要）。求職者向けフォーム
// （app/a/[token]/form, app/my/[token]）には出さない。

// 学歴・職歴・免許資格の「年・月・内容」行。
export interface HistoryRow {
  year: string;
  month: string;
  content: string;
}

export const EMPTY_HISTORY_ROW: HistoryRow = { year: '', month: '', content: '' };

// 学歴・職歴・免許資格を行リストとして持つ（既存の education/workHistory/qualifications
// という自由記述の文字列キーとは別名にして、求職者側の初回提出フォームが書き込む
// 文字列データと型が衝突しないようにする＝互換性を壊さない）。
export interface JisHistoryFields {
  educationHistory: HistoryRow[];
  workHistoryRows: HistoryRow[];
  qualificationRows: HistoryRow[];
}

export const EMPTY_JIS_HISTORY: JisHistoryFields = {
  educationHistory: [],
  workHistoryRows: [],
  qualificationRows: [],
};

// 志望動機・自己PR以外の残り4項目（配偶者・扶養家族数・通勤時間・本人希望記入欄）。
export interface JisExtraFields {
  maritalStatus: string; // 配偶者（有・無）
  dependentsCount: string; // 扶養家族数（配偶者を除く）
  commuteTime: string; // 通勤時間
  requests: string; // 本人希望記入欄
}

export const EMPTY_JIS_EXTRA: JisExtraFields = {
  maritalStatus: '',
  dependentsCount: '',
  commuteTime: '',
  requests: '',
};

function sanitizeHistoryRows(v: unknown, maxRows = 30): HistoryRow[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, maxRows).map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    return {
      year: typeof r.year === 'string' ? r.year.slice(0, 20) : '',
      month: typeof r.month === 'string' ? r.month.slice(0, 20) : '',
      content: typeof r.content === 'string' ? r.content.slice(0, 500) : '',
    };
  });
}

// submittedData/draft の JSON blob（未知キー許容）から JIS 追加項目一式を
// ホワイトリスト方式で安全に取り出す（admin PUT ルートと PDF 生成の両方で使う）。
export function pickJisExtra(source: Record<string, unknown> | null | undefined): JisExtraFields & JisHistoryFields {
  const src = source ?? {};
  const pickStr = (key: keyof JisExtraFields): string => {
    const v = src[key];
    return typeof v === 'string' ? v.slice(0, 4000) : '';
  };
  return {
    maritalStatus: pickStr('maritalStatus'),
    dependentsCount: pickStr('dependentsCount'),
    commuteTime: pickStr('commuteTime'),
    requests: pickStr('requests'),
    educationHistory: sanitizeHistoryRows(src.educationHistory),
    workHistoryRows: sanitizeHistoryRows(src.workHistoryRows),
    qualificationRows: sanitizeHistoryRows(src.qualificationRows),
  };
}
