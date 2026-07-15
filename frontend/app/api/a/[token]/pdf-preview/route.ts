import { NextRequest, NextResponse } from 'next/server';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME } from '@/lib/resumeFields';
import { renderJisResumePdf, toJisResumeData } from '@/lib/pdf/resumePdf';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 提出前の確認画面用に、いまの内容で JIS 履歴書PDFを描画して返す。
// 提出前は draft、提出後は確定データ（submittedData）を正とする。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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
