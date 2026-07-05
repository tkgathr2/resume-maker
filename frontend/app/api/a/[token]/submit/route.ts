import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME, REQUIRED_FIELDS } from '@/lib/resumeFields';

export const runtime = 'nodejs';

// 提出（冪等）。以降、求職者側は読取専用。
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  if (a.submittedAt) return NextResponse.json({ ok: true, already: true });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }
  const clean: Record<string, string> = {};
  for (const key of Object.keys(EMPTY_RESUME)) {
    const v = (body as Record<string, unknown>)[key];
    clean[key] = typeof v === 'string' ? v.slice(0, 4000) : '';
  }
  const missing = REQUIRED_FIELDS.filter((k) => !clean[k]?.trim());
  if (missing.length > 0) {
    return NextResponse.json({ error: 'missing_required', fields: missing }, { status: 422 });
  }

  await prisma.applicant.update({
    where: { id: a.id },
    data: { submittedData: clean, submittedAt: new Date(), status: 'submitted', draft: clean },
  });
  await prisma.auditEvent.create({ data: { applicantId: a.id, type: 'submitted' } });
  return NextResponse.json({ ok: true });
}
