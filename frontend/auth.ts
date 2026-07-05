import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

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
  // Trust the deployment host (Vercel/custom domain). Required by Auth.js v5
  // when not auto-detected, otherwise middleware auth checks reject the host.
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    // Custom sign-in screen (task requirement: /auth/signin).
    signIn: '/auth/signin',
  },
});
