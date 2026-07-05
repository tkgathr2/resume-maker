'use client';

import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Client view for the sign-in screen. Receives a bound server action so the
// Google OAuth call runs server-side (NextAuth v5).
export default function SignInView({ signInAction }: { signInAction: () => Promise<void> }) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-center">{t('signin.title')}</h1>
        <p className="text-gray-500 text-center">{t('signin.subtitle')}</p>

        <form action={signInAction} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold py-3 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFF"
                d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
                opacity="0.0"
              />
            </svg>
            {t('signin.googleButton')}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center">{t('signin.note')}</p>
      </div>
    </main>
  );
}
