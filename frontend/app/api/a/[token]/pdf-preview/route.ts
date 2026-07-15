import { NextRequest, NextResponse } from 'next/server';
import { findApplicantByToken, buildPdfSource } from '@/lib/applicantApi';
import { EMPTY_RESUME } from '@/lib/resumeFields';
import { renderJisResumePdf, toJisResumeData } from '@/lib/pdf/resumePdf';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 提出前の確認画面用に、いまの内容で JIS 履歴書PDFを描画して返す。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // 1描画ごとにフォント埋め込み込みのPDF生成が走るので上限を設ける。
  // 求職者は共有WiFiや携帯キャリアのNAT配下で同一IPになりやすく、IP単位だと
  // 無関係な人を巻き添えで止めてしまうため、トークン（=求職者）単位で数える。
  // トークンの取得自体は /api/start がIP単位で絞っている。
  if (!rateLimit(`pdfprev:${token}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  const jisData = toJisResumeData(EMPTY_RESUME, buildPdfSource(a));

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
