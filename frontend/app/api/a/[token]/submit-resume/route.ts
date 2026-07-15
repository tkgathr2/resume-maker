import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME } from '@/lib/resumeFields';
import { renderJisResumePdf, toJisResumeData } from '@/lib/pdf/resumePdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

/**
 * Slack DM で CA へ PDF を送信（MCP: slack_send_message 経由）
 */
async function sendPdfToCA(caCode: string, pdfBuffer: Buffer, applicantName: string): Promise<void> {
  if (!SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN not configured');
  }

  // CA コード → Slack User ID マッピング
  const caSlackMap: Record<string, string> = {
    '3javk': 'U03XXXXX1', // ホア（実際のUser IDに置換）
    '8tcj9': 'U03XXXXX2', // ライ
    '9wj9c': 'U03XXXXX3', // マヌス
  };

  const slackUserId = caSlackMap[caCode];
  if (!slackUserId) {
    throw new Error(`Unknown CA code: ${caCode}`);
  }

  // PDF をファイル形式で Slack API に投稿
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 9);
  const formData = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="channels"\r\n\r\n${slackUserId}\r\n`),
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="resume_${applicantName}.pdf"\r\n`),
    Buffer.from(`Content-Type: application/pdf\r\n\r\n`),
    pdfBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch('https://slack.com/api/files.upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: formData,
  });

  const result = (await res.json()) as { ok?: boolean; error?: string };
  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  if (a.status === 'completed') {
    return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
  }

  if (!a.submittedAt) {
    return NextResponse.json({ error: 'no_submitted_data' }, { status: 400 });
  }

  if (!a.caId) {
    return NextResponse.json({ error: 'no_ca_assigned' }, { status: 400 });
  }

  try {
    // CA コードを取得
    const ca = await prisma.cA.findUnique({ where: { id: a.caId } });
    if (!ca) {
      return NextResponse.json({ error: 'ca_not_found' }, { status: 500 });
    }

    // PDF 生成
    const submittedData = (a.submittedData ?? {}) as Record<string, unknown>;
    const jisData = toJisResumeData(EMPTY_RESUME, submittedData);
    const pdfBuffer = await renderJisResumePdf(jisData);

    // CA へ Slack DM で送信
    await sendPdfToCA(ca.code, pdfBuffer, a.displayName);

    // ステータス更新
    await prisma.applicant.update({
      where: { id: a.id },
      data: {
        status: 'completed',
      },
    });

    return NextResponse.json({ ok: true, message: 'PDF sent to CA' });
  } catch (e) {
    console.error('submit-resume failed:', e);
    return NextResponse.json(
      { error: 'submit_failed', detail: String(e) },
      { status: 500 }
    );
  }
}
