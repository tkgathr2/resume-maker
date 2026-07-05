# Resume Maker（履歴書メーカー）

## 概要
クラウドベースの履歴書・職務経歴書作成・管理・AI生成システム。
ユーザーは対話型フォームで経歴を入力し、AI（Haiku）が自動的に職務経歴書を生成。
Slack 通知・Google ドライブ同期対応。

## アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Next.js + TS   │     │   FastAPI + Py   │     │ Railway Postgres│
│  (Vercel)       │────▶│   (Railway)      │────▶│                │
│  - OAuth Login  │     │   - API Routes   │     │                │
│  - Resume Form  │     │   - AI Generation│     └────────────────┘
│  - Dashboard    │     │   - Integrations │
└─────────────────┘     └──────────────────┘
        │                       │
        │                       ▼
        │              ┌────────────────┐
        │              │  Google OAuth  │
        │              │  Slack Webhook │
        │              │  Haiku API     │
        │              └────────────────┘
        │
        ▼
  [Google Drive]
  (Resume Export)
```

## 開発目標

| 段階 | 期間 | フロント | バック | テスト | 目標完了 |
|------|------|---------|--------|--------|---------|
| W1-W2 | 2w | 骨組み+OAuth | - | - | 2026-07-18 |
| W3-W4 | 2w | UI/UX | API/DB/AI | - | 2026-08-01 |
| W5 | 1w | 統合 | 統合 | ✅ | 2026-08-08 |
| W6 | 1w | 本番 | 本番 | - | 2026-07-31 |

**工数計画：** フロント 80h / バック 120h / テスト 40h = **240h 目標**

## ディレクトリ構成

```
resume-maker/
├── frontend/              # Next.js + TypeScript
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── resume/[id]/
│   │   │   └── settings/
│   │   └── api/           # API routes (Next.js)
│   ├── components/
│   ├── lib/
│   ├── public/
│   │   └── favicon.svg
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.local         # Google OAuth, API endpoint
│
├── backend/               # FastAPI + Python
│   ├── app/
│   │   ├── main.py        # FastAPI entry point
│   │   ├── models.py      # SQLAlchemy ORM
│   │   ├── schemas.py     # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── resume.py
│   │   │   ├── ai.py
│   │   │   └── integrations.py
│   │   ├── services/
│   │   │   ├── ai_service.py    # Haiku integration
│   │   │   ├── google_service.py # Drive/OAuth
│   │   │   └── slack_service.py  # Webhook
│   │   └── db.py          # SQLAlchemy config
│   ├── tests/
│   ├── requirements.txt
│   ├── .env               # Database, API keys
│   └── alembic/           # DB migrations
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml         # Tests
│   │   └── deploy.yml     # Auto-deploy
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/
│   ├── API_SPEC.md
│   ├── DEV_GUIDE.md
│   └── DEPLOYMENT.md
│
├── .gitignore
├── .env.example
├── docker-compose.yml     # Local DB
├── package.json           # Root (optional)
└── README.md              # This file
```

## クイックスタート

### 前提
- Node.js 18+
- Python 3.10+
- Docker + Docker Compose（ローカル開発用）

### ローカル開発セットアップ

```bash
# リポジトリクローン
git clone https://github.com/tkgathr2/resume-maker.git
cd resume-maker

# フロントエンド
cd frontend
npm install
cp .env.example .env.local
# .env.local に Google OAuth client ID/secret を設定

# バックエンド（別ターミナル）
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env に DATABASE_URL, HAIKU_API_KEY などを設定

# DB 起動（Docker）
docker-compose up -d postgres

# DB マイグレーション
cd backend
alembic upgrade head

# バック起動
uvicorn app.main:app --reload --port 8000

# フロント起動
cd frontend
npm run dev
# http://localhost:3000
```

## 本番デプロイ

### Vercel（フロント）
```bash
# GitHub 連携自動デプロイ
# main ブランチへのプッシュで自動実行
vercel --prod
```

### Railway（バック）
```bash
railway up
# Database: Railway Postgres 使用
# Environment: OPENAI_API_KEY など設定
```

## 開発ガイド

### Google OAuth フロー
1. ユーザーが「Login with Google」クリック
2. Google 同意画面 → callback
3. Next.js `/api/auth/callback` で token 取得
4. FastAPI `/auth/exchange` で server-side verify
5. DB に user 登録・refresh token 暗号化保存

### AI 生成フロー
1. フロント：「職務経歴書を生成」ボタン
2. 入力データ送信 → FastAPI `/ai/generate`
3. Haiku 呼び出し（プロンプトテンプレート）
4. 生成結果を DB 保存＆フロントに返却

### Slack 連携
- 履歴書作成完了時に通知
- エラー発生時に管理者に通知

## テスト

```bash
# フロント
cd frontend
npm run test

# バック
cd backend
pytest tests/
pytest --cov=app tests/  # カバレッジレポート
```

## CI/CD

GitHub Actions ワークフロー：
- `push to main`：テスト実行 → Vercel/Railway 自動デプロイ
- `PR`：linting, type check, test 実行

## Notion 連携（カイゼンくん）

納品ガート：
- [ ] `systems.ts` に「履歴書メーカー」登録（slug: `resume-maker`）
- [ ] `targets.ts` に KPI 定義
- [ ] favicon.svg 作成＆検証
- [ ] 未ログイン E2E テスト通過

## トラブルシューティング

| 問題 | 原因 | 解決策 |
|------|------|--------|
| OAuth callback エラー | redirect URI 不一致 | Vercel/Google Console で確認 |
| DB 接続失敗 | DATABASE_URL 設定 | Railway から接続文字列コピー |
| Haiku 呼び出し失敗 | API キー無効 | Console API キー確認 |

## コントリビューション

1. `develop` ブランチから フィーチャーブランチを切る
2. PR 作成 → レビュー → マージ

## ライセンス

社内使用のみ。

---

**開発開始日：2026-07-05**
**目標完了日：2026-07-31**
