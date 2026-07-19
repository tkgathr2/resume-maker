'use client';

// 求職者マイページ: 在留カード情報入力（詳細設計書 3.1 / 画面フロー準拠）。
// OAuth ログイン済み求職者のみアクセス可（設計書 3.1 前提）。
//
// NOTE(引き継ぎ): 現行 middleware.ts のガード対象は '/' と '/admin/:path*' のみで、
// '/resume/*' は未ガード。また auth.ts の signIn コールバックはスタッフメールのみ
// 許可しており、求職者アカウントでの Google ログインは現状弾かれる。
// 求職者の OAuth ログインを実際に成立させるには auth.ts / middleware.ts 側の対応が
// 別途必要（本タスクは frontend コンポーネント実装のみのスコープのため、
// 認証基盤の変更はバックエンド/認証エージェントとの連携タスクとして残す）。
// 本ページはセッション確立後の /api/auth/session を叩いて求職者IDを取得する前提で実装。
import { useEffect, useState } from 'react';
import { ZairyuCardForm } from '@/components/ZairyuCardForm';
import type { ZairyuCard } from '@/lib/zairyu-types';
import { zairyuFetch } from '@/lib/zairyu-api';

interface SessionResponse {
  user?: { email?: string | null; name?: string | null };
}

export default function MyZairyuPage() {
  const [jobSeekerId, setJobSeekerId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<ZairyuCard | null>(null);
  const [savedData, setSavedData] = useState<ZairyuCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session: SessionResponse = await sessionRes.json().catch(() => ({}));
        const id = session.user?.email ?? null;
        setJobSeekerId(id);

        if (id) {
          const res = await zairyuFetch('/me', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json().catch(() => null);
            setInitialData(json ?? null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </main>
    );
  }

  if (!jobSeekerId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-lg bg-red-50 border border-red-300 text-red-700 px-6 py-4 text-center max-w-md">
          <h2 className="font-bold mb-2">ログインが必要です</h2>
          <p className="text-sm">在留カード情報の入力にはログインが必要です。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-1">在留カード情報の登録</h1>
      <p className="text-gray-600 text-sm mb-4">
        在留カードの情報を入力し、内容にご同意のうえ「保存」してください。
      </p>
      <ZairyuCardForm
        jobSeekerId={jobSeekerId}
        initialData={savedData ?? initialData}
        onSuccess={setSavedData}
      />
    </main>
  );
}
