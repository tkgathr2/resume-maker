import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByEditToken } from '@/lib/applicantApi';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { EMPTY_RESUME, type ResumeData } from '@/lib/resumeFields';

export const runtime = 'nodejs';

const RATE_LIMIT = 10; // req/分/IP
const RATE_WINDOW_MS = 60_000;

// 本人「後から修正」: トークン照合で自レコードのみ読み書き可能。
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(`my:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const { token } = await params;
  const r = await findApplicantByEditToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  const data: ResumeData = { ...EMPTY_RESUME, ...((a.submittedData as Partial<ResumeData>) ?? {}) };
  return NextResponse.json({ locale: a.locale, data, updatedAt: a.updatedAt });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(`my:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const { token } = await params;
  const r = await findApplicantByEditToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }

  // ホワイトリスト方式: ResumeData のフィールドのみ更新可（id/caId/editTokenHash等は不可）。
  const clean: Record<string, string> = {};
  for (const key of Object.keys(EMPTY_RESUME)) {
    const v = (body as Record<string, unknown>)[key];
    clean[key] = typeof v === 'string' ? v.slice(0, 4000) : '';
  }

  const updated = await prisma.applicant.update({
    where: { id: a.id },
    data: { submittedData: clean, updatedBy: 'self' },
  });
  await prisma.auditEvent.create({ data: { applicantId: a.id, type: 'self_edited' } });

  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt });
}
