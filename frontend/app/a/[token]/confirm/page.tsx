'use client';

// 画面③: 提出前の最終確認（母語）。できあがった履歴書PDFを見せて「これでOK？送りますか？」を問う。
// ここで送信を押して初めて /submit が走る（＝中身を見ないまま送信されるのを防ぐ）。
// そのため PDF を出し終えるまで送信ボタンは押せない。
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { useToast } from '@/lib/useToast';
import Spinner from '@/components/Spinner';
import ErrorScreen from '@/components/ErrorScreen';
import { EMPTY_RESUME, type ResumeData } from '@/lib/resumeFields';
import { fetchApplicant, submitResume } from '@/lib/applicantClient';

export default function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, setLocale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showToast } = useToast();
  // CA固有URL（?ca=<code>）はフォームから引き継ぎ、提出時にそのまま渡す（担当CAの紐付け）。
  const caCode = searchParams.get('ca');
  const formUrl = `/a/${token}/form${caCode ? `?ca=${encodeURIComponent(caCode)}` : ''}`;

  const [form, setForm] = useState<ResumeData>(EMPTY_RESUME);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  // 生成済みの blob URL。unmount と再読み込みの両方で確実に解放する。
  const objectUrlRef = useRef<string | null>(null);

  const loadPdf = useCallback(async () => {
    setPdfFailed(false);
    try {
      const res = await fetch(`/api/a/${token}/pdf-preview`, { cache: 'no-store' });
      if (!res.ok) {
        setPdfFailed(true);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      setPdfUrl(url);
    } catch {
      setPdfFailed(true);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      const r = await fetchApplicant(token);
      if ('error' in r) {
        setLoadError(r.error === 'http_404' ? 'notFound' : r.error);
        return;
      }
      if (r.submitted) {
        router.replace(`/a/${token}/done`);
        return;
      }
      if (LOCALES.includes(r.locale as Locale)) setLocale(r.locale as Locale);
      setForm({ ...EMPTY_RESUME, ...r.prefill });
      setReady(true);
      await loadPdf();
    })();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSend = async () => {
    setSending(true);
    const res = await submitResume(token, form, caCode ?? undefined);
    setSending(false);
    if (!res.ok) {
      // 必須項目が欠けている場合はフォームへ戻して直してもらう（母語で伝える）
      if (res.fields?.length) {
        showToast(t('a.form.validationRequired'), 'error');
        router.push(formUrl);
        return;
      }
      showToast(t('a.confirm.sendFailed'), 'error');
      return;
    }
    const doneUrl = res.editUrl
      ? `/a/${token}/done?editUrl=${encodeURIComponent(res.editUrl)}`
      : `/a/${token}/done`;
    router.replace(doneUrl);
  };

  if (loadError) {
    return (
      <ErrorScreen
        errorKey={loadError === 'notFound' ? 'a.expired.message' : 'common.loadFailed'}
        showHome={true}
      />
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold mb-1">{t('a.confirm.title')}</h1>
        <p className="text-sm text-gray-500 mb-4">{t('a.confirm.subtitle')}</p>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-5">
          {pdfFailed ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600 mb-4">{t('a.confirm.failed')}</p>
              <button
                onClick={() => void loadPdf()}
                className="bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl px-6 py-3 border border-gray-300 w-full sm:w-auto"
              >
                {t('a.confirm.retry')}
              </button>
            </div>
          ) : pdfUrl ? (
            <>
              {/* スマホでは iframe 内のPDFが開かない機種があるため、下の「別の画面で開く」を必ず併置する */}
              <iframe
                src={pdfUrl}
                title={t('a.confirm.title')}
                className="w-full aspect-[1/1.414] max-h-[70vh] border-0 bg-gray-100"
              />
              <div className="border-t border-gray-100 p-3">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm font-semibold text-brand py-2"
                >
                  {t('a.confirm.openPdf')} ↗
                </a>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 p-10">
              <Spinner />
              <p className="text-sm text-gray-500">{t('a.confirm.building')}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 text-center">
          <p className="text-lg font-bold mb-1">{t('a.confirm.question')}</p>
          <p className="text-sm text-gray-500 mb-5">{t('a.confirm.hint')}</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
            <button
              onClick={handleSend}
              // PDFを出し切る前に押せると「見せてから送る」が成立しないため、
              // 描画中は押させない（描画に失敗した時だけは、送信を塞いで詰ませない）。
              disabled={sending || (!pdfUrl && !pdfFailed)}
              className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl px-8 py-4 w-full sm:w-auto order-1 sm:order-2"
            >
              {sending ? <Spinner size="sm" /> : t('a.confirm.send')}
            </button>
            <button
              onClick={() => router.push(formUrl)}
              disabled={sending}
              className="bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-bold rounded-xl px-8 py-4 border border-gray-300 w-full sm:w-auto order-2 sm:order-1"
            >
              {t('a.confirm.edit')}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
