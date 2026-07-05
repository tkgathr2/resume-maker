import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken } from '@/lib/applicantApi';
import { encryptBuffer } from '@/lib/serverCrypto';
import { runCardOcr } from '@/lib/ocr';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // クライアント側でリサイズ済み前提（Vercel body 上限 4.5MB）
const MAX_OCR_PER_APPLICANT = 10;

// 在留カード画像アップロード → 暗号化保存 → その場でOCR実行（実測3秒）。
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  if (a.submittedAt) return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
  if (a.ocrCount >= MAX_OCR_PER_APPLICANT) {
    return NextResponse.json({ error: 'ocr_limit' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const dataUrl: string | undefined = body?.image;
  if (!dataUrl?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'bad_image' }, { status: 400 });
  }
  const [head, b64] = dataUrl.split(',', 2);
  const mediaType = head.slice(5).split(';')[0]; // image/jpeg 等
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) || !b64) {
    return NextResponse.json({ error: 'bad_image' }, { status: 400 });
  }
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 10_000 || buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'bad_size' }, { status: 400 });
  }

  // 暗号化保存 + processing 状態へ
  const enc = encryptBuffer(buf);
  await prisma.applicant.update({
    where: { id: a.id },
    data: {
      cardImage: new Uint8Array(enc.data),
      cardImageIv: enc.iv,
      cardUploadedAt: new Date(),
      status: 'card_uploaded',
      ocrStatus: 'processing',
      ocrCount: { increment: 1 },
    },
  });
  await prisma.auditEvent.create({ data: { applicantId: a.id, type: 'card_uploaded' } });

  // その場でOCR（〜3秒）。リクエスト内で完了させ、クライアントは status をポーリング。
  try {
    const result = await runCardOcr(b64, mediaType);
    if ('error' in result && result.error) {
      await prisma.applicant.update({
        where: { id: a.id },
        data: { ocrStatus: 'failed', ocrResult: { error: result.error } },
      });
      await prisma.auditEvent.create({
        data: { applicantId: a.id, type: 'ocr_failed', detail: String(result.error) },
      });
      return NextResponse.json({ ok: false, ocrStatus: 'failed', reason: result.error });
    }

    const fields = result as Record<string, unknown>;
    // カード番号はフル保存しない（下4桁のみ・要件 TBD-002 推奨値）
    const cardNumber = typeof fields.cardNumber === 'string' ? fields.cardNumber : null;
    const last4 = cardNumber ? cardNumber.replace(/[^A-Za-z0-9]/g, '').slice(-4) : null;
    delete fields.cardNumber;

    await prisma.applicant.update({
      where: { id: a.id },
      data: {
        ocrStatus: 'done',
        ocrResult: fields as object,
        workRestriction: typeof fields.workRestriction === 'string' ? fields.workRestriction : null,
        cardNumberLast4: last4,
        cardExpiryDate: typeof fields.cardExpiry === 'string' ? fields.cardExpiry : null,
      },
    });
    await prisma.auditEvent.create({ data: { applicantId: a.id, type: 'ocr_done' } });
    return NextResponse.json({ ok: true, ocrStatus: 'done' });
  } catch (e) {
    await prisma.applicant.update({ where: { id: a.id }, data: { ocrStatus: 'failed' } });
    await prisma.auditEvent.create({
      data: { applicantId: a.id, type: 'ocr_failed', detail: String(e).slice(0, 500) },
    });
    return NextResponse.json({ ok: false, ocrStatus: 'failed' });
  }
}
