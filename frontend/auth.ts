import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// 許可ドメイン + STAFF_EMAILS（カンマ区切り）で追加許可。
const STAFF_DOMAINS = ['takagi.bz', 'stepupnext.com'];

export function isStaffEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (!lower.includes('@')) return false;
  const domain = lower.split('@')[1];
  if (STAFF_DOMAINS.includes(domain)) return true;
  const extras = (process.env.STAFF_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extras.includes(lower);
}

// NextAuth v5 (Auth.js) configuration with the Google OAuth provider.
// Env vars fall back to '' so `next build` never throws when secrets are absent;
// real values are required at run time for actual authentication.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Offline access + consent prompt so a refresh token is issued.
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // スタッフのみログイン可（求職者はトークンURLでログイン不要のため、
    // Google ログインは社内スタッフ専用）。
    signIn({ user }) {
      return isStaffEmail(user.email ?? '');
    },
  },
  // Trust the deployment host (Vercel/custom domain). Required by Auth.js v5
  // when not auto-detected, otherwise middleware auth checks reject the host.
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    // Custom sign-in screen (task requirement: /auth/signin).
    signIn: '/auth/signin',
  },
});
