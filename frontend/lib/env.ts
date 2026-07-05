// Centralized environment access. Reads are lazy so the module can be imported
// in the browser bundle without throwing (only server routes call these).

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  get googleClientId() {
    return required('GOOGLE_CLIENT_ID');
  },
  get googleClientSecret() {
    return required('GOOGLE_CLIENT_SECRET');
  },
  // Public base URL of this deployment, e.g. https://resume-maker.vercel.app
  get appUrl() {
    return (
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      'http://localhost:3000'
    );
  },
  get redirectUri() {
    return `${this.appUrl}/api/auth/callback`;
  },
  get sessionSecret() {
    // Falls back to a dev-only secret so local build/dev never crashes.
    return process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me-please-32b';
  },
  get databaseUrl() {
    return process.env.DATABASE_URL || '';
  },
};

// Google OAuth scopes: identity + drive.file (per-file access to files the app creates).
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
];
