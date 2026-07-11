import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';

export const runtime = 'nodejs';

function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function GET() {
  const g = await requireStaff();
  if (!g.ok) return g.res;

  const cas = await prisma.cA.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });
  return NextResponse.json({ cas });
}

export async function POST(req: NextRequest) {
  const g = await requireStaff();
  if (!g.ok) return g.res;

  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'CA name is required' }, { status: 400 });
    }

    const code = generateCode();
    const ca = await prisma.cA.create({
      data: { name: name.trim(), code },
      select: { id: true, name: true, code: true },
    });

    return NextResponse.json(ca, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint failed')
    ) {
      return NextResponse.json(
        { error: 'CA name or code already exists' },
        { status: 409 }
      );
    }
    console.error('POST /api/admin/cas error:', error);
    return NextResponse.json({ error: 'Failed to create CA' }, { status: 500 });
  }
}
