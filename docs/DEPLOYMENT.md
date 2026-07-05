# Deployment Guide

## Overview
Resume Maker は以下の本番環境で動作します：

- **Frontend**: Vercel（Next.js）
- **Backend**: Railway（FastAPI）
- **Database**: Railway PostgreSQL

---

## Vercel（フロント）デプロイ

### Prerequisites
- Vercel account
- GitHub リポジトリ連携
- Google OAuth credentials

### Step 1: Vercel に GitHub リポジトリを連携
1. https://vercel.com にアクセス
2. "New Project" → GitHub 認可
3. `tkgathr2/resume-maker` を選択
4. Import

### Step 2: 環境変数を設定
Vercel Dashboard → Settings → Environment Variables

```
NEXT_PUBLIC_API_URL=https://api.resume-maker.takagi.bz
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://resume-maker.takagi.bz/auth/callback
```

### Step 3: ビルド設定
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Step 4: カスタムドメイン設定
1. Vercel Settings → Domains
2. "Add Domain" → `resume-maker.takagi.bz`
3. DNS CNAME を会社 DNS に追加：
   ```
   CNAME resume-maker.takagi.bz -> cname.vercel-dns.com.
   ```

### Step 5: デプロイ確認
- Preview URL: https://resume-maker-git-*.vercel.app
- Production URL: https://resume-maker.takagi.bz

---

## Railway（バック）デプロイ

### Prerequisites
- Railway account
- GitHub リポジトリ連携
- PostgreSQL プラグイン

### Step 1: Railway で PostgreSQL を追加
1. https://railway.app にアクセス
2. "New" → "Database" → "PostgreSQL"
3. 環境変数を確認：
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/resume_maker
   ```

### Step 2: FastAPI サービスを追加
1. "New" → "GitHub Repo" → `tkgathr2/resume-maker`
2. 以下の設定を行う：

**Build Settings**
```
Dockerfile: backend/Dockerfile  （未作成時は以下を作成）
```

**Environment Variables**
```
OPENAI_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
JWT_SECRET=your-secret-here-min-32-chars
REFRESH_TOKEN_ENCRYPTION_KEY=your-key-here-min-32-chars
PYTHONUNBUFFERED=1
DATABASE_URL=postgresql://...
```

### Step 3: Dockerfile を作成（backend ディレクトリ）

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# システム依存をインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Python 依存をインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# マイグレーション実行
RUN alembic upgrade head || true

# アプリケーション起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 4: デプロイ確認
- Railway ダッシュボードで `Deployments` を確認
- ログに以下が表示されることを確認：
  ```
  Application startup complete
  Uvicorn running on 0.0.0.0:8000
  ```

### Step 5: API エンドポイント確認
```bash
curl https://api.resume-maker.takagi.bz/health
# { "status": "ok", "version": "0.1.0" }
```

---

## Database マイグレーション（初回のみ）

### Alembic セットアップ
```bash
cd backend
alembic init alembic
```

### migration ファイル作成
```bash
alembic revision --autogenerate -m "Initial schema"
```

### migration 実行（Railway）
```bash
# Railway CLI 経由
railway run alembic upgrade head

# または Docker コンテナ内
docker exec <container_id> alembic upgrade head
```

---

## Slack 通知設定

### Slack Webhook URL の取得
1. Slack workspace → Settings → Manage Apps
2. "Create New App" → "From scratch"
3. App Name: "Resume Maker Bot"
4. Incoming Webhooks を有効化
5. チャンネル選択 → URL コピー

### Railway に設定
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Google OAuth 本番設定

### Google Cloud Console
1. プロジェクト作成
2. OAuth 2.0 credentials → Web application
3. 承認済みリダイレクト URI に以下を追加：
   ```
   https://resume-maker.takagi.bz/auth/callback
   ```
4. Client ID & Secret を取得
5. Vercel/Railway に設定

---

## Monitoring & Logging

### Vercel ログ
```bash
vercel logs
```

### Railway ログ
```bash
railway logs
```

### Error Tracking（将来：Sentry 連携）
```python
# backend/app/main.py
import sentry_sdk
sentry_sdk.init("https://examplePublicKey@o0.ingest.sentry.io/0")
```

---

## ロールバック

### Vercel
```bash
vercel rollback
```

### Railway
Dashboard → Deployments → 前のバージョン → Revert

---

## SSL/TLS
- Vercel: 自動で HTTPS
- Railway: Let's Encrypt 自動更新

---

## 本番チェックリスト

デプロイ前に以下を確認：

- [ ] All tests passing
- [ ] Security review completed
- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Google OAuth credentials configured
- [ ] Slack webhook URL set
- [ ] API health check OK
- [ ] Frontend-Backend CORS configured
- [ ] Favicon deployed
- [ ] Kaizen-kun registered

---

**Last Updated: 2026-07-05**
