'use client';

// 求職者ページ共通クライアント処理（画像リサイズ・API呼び出し・セッション状態）。
import type { ResumeData } from '@/lib/resumeFields';

export interface ApplicantState {
  status: string;
  locale: string;
  ocrStatus: 'none' | 'processing' | 'done' | 'failed';
  confidence: Record<string, number>;
  prefill: ResumeData;
  submitted: boolean;
}

export async function fetchApplicant(token: string): Promise<ApplicantState | { error: string }> {
  const res = await fetch(`/api/a/${token}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error ?? `http_${res.status}` };
  }
  return res.json();
}

// スマホ写真を最大辺1600pxのJPEGへ縮小（Vercel body 4.5MB制限対策・HEICもcanvas経由でJPEG化）。
export async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // createImageBitmap 非対応フォーマットは <img> 経由でデコード
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      return drawToJpeg(img, img.naturalWidth, img.naturalHeight);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return drawToJpeg(bitmap, bitmap.width, bitmap.height);
}

function drawToJpeg(source: CanvasImageSource, w: number, h: number): string {
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function uploadCard(token: string, imageDataUrl: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/a/${token}/card`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl }),
  });
  return res.json().catch(() => ({ ok: false }));
}

export async function saveDraft(token: string, data: ResumeData): Promise<void> {
  await fetch(`/api/a/${token}/draft`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => undefined);
}

export async function submitResume(
  token: string,
  data: ResumeData
): Promise<{ ok?: boolean; error?: string; fields?: string[] }> {
  const res = await fetch(`/api/a/${token}/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json().catch(() => ({ error: 'network' }));
}
