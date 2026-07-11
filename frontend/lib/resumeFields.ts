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
