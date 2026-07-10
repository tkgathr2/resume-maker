'use client';

// 求職者向け在留カード入力フォーム（詳細設計書 3.1 準拠）。
// react-hook-form + zod でリアルタイム（blur）バリデーションを行い、
// POST /api/zairyu/create-or-update に送信する。
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/lib/useToast';
import {
  ACTIVITY_RESTRICTION_OPTIONS,
  STATUS_OF_RESIDENCE_OPTIONS,
  zairyuCardFormSchema,
  type ZairyuCardFormValues,
} from '@/lib/zairyu-validation';
import type { ZairyuApiErrorResponse, ZairyuCard } from '@/lib/zairyu-types';
import { zairyuFetch } from '@/lib/zairyu-api';

export interface ZairyuCardFormProps {
  jobSeekerId: string; // OAuth token から取得（サーバー側で再検証されるため送信は不要）
  initialData?: Partial<ZairyuCard> | null; // edit mode 用の auto-fill データ
  onSuccess?: (card: ZairyuCard) => void;
}

const INPUT_BASE =
  'w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-2 transition-all';
const OK_BORDER = 'border-gray-300 focus:ring-brand';
const ERR_BORDER = 'border-red-400 bg-red-50 focus:ring-red-500';

function toDefaultValues(data?: Partial<ZairyuCard> | null): ZairyuCardFormValues {
  return {
    cardNumber: data?.cardNumber ?? '',
    cardholderNameKana: data?.cardholderNameKana ?? '',
    validityDate: data?.validityDate ? data.validityDate.slice(0, 10) : '',
    statusOfResidenceCode: data?.statusOfResidenceCode ?? '',
    activityRestriction: data?.activityRestriction ?? '',
    consentGiven: data?.consentGiven ?? false,
  };
}

