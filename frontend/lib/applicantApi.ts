import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Applicant } from '@prisma/client';
import { hashToken, verifyToken } from '@/lib/token';
import { EMPTY_RESUME, type ResumeData } from '@/lib/resumeFields';

// OCR結果 ← 下書き の順に重ねた「いまの入力内容」。本人修正が最優先。
// フォームのプリフィルと確認画面のPDFで必ず同じ値を使うため、ここに集約する
// （別々に組み立てると「PDFは空なのに送信内容にはOCR値が入る」ズレが起きる）。
const OCR_TO_FORM: Record<string, keyof ResumeData> = {
  fullName: 'fullName',
  birthDate: 'birthDate',
  gender: 'gender',
  nationality: 'nationality',
  address: 'address',
  visaStatus: 'visaStatus',
  visaExpiry: 'visaExpiry',
  workRestriction: 'workRestriction',
};

export function buildPrefill(a: Applicant): ResumeData {
  const ocr = (a.ocrResult ?? {}) as Record<string, unknown>;
  const draft = (a.draft ?? {}) as Partial<ResumeData>;
  const prefill: ResumeData = { ...EMPTY_RESUME };
  for (const [ocrKey, formKey] of Object.entries(OCR_TO_FORM)) {
    const v = ocr[ocrKey];
    if (typeof v === 'string' && v) prefill[formKey] = v;
  }
  Object.assign(prefill, draft);
  return prefill;
}

// PDF描画の元データ。提出後は確定データ、提出前は「いまの入力内容」。
// JIS追加項目（通勤時間・扶養家族数等）は下書きのJSON blob側にあるため下地として残す。
export function buildPdfSource(a: Applicant): Record<string, unknown> {
  if (a.submittedData) return a.submittedData as Record<string, unknown>;
  return { ...((a.draft ?? {}) as Record<string, unknown>), ...buildPrefill(a) };
}

// トークン検証つきで求職者を引く共通ヘルパー。
export async function findApplicantByToken(token: string): Promise<
  | { ok: true; applicant: Applicant }
  | { ok: false; res: NextResponse }
> {
  if (!token || token.length < 20) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  const applicant = await prisma.applicant.findUnique({ where: { token } });
  if (!applicant) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  if (applicant.tokenExpiresAt < new Date()) {
    return { ok: false, res: NextResponse.json({ error: 'token_expired' }, { status: 410 }) };
  }
  return { ok: true, applicant };
}

// 「後から修正」本人トークン検証つきで求職者を引く共通ヘルパー。
// 無効・失効トークンは一律 404（データの有無を漏らさない）。
export async function findApplicantByEditToken(token: string): Promise<
  | { ok: true; applicant: Applicant }
  | { ok: false; res: NextResponse }
> {
  if (!token || token.length < 20) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  const applicant = await prisma.applicant.findUnique({ where: { editTokenHash: hashToken(token) } });
  if (!applicant || !applicant.editTokenHash || !verifyToken(token, applicant.editTokenHash)) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  return { ok: true, applicant };
}
