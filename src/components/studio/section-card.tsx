'use client';

import React, { useState } from 'react';
import { Section, SectionDesignSettings } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  FolderGit2,
  GraduationCap,
  GripVertical,
  Layers,
  Pencil,
  Sliders,
  Trash2,
  Zap,
  FileText,
  Check,
  X,
} from 'lucide-react';

export interface SectionCardProps {
  section: Section;
  index: number;
  isCollapsed: boolean;
  isDragging: boolean;
  dragOverDirection: 'top' | 'bottom' | null;
  onToggleCollapse: () => void;
  onRename: (label: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: (visible: boolean) => void;
  onDeleteSection: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onEditDesign: (patch: Partial<SectionDesignSettings>) => void;
  defaultFontSize: number;
  defaultDividerWeight: number;
  defaultShowDividers: boolean;
  children: React.ReactNode;
}

function getSectionIcon(id: string) {
  const lower = id.toLowerCase();
  if (lower.includes('exp') || lower.includes('work')) return <Briefcase size={16} className="text-emerald-600" />;
  if (lower.includes('edu')) return <GraduationCap size={16} className="text-sky-600" />;
  if (lower.includes('proj')) return <FolderGit2 size={16} className="text-purple-600" />;
  if (lower.includes('skill')) return <Zap size={16} className="text-amber-500" />;
  if (lower.includes('obj') || lower.includes('sum')) return <FileText size={16} className="text-teal-600" />;
  return <Layers size={16} className="text-neutral-500" />;
}

export function SectionCard({
  section,
  isCollapsed,
  isDragging,
  dragOverDirection,
  onToggleCollapse,
  onRename,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDeleteSection,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEditDesign,
  defaultFontSize,
  defaultDividerWeight,
  defaultShowDividers,
  children,
}: SectionCardProps) {
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const [showTypographyDrawer, setShowTypographyDrawer] = useState(false);

  const dragClasses = isDragging
    ? 'is-dragging'
    : dragOverDirection === 'bottom'
    ? 'is-drag-over-bottom'
    : dragOverDirection === 'top'
    ? 'is-drag-over-top'
    : '';

  return (
    <Card
      id={`section-${section.id}`}
      className={`flowcv-card section-card shrink-0 min-h-fit rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs transition-all ${
        isCollapsed ? 'is-collapsed' : ''
      } ${dragClasses}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* 1. FLOWCV SECTION HEADER */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span
            className="drag-handle text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing p-1"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder section"
            aria-label={`Drag to reorder ${section.label}`}
          >
            <GripVertical size={16} />
          </span>

          <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            {getSectionIcon(section.id)}
          </div>

          {!isEditingHeading ? (
            <div
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer group/title"
              onClick={() => setIsEditingHeading(true)}
              title="Click to edit section title"
            >
              <h3 className="font-extrabold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                {section.label}
              </h3>
              <Pencil size={12} className="text-neutral-400 dark:text-neutral-500 opacity-0 group-hover/title:opacity-100 group-hover/title:text-emerald-500 transition-all shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <Input
                autoFocus
                className="h-8 text-xs font-bold rounded-lg border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 focus:border-emerald-500"
                value={section.label}
                onChange={e => onRename(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') setIsEditingHeading(false);
                }}
              />
              <Button
                type="button"
                size="icon-xs"
                onClick={() => setIsEditingHeading(false)}
                className="h-7 w-7 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white"
              >
                <Check size={12} />
              </Button>
            </div>
          )}
        </div>

        {/* Right Section Actions (FlowCV Style) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowTypographyDrawer(prev => !prev)}
            title="Section typography, spacing & divider overrides"
            className={`h-7 w-7 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
              showTypographyDrawer ? 'bg-neutral-100 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400' : ''
            }`}
          >
            <Sliders size={13} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={section.visible ? 'Hide section from PDF' : 'Show section in PDF'}
            onClick={() => onToggleVisibility(!section.visible)}
            className={`h-7 w-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
              section.visible ? 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100' : 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
            }`}
          >
            {section.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Move section up"
            onClick={onMoveUp}
            className="h-7 w-7 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronUp size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Move section down"
            onClick={onMoveDown}
            className="h-7 w-7 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronDown size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={`Delete section "${section.label}"`}
            onClick={onDeleteSection}
            className="h-7 w-7 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Trash2 size={13} />
          </Button>

          <div className="w-[1px] h-3.5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={isCollapsed ? 'Expand section' : 'Collapse section'}
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 ml-0.5"
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </Button>
        </div>
      </div>

      {/* 2. SECTION DESIGN & TYPOGRAPHY DRAWER */}
      {!isCollapsed && showTypographyDrawer && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700 text-xs space-y-3 animate-in fade-in">
          <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs">
              <Sliders size={13} className="text-emerald-500" />
              <span>Section Specific Typography, Spacing & Dividers</span>
            </span>
            <button
              type="button"
              onClick={() => setShowTypographyDrawer(false)}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors"
              title="Close drawer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600 dark:text-neutral-400">Font Size · pt</span>
              <Input
                type="number"
                min={8}
                max={24}
                step={0.5}
                value={section.design?.fontSizePt ?? defaultFontSize}
                onChange={e =>
                  onEditDesign({
                    fontSizePt: Math.max(8, Math.min(24, Number(e.target.value) || defaultFontSize)),
                  })
                }
                className="h-8 text-xs rounded-lg dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600 dark:text-neutral-400">Divider Weight · pt</span>
              <Input
                type="number"
                min={0.1}
                max={3}
                step={0.1}
                value={section.design?.dividerWeightPt ?? defaultDividerWeight}
                onChange={e =>
                  onEditDesign({
                    dividerWeightPt: Math.max(0.1, Math.min(3, Number(e.target.value) || defaultDividerWeight)),
                  })
                }
                className="h-8 text-xs rounded-lg dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600 dark:text-neutral-400">Margin Above · pt</span>
              <Input
                type="number"
                min={0}
                max={36}
                step={0.5}
                value={section.design?.marginTopPt ?? 0}
                onChange={e =>
                  onEditDesign({
                    marginTopPt: Math.max(0, Math.min(36, Number(e.target.value) || 0)),
                  })
                }
                className="h-8 text-xs rounded-lg dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600 dark:text-neutral-400">Margin Below · pt</span>
              <Input
                type="number"
                min={0}
                max={36}
                step={0.5}
                value={section.design?.marginBottomPt ?? 0}
                onChange={e =>
                  onEditDesign({
                    marginBottomPt: Math.max(0, Math.min(36, Number(e.target.value) || 0)),
                  })
                }
                className="h-8 text-xs rounded-lg dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300">
              <Switch
                size="sm"
                checked={section.design?.showDivider ?? defaultShowDividers}
                onCheckedChange={checked => onEditDesign({ showDivider: checked })}
              />
              <span>Divider Rule under Heading</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700 dark:text-neutral-300">
              <Switch
                size="sm"
                checked={Boolean(section.design?.pageBreakBefore)}
                onCheckedChange={checked => onEditDesign({ pageBreakBefore: checked })}
              />
              <span>Force Page Break Before Section</span>
            </label>
          </div>
        </div>
      )}


      {/* 3. SECTION CONTENT ENTRIES */}
      {!isCollapsed && <CardContent className="p-4 sm:p-5 space-y-3">{children}</CardContent>}
    </Card>
  );
}
