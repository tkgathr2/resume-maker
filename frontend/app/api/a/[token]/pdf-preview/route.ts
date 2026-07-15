import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME } from '@/lib/resumeFields';
import { renderJisResumePdf, toJisResumeData } from '@/lib/pdf/resumePdf';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  if (!a.submittedAt) {
    return NextResponse.json({ error: 'not_submitted' }, { status: 409 });
  }

  const submittedData = (a.submittedData ?? {}) as Record<string, unknown>;
  const jisData = toJisResumeData(EMPTY_RESUME, submittedData);

  try {
    const pdfBuffer = await renderJisResumePdf(jisData);

    await prisma.applicant.update({
      where: { id: a.id },
      data: { pdfGeneratedAt: new Date() },
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (e) {
    console.error('PDF render failed:', e);
    return NextResponse.json({ error: 'render_failed', detail: String(e) }, { status: 500 });
  }
}
