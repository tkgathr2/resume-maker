'use client';

// トップページ = いきなり在留カードのアップロード画面（工数最小フロー・社長決定 2026-07-11）。
// 事前登録・名前入力・招待トークンなし。ファイル選択と同時に匿名の提出セッションを
// 自動発行（POST /api/start）し、既存の /a/<token> フロー（OCR→確認→送信）へ流す。
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { resizeImage, uploadCard } from '@/lib/applicantClient';

export default function SelfUpload() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string | null>(null);
  const caRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ca = searchParams.get('ca');

  // ?ca= パラメータを取得
  useEffect(() => {
    if (ca) {
      caRef.current = ca;
    }
  }, [ca]);

  // ?ca= が無いアクセスは担当CA経由のURLではないため、案内のみ表示してアップロードは開始させない。
  if (!ca) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex justify-end p-4">
          <LanguageSwitcher />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center">
          <p className="text-gray-600 max-w-sm">{t('landing.noCaMessage')}</p>
        </div>
      </main>
    );
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await resizeImage(file);

      // 初回のみ匿名セッションを発行（撮り直しは同じトークンを再利用）
      if (!tokenRef.current) {
        const res = await fetch('/api/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ locale }),
        });
        if (!res.ok) {
          setError(t(res.status === 429 ? 'landing.tooMany' : 'landing.startFailed'));
          return;
        }
        const json = await res.json().catch(() => null);
        if (!json?.token) {
          setError(t('landing.startFailed'));
          return;
        }
        tokenRef.current = json.token as string;
      }
      const activeToken = tokenRef.current;
      if (!activeToken) return;

      setPreview(dataUrl);
      // 裏でアップロード+OCR開始（awaitしない: 「次へ」までに終わらせる）
      void uploadCard(activeToken, dataUrl);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <h1 className="text-xl font-bold text-center mb-2">{t('a.upload.title')}</h1>
        <p className="text-gray-500 text-sm text-center mb-8">{t('a.upload.hint')}</p>

        {error && (
          <p className="w-full max-w-sm mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 text-center">
            {error}
          </p>
        )}

        {preview ? (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="card" className="rounded-xl shadow-md max-h-56 object-contain" />
            <p className="text-green-600 text-sm font-semibold">✓ {t('a.upload.uploaded')}</p>
            <p className="text-gray-500 text-xs">{t('a.upload.processingNote')}</p>
            <button
              onClick={() => {
                if (tokenRef.current) {
                  let url = `/a/${tokenRef.current}/loading`;
                  if (caRef.current) {
                    url += `?ca=${encodeURIComponent(caRef.current)}`;
                  }
                  router.push(url);
                }
              }}
              className="w-full rounded-xl bg-brand hover:bg-brand-dark text-white text-lg font-bold py-4 transition-colors"
            >
              {t('common.next')} →
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-gray-400 text-sm underline"
            >
              {t('a.upload.retake')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full max-w-sm rounded-2xl border-4 border-dashed border-brand/40 bg-white hover:bg-brand/5 py-14 flex flex-col items-center gap-4 transition-colors disabled:opacity-60"
          >
            {/* カードのイラスト（インラインSVG） */}
            <svg width="120" height="78" viewBox="0 0 120 78" fill="none" aria-hidden>
              <rect x="2" y="2" width="116" height="74" rx="8" fill="#eef4ee" stroke="#2a6e3f" strokeWidth="3" />
              <rect x="82" y="16" width="24" height="30" rx="2" fill="#d9e6d9" stroke="#2a6e3f" strokeWidth="2" />
              <rect x="12" y="16" width="52" height="6" rx="3" fill="#2a6e3f" opacity="0.7" />
              <rect x="12" y="30" width="60" height="4" rx="2" fill="#2a6e3f" opacity="0.4" />
              <rect x="12" y="40" width="60" height="4" rx="2" fill="#2a6e3f" opacity="0.4" />
              <rect x="12" y="50" width="44" height="4" rx="2" fill="#2a6e3f" opacity="0.4" />
            </svg>
            <span className="text-brand font-bold text-lg">
              {busy ? t('common.loading') : `📷 ${t('a.upload.takePhoto')}`}
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFile}
        />
      </div>

      {/* スタッフ用ログインはフッターに小さく */}
      <footer className="py-6 text-center">
        <Link href="/auth/signin" className="text-xs text-gray-400 underline hover:text-gray-600">
          {t('landing.staffLink')}
        </Link>
      </footer>
    </main>
  );
}
