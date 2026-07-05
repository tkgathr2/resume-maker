import { auth } from '@/auth';

// スタッフ領域（/admin・トップ）のみ認証ガード。
// 求職者のトークンページ（/a/*）とそのAPI（/api/a/*）はログイン不要。
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
  // ガード対象: / と /admin/** のみ。/a/**・/api/** は対象外
  // （/api/admin/* は requireStaff() がアプリ層で401を返す）。
  matcher: ['/', '/admin/:path*'],
};
