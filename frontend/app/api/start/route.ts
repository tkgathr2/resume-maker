import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { newInviteToken } from '@/lib/serverCrypto';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// 工数最小フロー: トップページから「事前登録なし」で提出を開始する。
// 匿名の Applicant を発行し、既存の /a/<token> フローをそのまま使う。
// 氏名は OCR / 本人確認フォームから自動で埋まる（/api/a/[token]/card, submit 参照）。
const TOKEN_TTL_HOURS = 48;
const START_LIMIT = 10; // 10回 / 10分 / IP（いたずら対策）
const START_WINDOW_MS = 10 * 60_000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`start:${ip}`, START_LIMIT, START_WINDOW_MS)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const locale = ['ja', 'ne', 'en', 'vi'].includes(body?.locale) ? body.locale : 'ja';

  const token = newInviteToken();
  const applicant = await prisma.applicant.create({
    data: {
      displayName: '（本人アップロード）',
      locale,
      token,
      tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 3600_000),
      status: 'opened',
      createdBy: 'self',
    },
  });
  await prisma.auditEvent.create({
    data: { applicantId: applicant.id, type: 'created', detail: 'self' },
  });

  return NextResponse.json({ token });
}
