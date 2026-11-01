'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Download, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadProject } from '@/lib/storage';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Catches unexpected render errors (for example malformed imported data) and
 * gives the user a recovery path that does not destroy their local project.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unknown render error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Resume Studio render error', error, info);
  }

  handleExportBackup = async () => {
    try {
      const project = await loadProject();
      if (!project) {
        window.alert('No local project was found in this browser profile.');
        return;
      }
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'resume-studio-recovery-backup.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert('Could not read the local project. Your browser storage may be unavailable.');
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">The editor hit an unexpected error</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your local project is still stored in this browser. Export a backup before reloading if you want
                a safety copy.
              </p>
            </div>
          </div>

          <pre className="mt-4 max-h-32 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
            {this.state.message}
          </pre>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" onClick={() => window.location.reload()} className="gap-1.5">
              <RefreshCw size={14} />
              Reload editor
            </Button>
            <Button type="button" variant="outline" onClick={this.handleExportBackup} className="gap-1.5">
              <Download size={14} />
              Export recovery backup
            </Button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Home size={14} />
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }
}
