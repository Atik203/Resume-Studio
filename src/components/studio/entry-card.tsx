'use client';

import { ContentEntry } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Bold,
  GripVertical,
  Italic,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';

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
  const dragClasses = isDragging
    ? 'is-dragging'
    : dragOverDirection === 'bottom'
    ? 'is-drag-over-bottom'
    : dragOverDirection === 'top'
    ? 'is-drag-over-top'
    : '';

  return (
    <div
      className={`entry-editor ${dragClasses}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="entry-title-row">
        <span
          className="drag-handle"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Drag to reorder entry"
          aria-label="Drag to reorder entry"
        >
          <GripVertical size={14} />
        </span>
        <Input
          value={entry.title}
          aria-label="Entry title"
          onChange={e => onEdit({ title: e.target.value })}
          placeholder="Entry title (e.g. Senior Frontend Engineer)"
        />
        <span>
          <button type="button" title="Move entry up" onClick={onMoveUp}>
            ↑
          </button>
          <button type="button" title="Move entry down" onClick={onMoveDown}>
            ↓
          </button>
          <button type="button" title="Duplicate entry" onClick={onDuplicate}>
            ⧉
          </button>
          <button type="button" title="Remove from this draft" onClick={onRemove}>
            ×
          </button>
        </span>
      </div>

      <div className="field-grid">
        <label>
          <span>Organization / Subtitle</span>
          <Input
            value={entry.subtitle}
            placeholder="Company or school name"
            onChange={e => onEdit({ subtitle: e.target.value })}
          />
        </label>
        <label>
          <span>Date</span>
          <Input
            value={entry.date}
            placeholder="e.g. 2023 – Present"
            onChange={e => onEdit({ date: e.target.value })}
          />
        </label>
        <label>
          <span>Location</span>
          <Input
            value={entry.location}
            placeholder="e.g. Remote or City, Country"
            onChange={e => onEdit({ location: e.target.value })}
          />
        </label>
        <label className="wide">
          <span>Description</span>
          <Textarea
            rows={2}
            value={entry.description}
            placeholder="Summary or context"
            onChange={e => onEdit({ description: e.target.value })}
          />
        </label>
        <label className="wide">
          <span>Bullet points · one per line</span>
          <div className="bullet-format-bar">
            <button
              type="button"
              className="format-btn"
              title="Bold (**text**)"
              onClick={() => onInsertFormatting('**', '**')}
            >
              <Bold size={12} />
              <span>Bold</span>
            </button>
            <button
              type="button"
              className="format-btn"
              title="Italic (*text*)"
              onClick={() => onInsertFormatting('*', '*')}
            >
              <Italic size={12} />
              <span>Italic</span>
            </button>
            <button
              type="button"
              className="format-btn"
              title="Insert Link ([Label](https://...))"
              onClick={() => onInsertFormatting('[Link Text](https://', ')')}
            >
              <LinkIcon size={12} />
              <span>Link</span>
            </button>
            <div className="format-bar-divider" />
            <span className="format-hint">Verbs:</span>
            {ACTION_VERBS.map(verb => (
              <button
                key={verb}
                type="button"
                className="format-verb-pill"
                title={`Insert "${verb}"`}
                onClick={() => onInsertActionVerb(verb)}
              >
                {verb}
              </button>
            ))}
          </div>
          <Textarea
            rows={3}
            value={entry.bullets.join('\n')}
            placeholder="Key accomplishment&#10;Quantifiable impact or project detail"
            onChange={e => onEdit({ bullets: e.target.value.split('\n') })}
          />
          <div className="bullet-helper">
            <Sparkles size={13} className="text-primary shrink-0" />
            <span>Supports **bold**, *italic*, and [links](https://) in compiled PDF.</span>
          </div>
        </label>
        <label className="wide">
          <span>Technologies · comma separated</span>
          <Input
            value={entry.technologies.join(', ')}
            placeholder="React, TypeScript, Node.js"
            onChange={e =>
              onEdit({
                technologies: e.target.value
                  .split(',')
                  .map(t => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </div>
    </div>
  );
}
