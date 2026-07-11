import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SelfUpload from './SelfUpload';

// ホーム: いきなり在留カードのアップロード画面（未ログインOK）。
// スタッフ（Google ログイン済み）は /admin へ。
export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect('/admin');
  }
  return <SelfUpload />;
}
