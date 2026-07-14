'use client';

// ローディング画面: ぐるぐる + 疑似%進捗（実測3秒に合わせ0→90%を演出、完了で100%）。
import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { fetchApplicant } from '@/lib/applicantClient';

export default function LoadingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useI18n();
  const router = useRouter();
  const [percent, setPercent] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    // 疑似進捗: 3.5秒かけて0→90%（イージング）。完了検知で100%へ。
    const start = Date.now();
    const anim = setInterval(() => {
      if (doneRef.current) return;
      const elapsed = (Date.now() - start) / 3500;
      const eased = Math.min(0.9, 1 - Math.pow(1 - Math.min(elapsed, 1), 2)) * 100;
      setPercent(Math.round(Math.min(eased, 90)));
    }, 100);

    // OCR完了ポーリング（800ms間隔・最大30秒 → 失敗でもフォームへ）
    const deadline = Date.now() + 30_000;
    const poll = setInterval(async () => {
      const r = await fetchApplicant(token);
      const finished =
        ('error' in r) ||
        r.ocrStatus === 'done' ||
        r.ocrStatus === 'failed' ||
        Date.now() > deadline;
      if (finished && !doneRef.current) {
        doneRef.current = true;
        setPercent(100);
        setTimeout(() => router.replace(`/a/${token}/form`), 450);
      }
    }, 800);

    return () => {
      clearInterval(anim);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="relative w-28 h-28 mb-8">
        <div className="absolute inset-0 rounded-full border-8 border-gray-200" />
        <div
          className="absolute inset-0 rounded-full border-8 border-brand border-t-transparent animate-spin"
          style={{ animationDuration: '1s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-brand">{percent}%</span>
        </div>
      </div>
      <h1 className="text-lg font-bold mb-2">{t('a.loading.title')}</h1>
      <p className="text-gray-500 text-sm">{t('a.loading.subtitle')}</p>

      <button
        onClick={() => {
          const searchParams = new URLSearchParams(window.location.search);
          const ca = searchParams.get('ca');
          const backUrl = ca ? `/?ca=${encodeURIComponent(ca)}` : '/';
          router.push(backUrl);
        }}
        className="mt-8 text-gray-400 text-sm underline hover:text-gray-600"
      >
        {t('a.upload.retake')}
      </button>
    </main>
  );
}
