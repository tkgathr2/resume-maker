import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth, isStaffEmail } from '@/auth';
import { verifyToken } from '@/lib/token';
import { EMPTY_RESUME, type ResumeData } from '@/lib/resumeFields';
import { renderJisResumePdf, toJisResumeData } from '@/lib/pdf/resumePdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 認証統合: staff セッション（Googleログイン済みスタッフ）または
// 求職者本人の editToken（?token=）のハッシュ照合のいずれかで許可する。
// どちらも無ければ DB を引く前に fail closed で 401 を返す。
export async function GET(req: NextRequest, { params }: { params: Promise<{ applicantId: string }> }) {
  const { applicantId } = await params;

  const session = await auth();
  const staffEmail = session?.user?.email;
  const isStaff = !!staffEmail && isStaffEmail(staffEmail);
  const token = req.nextUrl.searchParams.get('token');

  if (!isStaff && !token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: { displayName: true, submittedData: true, draft: true, editTokenHash: true },
  });
  if (!applicant) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (!isStaff) {
    if (!token || !applicant.editTokenHash || !verifyToken(token, applicant.editTokenHash)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const source = (applicant.submittedData ?? applicant.draft) as
    | (Partial<ResumeData> & Record<string, unknown>)
    | null;
  const data = toJisResumeData(EMPTY_RESUME, source);

  const pdf = await renderJisResumePdf(data);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="resume-${encodeURIComponent(applicant.displayName)}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
