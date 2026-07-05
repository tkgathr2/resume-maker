import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await destroySession();
  const { origin } = new URL(req.url);
  return NextResponse.redirect(`${origin}/`);
}
