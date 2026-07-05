// 履歴書フィールド定義（v2.0）。在留カードOCRで自動入力される項目と本人入力項目。
export interface ResumeData {
  fullName: string; // 氏名（カードから）
  furigana: string; // ふりがな（本人）
  birthDate: string; // 生年月日（カードから）
  gender: string; // 性別（カードから）
  nationality: string; // 国籍（カードから）
  address: string; // 住所（カードから）
  phone: string; // 電話番号（本人）
  email: string; // メール（本人）
  visaStatus: string; // 在留資格（カードから）
  visaExpiry: string; // 在留期限（カードから）
  education: string; // 学歴（本人）
  workHistory: string; // 職歴（本人）
  qualifications: string; // 免許・資格（本人）
  motivation: string; // 志望動機（本人）
}

export const EMPTY_RESUME: ResumeData = {
  fullName: '',
  furigana: '',
  birthDate: '',
  gender: '',
  nationality: '',
  address: '',
  phone: '',
  email: '',
  visaStatus: '',
  visaExpiry: '',
  education: '',
  workHistory: '',
  qualifications: '',
  motivation: '',
};

// フォーム描画順。ocr=true はカード自動入力対象（低confidenceで黄色ハイライト）。
export const RESUME_FIELDS: Array<{ key: keyof ResumeData; multiline: boolean; ocr: boolean; type?: string }> = [
  { key: 'fullName', multiline: false, ocr: true },
  { key: 'furigana', multiline: false, ocr: false },
  { key: 'birthDate', multiline: false, ocr: true, type: 'date' },
  { key: 'gender', multiline: false, ocr: true },
  { key: 'nationality', multiline: false, ocr: true },
  { key: 'address', multiline: false, ocr: true },
  { key: 'phone', multiline: false, ocr: false, type: 'tel' },
  { key: 'email', multiline: false, ocr: false, type: 'email' },
  { key: 'visaStatus', multiline: false, ocr: true },
  { key: 'visaExpiry', multiline: false, ocr: true, type: 'date' },
  { key: 'education', multiline: true, ocr: false },
  { key: 'workHistory', multiline: true, ocr: false },
  { key: 'qualifications', multiline: true, ocr: false },
  { key: 'motivation', multiline: true, ocr: false },
];

export const REQUIRED_FIELDS: Array<keyof ResumeData> = ['fullName', 'birthDate', 'nationality'];
