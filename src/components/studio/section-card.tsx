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
      className={`flowcv-card section-card rounded-2xl border border-neutral-200/90 bg-white shadow-xs transition-all ${
        isCollapsed ? 'is-collapsed' : ''
      } ${dragClasses}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* 1. FLOWCV SECTION HEADER */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-neutral-100">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span
            className="drag-handle text-neutral-400 hover:text-neutral-700 cursor-grab active:cursor-grabbing p-1"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder section"
            aria-label={`Drag to reorder ${section.label}`}
          >
            <GripVertical size={16} />
          </span>

          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
            {getSectionIcon(section.id)}
          </div>

          {!isEditingHeading ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-neutral-900 tracking-tight truncate">
                {section.label}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingHeading(true)}
                className="h-6 px-2 text-[11px] font-semibold text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md"
              >
                <Pencil size={11} className="mr-1" />
                <span>Edit Heading</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <Input
                autoFocus
                className="h-8 text-xs font-bold rounded-lg border-neutral-300 focus:border-emerald-500"
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
                className="h-7 w-7 rounded-lg bg-neutral-900 text-white"
              >
                <Check size={12} />
              </Button>
            </div>
          )}
        </div>

        {/* Right Section Actions (FlowCV Style) */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowTypographyDrawer(prev => !prev)}
            title="Section typography, spacing & divider overrides"
            className={`h-7 w-7 rounded-lg text-neutral-500 hover:text-neutral-900 ${
              showTypographyDrawer ? 'bg-neutral-100 text-emerald-600' : ''
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
            className={`h-7 w-7 rounded-lg ${
              section.visible ? 'text-neutral-500 hover:text-neutral-900' : 'text-amber-500 bg-amber-50'
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
            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-900"
          >
            <ChevronUp size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Move section down"
            onClick={onMoveDown}
            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-900"
          >
            <ChevronDown size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={`Delete section "${section.label}"`}
            onClick={onDeleteSection}
            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={13} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={isCollapsed ? 'Expand section' : 'Collapse section'}
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-lg text-neutral-500 hover:text-neutral-900 ml-1"
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </Button>
        </div>
      </div>

      {/* 2. SECTION DESIGN & TYPOGRAPHY DRAWER */}
      {!isCollapsed && showTypographyDrawer && (
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 text-xs space-y-3">
          <div className="font-bold text-neutral-800 flex items-center justify-between">
            <span>Section Specific Typography, Spacing & Dividers</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setShowTypographyDrawer(false)}
              className="text-[11px] p-0 h-auto text-neutral-500"
            >
              Close Drawer ✕
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600">Font Size · pt</span>
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
                className="h-8 text-xs rounded-lg"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600">Divider Weight · pt</span>
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
                className="h-8 text-xs rounded-lg"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600">Margin Above · pt</span>
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
                className="h-8 text-xs rounded-lg"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-600">Margin Below · pt</span>
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
                className="h-8 text-xs rounded-lg"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700">
              <Switch
                size="sm"
                checked={section.design?.showDivider ?? defaultShowDividers}
                onCheckedChange={checked => onEditDesign({ showDivider: checked })}
              />
              <span>Divider Rule under Heading</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-700">
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
