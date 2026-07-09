'use client';

import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor = {
    error: 'bg-red-50 border-red-300',
    success: 'bg-green-50 border-green-300',
    info: 'bg-blue-50 border-blue-300',
  }[toast.type];

  const textColor = {
    error: 'text-red-700',
    success: 'text-green-700',
    info: 'text-blue-700',
  }[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${toast.type}: ${toast.message}`}
      className={`rounded-lg border ${bgColor} ${textColor} px-4 py-3 text-sm flex justify-between items-center animate-fadeIn`}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="ml-4 text-lg font-bold opacity-50 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
