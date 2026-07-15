import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findApplicantByToken } from '@/lib/applicantApi';
import { EMPTY_RESUME, REQUIRED_FIELDS } from '@/lib/resumeFields';
import { generateEditToken, hashToken } from '@/lib/token';
import { notifySubmit } from '@/lib/slackNotify';
import { SELF_EDIT_ENABLED } from '@/lib/featureFlags';

export const runtime = 'nodejs';

// 提出（冪等）。以降、求職者側は読取専用。
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findApplicantByToken(token);
  if (!r.ok) return r.res;
  const a = r.applicant;

  if (a.submittedAt) return NextResponse.json({ ok: true, already: true });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }
  const clean: Record<string, string> = {};
  for (const key of Object.keys(EMPTY_RESUME)) {
    const v = (body as Record<string, unknown>)[key];
    clean[key] = typeof v === 'string' ? v.slice(0, 4000) : '';
  }
  const missing = REQUIRED_FIELDS.filter((k) => !clean[k]?.trim());
  if (missing.length > 0) {
    return NextResponse.json({ error: 'missing_required', fields: missing }, { status: 422 });
  }

  // CA固有URL（?ca=<code>）の担当CAを紐付ける。
  // 呼び出し側が code / caId / CA名 のどれを渡してきても解決できるようにする
  // （以前フォームは lookup 済みの caId を渡しており、name 一致では常に外れていた）。
  const caParam = req.nextUrl.searchParams.get('ca');
  let ca = caParam
    ? await prisma.cA.findFirst({
        where: { OR: [{ code: caParam }, { id: caParam }, { name: caParam }] },
        select: { id: true, name: true },
      })
    : null;
  if (caParam && !ca) console.warn('[submit] CA not found for param:', caParam);
  // ?ca= が無い提出で、招待時にスタッフが設定した担当CAを消さない
  if (!ca && a.caId) {
    ca = await prisma.cA.findUnique({ where: { id: a.caId }, select: { id: true, name: true } });
  }

  const updatedApplicant = await prisma.applicant.update({
    where: { id: a.id },
    data: {
      submittedData: clean,
      submittedAt: new Date(),
      status: 'submitted',
      draft: clean,
      caId: ca?.id ?? null,
      // 本人アップロード（事前登録なし）は本人確定の氏名を管理用の名前に反映
      ...(a.createdBy === 'self' && clean.fullName?.trim()
        ? { displayName: clean.fullName.trim().slice(0, 100) }
        : {}),
    },
  });
  await prisma.auditEvent.create({ data: { applicantId: a.id, type: 'submitted' } });

  try {
    await notifySubmit(updatedApplicant.displayName, ca?.name ?? null, updatedApplicant.id);
  } catch (e) {
    console.error('Slack notify (submit) failed:', e);
  }

  // 「後から修正」本人トークンを発行（失敗しても提出自体は成功扱い）。
  // DB への editTokenHash 保存は SELF_EDIT_ENABLED に関わらず常に行う（CA再発行の将来利用に温存）。
  // レスポンスへの editUrl 同梱は SELF_EDIT_ENABLED=false のときは行わない（本人修正機能は非表示）。
  let editUrl: string | undefined;
  try {
    const editToken = generateEditToken();
    await prisma.applicant.update({
      where: { id: a.id },
      data: { editTokenHash: hashToken(editToken) },
    });
    if (SELF_EDIT_ENABLED) {
      editUrl = `${req.nextUrl.origin}/my/${editToken}`;
    }
  } catch (e) {
    console.error('Failed to issue edit token:', e);
  }

  return NextResponse.json({ ok: true, ...(editUrl ? { editUrl } : {}) });
}
