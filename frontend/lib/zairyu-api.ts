// 在留カード機能: FastAPI バックエンド（backend/app/routers/zairyu.py, prefix /api/zairyu）
// への共通フェッチヘルパー。
//
// 【重要・引き継ぎ】このリポジトリは Next.js フロントエンド（frontend/）と、
// 別サービスとして動く FastAPI バックエンド（backend/, デフォルト http://localhost:8000）
// の2本立てで、zairyu API は backend 側に実装されている
// （frontend 自身の /api/zairyu という内部 Next.js route ではない）。
// ベースURLは next.config.js が公開している NEXT_PUBLIC_API_URL を使う。
//
// 認証: backend の /api/zairyu/* は Authorization: Bearer <JWT> を要求する
// （backend/app/dependencies.py の get_current_user / require_staff）。この JWT は
// backend 自身の POST /auth/google-signin で発行されるもので、frontend の
// next-auth（Google OAuth・スタッフ専用サインイン、auth.ts）とは別物・未接続。
// 本タスクのスコープは frontend コンポーネント実装のみのため、
// 「next-auth ログイン → backend JWT 取得」のブリッジは未実装（後続の統合タスクが必要）。
// getZairyuAuthToken() は localStorage の 'zairyu_access_token' を読むだけの
// プレースホルダー。ブリッジ実装後は google-signin のレスポンス（access_token）を
// ここに保存すれば、本ファイルを変更せずにそのまま繋がる。
//
// 【backend 未実装のエンドポイント】設計書セクション4は5本
// （create-or-update / :cardId(GET) / verify / set-work-eligibility / export-csv）のみを
// 定義しており、一覧取得（GET /api/zairyu）・求職者本人の既存データ取得（GET /api/zairyu/me）・
// 論理削除（DELETE /api/zairyu/:cardId）は screens 3.1/3.3 の要件から本 PR 側で推測実装した
// ものの、2026-07-11 時点の backend には未実装（該当箇所は 404 になる）。

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const AUTH_TOKEN_STORAGE_KEY = 'zairyu_access_token';

export function zairyuApiUrl(path: string): string {
  return `${API_BASE}/api/zairyu${path}`;
}

export function getZairyuAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function zairyuFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getZairyuAuthToken();
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(zairyuApiUrl(path), { ...init, headers });
}
