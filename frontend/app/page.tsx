import { auth } from '@/auth';
import { redirect } from 'next/navigation';

// ホーム: スタッフは管理画面へ、未ログインはスタッフ用サインインへ。
// 求職者は /a/<token> を直接開くのでここは通らない。
export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect('/admin');
  }
  redirect('/auth/signin');
}
