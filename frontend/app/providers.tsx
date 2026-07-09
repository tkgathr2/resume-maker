'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useCallback } from 'react';
import { I18nProvider } from '@/lib/i18n';
import ToastContainer, { type ToastMessage } from '@/components/Toast';

export interface ToastContextType {
  show: (message: string, type?: 'error' | 'success' | 'info') => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// Client-side providers wrapper for the App Router tree.
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}
