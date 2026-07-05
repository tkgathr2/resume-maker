import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const CARD_RETENTION_DAYS = 30; // 要件 TBD-001 の安全側既定値

// 毎日実行: 保持期限を過ぎたカード画像を削除（PII最小化）。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - CARD_RETENTION_DAYS * 86400_000);
  const result = await prisma.applicant.updateMany({
    where: { cardUploadedAt: { lt: cutoff }, cardImage: { not: null } },
    data: { cardImage: null, cardImageIv: null },
  });
  return NextResponse.json({ purgedCardImages: result.count });
}
