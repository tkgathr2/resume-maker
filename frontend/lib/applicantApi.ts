import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Applicant } from '@prisma/client';
import { hashToken, verifyToken } from '@/lib/token';

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

// 「後から修正」本人トークン検証つきで求職者を引く共通ヘルパー。
// 無効・失効トークンは一律 404（データの有無を漏らさない）。
export async function findApplicantByEditToken(token: string): Promise<
  | { ok: true; applicant: Applicant }
  | { ok: false; res: NextResponse }
> {
  if (!token || token.length < 20) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  const applicant = await prisma.applicant.findUnique({ where: { editTokenHash: hashToken(token) } });
  if (!applicant || !applicant.editTokenHash || !verifyToken(token, applicant.editTokenHash)) {
    return { ok: false, res: NextResponse.json({ error: 'invalid_token' }, { status: 404 }) };
  }
  return { ok: true, applicant };
}
