import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Applicant } from '@prisma/client';

// トークン検証つきで求職者を引く共通ヘルパー。
export async function findApplicantByToken(token: string): Promise<
  | { ok: true; applicant: Applicant }
  | { ok: false; res: NextResponse }
> {
  if (!token || token.length < 20) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  const applicant = await prisma.applicant.findUnique({ where: { token } });
  if (!applicant) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  if (applicant.tokenExpiresAt < new Date()) {
    return { ok: false, res: NextResponse.json({ error: 'token_expired' }, { status: 410 }) };
  }
  return { ok: true, applicant };
}
