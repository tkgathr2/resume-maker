'use client';

// スタッフ向け在留カード詳細画面（詳細設計書 3.2 準拠）。
// ヘッダー情報 / カード情報表示 / 検証パネル / 判定パネル / アクセスログ表示。
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/lib/useToast';
import type { ZairyuApiErrorResponse, ZairyuCardDetailData } from '@/lib/zairyu-types';
import { zairyuFetch } from '@/lib/zairyu-api';
import { ZairyuStatusBadge } from './ZairyuStatusBadge';

export interface ZairyuCardDetailProps {
  cardId: string;
  staffId: string;
}

type Judgment = 'can' | 'cannot' | '';

export const ZairyuCardDetail: React.FC<ZairyuCardDetailProps> = ({ cardId, staffId }) => {
  const { show: showToast } = useToast();

  const [detail, setDetail] = useState<ZairyuCardDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [checkedConfirmed, setCheckedConfirmed] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [judgment, setJudgment] = useState<Judgment>('');
  const [workRestrictionDetails, setWorkRestrictionDetails] = useState('');
  const [judging, setJudging] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await zairyuFetch(`/${cardId}`, { cache: 'no-store' });
      if (!res.ok) {
        setLoadError(
          res.status === 404
            ? '在留カード情報が見つかりません'
            : res.status === 403
              ? 'この情報を閲覧する権限がありません'
              : 'データの取得に失敗しました'
        );
        return;
      }
      const json: ZairyuCardDetailData = await res.json();
      setDetail(json);
      setVerificationNotes(json.verificationNotes ?? '');
      setJudgment(json.isVerified ? (json.canWorkInJapan ? 'can' : 'cannot') : '');
      setWorkRestrictionDetails(json.workRestrictionDetails ?? '');
      setCheckedConfirmed(json.isVerified);
    } catch {
      setLoadError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submitVerify = async () => {
    if (!checkedConfirmed) {
      showToast('内容確認済みにチェックしてください', 'error');
      return;
    }
    setVerifying(true);
    try {
      const res = await zairyuFetch(`/${cardId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationNotes }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as ZairyuApiErrorResponse | null;
        showToast(`エラー: ${json?.error ?? '検証に失敗しました'}`, 'error');
        return;
      }
      showToast('検証を完了しました', 'success');
      void reload();
    } catch {
      showToast('通信エラーが発生しました', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const submitJudgment = async () => {
    if (judgment === '') {
      showToast('就労可能性を選択してください', 'error');
      return;
    }
    setJudging(true);
    try {
      const res = await zairyuFetch(`/${cardId}/set-work-eligibility`, {
        method: 'PATCH',
        body: JSON.stringify({
          canWorkInJapan: judgment === 'can',
          workRestrictionDetails: workRestrictionDetails.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as ZairyuApiErrorResponse | null;
        showToast(`エラー: ${json?.error ?? '判定確定に失敗しました'}`, 'error');
        return;
      }
      showToast('判定を確定しました', 'success');
      void reload();
    } catch {
      showToast('通信エラーが発生しました', 'error');
    } finally {
      setJudging(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-300 text-red-700 px-6 py-4 text-sm">
        {loadError ?? 'データが見つかりません'}
      </div>
    );
  }

  const expiringSoon =
    !Number.isNaN(new Date(detail.validityDate).getTime()) &&
    new Date(detail.validityDate).getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 90;

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー情報 */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold">{detail.jobSeekerName}</h2>
            <p className="text-xs text-gray-400 mt-1">
              求職者ID: {detail.jobSeekerId} / 登録日時: {new Date(detail.createdAt).toLocaleString('ja-JP')}
              {detail.updatedAt && <> / 最終更新: {new Date(detail.updatedAt).toLocaleString('ja-JP')}</>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">操作スタッフ: {staffId}</p>
          </div>
          <ZairyuStatusBadge
            isVerified={detail.isVerified}
            canWorkInJapan={detail.canWorkInJapan}
            validityDate={detail.validityDate}
          />
        </div>
      </div>

      {/* カード情報表示（読取専用） */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <h3 className="font-semibold mb-3 text-sm text-gray-700">在留カード情報</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">在留カード番号</dt>
            <dd className="font-mono mt-1">{detail.cardNumber}</dd>
          </div>
          <div>
            <dt className="text-gray-500">氏名（カナ）</dt>
            <dd className="mt-1">{detail.cardholderNameKana}</dd>
          </div>
          <div>
            <dt className="text-gray-500">有効期限</dt>
            <dd className={`mt-1 ${expiringSoon ? 'text-red-600 font-semibold' : ''}`}>
              {detail.validityDate}
              {expiringSoon && <span className="ml-1 text-xs">（3ヶ月以内に期限切れ）</span>}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">在留資格</dt>
            <dd className="mt-1">{detail.statusOfResidenceJp}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">活動制限</dt>
            <dd className="mt-1">{detail.activityRestrictionJp}</dd>
          </div>
        </dl>
      </div>

      {/* 検証パネル */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <h3 className="font-semibold mb-3 text-sm text-gray-700">検証パネル</h3>
        {detail.isVerified ? (
          <p className="text-sm text-green-700">
            検証済み: {detail.verifiedBy ?? '-'} /{' '}
            {detail.verifiedAt ? new Date(detail.verifiedAt).toLocaleString('ja-JP') : '-'}
            {detail.verificationNotes && (
              <span className="block text-gray-600 mt-1">メモ: {detail.verificationNotes}</span>
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checkedConfirmed}
                onChange={(e) => setCheckedConfirmed(e.target.checked)}
                className="rounded"
              />
              内容確認済み
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="検証メモ（例: 月30時間の制限注意）"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              type="button"
              onClick={submitVerify}
              disabled={verifying || !checkedConfirmed}
              className="self-start rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2 text-sm"
            >
              {verifying ? '処理中...' : '検証完了'}
            </button>
          </div>
        )}
      </div>

      {/* 判定パネル */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <h3 className="font-semibold mb-3 text-sm text-gray-700">判定パネル</h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="judgment"
                value="can"
                checked={judgment === 'can'}
                onChange={() => setJudgment('can')}
              />
              就労可能
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="judgment"
                value="cannot"
                checked={judgment === 'cannot'}
                onChange={() => setJudgment('cannot')}
              />
              就労不可
            </label>
          </div>
          <textarea
            value={workRestrictionDetails}
            onChange={(e) => setWorkRestrictionDetails(e.target.value)}
            placeholder="就労条件詳細（例: 建設業のみ可）"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="button"
            onClick={submitJudgment}
            disabled={judging || judgment === ''}
            className="self-start rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2 text-sm"
          >
            {judging ? '処理中...' : '判定確定'}
          </button>
        </div>
      </div>

      {/* アクセスログ表示（直近20件） */}
      <div className="bg-white rounded-2xl shadow-md p-5 overflow-x-auto">
        <h3 className="font-semibold mb-3 text-sm text-gray-700">アクセスログ（直近20件）</h3>
        {detail.accessLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">ログがありません</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-3 py-2">日時</th>
                <th className="px-3 py-2">操作</th>
                <th className="px-3 py-2">スタッフ</th>
                <th className="px-3 py-2">IPアドレス</th>
              </tr>
            </thead>
            <tbody>
              {detail.accessLogs.slice(0, 20).map((log, i) => (
                <tr key={`${log.timestamp}-${i}`} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2">{new Date(log.timestamp).toLocaleString('ja-JP')}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.staffName}</td>
                  <td className="px-3 py-2">{log.ipAddress ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ZairyuCardDetail;
