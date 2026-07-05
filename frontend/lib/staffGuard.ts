import { NextResponse } from 'next/server';
import { auth, isStaffEmail } from '@/auth';

// /api/admin/* 共通ガード。applicant トークンでは絶対に通れない（権限分離・STRIDE-E）。
export async function requireStaff(): Promise<
  { ok: true; email: string } | { ok: false; res: NextResponse }
> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isStaffEmail(email)) {
    return { ok: false, res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  return { ok: true, email };
}
