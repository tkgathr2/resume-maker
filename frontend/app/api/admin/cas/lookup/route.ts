import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const ca = await prisma.cA.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!ca) {
      return NextResponse.json({ error: 'CA not found' }, { status: 404 });
    }

    return NextResponse.json({ caId: ca.id });
  } catch (error) {
    console.error('GET /api/admin/cas/lookup error:', error);
    return NextResponse.json({ error: 'Failed to lookup CA' }, { status: 500 });
  }
}
