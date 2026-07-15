import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken, buildPrefill } from '@/lib/applicantApi';

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

  // プリフィル: OCR結果 ← 下書きで上書き（本人修正が最優先）。
  // 確認画面のPDFと同じ値になるよう、組み立ては applicantApi に集約している。
  const ocr = (a.ocrResult ?? {}) as Record<string, unknown>;
  const prefill = buildPrefill(a);

  return NextResponse.json({
    status: a.status,
    locale: a.locale,
    ocrStatus: a.ocrStatus,
    confidence: (ocr.confidence as Record<string, number>) ?? {},
    prefill,
    submitted: !!a.submittedAt,
  });
}
