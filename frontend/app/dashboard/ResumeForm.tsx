'use client';

import { useState } from 'react';

interface Props {
  defaultName: string;
  defaultEmail: string;
}

interface SuccessResult {
  driveLink: string;
  fileName: string;
  resumeId: string;
}

export default function ResumeForm({ defaultName, defaultEmail }: Props) {
  const [form, setForm] = useState({
    fullName: defaultName || '',
    email: defaultEmail || '',
    phone: '',
    summary: '',
    experience: '',
    education: '',
    skills: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessResult | null>(null);

  const update = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!form.fullName.trim()) {
      setError('氏名を入力してください。');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '生成に失敗しました。');
      }
      setResult(data as SuccessResult);
    } catch (err: any) {
      setError(err?.message || '予期しないエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="alert alert-err">{error}</div>}
      {result && (
        <div className="alert alert-ok">
          <div>PDF を生成し、Google ドライブに保存しました。</div>
          <a
            className="result-link"
            href={result.driveLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            📄 {result.fileName} を Google ドライブで開く →
          </a>
        </div>
      )}

      <div className="row">
        <div>
          <label htmlFor="fullName">氏名 *</label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={update('fullName')}
            placeholder="山田 太郎"
            required
          />
        </div>
        <div>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="taro@example.com"
          />
        </div>
      </div>

      <label htmlFor="phone">電話番号</label>
      <input
        id="phone"
        value={form.phone}
        onChange={update('phone')}
        placeholder="090-1234-5678"
      />

      <label htmlFor="summary">概要 / 自己 PR</label>
      <textarea
        id="summary"
        value={form.summary}
        onChange={update('summary')}
        placeholder="これまでの経験や強みを簡潔に。"
      />

      <label htmlFor="experience">職務経歴</label>
      <textarea
        id="experience"
        value={form.experience}
        onChange={update('experience')}
        placeholder="会社名・役職・担当業務など。改行で複数行入力できます。"
        style={{ minHeight: 140 }}
      />

      <label htmlFor="education">学歴</label>
      <textarea
        id="education"
        value={form.education}
        onChange={update('education')}
        placeholder="学校名・学部・卒業年など。"
      />

      <label htmlFor="skills">スキル</label>
      <textarea
        id="skills"
        value={form.skills}
        onChange={update('skills')}
        placeholder="資格・言語・ツールなど。"
      />

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '生成中…' : 'PDF を生成して Google ドライブに保存'}
        </button>
      </div>
    </form>
  );
}
