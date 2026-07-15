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
    <div style={{ padding: '40px 20px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '24px', fontWeight: 'bold' }}>
        履歴書確認
      </h1>

      {error && <div style={{ color: '#d32f2f', marginBottom: '20px', padding: '12px', backgroundColor: '#ffebee', borderRadius: '4px' }}>エラー: {error}</div>}

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>PDF読み込み中...</div>}

      {pdfUrl && (
        <>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '700px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '40px',
            }}
            title="履歴書プレビュー"
          />

          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '4px',
            marginBottom: '30px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
              これでOK? 送りますか?
            </p>
            <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
              修正が必要な場合は「修正する」ボタンをクリック
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? '送信中...' : 'OK 送ります'}
            </button>
            <button
              onClick={handleEdit}
              disabled={submitting}
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              修正する
            </button>
          </div>
        </>
      )}
    </div>
  );
}
