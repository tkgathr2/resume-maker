'use client';

// スタッフ向け在留カード一覧・ダッシュボード（詳細設計書 3.3 準拠）。
// /admin/:path* は middleware.ts でスタッフログイン必須にガード済み。
//
// NOTE(引き継ぎ): 設計書セクション4はAPIとして create-or-update / :cardId (GET) /
// verify / set-work-eligibility / export-csv の5本のみを明記しており、一覧取得用の
// GET エンドポイントは明示されていない。本画面は export-csv と同じクエリ命名
// （filter_verified / filter_work_eligible / sort_by）に合わせて GET /api/zairyu を
// 呼ぶ前提で実装。削除（論理削除）は DELETE /api/zairyu/:cardId を仮定。
// バックエンド実装時にエンドポイント名・レスポンス形状の突合せが必要。
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/useToast';
import { ZairyuStatusBadge } from '@/components/ZairyuStatusBadge';
import type { ZairyuCardListItem } from '@/lib/zairyu-types';
import { zairyuFetch } from '@/lib/zairyu-api';

type VerifiedFilter = 'all' | 'true' | 'false';
type WorkEligibleFilter = 'all' | 'true' | 'false';
type SortBy = 'createdAt' | 'validityDate' | 'jobSeekerName';

const THREE_MONTHS_MS = 1000 * 60 * 60 * 24 * 90;

function isExpiringSoon(validityDate: string): boolean {
  const d = new Date(validityDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() - Date.now() <= THREE_MONTHS_MS;
}

function timestampSuffix(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export default function ZairyuListPage() {
  const { show: showToast } = useToast();
  const [items, setItems] = useState<ZairyuCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all');
  const [workEligibleFilter, setWorkEligibleFilter] = useState<WorkEligibleFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [exporting, setExporting] = useState(false);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (verifiedFilter !== 'all') params.set('filter_verified', verifiedFilter);
    if (workEligibleFilter !== 'all') params.set('filter_work_eligible', workEligibleFilter);
    params.set('sort_by', sortBy);
    return params.toString();
  }, [verifiedFilter, workEligibleFilter, sortBy]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await zairyuFetch(`?${buildQuery()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        setItems(json?.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = async (cardId: string, name: string) => {
    if (!window.confirm(`${name} さんの在留カード情報を削除しますか？`)) return;
    const res = await zairyuFetch(`/${cardId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('削除しました', 'success');
      void reload();
    } else {
      showToast('削除に失敗しました', 'error');
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await zairyuFetch(`/export-csv?${buildQuery()}`);
      if (!res.ok) {
        showToast('CSV出力に失敗しました', 'error');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zairyu_cards_export_${timestampSuffix()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('通信エラーが発生しました', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">在留カード管理</h1>
      <p className="text-gray-500 text-sm mb-6">求職者の在留カード情報を確認・検証・就労判定します。</p>

      {/* フィルター・ソート・CSV */}
      <div className="bg-white rounded-2xl shadow-md p-4 md:p-5 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">検証状態</label>
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as VerifiedFilter)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">すべて</option>
            <option value="true">検証済み</option>
            <option value="false">未検証</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">就労可能性</label>
          <select
            value={workEligibleFilter}
            onChange={(e) => setWorkEligibleFilter(e.target.value as WorkEligibleFilter)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">すべて</option>
            <option value="true">就労可能</option>
            <option value="false">就労不可</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">並び順</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="createdAt">登録日</option>
            <option value="validityDate">有効期限</option>
            <option value="jobSeekerName">氏名</option>
          </select>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="ml-auto rounded-lg border border-brand text-brand font-semibold px-4 py-2 text-sm hover:bg-brand/5 disabled:opacity-50"
        >
          {exporting ? '出力中...' : '⬇ CSV ダウンロード'}
        </button>
      </div>

      {/* 一覧 */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-gray-400 text-sm">データがありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3">求職者氏名</th>
                <th className="px-4 py-3">在留資格</th>
                <th className="px-4 py-3">有効期限</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{item.jobSeekerName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-600">
                      {item.statusOfResidenceJp}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 ${isExpiringSoon(item.validityDate) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}
                  >
                    {item.validityDate}
                  </td>
                  <td className="px-4 py-3">
                    <ZairyuStatusBadge
                      isVerified={item.isVerified}
                      canWorkInJapan={item.canWorkInJapan}
                      validityDate={item.validityDate}
                    />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/zairyu/${item.id}`}
                      className="text-brand font-semibold hover:underline text-sm mr-4"
                    >
                      詳細 →
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(item.id, item.jobSeekerName)}
                      className="text-red-500 hover:underline text-sm"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
