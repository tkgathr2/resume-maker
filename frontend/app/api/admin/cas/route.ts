import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';

export const runtime = 'nodejs';

export async function GET() {
  const g = await requireStaff();
  if (!g.ok) return g.res;

  const cas = await prisma.cA.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });
  return NextResponse.json({ cas });
}
