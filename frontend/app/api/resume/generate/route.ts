import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateResumePdf, ResumeData } from '@/lib/pdf';
import { uploadPdfToDrive } from '@/lib/google';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sanitizeFileName(name: string): string {
  const base = (name || 'resume').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}_履歴書_${stamp}.pdf`;
}

// Full flow: form data -> PDF -> Google Drive -> DB record -> link.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  let body: ResumeData;
  try {
    body = (await req.json()) as ResumeData;
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です。' }, { status: 400 });
  }

  if (!body.fullName || !body.fullName.trim()) {
    return NextResponse.json({ error: '氏名は必須です。' }, { status: 400 });
  }

  try {
    // 1. Generate the PDF.
    const pdf = await generateResumePdf(body);

    // 2. Upload to the user's Google Drive.
    const fileName = sanitizeFileName(body.fullName);
    const { fileId, webViewLink } = await uploadPdfToDrive(
      session.accessToken,
      fileName,
      pdf
    );

    // 3. Persist a record.
    const { rows } = await query<{ id: string }>(
      `INSERT INTO resumes
         (user_id, full_name, email, phone, summary, experience, education, skills, drive_file_id, drive_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        session.userId,
        body.fullName,
        body.email || null,
        body.phone || null,
        body.summary || null,
        body.experience || null,
        body.education || null,
        body.skills || null,
        fileId,
        webViewLink,
      ]
    );

    return NextResponse.json({
      resumeId: rows[0].id,
      fileName,
      driveFileId: fileId,
      driveLink: webViewLink,
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('resume/generate failed:', msg);

    // Distinguish common Drive auth failures for a clearer client message.
    if (/invalid_grant|invalid credentials|401|unauthorized/i.test(msg)) {
      return NextResponse.json(
        { error: 'Google の認証が切れました。ログインし直してください。' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'PDF 生成または Drive 保存に失敗しました。' },
      { status: 500 }
    );
  }
}
