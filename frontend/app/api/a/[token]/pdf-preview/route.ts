import { NextRequest, NextResponse } from 'next/server';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME } from '@/lib/resumeFields';
import { renderJisResumePdf, toJisResumeData } from '@/lib/pdf/resumePdf';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 提出前の確認画面用に、いまの内容で JIS 履歴書PDFを描画して返す。
// 提出前は draft、提出後は確定データ（submittedData）を正とする。
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // 1描画ごとにフォント埋め込み込みのPDF生成が走るため、同ディレクトリの card と
  // 同じIPベースの制限をかける（/api/start で誰でも有効トークンを取れるため、
  // トークン所持だけを条件にすると無制限に描画を発火させられる）。
  if (!rateLimit(`pdfprev:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  const source = (a.submittedData ?? a.draft ?? {}) as Record<string, unknown>;
  const jisData = toJisResumeData(EMPTY_RESUME, source);

  try {
    const pdfBuffer = await renderJisResumePdf(jisData);
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('PDF render failed:', e);
    return NextResponse.json({ error: 'render_failed' }, { status: 500 });
  }
}
