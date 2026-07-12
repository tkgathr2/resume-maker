import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';
import { newInviteToken } from '@/lib/serverCrypto';
import { EMPTY_RESUME } from '@/lib/resumeFields';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff();
  if (!g.ok) return g.res;
  const { id } = await params;
  const a = await prisma.applicant.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      status: true,
      locale: true,
      token: true,
      tokenExpiresAt: true,
      ocrStatus: true,
      ocrResult: true,
      workRestriction: true,
      cardNumberLast4: true,
      cardExpiryDate: true,
      cardUploadedAt: true,
      draft: true,
      submittedData: true,
      submittedAt: true,
      caId: true,
      createdBy: true,
      createdAt: true,
    },
  });
  if (!a) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ applicant: a });
}

// action: 'reissue'（URL再発行・旧トークン即失効） / 'update'（スタッフ修正） / 'complete'
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff();
  if (!g.ok) return g.res;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === 'reissue') {
    const token = newInviteToken();
    const a = await prisma.applicant.update({
      where: { id },
      data: { token, tokenExpiresAt: new Date(Date.now() + 14 * 86400_000) },
    });
    await prisma.auditEvent.create({ data: { applicantId: id, type: 'reissued', detail: g.email } });
    return NextResponse.json({ url: `${req.nextUrl.origin}/a/${a.token}` });
  }

  if (action === 'update') {
    const clean: Record<string, string> = {};
    for (const key of Object.keys(EMPTY_RESUME)) {
      const v = body?.data?.[key];
      if (typeof v === 'string') clean[key] = v.slice(0, 4000);
    }
    await prisma.$transaction(async (tx) => {
      const before = await tx.applicant.findUnique({ where: { id }, select: { submittedData: true } });
      // 更新前の全提出データをスナップショットとして保存してから上書きする。
      await tx.applicantRevision.create({
        data: { applicantId: id, snapshot: before?.submittedData ?? {}, changedBy: g.email },
      });
      await tx.applicant.update({ where: { id }, data: { submittedData: clean, updatedBy: 'staff' } });
    });
    await prisma.auditEvent.create({ data: { applicantId: id, type: 'staff_edited', detail: g.email } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'update_ca') {
    const caId = body?.caId ?? null;
    await prisma.applicant.update({ where: { id }, data: { caId } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'complete') {
    await prisma.applicant.update({ where: { id }, data: { status: 'completed' } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'bad_action' }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff();
  if (!g.ok) return g.res;
  const { id } = await params;
  await prisma.applicant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
