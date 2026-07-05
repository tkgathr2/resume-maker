import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/google';
import { createSession } from '@/lib/session';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Google redirects here with ?code=...&state=...
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  // Verify CSRF state.
  const expected = req.cookies.get('rm_oauth_state')?.value;
  if (!expected || expected !== state) {
    return NextResponse.redirect(`${origin}/?error=state_mismatch`);
  }

  try {
    const { accessToken, profile } = await exchangeCode(code);

    // Upsert the user record in Postgres.
    const { rows } = await query<{ id: string }>(
      `INSERT INTO users (google_sub, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_sub)
       DO UPDATE SET email = EXCLUDED.email,
                     name = EXCLUDED.name,
                     picture = EXCLUDED.picture,
                     updated_at = now()
       RETURNING id`,
      [profile.sub, profile.email, profile.name, profile.picture || null]
    );
    const userId = rows[0].id;

    await createSession({
      userId,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      accessToken,
    });

    const res = NextResponse.redirect(`${origin}/dashboard`);
    res.cookies.delete('rm_oauth_state');
    return res;
  } catch (e: any) {
    console.error('OAuth callback failed:', e?.message || e);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent('auth_failed')}`
    );
  }
}
