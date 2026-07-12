import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';
import { generateEditToken, hashToken } from '@/lib/token';

export const runtime = 'nodejs';

// CA による「後から修正」本人トークンの再発行。旧トークンは即無効化される
// （editTokenHash を上書きするため、旧ハッシュでの照合は失敗する）。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff();
  if (!g.ok) return g.res;

  const { id } = await params;
  const applicant = await prisma.applicant.findUnique({ where: { id } });
  if (!applicant) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const editToken = generateEditToken();
  await prisma.applicant.update({
    where: { id },
    data: { editTokenHash: hashToken(editToken) },
  });
  await prisma.auditEvent.create({ data: { applicantId: id, type: 'edit_token_reissued', detail: g.email } });

  return NextResponse.json({ url: `${req.nextUrl.origin}/my/${editToken}` });
}
