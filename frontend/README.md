# Resume Maker — Frontend

Next.js 15 (App Router) + TypeScript + TailwindCSS + NextAuth.js (Auth.js v5).
Multilingual (日本語 / नेपाली / English) resume builder UI.

## Screens

| Route            | File                            | Purpose                                             |
| ---------------- | ------------------------------- | --------------------------------------------------- |
| `/auth/signin`   | `app/auth/signin/page.tsx`      | Google OAuth login screen                           |
| `/form`          | `app/form/page.tsx`             | 8-item resume form (multilingual)                   |
| `/preview`       | `app/preview/page.tsx`          | Resume preview (print / save as PDF)                |
| `/admin`         | `app/admin/page.tsx`            | CS dashboard: applicant list + generation status    |
| `/`              | `app/page.tsx`                  | Redirects to `/form` (auth) or `/auth/signin`       |

### The 8 form fields (standard rirekisho basics)

氏名 (full name) · 生年月日 (date of birth) · 住所 (address) · 電話番号 (phone) ·
メールアドレス (email) · 学歴 (education) · 職歴 (work history) · 志望動機 (motivation)

Field order and metadata are defined in `lib/resumeStore.ts`.

## Happy path

1. Unauthenticated visit → `middleware.ts` redirects to `/auth/signin`.
2. Sign in with Google (NextAuth v5, `auth.ts`).
3. Pick a language (日本語 / नेपाली / English) via the switcher (persists to `localStorage`).
4. Fill in the 8-item form → data saved to `localStorage`.
5. Preview the resume at `/preview` (print / save-as-PDF supported).
6. CS staff review applicants + generation status at `/admin`.

## Architecture notes

- **Auth**: NextAuth v5 (Auth.js) with the Google provider. Config in `auth.ts`;
  route handler in `app/api/auth/[...nextauth]/route.ts`; guard in `middleware.ts`
  (redirects unauthenticated users to `/auth/signin`, excluding `/auth/*`).
- **i18n**: lightweight React Context + JSON dictionaries — no external i18n lib.
  Provider in `lib/i18n.tsx`; dictionaries in `locales/{ja,ne,en}.json`;
  switcher in `components/LanguageSwitcher.tsx`. Client pages call `useI18n().t('key')`.
- **State handoff**: the form persists its draft to `localStorage`
  (`lib/resumeStore.ts`) so `/preview` can render it without a backend round-trip.
- **Styling**: TailwindCSS (`tailwind.config.js`, `postcss.config.js`, `app/globals.css`).
- **Build safety**: env vars fall back to empty strings in `auth.ts`, so
  `next build` never throws when secrets are absent. Real values are required
  only at run time.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable               | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `NEXTAUTH_URL`         | App base URL (e.g. `http://localhost:3000`)          |
| `NEXTAUTH_SECRET`      | Random 32+ char secret (`openssl rand -base64 32`)   |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                               |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                           |
| `NEXT_PUBLIC_API_URL`  | Backend (FastAPI) base URL                            |

Google OAuth authorized redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`

## Development

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve production build
npm run lint        # ESLint (next lint)
npm run type-check  # tsc --noEmit
```
