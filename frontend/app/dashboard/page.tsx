import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import ResumeForm from './ResumeForm';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          <span>履歴書メーカー</span>
        </div>
        <div className="user">
          {session.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.picture} alt="" referrerPolicy="no-referrer" />
          ) : null}
          <span>{session.name}</span>
          <a className="btn btn-ghost" href="/api/auth/logout">
            ログアウト
          </a>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>履歴書を作成</h2>
        <p className="muted">
          必要な項目を入力して「PDF を生成して Google ドライブに保存」を押すと、PDF
          が作られ、あなたの Google ドライブに保存されます。
        </p>
        <ResumeForm defaultName={session.name} defaultEmail={session.email} />
      </div>

      <p className="footer-note">
        高木産業グループ · Resume Maker · sys=resume-maker
      </p>
    </div>
  );
}
