'use client';

import {
  Briefcase,
  FolderGit2,
  GraduationCap,
  Layers,
  User,
  Zap,
} from 'lucide-react';
import type { StudioPane } from '@/components/studio/topbar';

function getSectionChipIcon(id: string) {
  const lower = id.toLowerCase();
  if (lower.includes('skill')) return <Zap size={12} className="text-amber-500 shrink-0" />;
  if (lower.includes('exp') || lower.includes('work')) return <Briefcase size={12} className="text-emerald-500 shrink-0" />;
  if (lower.includes('proj')) return <FolderGit2 size={12} className="text-purple-500 shrink-0" />;
  if (lower.includes('edu')) return <GraduationCap size={12} className="text-sky-500 shrink-0" />;
  return <Layers size={12} className="text-neutral-400 shrink-0" />;
}

export interface EditorHeaderSection {
  id: string;
  label: string;
}

export interface EditorHeaderProps {
  activePane: StudioPane;
  mode: 'resume' | 'cv';
  targetPages: number;
  templateId: string;
  name: string;
  sections: EditorHeaderSection[];
  onRename: (name: string) => void;
  onSectionClick: (id: string) => void;
}

export function EditorHeader({
  activePane,
  mode,
  targetPages,
  templateId,
  name,
  sections,
  onRename,
  onSectionClick,
}: EditorHeaderProps) {
  if (activePane === 'design') {
    return (
      <div className="editor-header design-header">
        <div className="editor-header-main">
          <div className="editor-breadcrumb">
            <span>Document Styling</span>
            <span>·</span>
            <span>Template: {templateId}</span>
          </div>
          <h2 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Design, Typography & Spacing
          </h2>
        </div>
      </div>
    );
  }

  if (activePane === 'ats') {
    return (
      <div className="editor-header ats-header">
        <div className="editor-header-main">
          <div className="editor-breadcrumb">
            <span>Intelligence & Matcher</span>
            <span>·</span>
            <span>Local GPU Inference</span>
          </div>
          <h2 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            ATS Matcher & Keyword Optimizer
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-header">
      <div className="editor-header-main">
        <div className="editor-breadcrumb">
          <span>{mode === 'cv' ? 'Curriculum Vitae' : 'Resume'}</span>
          <span>·</span>
          <span>
            {targetPages} {targetPages === 1 ? 'Page Target' : 'Pages Target'}
          </span>
        </div>
        <input
          className="editor-title-input"
          value={name}
          aria-label="Draft name"
          placeholder="Name your resume draft"
          onChange={event => onRename(event.target.value)}
        />
        <div className="section-quick-nav" aria-label="Jump to section">
          <button type="button" className="section-chip" onClick={() => onSectionClick('profile')}>
            <User size={12} className="text-emerald-500 shrink-0" />
            <span>Profile</span>
          </button>
          {sections.map(section => (
            <button
              key={section.id}
              type="button"
              className="section-chip"
              onClick={() => onSectionClick(section.id)}
            >
              {getSectionChipIcon(section.id)}
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
