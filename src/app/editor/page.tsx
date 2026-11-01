'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/error-boundary';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

const Studio = dynamic(() => import('../studio'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="text-sm font-semibold text-muted-foreground">Loading Resume Studio…</span>
      </div>
    </div>
  ),
});

export default function EditorPage() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <Studio />
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

