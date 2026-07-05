import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '履歴書メーカー | Resume Maker',
  description: 'Google ログインでかんたんに履歴書を作成し、PDF を Google ドライブに保存できます。',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
