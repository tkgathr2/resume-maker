import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildAuthUrl } from '@/lib/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Kicks off the Google OAuth flow.
export async function GET() {
  // CSRF state stored in a short-lived cookie, verified on callback.
  const state = randomBytes(16).toString('hex');
  const url = buildAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set('rm_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
