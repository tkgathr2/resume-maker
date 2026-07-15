import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME, type ResumeData } from '@/lib/resumeFields';

export const runtime = 'nodejs';

// 求職者ページの状態取得（プリフィル込み）。初回アクセスで opened に。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  if (a.status === 'invited') {
    await prisma.applicant.update({ where: { id: a.id }, data: { status: 'opened' } });
    await prisma.auditEvent.create({ data: { applicantId: a.id, type: 'opened' } });
  }

  // プリフィル: OCR結果 ← 下書きで上書き（本人修正が最優先）
  const ocr = (a.ocrResult ?? {}) as Record<string, unknown>;
  const draft = (a.draft ?? {}) as Partial<ResumeData>;
  const prefill: ResumeData = { ...EMPTY_RESUME };
  const map: Record<string, keyof ResumeData> = {
    fullName: 'fullName',
    birthDate: 'birthDate',
    gender: 'gender',
    nationality: 'nationality',
    address: 'address',
    visaStatus: 'visaStatus',
    visaExpiry: 'visaExpiry',
    workRestriction: 'workRestriction',
  };
  for (const [ocrKey, formKey] of Object.entries(map)) {
    const v = ocr[ocrKey];
    if (typeof v === 'string' && v) prefill[formKey] = v;
  }
  Object.assign(prefill, draft);

  return NextResponse.json({
    status: a.status,
    locale: a.locale,
    ocrStatus: a.ocrStatus,
    confidence: (ocr.confidence as Record<string, number>) ?? {},
    prefill,
    submitted: !!a.submittedAt,
  });
}
