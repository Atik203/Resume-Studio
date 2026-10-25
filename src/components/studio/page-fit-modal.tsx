'use client';

import { useState, useMemo } from 'react';
import type { DesignSettings, ResumeVariant, ProjectData } from '@/lib/data';
import { optimizePageFit, type SpacingDiff } from '@/lib/page-fit-optimizer';
import { scanEntryOrphans, type OrphanCandidate } from '@/lib/orphan-hunter';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Scissors,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export interface PageFitModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVariant: ResumeVariant;
  project: ProjectData;
  onApplyDesign: (updatedDesign: DesignSettings) => void;
  onUpdateEntryBullet: (entryId: string, bulletIndex: number, newText: string) => void;
  isOverflowing: boolean;
}

export function PageFitModal({
  isOpen,
  onClose,
  activeVariant,
  project,
  onApplyDesign,
  onUpdateEntryBullet,
  isOverflowing,
}: PageFitModalProps) {
  const [tab, setTab] = useState<'fit' | 'expand' | 'orphans'>(
    isOverflowing ? 'fit' : 'fit'
  );

  // Calculate optimization result for current mode
  const optimization = useMemo(() => {
    return optimizePageFit(activeVariant.design, tab === 'expand' ? 'expand' : 'tighten');
  }, [activeVariant.design, tab]);

  // Scan all bullets in active variant for orphans
  const orphans = useMemo(() => {
    const list: Array<{ entryId: string; entryTitle: string; candidate: OrphanCandidate }> = [];
    const entriesById = new Map(project.library.entries.map(e => [e.id, e]));

    for (const section of activeVariant.sections) {
      if (!section.visible) continue;
      for (const entryId of section.entryIds) {
        const master = entriesById.get(entryId);
        if (!master) continue;
        const entry = { ...master, ...activeVariant.entryOverrides[entryId] };
        const found = scanEntryOrphans(entry.bullets);
        for (const candidate of found) {
          list.push({ entryId, entryTitle: entry.title || section.label, candidate });
        }
      }
    }
    return list;
  }, [project, activeVariant]);

  if (!isOpen) return null;

  const handleApplyOptimization = () => {
    onApplyDesign(optimization.proposedDesign);
    onClose();
  };

  const handleApplyOrphanTrim = (entryId: string, bulletIndex: number, newText: string) => {
    onUpdateEntryBullet(entryId, bulletIndex, newText);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="page-fit-title">
      <div className="modal-box page-fit-modal-box">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 id="page-fit-title" className="text-base font-bold">
                Page-Fit Assistant & Spacing Intelligence
              </h3>
              <p className="text-xs text-muted-foreground">
                Mathematical micro-tuning to eliminate overflow or balance whitespace with 0 silent text loss.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close modal">
            ✕
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="page-fit-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'fit'}
            className={`page-fit-tab-btn ${tab === 'fit' ? 'active' : ''}`}
            onClick={() => setTab('fit')}
          >
            <Minimize2 size={13} />
            <span>Fit to Target Page ({activeVariant.targetPages}p)</span>
            {isOverflowing && <span className="fit-pill-warning">Overflow</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'expand'}
            className={`page-fit-tab-btn ${tab === 'expand' ? 'active' : ''}`}
            onClick={() => setTab('expand')}
          >
            <Maximize2 size={13} />
            <span>Fill Page Balance</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'orphans'}
            className={`page-fit-tab-btn ${tab === 'orphans' ? 'active' : ''}`}
            onClick={() => setTab('orphans')}
          >
            <Scissors size={13} />
            <span>Orphan Hunter ({orphans.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="page-fit-modal-body">
          {tab !== 'orphans' ? (
            <div className="space-y-4">
              {/* Strategy Explanation Card */}
              <div className="fit-strategy-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <FileCheck size={14} className="text-primary" />
                      <span>{tab === 'fit' ? 'Micro-Spacing Tighten Strategy' : 'Gentle Spacing Expansion Strategy'}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {optimization.explanation}
                    </p>
                  </div>
                  <div className="fit-stat-badge">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Reclaimed</span>
                    <strong className="text-sm font-extrabold text-primary">
                      ~{optimization.estimatedSpaceReclaimedPercent}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Diffs Table */}
              <div className="fit-diffs-container">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  Proposed Parametric Changes ({optimization.diffs.length})
                </span>
                {optimization.diffs.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center bg-card rounded-lg border border-border">
                    Spacing is already at the optimal boundary for this strategy.
                  </p>
                ) : (
                  <div className="fit-diffs-grid">
                    {optimization.diffs.map((diff: SpacingDiff) => (
                      <div key={diff.parameter} className="fit-diff-card">
                        <span className="diff-card-label">{diff.label}</span>
                        <div className="diff-card-values">
                          <span className="diff-orig">{diff.current}</span>
                          <ArrowRight size={11} className="text-muted-foreground" />
                          <span className="diff-prop">{diff.proposed}</span>
                          <span className="diff-delta">({diff.delta})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Certified Readability Guarantee */}
              <div className="fit-guarantee-box">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong>Content Preservation Guarantee:</strong> Zero words or bullets are deleted. All font sizes remain ≥ 9.0pt, margins remain ≥ 13mm, and line heights stay comfortable for recruiters.
                </span>
              </div>
            </div>
          ) : (
            /* ORPHAN HUNTER TAB */
            <div className="space-y-3">
              <div className="p-3 bg-card border border-border rounded-xl">
                <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                  <Scissors size={14} className="text-amber-500" />
                  <span>Runaway Line Wrap Detector</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  An <em>orphan</em> is when a bullet wraps onto an extra line for just 1–3 words, consuming an entire row of page height (~14pt). Trimming these trailing words pulls back the entire line!
                </p>
              </div>

              {orphans.length === 0 ? (
                <div className="p-6 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                  <strong className="text-sm font-semibold text-foreground block">Zero Orphan Wraps Found!</strong>
                  <p className="text-xs text-muted-foreground mt-1">
                    All your bullet points end cleanly without lonely trailing single words.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {orphans.map(({ entryId, entryTitle, candidate }, idx) => (
                    <div key={`${entryId}-${idx}`} className="orphan-card">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                        <span>{entryTitle} · Bullet #{candidate.bulletIndex + 1}</span>
                        <span className="text-amber-500 font-mono text-[10px]">
                          Trailing: ~{candidate.charsNeededToSaveLine} chars
                        </span>
                      </div>
                      <p className="text-xs text-foreground bg-muted/30 p-2 rounded border border-border/50 mb-2 font-mono leading-relaxed">
                        {candidate.originalText.slice(0, -candidate.trailingSnippet.length)}
                        <span className="bg-amber-500/20 text-amber-500 font-bold px-1 rounded">
                          {candidate.trailingSnippet}
                        </span>
                      </p>

                      {candidate.suggestedReplacement ? (
                        <div className="flex items-center justify-between gap-2 p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            💡 Filler detected ({candidate.fillerFound?.phrase}): saves {candidate.fillerFound?.charsSaved} chars!
                          </span>
                          <Button
                            variant="secondary"
                            size="icon-xs"
                            className="h-6 px-2 text-[11px] gap-1 shrink-0"
                            onClick={() =>
                              handleApplyOrphanTrim(
                                entryId,
                                candidate.bulletIndex,
                                candidate.suggestedReplacement!
                              )
                            }
                          >
                            <span>Apply Trim</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Trim ~{candidate.charsNeededToSaveLine} chars from this sentence to save an entire vertical line.
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>

          {tab !== 'orphans' && (
            <Button
              variant="default"
              size="sm"
              disabled={!optimization.canOptimize}
              onClick={handleApplyOptimization}
              className="gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span>Apply {optimization.strategy === 'tighten' ? 'Fit Spacing' : 'Expanded Spacing'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
