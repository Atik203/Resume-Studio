'use client';

import React from 'react';
import { Section, SectionDesignSettings } from '@/lib/data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
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

export function SectionCard({
  section,
  index,
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
      className={`form-card section-card gap-0 ${isCollapsed ? 'is-collapsed' : ''} ${dragClasses}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="card-title section-card-title p-0">
        <div className="section-heading-group">
          <span
            className="drag-handle"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder section"
            aria-label={`Drag to reorder ${section.label}`}
          >
            <GripVertical size={16} />
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="section-collapse"
            aria-label={isCollapsed ? `Expand ${section.label}` : `Collapse ${section.label}`}
            aria-expanded={!isCollapsed}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </Button>
          <span className="step">{String(index + 2).padStart(2, '0')}</span>
          <Input
            className="section-name"
            value={section.label}
            onChange={e => onRename(e.target.value)}
          />
        </div>

        <div className="section-actions">
          <button
            type="button"
            title="Move section up"
            aria-label={`Move ${section.label} up`}
            onClick={onMoveUp}
          >
            ↑
          </button>
          <button
            type="button"
            title="Move section down"
            aria-label={`Move ${section.label} down`}
            onClick={onMoveDown}
          >
            ↓
          </button>
          <button
            type="button"
            className="delete-section-btn"
            title={`Delete section "${section.label}" from this draft`}
            aria-label={`Delete section "${section.label}"`}
            onClick={onDeleteSection}
          >
            <Trash2 size={13} />
          </button>
          <label className="toggle" title="Toggle section visibility in compiled PDF">
            <Switch
              size="sm"
              checked={section.visible}
              onCheckedChange={onToggleVisibility}
            />
            <span>{section.visible ? 'Visible' : 'Hidden'}</span>
          </label>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0">
          {/* Section Design Overrides Drawer */}
          <details className="section-design-details">
            <summary>Section typography, spacing & divider</summary>
            <div className="field-grid section-design-grid">
              <label>
                <span>Section font · pt</span>
                <Input
                  type="number"
                  min={8}
                  max={24}
                  step={0.5}
                  value={section.design?.fontSizePt ?? defaultFontSize}
                  onChange={e =>
                    onEditDesign({
                      fontSizePt: Math.max(
                        8,
                        Math.min(24, Number(e.target.value) || defaultFontSize)
                      ),
                    })
                  }
                />
              </label>
              <label>
                <span>Left margin · mm</span>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  step={0.5}
                  value={section.design?.marginLeftMm ?? 0}
                  onChange={e =>
                    onEditDesign({
                      marginLeftMm: Math.max(0, Math.min(25, Number(e.target.value) || 0)),
                    })
                  }
                />
              </label>
              <label>
                <span>Right margin · mm</span>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  step={0.5}
                  value={section.design?.marginRightMm ?? 0}
                  onChange={e =>
                    onEditDesign({
                      marginRightMm: Math.max(0, Math.min(25, Number(e.target.value) || 0)),
                    })
                  }
                />
              </label>
              <label>
                <span>Margin above · pt</span>
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
                />
              </label>
              <label>
                <span>Margin below · pt</span>
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
                />
              </label>
              <label>
                <span>Padding top · pt</span>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={section.design?.paddingTopPt ?? 0}
                  onChange={e =>
                    onEditDesign({
                      paddingTopPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                    })
                  }
                />
              </label>
              <label>
                <span>Padding bottom · pt</span>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={section.design?.paddingBottomPt ?? 0}
                  onChange={e =>
                    onEditDesign({
                      paddingBottomPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                    })
                  }
                />
              </label>
              <label>
                <span>Divider weight · pt</span>
                <Input
                  type="number"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={section.design?.dividerWeightPt ?? defaultDividerWeight}
                  onChange={e =>
                    onEditDesign({
                      dividerWeightPt: Math.max(
                        0.1,
                        Math.min(3, Number(e.target.value) || defaultDividerWeight)
                      ),
                    })
                  }
                />
              </label>
              <label className="setting-toggle">
                <span>Divider under heading</span>
                <Switch
                  checked={section.design?.showDivider ?? defaultShowDividers}
                  onCheckedChange={checked => onEditDesign({ showDivider: checked })}
                />
              </label>
              <label className="setting-toggle" title="Push this section to the top of the next page">
                <span>📄 Page Break Before Section</span>
                <Switch
                  checked={Boolean(section.design?.pageBreakBefore)}
                  onCheckedChange={checked => onEditDesign({ pageBreakBefore: checked })}
                />
              </label>
            </div>
          </details>

          {/* Render entries inside section */}
          {children}
        </CardContent>
      )}
    </Card>
  );
}
