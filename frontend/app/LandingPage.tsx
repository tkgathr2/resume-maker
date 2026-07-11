'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/useToast';

export default function LandingPage() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      showToast('招待トークンを入力してください', 'error');
      return;
    }
    setLoading(true);
    router.push(`/a/${token.trim()}/form`);
  };

  const handleStaffSignIn = () => {
    router.push('/auth/signin');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-6xl">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">履歴書メーカー</h1>
          <p className="text-lg text-gray-600">在留資格データで簡単に履歴書を作成</p>
        </div>

        {/* メインコンテンツ：2カラムレイアウト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左側：求職者フロー */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">👤</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">求職者向け</h2>
            <p className="text-gray-600 text-center mb-6">
              在留資格情報をアップロードして、AI が自動で履歴書を作成します
            </p>

            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-semibold text-gray-700 mb-2">
                  招待トークン
                </label>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="招待トークンを入力"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                採用担当者から受け取った招待トークンを入力してください
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all duration-200"
              >
                {loading ? 'ロード中...' : '履歴書作成を開始'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                📋 必要な情報：
                <br />
                在留カード画像 + 基本情報 + 職務経歴
              </p>
            </div>
          </div>

          {/* 右側：スタッフ用ログイン */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">👨‍💼</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">採用担当者向け</h2>
            <p className="text-gray-600 text-center mb-6">
              応募者の履歴書を管理し、AI 添削・CSV エクスポート
            </p>

            <button
              onClick={handleStaffSignIn}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition-all duration-200"
            >
              Google でログイン
            </button>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                🔐 スタッフアカウントでログインしてください
                <br />
                <span className="text-xs text-gray-500">（社内 Google アカウント使用）</span>
              </p>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-12 text-gray-600 text-sm">
          <p>© 2026 高木産業グループ 履歴書メーカー</p>
        </div>
      </div>
    </main>
  );
}
