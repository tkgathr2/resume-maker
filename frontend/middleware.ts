import { auth } from '@/auth';

// Auth guard (NextAuth v5). Unauthenticated users hitting a protected route are
// redirected to /auth/signin. The /auth/* pages themselves are excluded so the
// sign-in flow remains reachable while logged out.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname.startsWith('/auth');
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn && !isAuthRoute) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  // Run on everything except NextAuth API routes, Next internals, and static files.
  // /auth/* IS matched (so logged-in users could be bounced away later if desired),
  // but the callback above lets unauthenticated users through to /auth/*.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.svg|favicon.ico|locales|.*\\..*).*)'],
};
