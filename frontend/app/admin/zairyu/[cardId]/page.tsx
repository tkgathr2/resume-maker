'use client';

// スタッフ向け在留カード詳細画面（詳細設計書 3.2 準拠）。
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ZairyuCardDetail } from '@/components/ZairyuCardDetail';

interface SessionResponse {
  user?: { email?: string | null; name?: string | null };
}

export default function ZairyuDetailPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = use(params);
  const [staffId, setStaffId] = useState('staff');

  useEffect(() => {
    // ログイン中スタッフの表示用。認可自体はサーバー側 requireStaff() /
    // middleware.ts が /admin/:path* を既にガードしているため、
    // ここでの取得失敗は表示上のフォールバックのみに影響する。
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session: SessionResponse) => {
        if (session.user?.email) setStaffId(session.user.email);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <Link href="/admin/zairyu" className="text-sm text-gray-500 hover:underline">
        ← 一覧に戻る
      </Link>
      <div className="mt-4">
        <ZairyuCardDetail cardId={cardId} staffId={staffId} />
      </div>
    </main>
  );
}
