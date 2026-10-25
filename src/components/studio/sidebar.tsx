'use client';

import React from 'react';
import { ProjectData } from '@/lib/data';
import { UiPreferences } from '@/lib/ui-preferences';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FolderKanban,
  Monitor,
  Moon,
  Plus,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';

export interface SidebarProps {
  project: ProjectData;
  activeVariantId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  saveState: 'saving' | 'saved' | 'idle' | 'error';
  saveStateText: string;
  preferences: UiPreferences;
  onUpdatePreferences: (updater: (p: UiPreferences) => UiPreferences) => void;
  onSelectVariant: (id: string) => void;
  onRenameVariant: (id: string, name: string) => void;
  onOpenNewDraftModal: () => void;
  onDuplicateVariant: (id: string) => void;
  onDeleteVariant: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Sidebar({
  project,
  activeVariantId,
  collapsed,
  onToggleCollapse,
  saveState,
  saveStateText,
  preferences,
  onUpdatePreferences,
  onSelectVariant,
  onRenameVariant,
  onOpenNewDraftModal,
  onDuplicateVariant,
  onDeleteVariant,
  onExportBackup,
  onImportBackup,
}: SidebarProps) {
  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      aria-label="Resume Studio drafts navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-header">
        <div
          className="sidebar-brand"
          onClick={collapsed ? onToggleCollapse : undefined}
          title={collapsed ? 'Click to expand sidebar' : undefined}
          style={{ cursor: collapsed ? 'pointer' : 'default' }}
        >
          <div className="brand-mark">
            <FolderKanban size={16} />
          </div>
          <div className="brand-info">
            <span className="brand-title">Workspace</span>
            <span className="brand-badge">
              <span className={`save-pulse ${saveState}`} />
              {saveStateText}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="sidebar-body">
        {/* Drafts Section Header */}
        <div className="sidebar-section-head">
          <span className="sidebar-section-title">Drafts & Documents</span>
          <button
            type="button"
            className="new-draft-btn"
            onClick={onOpenNewDraftModal}
            title="Create new draft"
          >
            <Plus size={13} />
            <span>New Draft</span>
          </button>
        </div>

        {/* Drafts & Documents List */}
        <div className="drafts-list" role="tablist" aria-label="Resume drafts">
          {project.variants.map(variant => {
            const isActive = variant.id === activeVariantId;
            return (
              <div
                key={variant.id}
                className={`draft-item ${isActive ? 'active' : ''}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectVariant(variant.id)}
                title={`${variant.name} (${variant.mode === 'cv' ? 'Curriculum Vitae' : 'Resume'} · ${variant.targetPages} ${variant.targetPages === 1 ? 'Page' : 'Pages'})`}
              >
                {collapsed ? (
                  <div className="collapsed-draft-card">
                    <span className={`doc-mode-badge ${variant.mode}`}>
                      {variant.mode === 'cv' ? 'CV' : 'RES'}
                    </span>
                    <span className="collapsed-pages-dot">{variant.targetPages}p</span>
                  </div>
                ) : (
                  <>
                    <div className="draft-item-top">
                      <span className={`doc-mode-badge ${variant.mode}`}>
                        {variant.mode === 'cv' ? 'CV' : 'RES'}
                      </span>
                      <span className="draft-page-target">
                        {variant.targetPages} {variant.targetPages === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                    <div className="draft-item-title-row">
                      <input
                        className="draft-name-input"
                        value={variant.name}
                        onClick={e => e.stopPropagation()}
                        onChange={e => onRenameVariant(variant.id, e.target.value)}
                        placeholder="Draft name"
                        aria-label={`Name for draft ${variant.name}`}
                      />
                      <div className="draft-item-actions" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="draft-action-btn"
                          title="Duplicate draft (Make a copy)"
                          aria-label={`Duplicate draft ${variant.name}`}
                          onClick={() => onDuplicateVariant(variant.id)}
                        >
                          <Copy size={12} />
                        </button>
                        {project.variants.length > 1 && (
                          <button
                            type="button"
                            className="draft-action-btn delete"
                            title="Delete draft"
                            aria-label={`Delete draft ${variant.name}`}
                            onClick={() => onDeleteVariant(variant.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer (Utility Dock) */}
      <div className="sidebar-footer">
        {/* Theme Toggle */}
        <div className="theme-switcher" role="radiogroup" aria-label="Color theme">
          <button
            type="button"
            className={`theme-tab-btn ${preferences.theme === 'light' ? 'active' : ''}`}
            onClick={() => onUpdatePreferences(p => ({ ...p, theme: 'light' }))}
            title="Light mode"
            aria-label="Light mode"
          >
            <Sun size={13} />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={`theme-tab-btn ${preferences.theme === 'dark' ? 'active' : ''}`}
            onClick={() => onUpdatePreferences(p => ({ ...p, theme: 'dark' }))}
            title="Dark mode"
            aria-label="Dark mode"
          >
            <Moon size={13} />
            <span>Dark</span>
          </button>
          <button
            type="button"
            className={`theme-tab-btn ${preferences.theme === 'system' ? 'active' : ''}`}
            onClick={() => onUpdatePreferences(p => ({ ...p, theme: 'system' }))}
            title="System theme"
            aria-label="System theme"
          >
            <Monitor size={13} />
            <span>Sys</span>
          </button>
        </div>

        {/* Backup actions */}
        <div className="sidebar-footer-actions">
          <button
            type="button"
            className="sidebar-footer-btn"
            onClick={onExportBackup}
            title="Export JSON backup of all drafts and master content"
            aria-label="Export JSON backup"
          >
            <Download size={13} />
            {!collapsed && <span>Export Backup</span>}
          </button>
          <label
            className="sidebar-footer-btn file-button"
            title="Import JSON backup file"
            aria-label="Import JSON backup"
          >
            <Upload size={13} />
            {!collapsed && <span>Import</span>}
            <input type="file" accept="application/json,.json" onChange={onImportBackup} />
          </label>
        </div>

        {/* Local Engine Status */}
        <div
          className="engine-status"
          title="Compiled locally with TeX Live pdflatex (verified & 100% offline)"
        >
          <span className="engine-status-dot" aria-hidden="true" />
          {!collapsed && <span>Local TeX Live pdflatex</span>}
        </div>
      </div>
    </aside>
  );
}
