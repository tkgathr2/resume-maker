'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ConfirmPage() {
  const params = useParams();
  const token = params.token as string;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const url = `/api/a/${token}/pdf-preview`;
        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'unknown' }));
          setError(data.error || 'PDF読み込み失敗');
          return;
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [token]);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/a/${token}/submit-resume`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'unknown' }));
        setError(data.error || '提出失敗');
        return;
      }
      // 提出成功
      window.location.href = `/a/${token}/done`;
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    window.history.back();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>履歴書確認</h1>

      {error && <div style={{ color: 'red', marginBottom: '20px' }}>エラー: {error}</div>}
      {loading && <div>PDF読み込み中...</div>}

      {pdfUrl && (
        <div style={{ marginBottom: '20px' }}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '600px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            title="履歴書プレビュー"
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={handleConfirm}
          disabled={submitting || !pdfUrl}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {submitting ? '送信中...' : 'OK確認'}
        </button>
        <button
          onClick={handleEdit}
          disabled={submitting}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          修正する
        </button>
      </div>
    </div>
  );
}
