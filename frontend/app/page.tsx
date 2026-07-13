import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SelfUpload from './SelfUpload';

// ホーム: いきなり在留カードのアップロード画面（未ログインOK）。
// ?ca=<CA id> 付きアクセスは、スタッフ自身のブラウザがログイン中でも
// 求職者向けアップロード画面をそのまま表示する（CA が案内リンクを自分の
// スマホ等で開いて確認できるように）。ログイン中で ?ca= が無い素の "/" アクセス
// のみ /admin へ誘導する。
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ca } = await searchParams;
  if (!ca) {
    const session = await auth();
    if (session?.user) {
      redirect('/admin');
    }
  }
  return <SelfUpload />;
}
