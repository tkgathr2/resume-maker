# Resume Maker Development Guide

## 概要
このドキュメントは、Resume Maker の開発メンバー向けの実装ガイドです。
6週間（240時間）で完遂するための役割分担と実装フローを定めています。

## チーム構成

| 役割 | 人数 | 工数 | 担当範囲 |
|------|------|------|---------|
| **フロント PL** | 1 | 80h | Next.js UI/UX・OAuth・フォーム |
| **バック PL** | 1 | 120h | FastAPI API・DB・Haiku連携 |
| **QA/テスト** | 0.5 | 40h | テスト・本番検証 |

**開始日：2026-07-05**
**目標完了日：2026-07-31**

## 工程別スケジュール

### Week 1-2（2026-07-05 ～ 2026-07-18）
**フロント優先・骨組み整備**

#### フロント（80h 中 40h）
- [ ] Next.js プロジェクト初期化
- [ ] TypeScript 設定・ESLint/Prettier
- [ ] Google OAuth ログイン画面実装
- [ ] ログイン API route (`/api/auth/callback`)
- [ ] OAuth token 取得・ローカルストレージ保存
- [ ] 基本レイアウト・ナビゲーション
- [ ] ダッシュボードスケルトン

#### バック（120h 中 20h）
- [ ] FastAPI プロジェクト初期化
- [ ] Database スキーマ設計（User, Resume, JobEntry など）
- [ ] SQLAlchemy models 実装
- [ ] `/health` エンドポイント動作確認

**マイルストーン：** OAuth ログイン通すまで

---

### Week 3-4（2026-07-19 ～ 2026-08-01）
**バック・API 実装ラッシュ**

#### バック（120h 中 100h）
- [ ] `/auth/exchange` エンドポイント（Google token verify）
- [ ] User CRUD（登録・ユーザー情報取得）
- [ ] Resume CRUD（作成・編集・一覧・削除）
- [ ] Job Entry CRUD（職務経歴追加・削除）
- [ ] `/ai/generate` エンドポイント（Haiku 連携）
- [ ] Slack 通知ロジック
- [ ] Google Drive 連携（Export）
- [ ] DB マイグレーション（Alembic）

#### フロント（80h 中 40h）
- [ ] Resume フォーム実装（職務経歴など）
- [ ] API integration（axios/SWR）
- [ ] AI 生成ボタン・結果表示
- [ ] Slack 通知確認画面
- [ ] 設定ページ（プロフィール編集）
- [ ] エラーハンドリング UI

**マイルストーン：** フロント・バック統合テスト OK

---

### Week 5（2026-08-02 ～ 2026-08-08）
**統合テスト・バグ修正**

#### テスト（40h 全体）
- [ ] ユニットテスト（バック）
- [ ] E2E テスト（Playwright など）
- [ ] 未ログイン状態の動作確認
- [ ] OAuth エラーハンドリング
- [ ] AI 生成の品質テスト
- [ ] Slack 通知テスト

#### 修正・最適化
- [ ] パフォーマンス調査
- [ ] セキュリティレビュー
- [ ] ログイン後の redirect フロー確認

**マイルストーン：** すべてのテストケース green

---

### Week 6（2026-08-09 ～ 2026-07-31）**
**本番デプロイ・納品準備**

#### Vercel デプロイ（フロント）
- [ ] 環境変数設定
- [ ] ビルド確認
- [ ] Vercel preview deployment
- [ ] DNS CNAME 設定（resume-maker.takagi.bz）

#### Railway デプロイ（バック）
- [ ] Environment variables 設定
- [ ] Database migration
- [ ] Deployment workflow 設定
- [ ] エラー監視・ログ確認

#### カイゼンくん登録（納品ガート）
- [ ] systems.ts に「履歴書メーカー」追加（slug: `resume-maker`）
- [ ] targets.ts に KPI 定義
- [ ] favicon.svg 作成＆検証
- [ ] 未ログイン E2E テスト通過確認

**マイルストーン：** resume-maker.takagi.bz で本番公開

---

## 技術スタック

### フロント
```
Next.js 15 (App Router)
├ TypeScript
├ React 19
├ Tailwind CSS (or Material-UI)
├ axios / SWR (data fetching)
├ Zustand (state management)
└ Google OAuth (authentication)
```

### バック
```
FastAPI
├ SQLAlchemy (ORM)
├ Alembic (migrations)
├ Pydantic (schemas)
├ PostgreSQL (Railway)
├ Anthropic SDK (Haiku)
├ google-auth-oauthlib
└ python-slack-sdk
```

### インフラ
```
Vercel (Next.js frontend)
├ GitHub Actions (CI/CD)
└ Custom domain: resume-maker.takagi.bz

Railway (FastAPI backend)
├ PostgreSQL database
└ Environment variables
```

## API 仕様概要（詳細は API_SPEC.md）

### Authentication
```
POST /api/v1/auth/exchange
- Input: Google ID token
- Output: JWT token, Refresh token (encrypted)

POST /api/v1/auth/refresh
- Input: Refresh token
- Output: New JWT token
```

### Resume Management
```
GET /api/v1/resume
- Output: User's resumes (list)

POST /api/v1/resume
- Input: Resume data (name, summary, etc.)
- Output: Created resume

GET /api/v1/resume/{id}
- Output: Resume details

PUT /api/v1/resume/{id}
- Input: Updated data
- Output: Updated resume

DELETE /api/v1/resume/{id}
- Output: Success
```

### AI Generation
```
POST /api/v1/ai/generate
- Input: Resume ID, job title, company, description
- Output: Generated job entry (AI生成)

GET /api/v1/ai/generate/{id}/status
- Output: Generation status (pending/completed/error)
```

### Integrations
```
POST /api/v1/integrations/slack/notify
- Input: Resume ID, action
- Output: Notification sent

GET /api/v1/integrations/google/export
- Input: Resume ID
- Output: Google Drive link
```

## 開発フロー（Git）

### ブランチ戦略
```
main (本番)
  ↑
develop (開発統合)
  ↑
feature/フロント-oauth
feature/バック-auth-api
feature/バック-resume-crud
...
```

### コミットメッセージ形式
```
feat(auth): implement Google OAuth login
fix(resume): correct job entry validation
docs(api): update API specification
test(ai): add Haiku generation tests
chore(deps): update dependencies

Co-Authored-By: [Name] <[email]>
```

### PR・マージ手順
1. Feature ブランチから PR 作成
2. レビュー（コードレビュー・テスト実行）
3. Squash merge → main
4. Vercel/Railway 自動デプロイ

## セキュリティチェックリスト

- [ ] Google Client Secret は .env に置く（リポジトリに commit しない）
- [ ] JWT Secret は環境変数から読み込み
- [ ] Refresh Token は暗号化保存
- [ ] CORS は明示的にホワイトリスト設定
- [ ] SQL injection 対策（SQLAlchemy 使用）
- [ ] HTTPS only（Vercel/Railway は自動）
- [ ] 2FA サポート（将来オプション）

## トラブルシューティング

| 問題 | 対応 |
|------|------|
| OAuth callback 失敗 | Vercel・Google Console の redirect URI 確認 |
| DB 接続エラー | DATABASE_URL・パスワード確認 |
| Haiku API key エラー | Console API キー確認・scope 確認 |
| CORS エラー | frontend/backend ドメイン確認 |

## ドキュメント参照

- [API_SPEC.md](API_SPEC.md) - API 詳細仕様
- [DEPLOYMENT.md](DEPLOYMENT.md) - デプロイ手順

---

**最終更新：2026-07-05**
