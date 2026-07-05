import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';
import { decryptBuffer } from '@/lib/serverCrypto';

export const runtime = 'nodejs';

// スタッフ専用: 復号したカード画像を返す（本人確認用）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff();
  if (!g.ok) return g.res;
  const { id } = await params;
  const a = await prisma.applicant.findUnique({
    where: { id },
    select: { cardImage: true, cardImageIv: true },
  });
  if (!a?.cardImage || !a.cardImageIv) {
    return NextResponse.json({ error: 'no_card' }, { status: 404 });
  }
  const plain = decryptBuffer(Buffer.from(a.cardImage), a.cardImageIv);
  return new NextResponse(new Uint8Array(plain), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store' },
  });
}
