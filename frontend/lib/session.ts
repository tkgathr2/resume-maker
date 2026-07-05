import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';

const COOKIE_NAME = 'rm_session';
const MAX_AGE_SEC = 60 * 60; // 1 hour (matches Google access-token lifetime)

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  // Google OAuth access token, used to call the Drive API on the user's behalf.
  accessToken: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function createSession(data: SessionData): Promise<void> {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
