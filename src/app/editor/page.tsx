'use client';

import dynamic from 'next/dynamic';

const Studio = dynamic(() => import('../studio'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#f4f6f4] dark:bg-[#0d120f]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Loading Resume Studio…</span>
      </div>
    </div>
  ),
});

export default function EditorPage() {
  return <Studio />;
}

