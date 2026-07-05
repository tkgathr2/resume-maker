import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';
import { newInviteToken } from '@/lib/serverCrypto';

export const runtime = 'nodejs';

const TOKEN_TTL_DAYS = 14;

export async function GET() {
  const g = await requireStaff();
  if (!g.ok) return g.res;
  const applicants = await prisma.applicant.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      displayName: true,
      status: true,
      locale: true,
      ocrStatus: true,
      workRestriction: true,
      submittedAt: true,
      tokenExpiresAt: true,
      createdAt: true,
    },
    take: 200,
  });
  return NextResponse.json({ applicants });
}

// 求職者登録 + 招待URL発行
export async function POST(req: NextRequest) {
  const g = await requireStaff();
  if (!g.ok) return g.res;

  const body = await req.json().catch(() => null);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 100) : '';
  const locale = ['ja', 'ne', 'en', 'vi'].includes(body?.locale) ? body.locale : 'ja';
  if (!displayName) return NextResponse.json({ error: 'name_required' }, { status: 422 });

  const token = newInviteToken();
  const applicant = await prisma.applicant.create({
    data: {
      displayName,
      locale,
      token,
      tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_DAYS * 86400_000),
      createdBy: g.email,
    },
  });
  await prisma.auditEvent.create({ data: { applicantId: applicant.id, type: 'created', detail: g.email } });

  const origin = req.nextUrl.origin;
  return NextResponse.json({ id: applicant.id, url: `${origin}/a/${token}` });
}
