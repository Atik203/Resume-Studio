'use client';

import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  ChevronDown,
  Code2,
  Download,
  FileArchive,
  FileEdit,
  FileText,
  History,
  Home,
  Moon,
  MoreVertical,
  PanelLeft,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Sun,
} from 'lucide-react';

export type StudioPane = 'editor' | 'design' | 'ats';

export interface TopbarDraft {
  id: string;
  name: string;
}

export interface TopbarProps {
  activePane: StudioPane;
  onPaneChange: (pane: StudioPane) => void;
  libraryCollapsed: boolean;
  onToggleLibrary: () => void;
  drafts: TopbarDraft[];
  activeDraftId: string;
  activeDraftName: string;
  onSelectDraft: (id: string) => void;
  onNewDraft: () => void;
  onDuplicateDraft: (id: string) => void;
  hasPdf: boolean;
  busy: boolean;
  exportingZip: boolean;
  onDownloadPdf: () => void;
  onCompile: () => void;
  onExportLatex: () => void;
  onOpenLatexInspector: () => void;
  onOpenSnapshots: () => void;
  onOpenPageFit: () => void;
  onExportBackup: () => void;
  onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark' | 'system';
}

export function Topbar({
  activePane,
  onPaneChange,
  libraryCollapsed,
  onToggleLibrary,
  drafts,
  activeDraftId,
  activeDraftName,
  onSelectDraft,
  onNewDraft,
  onDuplicateDraft,
  hasPdf,
  busy,
  exportingZip,
  onDownloadPdf,
  onCompile,
  onExportLatex,
  onOpenLatexInspector,
  onOpenSnapshots,
  onOpenPageFit,
  onExportBackup,
  onImportBackup,
  onToggleTheme,
  theme,
}: TopbarProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  return (
<header className="studio-topbar">
        <div className="studio-topbar-left">
          <Link href="/" className="studio-brand" title="Return to Landing Page">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs">
              <FileText size={17} />
            </div>
            <span className="font-extrabold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight hidden sm:inline">
              Resume Studio
            </span>
          </Link>

          {/* Dedicated Sidebar Toggle Button */}
          <button
            type="button"
            className="studio-icon-btn hidden md:inline-flex"
            onClick={() =>
              onToggleLibrary
            }
            title={libraryCollapsed ? 'Expand library sidebar' : 'Collapse library sidebar'}
            aria-label="Toggle library sidebar"
          >
            <PanelLeft size={16} />
          </button>

          {/* Floating Pill Navigation Tabs */}
          <div className="studio-nav-pills" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activePane === 'editor'}
              className={`studio-pill-btn ${activePane === 'editor' ? 'active' : ''}`}
              onClick={() => onPaneChange('editor')}
            >
              <FileEdit size={13} />
              <span>Content</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePane === 'design'}
              className={`studio-pill-btn ${activePane === 'design' ? 'active' : ''}`}
              onClick={() => onPaneChange('design')}
            >
              <Sliders size={13} />
              <span>Customize</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePane === 'ats'}
              className={`studio-pill-btn ${activePane === 'ats' ? 'active' : ''}`}
              onClick={() => onPaneChange('ats')}
            >
              <Sparkles size={13} />
              <span>AI Tools</span>
            </button>
          </div>
        </div>

        {/* Right: Draft Switcher + Primary Download + More Menu */}
        <div className="studio-topbar-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="draft-selector-btn" title="Switch or manage drafts">
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{activeDraftName}</span>
                <ChevronDown size={13} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Resume & CV Drafts</DropdownMenuLabel>
              {drafts.map(v => (
                <DropdownMenuItem
                  key={v.id}
                  onSelect={() => onSelectDraft(v.id)}
                  className={v.id === activeDraftId ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : ''}
                >
                  <span className="truncate flex-1">{v.name}</span>
                  {v.id === activeDraftId && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onNewDraft()}
                className="text-emerald-700 dark:text-emerald-400 font-semibold"
              >
                <Plus size={13} />
                <span>Create New Draft…</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDuplicateDraft(activeDraftId)}>
                <span>Duplicate Current Draft</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Primary Download Split Button */}
          <div className="relative inline-flex items-center">
            <Button
              className="download-primary-btn"
              disabled={busy}
              onClick={hasPdf ? onDownloadPdf : onCompile}
              title="Download Verified PDF (Ctrl+S)"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{busy ? 'Compiling…' : 'Download'}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="download-split-arrow" title="Export options">
                  <ChevronDown size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled={!hasPdf} onSelect={onDownloadPdf} className="font-semibold">
                  <Download size={13} className="text-emerald-600" />
                  <span>Download Verified PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={exportingZip} onSelect={onExportLatex}>
                  <FileArchive size={13} className="text-amber-500" />
                  <span>Export Standalone LaTeX (.zip)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={busy} onSelect={onCompile}>
                  <RefreshCw size={13} className="text-sky-500" />
                  <span>Force ReonCompile (Ctrl+B)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* More Menu (⋮) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="studio-icon-btn" title="Developer tools & backups">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Developer & History</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onOpenLatexInspector()}>
                <Code2 size={13} className="text-emerald-500" />
                <span>Inspect LaTeX Source</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onOpenSnapshots()}>
                <History size={13} className="text-sky-500" />
                <span>Snapshot Time Machine</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onOpenPageFit()}>
                <Sparkles size={13} className="text-purple-500" />
                <span>Page-Fit Assistant</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Project Backup</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onExportBackup}>
                <span>Export JSON Backup</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                <span>Import JSON Backup</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onToggleTheme}>
                <span className="flex-1">Toggle Dark Theme</span>
                {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="flex w-full items-center gap-2 text-muted-foreground">
                  <Home size={13} />
                  <span>Public Landing Page</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={onImportBackup}
            className="hidden"
          />
        </div>
      </header>
  );
}
