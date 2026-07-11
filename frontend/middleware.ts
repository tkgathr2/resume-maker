import { auth } from '@/auth';

// ガード方針：
// - /: ランディングページ（未ログインOK）→ ページ内で認証判定（スタッフは /admin へ）
// - /admin/*: スタッフ用（認証必須）→ 未ログインは /auth/signin へ
// - /a/*: 求職者用（トークン認証）→ ログイン不要
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname.startsWith('/auth');
  const isApplicantRoute = pathname.startsWith('/a');
  const isApiApplicantRoute = pathname.startsWith('/api/a');
  const isLoggedIn = !!req.auth;

  // ランディングページ・求職者ページ・認証ページはスキップ
  if (isAuthRoute || isApplicantRoute || isApiApplicantRoute || pathname === '/') {
    return undefined;
  }

  // /admin/* はスタッフのみ
  if (!isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  // ガード対象: / と /admin/**、その他（/api/admin/*など）
  // 対象外: /a/**・/api/a/**・/auth/**
  matcher: ['/', '/admin/:path*', '/api/:path*'],
};
