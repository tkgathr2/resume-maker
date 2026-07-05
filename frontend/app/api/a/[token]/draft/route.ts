import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME } from '@/lib/resumeFields';

export const runtime = 'nodejs';

// 下書き自動保存。提出後は読取専用（改ざん防止・要件 STRIDE-T）。
export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  if (r.applicant.submittedAt) {
    return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }
  // 既知フィールドのみ・文字列のみ・長さ制限（zod なしの最小バリデーション）
  const clean: Record<string, string> = {};
  for (const key of Object.keys(EMPTY_RESUME)) {
    const v = (body as Record<string, unknown>)[key];
    if (typeof v === 'string') clean[key] = v.slice(0, 4000);
  }
  await prisma.applicant.update({ where: { id: r.applicant.id }, data: { draft: clean } });
  return NextResponse.json({ ok: true });
}
