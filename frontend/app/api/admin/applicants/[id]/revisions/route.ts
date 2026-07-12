import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';

export const runtime = 'nodejs';

// 修正履歴一覧（スナップショット全文つき）。バージョン新しい順。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff();
  if (!g.ok) return g.res;
  const { id } = await params;
  const revisions = await prisma.applicantRevision.findMany({
    where: { applicantId: id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, snapshot: true, changedBy: true, createdAt: true },
  });
  return NextResponse.json({ revisions });
}
