// 在留カード情報の入力バリデーション（詳細設計書 v1.0 セクション 3.1 / 4.1 準拠）。
// react-hook-form の zodResolver から利用するほか、単体でも import して使える。
import { z } from 'zod';

// 在留資格コード一覧（詳細設計書 4.1 の statusOfResidenceCode enum 相当）。
// 正式なコード表は法務省告示ベースだが、本設計書では代表的な区分のみ明記されているため、
// 実務でよく使う区分を暫定コードとして定義。最終確定は法務チーム確認待ち（設計書 7章参照）。
export const STATUS_OF_RESIDENCE_OPTIONS = [
  { code: '10', label: '技術・人文知識・国際業務' },
  { code: '20', label: '永住者' },
  { code: '21', label: '定住者' },
  { code: '30', label: '技能実習' },
  { code: '40', label: '特定技能' },
  { code: '50', label: '留学' },
  { code: '60', label: '家族滞在' },
  { code: '70', label: '日本人の配偶者等' },
  { code: '80', label: '永住者の配偶者等' },
  { code: '90', label: 'その他' },
] as const;

// 活動制限コード一覧（詳細設計書 4.1 の activityRestriction enum 相当）。
export const ACTIVITY_RESTRICTION_OPTIONS = [
  { code: '01', label: '制限なし' },
  { code: '02', label: '指定機関内で就労可' },
  { code: '03', label: '資格外活動許可の範囲内で就労可' },
  { code: '04', label: '就労不可' },
] as const;

const STATUS_CODES: string[] = STATUS_OF_RESIDENCE_OPTIONS.map((o) => o.code);
const ACTIVITY_CODES: string[] = ACTIVITY_RESTRICTION_OPTIONS.map((o) => o.code);

// 半角英数16文字（設計書 4.1: /^[A-Z0-9]{16}$/、例: ZZAA1234B5678901）。
const CARD_NUMBER_REGEX = /^[A-Z0-9]{16}$/;
// 全角カタカナ + スペース、1〜50字（設計書 3.1: 「テスト タロウ」等）。
const KANA_NAME_REGEX = /^[ァ-ヶーゝゞ\s　]{1,50}$/;

function isPastDate(value: string): boolean {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export const zairyuCardFormSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(
      z
        .string()
        .regex(CARD_NUMBER_REGEX, '在留カード番号は半角英数16文字で入力してください（例: ZZAA1234B5678901）')
    ),
  cardholderNameKana: z
    .string()
    .trim()
    .pipe(
      z
        .string()
        .min(1, 'カード上のお名前（カナ）を入力してください')
        .max(50, '50文字以内で入力してください')
        .regex(KANA_NAME_REGEX, '全角カタカナで入力してください（例: テスト タロウ）')
    ),
  validityDate: z
    .string()
    .min(1, '有効期限を入力してください')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: '日付の形式が正しくありません' })
    .refine((v) => !isPastDate(v), { message: '過去の日付は指定できません' }),
  statusOfResidenceCode: z
    .string()
    .min(1, '在留資格を選択してください')
    .refine((v) => STATUS_CODES.includes(v), { message: '在留資格を選択してください' }),
  activityRestriction: z
    .string()
    .min(1, '活動制限を選択してください')
    .refine((v) => ACTIVITY_CODES.includes(v), { message: '活動制限を選択してください' }),
  consentGiven: z.boolean().refine((v) => v === true, {
    message: '個人情報保護法・入管法に基づく本情報の取扱いについて同意が必要です',
  }),
});

export type ZairyuCardFormValues = z.infer<typeof zairyuCardFormSchema>;

export interface ZairyuValidationResult {
  success: boolean;
  data?: ZairyuCardFormValues;
  fieldErrors: Partial<Record<keyof ZairyuCardFormValues, string>>;
}

// react-hook-form を使わない箇所（例: ユニットテスト・将来のサーバー側再利用）向けの単体バリデーション関数。
export function validateZairyuCardForm(input: unknown): ZairyuValidationResult {
  const result = zairyuCardFormSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data, fieldErrors: {} };
  }
  const fieldErrors: Partial<Record<keyof ZairyuCardFormValues, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ZairyuCardFormValues | undefined;
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return { success: false, fieldErrors };
}

export function findStatusLabel(code: string): string {
  return STATUS_OF_RESIDENCE_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

export function findActivityLabel(code: string): string {
  return ACTIVITY_RESTRICTION_OPTIONS.find((o) => o.code === code)?.label ?? code;
}
