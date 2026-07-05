'use client';

import type { ReactNode } from 'react';
import { I18nProvider } from '@/lib/i18n';

// Client-side providers wrapper (i18n context) for the App Router tree.
export default function Providers({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
