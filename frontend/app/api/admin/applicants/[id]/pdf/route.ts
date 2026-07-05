import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/staffGuard';
import { EMPTY_RESUME, type ResumeData } from '@/lib/resumeFields';
import { renderResumePdf } from '@/lib/resumePdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff();
  if (!g.ok) return g.res;
  const { id } = await params;
  const a = await prisma.applicant.findUnique({
    where: { id },
    select: { displayName: true, submittedData: true, draft: true },
  });
  if (!a) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const source = (a.submittedData ?? a.draft) as Partial<ResumeData> | null;
  if (!source) return NextResponse.json({ error: 'no_data' }, { status: 422 });
  const data: ResumeData = { ...EMPTY_RESUME, ...source };

  const pdf = await renderResumePdf(data);
  await prisma.auditEvent.create({ data: { applicantId: id, type: 'pdf_downloaded', detail: g.email } });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="resume-${encodeURIComponent(a.displayName)}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
