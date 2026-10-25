'use client';

import React, { useState, useMemo } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  FileArchive,
  GitCompare,
  Search,
  X,
  FileCode,
} from 'lucide-react';
import { ResolvedVariant, TemplateId } from '@/lib/data';
import { renderLatex } from '@/lib/latex';

interface LatexInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVariant: ResolvedVariant;
  onExportZip: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNumA?: number;
  lineNumB?: number;
}

const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string }> = [
  { id: 't01-simple-ats', label: 'T01 Simple ATS' },
  { id: 't02-clean-compact', label: 'T02 Clean Compact' },
  { id: 't03-modern-developer', label: 'T03 Modern Developer' },
  { id: 't04-academic-cv', label: 'T04 Academic CV' },
  { id: 't05-profile-cv', label: 'T05 Profile CV' },
];

function computeLineDiff(textA: string, textB: string): DiffLine[] {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const result: DiffLine[] = [];

  let idxA = 0;
  let idxB = 0;

  while (idxA < linesA.length || idxB < linesB.length) {
    if (idxA < linesA.length && idxB < linesB.length && linesA[idxA] === linesB[idxB]) {
      result.push({
        type: 'unchanged',
        text: linesA[idxA],
        lineNumA: idxA + 1,
        lineNumB: idxB + 1,
      });
      idxA++;
      idxB++;
    } else {
      // Lookahead match
      let matchFound = false;
      for (let offset = 1; offset <= 3; offset++) {
        if (idxA + offset < linesA.length && linesA[idxA + offset] === linesB[idxB]) {
          for (let i = 0; i < offset; i++) {
            result.push({
              type: 'removed',
              text: linesA[idxA + i],
              lineNumA: idxA + i + 1,
            });
          }
          idxA += offset;
          matchFound = true;
          break;
        } else if (idxB + offset < linesB.length && linesA[idxA] === linesB[idxB + offset]) {
          for (let i = 0; i < offset; i++) {
            result.push({
              type: 'added',
              text: linesB[idxB + i],
              lineNumB: idxB + i + 1,
            });
          }
          idxB += offset;
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        if (idxA < linesA.length) {
          result.push({
            type: 'removed',
            text: linesA[idxA],
            lineNumA: idxA + 1,
          });
          idxA++;
        }
        if (idxB < linesB.length) {
          result.push({
            type: 'added',
            text: linesB[idxB],
            lineNumB: idxB + 1,
          });
          idxB++;
        }
      }
    }
  }

  return result;
}

export function LatexInspectorModal({
  isOpen,
  onClose,
  activeVariant,
  onExportZip,
}: LatexInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'source' | 'diff'>('source');
  const [diffTargetTemplate, setDiffTargetTemplate] = useState<TemplateId>(
    activeVariant.templateId === 't01-simple-ats' ? 't03-modern-developer' : 't01-simple-ats'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Current LaTeX source
  const currentLatex = useMemo(() => {
    return renderLatex(activeVariant);
  }, [activeVariant]);

  // Target LaTeX source for diff
  const diffLatex = useMemo(() => {
    if (activeTab !== 'diff') return '';
    try {
      const clonedVariant = structuredClone(activeVariant);
      clonedVariant.templateId = diffTargetTemplate;
      return renderLatex(clonedVariant);
    } catch {
      return '';
    }
  }, [activeTab, activeVariant, diffTargetTemplate]);

  // Computed diff lines
  const diffLines = useMemo(() => {
    if (activeTab !== 'diff' || !diffLatex) return [];
    return computeLineDiff(currentLatex, diffLatex);
  }, [activeTab, currentLatex, diffLatex]);

  // Filtered source lines
  const sourceLines = useMemo(() => {
    return currentLatex.split('\n');
  }, [currentLatex]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentLatex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTex = () => {
    const blob = new Blob([currentLatex], { type: 'text/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = activeVariant.profile.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Resume';
    link.download = `${safeName}_${activeVariant.templateId}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col bg-[#0f1511] border border-[#233529] rounded-2xl shadow-2xl text-[#e6f4ea] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#233529] bg-[#141e17]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Code2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Live LaTeX Source Inspector & Diff
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {activeVariant.templateId}
                </span>
              </div>
              <p className="text-xs text-[#8ba393]">
                Inspect exact markup generated for TeX Live `pdflatex` compilation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-[#8ba393] hover:text-white border border-white/10 transition-colors"
              title="Copy LaTeX source to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Source'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTex}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1d2c22] hover:bg-[#25392c] text-emerald-300 border border-emerald-700/50 transition-colors"
              title="Download standalone .tex file"
            >
              <Download size={13} />
              <span>Download .tex</span>
            </button>

            <button
              type="button"
              onClick={onExportZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-[#09110b] shadow-md transition-all active:scale-95"
              title="Export complete standalone package with assets and data"
            >
              <FileArchive size={13} />
              <span>Export .zip</span>
            </button>

            <div className="w-[1px] h-6 bg-[#233529] mx-1" />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8ba393] hover:text-white hover:bg-white/5 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-header Tabs & Search */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-[#1b2b20] bg-[#111913] text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('source')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'source'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-[#8ba393] hover:text-white'
              }`}
            >
              <FileCode size={13} />
              <span>Complete Source ({sourceLines.length} lines)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'diff'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-[#8ba393] hover:text-white'
              }`}
            >
              <GitCompare size={13} />
              <span>Live Template Diff</span>
            </button>

            {activeTab === 'diff' && (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-[#233529]">
                <span className="text-[#8ba393]">Compare against:</span>
                <select
                  value={diffTargetTemplate}
                  onChange={(e) => setDiffTargetTemplate(e.target.value as TemplateId)}
                  className="bg-[#18231c] text-white border border-[#2b3e32] rounded px-2 py-0.5 text-xs font-mono"
                >
                  {TEMPLATE_OPTIONS.filter((t) => t.id !== activeVariant.templateId).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-[#8ba393]" />
              <input
                type="text"
                placeholder="Search LaTeX markup..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-[#18231c] text-white placeholder-[#5d7766] border border-[#263a2d] rounded-lg text-xs w-52 focus:outline-none focus:border-emerald-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-[#8ba393] hover:text-white"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-auto bg-[#0a0f0c] font-mono text-[12px] leading-5 select-text p-4">
          {activeTab === 'source' ? (
            <div className="space-y-0.5">
              {sourceLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isMatch = searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());

                return (
                  <div
                    key={idx}
                    className={`flex items-start hover:bg-white/[0.03] transition-colors rounded px-2 py-0.5 ${
                      isMatch ? 'bg-amber-500/20 text-amber-200' : ''
                    }`}
                  >
                    <span className="w-12 shrink-0 select-none text-right pr-4 text-[#445b4c] text-[11px]">
                      {lineNum}
                    </span>
                    <span className="flex-1 text-[#d8ebd9] whitespace-pre-wrap break-all">
                      {line.startsWith('\\') ? (
                        <span className="text-emerald-400 font-semibold">{line}</span>
                      ) : line.startsWith('%') ? (
                        <span className="text-[#688572] italic">{line}</span>
                      ) : (
                        line
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="px-2 py-1 mb-2 text-xs text-[#8ba393] bg-[#141e17] rounded border border-[#233529] flex items-center justify-between">
                <span>
                  Comparing <strong>{activeVariant.templateId}</strong> (current) with{' '}
                  <strong>{diffTargetTemplate}</strong> (target)
                </span>
                <span className="text-[11px] font-mono text-[#8ba393]">
                  + Added in {diffTargetTemplate} | - Removed from {activeVariant.templateId}
                </span>
              </div>

              {diffLines.map((line, idx) => {
                const isMatch = searchQuery && line.text.toLowerCase().includes(searchQuery.toLowerCase());
                const bg =
                  line.type === 'added'
                    ? 'bg-emerald-950/60 text-emerald-200 border-l-2 border-emerald-500'
                    : line.type === 'removed'
                    ? 'bg-rose-950/60 text-rose-200 border-l-2 border-rose-500 opacity-80'
                    : '';

                return (
                  <div
                    key={idx}
                    className={`flex items-start px-2 py-0.5 transition-colors ${bg} ${
                      isMatch ? 'ring-1 ring-amber-400' : ''
                    }`}
                  >
                    <span className="w-6 shrink-0 select-none text-center font-bold text-xs opacity-70">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className="w-12 shrink-0 select-none text-right pr-4 text-[#445b4c] text-[11px]">
                      {line.lineNumA ?? line.lineNumB ?? ''}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">{line.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-[#1b2b20] bg-[#111913] text-xs text-[#8ba393]">
          <div className="flex items-center gap-4">
            <span>Encoding: UTF-8</span>
            <span>Compiler: pdflatex</span>
            <span>Target Paper: {activeVariant.design.paper.toUpperCase()}</span>
            <span>Font Size: {activeVariant.design.fontSize}pt</span>
          </div>
          <span>Pure local generation · Zero network exposure</span>
        </div>
      </div>
    </div>
  );
}
