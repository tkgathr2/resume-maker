// ステータスバッジ（詳細設計書 3.4 準拠）。
// 未検証 → gray / 検証済み+就労可能 → green / 検証済み+就労不可 → red
// 有効期限が3ヶ月以内 → amber の警告バッジを追加表示。
const THREE_MONTHS_MS = 1000 * 60 * 60 * 24 * 90;

function isExpiringSoon(validityDate: string | Date): boolean {
  const d = typeof validityDate === 'string' ? new Date(validityDate) : validityDate;
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() - Date.now() <= THREE_MONTHS_MS;
}

export interface ZairyuStatusBadgeProps {
  isVerified: boolean;
  canWorkInJapan: boolean;
  validityDate: string | Date;
}

export const ZairyuStatusBadge: React.FC<ZairyuStatusBadgeProps> = ({
  isVerified,
  canWorkInJapan,
  validityDate,
}) => {
  const expiringSoon = isExpiringSoon(validityDate);

  let colorClass = 'bg-gray-100 text-gray-600';
  let label = '未検証';
  if (isVerified) {
    if (canWorkInJapan) {
      colorClass = 'bg-green-50 text-green-700';
      label = '就労可能';
    } else {
      colorClass = 'bg-red-50 text-red-700';
      label = '就労不可';
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>{label}</span>
      {expiringSoon && (
        <span
          role="status"
          className="rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 inline-flex items-center gap-1"
        >
          <span aria-hidden>⚠</span>
          有効期限間近
        </span>
      )}
    </span>
  );
};

export default ZairyuStatusBadge;
