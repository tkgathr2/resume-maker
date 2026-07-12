import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMPTY_RESUME, type ResumeData } from '@/lib/resumeFields';
import { renderJisResumePdf, toJisResumeData } from '@/lib/pdf/resumePdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

// TODO: integrate token auth (Task#1) — 本実装では staff session / applicant token に
// 統合する。それまでの暫定ガードとして env PDF_PREVIEW_SECRET と一致する
// ?secret= クエリのみ許可する（未設定なら誰も通さない = fail closed）。
function checkPreviewSecret(req: NextRequest): boolean {
  const expected = process.env.PDF_PREVIEW_SECRET;
  if (!expected) return false;
  const provided = req.nextUrl.searchParams.get('secret');
  return provided === expected;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ applicantId: string }> }) {
  if (!checkPreviewSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { applicantId } = await params;
  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: { displayName: true, submittedData: true, draft: true },
  });
  if (!applicant) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const source = (applicant.submittedData ?? applicant.draft) as
    | (Partial<ResumeData> & Record<string, unknown>)
    | null;
  const data = toJisResumeData(EMPTY_RESUME, source);

  const pdf = await renderJisResumePdf(data);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="resume-${encodeURIComponent(applicant.displayName)}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
