// 在留カード機能の共有型定義（フロントエンド内部用）。
// バックエンド API（/api/zairyu/*）は別エージェントが実装中のため、
// 詳細設計書 v1.0 (~/.claude/specs/resume-maker-zairyu-detail-design-v1.0.md)
// のリクエスト/レスポンス例（4.1〜4.5）に基づいて定義している。
// 実装差異が出た場合はバックエンド側のレスポンス形状に合わせて更新すること。

export interface ZairyuAccessLogEntry {
  timestamp: string;
  action: 'view' | 'verify' | 'export' | 'update' | string;
  staffName: string;
  ipAddress?: string | null;
}

// POST /api/zairyu/create-or-update のレスポンス、および
// GET /api/zairyu/me（求職者本人の既存データ取得・auto-fill 用）で共通利用する形。
export interface ZairyuCard {
  id: string;
  jobSeekerId: string;
  cardNumber?: string; // フォーム再表示用の値（末尾4桁マスクなし・本人向け）
  cardholderNameKana?: string;
  validityDate: string;
  statusOfResidenceJp: string;
  statusOfResidenceCode?: string;
  activityRestrictionJp?: string;
  activityRestriction?: string;
  consentGiven?: boolean;
  isVerified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  verificationNotes?: string | null;
  canWorkInJapan: boolean;
  workRestrictionDetails?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// GET /api/zairyu/:cardId のレスポンス（スタッフ詳細画面用）。
// cardNumber は末尾4桁のみ（例: "****8901"）で返却される想定。
export interface ZairyuCardDetailData extends ZairyuCard {
  jobSeekerName: string;
  accessLogs: ZairyuAccessLogEntry[];
}

// 一覧画面（/admin/zairyu）用の行データ。
export interface ZairyuCardListItem {
  id: string;
  jobSeekerName: string;
  statusOfResidenceJp: string;
  validityDate: string;
  isVerified: boolean;
  canWorkInJapan: boolean;
}

export interface ZairyuApiErrorResponse {
  error: string;
  fields?: string[];
}
