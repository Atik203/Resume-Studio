'use client';

import dynamic from 'next/dynamic';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const CompiledPdfViewer = dynamic(() => import('@/components/pdf/compiled-pdf-viewer'), {
  ssr: false,
  loading: () => <div className="pdf-viewer-state">Loading local PDF viewer…</div>,
});

export interface PreviewPaneProps {
  draftName: string;
  pageCount: string;
  overflow: boolean;
  compiledRevision: number;
  revision: number;
  busy: boolean;
  message: string;
  pdfUrl: string;
  targetPages: number;
  paper: string;
  fontSize: number;
  profileName: string;
  profileTitle: string;
  onCompile: () => void;
  onOpenPageFit: () => void;
  onPageCountChange: (pages: number) => void;
}

export function PreviewPane({
  draftName,
  pageCount,
  overflow,
  compiledRevision,
  revision,
  busy,
  message,
  pdfUrl,
  targetPages,
  paper,
  fontSize,
  profileName,
  profileTitle,
  onCompile,
  onOpenPageFit,
  onPageCountChange,
}: PreviewPaneProps) {
  return (
    <section className="preview-column" aria-label="PDF preview and export">
      {/* Clean FlowCV Preview Status Bar */}
      <div className="preview-canvas-header flex items-center justify-between px-5 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">{draftName}</span>
          {pageCount && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                overflow
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {pageCount} {pageCount === '1' ? 'Page' : 'Pages'} · {overflow ? 'Over Limit' : 'Verified'}
            </span>
          )}
          <span className="text-[11px] text-neutral-400 hidden sm:inline">
            {compiledRevision === revision ? '· Up to date' : '· Edits pending'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs font-semibold text-neutral-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
            onClick={onCompile}
            disabled={busy}
            title="Compile with local pdflatex (Shortcut: Ctrl+B)"
          >
            <RefreshCw size={13} className={busy ? 'animate-spin text-emerald-500' : ''} />
            <span>{busy ? 'Compiling…' : 'Recompile'}</span>
          </button>
        </div>
      </div>

      {/* Overflow Alert */}
      {overflow && (
        <Alert className="warning">
          <AlertTitle className="flex items-center justify-between">
            <span>Target page limit exceeded ({pageCount}/{targetPages} pages)</span>
            <Button
              variant="default"
              size="icon-xs"
              className="h-6 px-2 text-[11px] gap-1 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={onOpenPageFit}
            >
              <Sparkles size={11} />
              <span>Fit to 1 Page</span>
            </Button>
          </AlertTitle>
          <AlertDescription className="text-xs">
            This draft spills onto Page {pageCount}. All content is preserved in the compiled PDF.
            Click <strong>Fit to 1 Page</strong> to mathematically micro-tune spacing with zero text loss.
          </AlertDescription>
        </Alert>
      )}

      {/* Status / Error Message (Only show genuine alerts, avoid redundant green success line) */}
      {message && ['failed', 'rejected', 'error', 'not found', 'exception'].some(token => message.toLowerCase().includes(token)) && (
        <div className="status-message error mx-4 my-2">
          {message}
        </div>
      )}

      {/* PDF Paper Viewer Area */}
      <div className="paper-area">
        {pdfUrl ? (
          <CompiledPdfViewer
            key={pdfUrl}
            src={pdfUrl}
            expectedPageCount={pageCount ? Number(pageCount) : null}
            overflow={overflow}
            onPageCountChange={pages => onPageCountChange(pages)}
          />
        ) : busy ? (
          <div className="empty-preview flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4 animate-spin">
              <RefreshCw size={22} />
            </div>
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Compiling with local pdflatex…</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Generating verified PDF from your local TeX Live engine</p>
          </div>
        ) : (
          <div className="empty-preview">
            <div className="paper-illustration" aria-hidden="true">
              <strong>{profileName || 'Your Name'}</strong>
              <span>{profileTitle || 'Professional Title'}</span>
              <i />
              <b>EXPERIENCE</b>
              <i />
              <i />
              <b>PROJECTS</b>
              <i />
            </div>
            <h2>Ready when you are</h2>
            <p>Click below to compile this draft with your local TeX Live installation.</p>
            <Button className="button primary" onClick={onCompile} disabled={busy}>
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
              <span>{busy ? 'Compiling…' : 'Build Preview'}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="preview-footer">
        <span>● Compiled locally with TeX Live pdflatex</span>
        <span className="footer-spacer" />
        <span>
          {paper.toUpperCase()} · {fontSize} pt
        </span>
      </div>
    </section>
  );
}