export const ZairyuCardForm: React.FC<ZairyuCardFormProps> = ({
  jobSeekerId,
  initialData,
  onSuccess,
}) => {
  const { show: showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ZairyuCardFormValues>({
    resolver: zodResolver(zairyuCardFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: toDefaultValues(initialData),
  });

  // jobSeekerId の切替や initialData のロード完了時にフォームを再同期。
  useEffect(() => {
    reset(toDefaultValues(initialData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, jobSeekerId]);

  const onSubmit = async (values: ZairyuCardFormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await zairyuFetch('/create-or-update', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err = json as ZairyuApiErrorResponse | null;
        const message = err?.error ?? 'サーバーエラーが発生しました';
        setServerError(message);
        showToast(`エラー: ${message}`, 'error');
        err?.fields?.forEach((field) => {
          setError(field as keyof ZairyuCardFormValues, { type: 'server', message });
        });
        return;
      }
      showToast('在留カード情報を保存しました', 'success');
      onSuccess?.(json as ZairyuCard);
    } catch {
      setServerError('通信エラーが発生しました');
      showToast('通信エラーが発生しました', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4"
      noValidate
    >
      {serverError && (
        <p className="rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3">
          {serverError}
        </p>
      )}

      {/* 在留カード番号 */}
      <div>
        <label htmlFor="cardNumber" className="block font-semibold mb-1 text-sm">
          在留カード番号
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <input
          id="cardNumber"
          type="text"
          placeholder="ZZAA1234B5678901"
          maxLength={16}
          {...register('cardNumber')}
          className={`${INPUT_BASE} ${errors.cardNumber ? ERR_BORDER : OK_BORDER}`}
          aria-invalid={!!errors.cardNumber}
          aria-describedby={errors.cardNumber ? 'cardNumber-error' : undefined}
        />
        {errors.cardNumber && (
          <p id="cardNumber-error" className="text-red-500 text-xs mt-1">
            {errors.cardNumber.message}
          </p>
        )}
      </div>

      {/* カード上のお名前（カナ） */}
      <div>
        <label htmlFor="cardholderNameKana" className="block font-semibold mb-1 text-sm">
          カード上のお名前（カナ）
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <input
          id="cardholderNameKana"
          type="text"
          placeholder="テスト タロウ"
          {...register('cardholderNameKana')}
          className={`${INPUT_BASE} ${errors.cardholderNameKana ? ERR_BORDER : OK_BORDER}`}
          aria-invalid={!!errors.cardholderNameKana}
          aria-describedby={errors.cardholderNameKana ? 'cardholderNameKana-error' : undefined}
        />
        {errors.cardholderNameKana && (
          <p id="cardholderNameKana-error" className="text-red-500 text-xs mt-1">
            {errors.cardholderNameKana.message}
          </p>
        )}
      </div>

      {/* 有効期限 */}
      <div>
        <label htmlFor="validityDate" className="block font-semibold mb-1 text-sm">
          有効期限
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <input
          id="validityDate"
          type="date"
          {...register('validityDate')}
          className={`${INPUT_BASE} ${errors.validityDate ? ERR_BORDER : OK_BORDER}`}
          aria-invalid={!!errors.validityDate}
          aria-describedby={errors.validityDate ? 'validityDate-error' : undefined}
        />
        {errors.validityDate && (
          <p id="validityDate-error" className="text-red-500 text-xs mt-1">
            {errors.validityDate.message}
          </p>
        )}
      </div>

      {/* 在留資格 */}
      <div>
        <label htmlFor="statusOfResidenceCode" className="block font-semibold mb-1 text-sm">
          在留資格
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <select
          id="statusOfResidenceCode"
          {...register('statusOfResidenceCode')}
          className={`${INPUT_BASE} ${errors.statusOfResidenceCode ? ERR_BORDER : OK_BORDER}`}
          aria-invalid={!!errors.statusOfResidenceCode}
          aria-describedby={errors.statusOfResidenceCode ? 'statusOfResidenceCode-error' : undefined}
          defaultValue=""
        >
          <option value="" disabled>
            選択してください
          </option>
          {STATUS_OF_RESIDENCE_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.statusOfResidenceCode && (
          <p id="statusOfResidenceCode-error" className="text-red-500 text-xs mt-1">
            {errors.statusOfResidenceCode.message}
          </p>
        )}
      </div>

      {/* 活動制限 */}
      <div>
        <label htmlFor="activityRestriction" className="block font-semibold mb-1 text-sm">
          活動制限
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        </label>
        <select
          id="activityRestriction"
          {...register('activityRestriction')}
          className={`${INPUT_BASE} ${errors.activityRestriction ? ERR_BORDER : OK_BORDER}`}
          aria-invalid={!!errors.activityRestriction}
          aria-describedby={errors.activityRestriction ? 'activityRestriction-error' : undefined}
          defaultValue=""
        >
          <option value="" disabled>
            選択してください
          </option>
          {ACTIVITY_RESTRICTION_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.activityRestriction && (
          <p id="activityRestriction-error" className="text-red-500 text-xs mt-1">
            {errors.activityRestriction.message}
          </p>
        )}
      </div>

      {/* 同意書チェック */}
      <div>
        <label htmlFor="consentGiven" className="flex items-start gap-2 text-sm">
          <input
            id="consentGiven"
            type="checkbox"
            {...register('consentGiven')}
            className="mt-0.5 rounded"
            aria-invalid={!!errors.consentGiven}
            aria-describedby={errors.consentGiven ? 'consentGiven-error' : undefined}
          />
          <span>
            個人情報保護法・入管法に基づき、本情報を求職者の就労可能性確認および
            ハローワークへの求人票作成の目的で利用することに同意します。
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          </span>
        </label>
        {errors.consentGiven && (
          <p id="consentGiven-error" className="text-red-500 text-xs mt-1">
            {errors.consentGiven.message}
          </p>
        )}
        <p className="text-gray-400 text-xs mt-2">
          ※ 虚偽の申告は入管法により処罰の対象となります。正確な情報を入力してください。
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 transition-colors"
        aria-busy={submitting}
      >
        {submitting ? '保存中...' : '保存'}
      </button>
    </form>
  );
};

export default ZairyuCardForm;
