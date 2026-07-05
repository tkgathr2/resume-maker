'use client';

import { useState } from 'react';
import { createResume, generateAI, type ResumeInput } from '@/lib/api';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  fontSize: '1rem',
  border: '1px solid #d0d3d9',
  borderRadius: '6px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '0.4rem',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.65rem 1.25rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

export default function ResumePage() {
  const [form, setForm] = useState<ResumeInput>({
    fullName: '',
    contact: '',
    experience: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (key: keyof ResumeInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleGenerateAI = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await generateAI({
        prompt: `職務経歴書の職務経歴を整えてください: ${form.experience}`,
        fields: { fullName: form.fullName, contact: form.contact },
      });
      setForm((prev) => ({ ...prev, experience: result.content }));
      setMessage('AI が職務経歴を生成しました。');
    } catch (err) {
      setMessage('AI 生成に失敗しました（バックエンド未起動の可能性があります）。');
    } finally {
      setBusy(false);
    }
  };

  const handleGeneratePDF = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await createResume(form);
      setMessage('保存しました。PDF 生成を開始します。');
    } catch (err) {
      setMessage('保存に失敗しました（バックエンド未起動の可能性があります）。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
      }}
    >
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>職務経歴書の作成</h1>

      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: '#fff',
          padding: '1.75rem',
          borderRadius: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <label htmlFor="fullName" style={labelStyle}>
            氏名
          </label>
          <input
            id="fullName"
            type="text"
            value={form.fullName}
            onChange={update('fullName')}
            placeholder="山田 太郎"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="contact" style={labelStyle}>
            連絡先
          </label>
          <input
            id="contact"
            type="text"
            value={form.contact}
            onChange={update('contact')}
            placeholder="taro@example.com / 090-0000-0000"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="experience" style={labelStyle}>
            職務経歴
          </label>
          <textarea
            id="experience"
            value={form.experience}
            onChange={update('experience')}
            placeholder="これまでの職務経歴を入力してください"
            rows={8}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={busy}
            style={{
              ...buttonStyle,
              color: '#fff',
              background: busy ? '#9aa0a6' : '#7c3aed',
            }}
          >
            AI 生成
          </button>
          <button
            type="button"
            onClick={handleGeneratePDF}
            disabled={busy}
            style={{
              ...buttonStyle,
              color: '#fff',
              background: busy ? '#9aa0a6' : '#059669',
            }}
          >
            PDF 生成
          </button>
        </div>

        {message && (
          <p style={{ margin: 0, color: '#374151', fontSize: '0.9rem' }}>{message}</p>
        )}
      </form>
    </main>
  );
}
