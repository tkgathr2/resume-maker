/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  async redirects() {
    return [
      // 旧構成のURL（rirekisyo.takagi.bz 時代のブックマーク・履歴）救済
      { source: '/form', destination: '/', permanent: true },
      // 旧ドメインは正ドメインへ寄せる（クエリは自動引き継ぎ）
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'rirekisyo.takagi.bz' }],
        destination: 'https://rirekimeka.takagi.bz/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
