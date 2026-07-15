import { ResumeData } from './resumeFields';

export interface JisResumeData extends ResumeData {
  // === JIS特有項目（PDF枠外に記載） ===
  commuteTime?: string; // 約45分
  dependents?: string; // 0人
  maritalStatus?: string; // 無/有
  requests?: string; // 特になし

  // === 構造化履歴行（フリーテキストの代替）===
  educationHistory?: Array<{ year: string; month: string; content: string }>;
  workHistoryRows?: Array<{ year: string; month: string; content: string }>;
  qualificationRows?: Array<{ year: string; month: string; content: string }>;
}

/**
 * ResumeData → JisResumeData へ変換
 * OCR/下書き結果をJIS履歴書フォーマットにマッピング
 */
export function mapResumeToJis(base: ResumeData, jisFields?: Partial<JisResumeData>): JisResumeData {
  return {
    ...base,
    commuteTime: jisFields?.commuteTime,
    dependents: jisFields?.dependents,
    maritalStatus: jisFields?.maritalStatus,
    requests: jisFields?.requests,
    educationHistory: jisFields?.educationHistory,
    workHistoryRows: jisFields?.workHistoryRows,
    qualificationRows: jisFields?.qualificationRows,
  };
}

/**
 * 本人修正の下書きをマージ
 * （求職者がフォームで修正した値が優先される）
 */
export function mergeWithFormData(mapped: JisResumeData, formData: Partial<ResumeData>): JisResumeData {
  return {
    ...mapped,
    ...formData,
  };
}
