import { auth } from '@/auth';

// ガード方針：
// - /: 求職者用アップロード画面（未ログインOK）→ ページ内でスタッフは /admin へ
// - /admin/* と /api/admin/*: スタッフ用（認証必須）→ 未ログインは /auth/signin へ
// - /a/* と /api/a/*: 求職者用（トークン認証）→ ログイン不要
// - /api/start: 求職者の提出開始（匿名・IPレート制限あり）→ ログイン不要
// - /api/auth/*: NextAuth、/api/cron/*: CRON_SECRET で自己防衛 → ログイン不要
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/a') ||
    pathname.startsWith('/api/a') ||
    pathname === '/api/start' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron');
  const isLoggedIn = !!req.auth;

  if (isPublic) {
    return undefined;
  }

  // /admin/*・/api/admin/* などはスタッフのみ
  if (!isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  // ガード対象: / と /admin/**、その他（/api/admin/*など）
  // 対象外: /a/**・/api/a/**・/api/start・/api/auth/**・/auth/**
  matcher: ['/', '/admin/:path*', '/api/:path*'],
};
