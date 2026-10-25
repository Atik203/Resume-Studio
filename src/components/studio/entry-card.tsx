'use client';

import { useState } from 'react';
import { ContentEntry } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { analyzeBulletClient } from '@/lib/bullet-analyzer';
import {
  Bold,
  GripVertical,
  Italic,
  Link as LinkIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Pencil,
  Copy,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BulletPolishModal } from './bullet-polish-modal';

export interface EntryCardProps {
  entry: ContentEntry;
  sectionId: string;
  index: number;
  isDragging: boolean;
  dragOverDirection: 'top' | 'bottom' | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onEdit: (patch: Partial<ContentEntry>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onInsertFormatting: (prefix: string, suffix: string) => void;
  onInsertActionVerb: (verb: string) => void;
}

const ACTION_VERBS = ['Architected', 'Spearheaded', 'Optimized', 'Automated', 'Engineered'];

export function EntryCard({
  entry,
  isDragging,
  dragOverDirection,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onInsertFormatting,
  onInsertActionVerb,
}: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(!entry.title);
  const [polishingBullet, setPolishingBullet] = useState<{ text: string; index: number } | null>(null);

  const dragClasses = isDragging
    ? 'is-dragging'
    : dragOverDirection === 'bottom'
    ? 'is-drag-over-bottom'
    : dragOverDirection === 'top'
    ? 'is-drag-over-top'
    : '';

  const bulletScores = entry.bullets.map(b => analyzeBulletClient(b));
  const firstBullet = entry.bullets.find(b => b.trim().length > 0) || entry.description;

  const handleApplyVariation = (bIdx: number, newText: string, mode: 'replace' | 'append') => {
    const updated = [...entry.bullets];
    if (mode === 'replace') {
      updated[bIdx] = newText;
    } else {
      updated.splice(bIdx + 1, 0, newText);
    }
    onEdit({ bullets: updated });
  };

  return (
    <div
      className={`entry-card-wrapper transition-all ${dragClasses}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* 1. COLLAPSED SCANNABLE SUMMARY ROW (FlowCV Style) */}
      {!isExpanded ? (
        <div className="entry-summary-row flex items-center justify-between p-3.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group shadow-xs">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span
              className="drag-handle text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing p-1"
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              title="Drag to reorder"
            >
              <GripVertical size={15} />
            </span>

            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => setIsExpanded(true)}
              title="Click to edit entry details"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-xs sm:text-sm truncate" style={{ color: 'var(--studio-text)' }}>
                    {entry.title || 'Untitled Position / Entry'}
                  </span>
                  {entry.subtitle && (
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--studio-muted)' }}>
                      · {entry.subtitle}
                    </span>
                  )}
                </div>
                {entry.date && (
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--studio-muted)' }}>
                    {entry.date}
                  </span>
                )}
              </div>

              {firstBullet && (
                <div className="text-xs truncate mt-0.5 font-normal" style={{ color: 'var(--studio-muted)' }}>
                  {firstBullet}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 ml-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onMoveUp}
              title="Move entry up"
              className="h-7 w-7 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <ChevronUp size={13} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onMoveDown}
              title="Move entry down"
              className="h-7 w-7 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <ChevronDown size={13} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsExpanded(true)}
              title="Edit entry"
              className="h-7 w-7 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <Pencil size={13} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onDuplicate}
              title="Duplicate entry"
              className="h-7 w-7 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <Copy size={13} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onRemove}
              title="Delete entry"
              className="h-7 w-7 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      ) : (
        /* 2. EXPANDED ENTRY FORM */
        <div className="entry-editor p-4 sm:p-5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
          <div className="entry-title-row flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 flex-1">
              <span
                className="drag-handle text-neutral-400 cursor-grab p-1"
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                title="Drag to reorder entry"
              >
                <GripVertical size={14} />
              </span>
              <Input
                value={entry.title}
                aria-label="Entry title"
                onChange={e => onEdit({ title: e.target.value })}
                placeholder="Entry title (e.g. Senior Frontend Engineer)"
                className="font-bold text-sm rounded-xl border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 focus:border-emerald-500 flex-1"
              />
            </div>

            <div className="flex items-center gap-1.5 ml-3 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                title="Move entry up"
                onClick={onMoveUp}
              >
                <ChevronUp size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                title="Move entry down"
                onClick={onMoveDown}
              >
                <ChevronDown size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="h-7 w-7 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Delete entry"
                onClick={onRemove}
              >
                <Trash2 size={13} />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold shadow-xs ml-1"
              >
                <Check size={12} />
                <span>Done</span>
              </Button>
            </div>
          </div>

          <div className="field-grid grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="flex flex-col gap-1 sm:col-span-1">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Organization / Subtitle</span>
              <Input
                value={entry.subtitle}
                placeholder="Company or school name"
                onChange={e => onEdit({ subtitle: e.target.value })}
                className="rounded-xl border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-1">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Date</span>
              <Input
                value={entry.date}
                placeholder="e.g. 2023 – Present"
                onChange={e => onEdit({ date: e.target.value })}
                className="rounded-xl border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-1">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Location</span>
              <Input
                value={entry.location}
                placeholder="e.g. Remote or City"
                onChange={e => onEdit({ location: e.target.value })}
                className="rounded-xl border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </label>

            <label className="wide flex flex-col gap-1 sm:col-span-3">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Short Summary / Description</span>
              <Textarea
                rows={2}
                value={entry.description}
                placeholder="Brief summary or context"
                onChange={e => onEdit({ description: e.target.value })}
                className="rounded-xl border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </label>

            <div className="wide flex flex-col gap-1.5 sm:col-span-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Bullet Points (One per line)</span>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Supports **bold**, *italic*, [links]</span>
              </div>

              {/* Compact Inline Formatting Toolbar */}
              <div className="bullet-format-bar flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  className="format-btn inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Bold (**text**)"
                  onClick={() => onInsertFormatting('**', '**')}
                >
                  <Bold size={11} />
                  <span>Bold</span>
                </button>
                <button
                  type="button"
                  className="format-btn inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Italic (*text*)"
                  onClick={() => onInsertFormatting('*', '*')}
                >
                  <Italic size={11} />
                  <span>Italic</span>
                </button>
                <button
                  type="button"
                  className="format-btn inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Insert Link ([Label](https://...))"
                  onClick={() => onInsertFormatting('[Link Text](https://', ')')}
                >
                  <LinkIcon size={11} />
                  <span>Link</span>
                </button>

                <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />

                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">Verbs:</span>
                {ACTION_VERBS.map(verb => (
                  <button
                    key={verb}
                    type="button"
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 text-neutral-600 dark:text-neutral-300 transition-colors"
                    onClick={() => onInsertActionVerb(verb)}
                  >
                    {verb}
                  </button>
                ))}
              </div>

              <Textarea
                rows={4}
                value={entry.bullets.join('\n')}
                placeholder="• Architected microservices with 99.9% uptime...&#10;• Spearheaded team adoption of Next.js..."
                onChange={e => onEdit({ bullets: e.target.value.split('\n') })}
                className="font-mono text-xs rounded-xl border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Bullet Analysis & Polish Badges */}
          {entry.bullets.some(b => b.trim().length > 0) && (
            <div className="bullet-insights-container pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-emerald-500" />
                <span>Google XYZ Impact & Polish Assistant</span>
              </div>

              <div className="space-y-1.5">
                {entry.bullets.map((bullet, bIdx) => {
                  if (!bullet.trim()) return null;
                  const analysis = bulletScores[bIdx];
                  const isGood = analysis?.score >= 70;
                  const isMedium = analysis?.score >= 40 && analysis?.score < 70;

                  return (
                    <div
                      key={bIdx}
                      className="p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isGood ? (
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        ) : isMedium ? (
                          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                        ) : (
                          <HelpCircle size={13} className="text-neutral-400 shrink-0" />
                        )}
                        <span className="truncate text-neutral-700 dark:text-neutral-300 flex-1">{bullet}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isGood
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isMedium
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {analysis?.score ?? 0}%
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPolishingBullet({ text: bullet, index: bIdx })}
                        className="h-6 text-[11px] px-2 rounded-lg border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 xyz-polish-btn shrink-0"
                      >
                        <Sparkles size={11} className="mr-1 text-emerald-500" />
                        <span>Polish</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bullet Polish Modal */}
          {polishingBullet && (
            <BulletPolishModal
              isOpen={true}
              bulletText={polishingBullet.text}
              bulletIndex={polishingBullet.index}
              entryTitle={entry.title}
              entrySubtitle={entry.subtitle}
              onClose={() => setPolishingBullet(null)}
              onApplyVariation={(bIdx, newText, mode) => {
                handleApplyVariation(bIdx, newText, mode);
                setPolishingBullet(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
