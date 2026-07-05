# Resume Maker API Specification

## Base URL
```
Development:  http://localhost:8000/api/v1
Staging:      https://api-staging.resume-maker.takagi.bz/api/v1
Production:   https://api.resume-maker.takagi.bz/api/v1
```

## 認証フロー

### 1. OAuth Login（フロント）
ユーザーが Google ボタンをクリック → Google 同意画面 → ID token 取得

### 2. Token Exchange（バック）
```http
POST /auth/exchange
Content-Type: application/json

{
  "id_token": "eyJhbGc..."
}
```

**Response (200)**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "encrypted_token_xxx",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

### 3. Authenticated Requests
```http
GET /resume
Authorization: Bearer eyJhbGc...
```

---

## Endpoints

### Authentication

#### POST /auth/exchange
Google OAuth token を verify し、JWT access token を発行

**Request**
```json
{
  "id_token": "string (from Google)"
}
```

**Response (200)**
```json
{
  "access_token": "string",
  "refresh_token": "string (encrypted)",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors**
- 401: Invalid token
- 400: Missing id_token

---

#### POST /auth/refresh
Refresh token を使い、新しい access token を取得

**Request**
```json
{
  "refresh_token": "string"
}
```

**Response (200)**
```json
{
  "access_token": "string",
  "expires_in": 86400
}
```

**Errors**
- 401: Invalid/expired refresh token
- 400: Missing refresh_token

---

### Resume Management

#### GET /resume
ユーザーのすべての履歴書を取得

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "resumes": [
    {
      "id": "uuid",
      "name": "My Resume",
      "summary": "Experienced developer",
      "created_at": "2026-07-05T10:00:00Z",
      "updated_at": "2026-07-05T10:00:00Z"
    }
  ]
}
```

**Errors**
- 401: Unauthorized

---

#### POST /resume
新しい履歴書を作成

**Request**
```json
{
  "name": "My First Resume",
  "summary": "Senior Full-stack Developer",
  "email": "john@example.com",
  "phone": "+81-90-xxxx-xxxx"
}
```

**Response (201)**
```json
{
  "id": "uuid",
  "name": "My First Resume",
  "summary": "Senior Full-stack Developer",
  "email": "john@example.com",
  "phone": "+81-90-xxxx-xxxx",
  "created_at": "2026-07-05T10:00:00Z"
}
```

**Errors**
- 400: Validation error
- 401: Unauthorized

---

#### GET /resume/{id}
特定の履歴書を取得（完全情報）

**Response (200)**
```json
{
  "id": "uuid",
  "name": "My Resume",
  "summary": "...",
  "email": "...",
  "phone": "...",
  "job_entries": [
    {
      "id": "uuid",
      "company": "Company A",
      "job_title": "Senior Developer",
      "description": "Led development of ...",
      "start_date": "2024-01-01",
      "end_date": "2026-07-05",
      "generated": false,
      "generated_at": null
    }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

**Errors**
- 404: Resume not found
- 401: Unauthorized

---

#### PUT /resume/{id}
履歴書情報を更新

**Request**
```json
{
  "name": "Updated Name",
  "summary": "New summary"
}
```

**Response (200)**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "summary": "New summary",
  ...
}
```

**Errors**
- 404: Not found
- 400: Validation error
- 401: Unauthorized

---

#### DELETE /resume/{id}
履歴書を削除

**Response (204)**
No content

**Errors**
- 404: Not found
- 401: Unauthorized

---

### Job Entry Management

#### POST /resume/{id}/entries
履歴書に職務経歴を追加

**Request**
```json
{
  "company": "Company A",
  "job_title": "Senior Developer",
  "description": "Built microservices...",
  "start_date": "2024-01-01",
  "end_date": "2026-07-05"
}
```

**Response (201)**
```json
{
  "id": "uuid",
  "resume_id": "uuid",
  "company": "Company A",
  "job_title": "Senior Developer",
  "description": "Built microservices...",
  "start_date": "2024-01-01",
  "end_date": "2026-07-05",
  "generated": false
}
```

---

#### DELETE /resume/{id}/entries/{entry_id}
職務経歴を削除

**Response (204)**

---

### AI Generation

#### POST /ai/generate
Haiku を使い、職務経歴を自動生成

**Request**
```json
{
  "resume_id": "uuid",
  "company": "Company A",
  "job_title": "Developer",
  "raw_description": "worked on web app, database, testing"
}
```

**Response (202 Accepted)**
```json
{
  "job_id": "uuid",
  "status": "processing",
  "created_at": "2026-07-05T10:00:00Z"
}
```

#### GET /ai/generate/{job_id}/status
生成状態を確認

**Response (200)**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "result": {
    "company": "Company A",
    "job_title": "Senior Developer",
    "description": "Developed and maintained web application using Python and PostgreSQL. Implemented automated testing suite achieving 85% code coverage...",
    "start_date": "2024-01-01",
    "end_date": "2026-07-05"
  }
}
```

**Status values**
- `processing`: 生成中
- `completed`: 完了
- `error`: エラー

**Errors**
- 404: Job not found

---

### Integrations

#### POST /integrations/slack/notify
Slack に通知を送信

**Request**
```json
{
  "resume_id": "uuid",
  "action": "created",
  "message": "Resume created successfully"
}
```

**Response (200)**
```json
{
  "ok": true,
  "message": "Notification sent"
}
```

**Errors**
- 400: Invalid action
- 500: Slack API error

---

#### GET /integrations/google/export
Google Drive に履歴書をエクスポート

**Request**
```
GET /integrations/google/export?resume_id=<id>
```

**Response (200)**
```json
{
  "drive_link": "https://drive.google.com/file/d/...",
  "file_name": "My_Resume_2026.pdf"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "detail": "Resume not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "An unexpected error occurred"
}
```

---

## Rate Limiting
- 100 requests/hour per user
- Response header: `X-RateLimit-Remaining`

---

## Versioning
API version: **v1**

Future breaking changes will use v2, v3, etc.

---

**Last Updated: 2026-07-05**
