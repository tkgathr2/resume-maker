'use client';

// 画面①: 何もないアップロード画面（要件 v2.0 確定UXフロー）。
// カード選択と同時に裏でアップロード+OCRを開始し、「次へ」でローディング画面へ。
import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { fetchApplicant, resizeImage, uploadCard } from '@/lib/applicantClient';

export default function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, setLocale } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pageState, setPageState] = useState<'loading' | 'ok' | 'expired' | 'invalid' | 'submitted'>('loading');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchApplicant(token).then((r) => {
      if ('error' in r) {
        setPageState(r.error === 'token_expired' ? 'expired' : 'invalid');
        return;
      }
      if (r.submitted) {
        setPageState('submitted');
        return;
      }
      if (LOCALES.includes(r.locale as Locale)) setLocale(r.locale as Locale);
      setPageState('ok');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      setPreview(dataUrl);
      // 裏でアップロード+OCR開始（awaitしない: 「次へ」までに終わらせる）
      void uploadCard(token, dataUrl);
    } finally {
      setUploading(false);
    }
  };

  if (pageState === 'loading') {
    return <Center><p className="text-gray-400">{t('common.loading')}</p></Center>;
  }
  if (pageState === 'expired' || pageState === 'invalid') {
    return (
      <Center>
        <h1 className="text-xl font-bold mb-3">{t('a.expired.title')}</h1>
        <p className="text-gray-500">{t('a.expired.message')}</p>
      </Center>
    );
  }
  if (pageState === 'submitted') {
    return (
      <Center>
        <h1 className="text-xl font-bold mb-3">{t('a.submitted.title')}</h1>
        <p className="text-gray-500">{t('a.submitted.message')}</p>
      </Center>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <h1 className="text-xl font-bold text-center mb-2">{t('a.upload.title')}</h1>
        <p className="text-gray-500 text-sm text-center mb-8">{t('a.upload.hint')}</p>

        {preview ? (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="card" className="rounded-xl shadow-md max-h-56 object-contain" />
            <p className="text-green-600 text-sm font-semibold">✓ {t('a.upload.uploaded')}</p>
            <p className="text-gray-500 text-xs">{t('a.upload.processingNote')}</p>
            <button
              onClick={() => router.push(`/a/${token}/loading`)}
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
            disabled={uploading}
            className="w-full max-w-sm rounded-2xl border-4 border-dashed border-brand/40 bg-white hover:bg-brand/5 py-14 flex flex-col items-center gap-4 transition-colors"
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
            <span className="text-brand font-bold text-lg">📷 {t('a.upload.takePhoto')}</span>
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
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      {children}
    </main>
  );
}
