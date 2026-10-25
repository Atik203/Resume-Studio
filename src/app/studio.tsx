'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ContactLink,
  ContactLinkType,
  ContentEntry,
  FontFamily,
  ProjectData,
  ResumeVariant,
  SectionDesignSettings,
  TemplateId,
  validateProject,
} from '@/lib/data';
import { fixtureProject } from '@/lib/fixture';
import { loadProject, saveProject } from '@/lib/storage';
import { decodePdfBase64, parseCompileResponseMetadata } from '@/lib/compile-response';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { defaultUiPreferences, loadUiPreferences, saveUiPreferences, type UiPreferences } from '@/lib/ui-preferences';
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Copy,
  Download,
  FileText,
  Github,
  Globe,
  Linkedin,
  Link as LinkIcon,
  Moon,
  Monitor,
  Plus,
  RefreshCw,
  Sliders,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { designPresets, getDesignPreset, type DesignPresetId } from '@/lib/design-presets';

const templates: { id: TemplateId; name: string; description: string }[] = [
  { id: 't01-simple-ats', name: 'Simple ATS', description: 'Centered header · compact sections · 1-page ready' },
  { id: 't02-clean-compact', name: 'Clean Compact', description: 'Left-aligned single column · dense layout' },
  { id: 't03-modern-developer', name: 'Modern Developer', description: 'Restrained accent color · technical hierarchy' },
  { id: 't04-academic-cv', name: 'Academic CV', description: 'Two pages target · roomy academic rhythm' },
  { id: 't05-profile-cv', name: 'Profile CV', description: 'Clean single column with optional portrait' },
];

const contactTypes: { id: ContactLinkType; label: string }[] = [
  { id: 'website', label: 'Website' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'github', label: 'GitHub' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'other', label: 'Other' },
];

const CompiledPdfViewer = dynamic(() => import('@/components/pdf/compiled-pdf-viewer'), {
  ssr: false,
  loading: () => <div className="pdf-viewer-state">Loading local PDF viewer…</div>,
});

export default function Studio() {
  const [project, setProject] = useState<ProjectData>(() => structuredClone(fixtureProject));
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'idle' | 'error'>('idle');
  const [saveStateText, setSaveStateText] = useState('Loading library…');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [pageCount, setPageCount] = useState<string>('');
  const [overflow, setOverflow] = useState(false);
  const [compiledRevision, setCompiledRevision] = useState(-1);
  const [revision, setRevision] = useState(0);
  const projectRevision = useRef(0);
  const compileController = useRef<AbortController | null>(null);
  const compileRequestId = useRef(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [activePane, setActivePane] = useState<'editor' | 'design'>('editor');
  const [designMode, setDesignMode] = useState<'quick' | 'advanced'>('quick');
  const [preferences, setPreferences] = useState<UiPreferences>(defaultUiPreferences);
  const [editorWidth, setEditorWidth] = useState(540);
  const [workspacePane, setWorkspacePane] = useState<'editor' | 'preview'>('editor');
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, string[]>>({});
  const [showNewDraftModal, setShowNewDraftModal] = useState(false);
  const [newDraftType, setNewDraftType] = useState<'resume' | 'cv'>('resume');
  const [newDraftName, setNewDraftName] = useState('');
  const dragX = useRef<number | null>(null);

  const active = project.variants.find(v => v.id === project.activeVariantId) ?? project.variants[0];

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        setPreferences(loadUiPreferences());
        return loadProject();
      })
      .then(saved => {
        if (saved) setProject(validateProject(saved));
        setSaveState('saved');
        setSaveStateText('Saved locally');
      })
      .catch(err => {
        setMessage(`Local storage error: ${err instanceof Error ? err.message : 'unknown error'}`);
        setSaveState('error');
        setSaveStateText('Storage error');
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveUiPreferences(preferences);
    const root = document.documentElement;
    const dark =
      preferences.theme === 'dark' ||
      (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    if (preferences.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      root.classList.toggle('dark', media.matches);
      root.style.colorScheme = media.matches ? 'dark' : 'light';
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [preferences, ready]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setSaveState('saving');
      setSaveStateText('Saving…');
      saveProject(project)
        .then(() => {
          setSaveState('saved');
          setSaveStateText('Saved locally');
        })
        .catch(err => {
          setSaveState('error');
          setSaveStateText(`Save failed: ${err instanceof Error ? err.message : 'error'}`);
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project, ready]);

  const updateProject = useCallback((updater: (current: ProjectData) => ProjectData) => {
    compileController.current?.abort();
    projectRevision.current += 1;
    setRevision(projectRevision.current);
    setPdfFile(null);
    setPageCount('');
    setOverflow(false);
    setSaveState('saving');
    setSaveStateText('Saving…');
    setProject(current => updater(structuredClone(current)));
  }, []);

  const updateVariant = useCallback(
    (updater: (variant: ResumeVariant) => ResumeVariant) =>
      updateProject(p => ({
        ...p,
        variants: p.variants.map(v => (v.id === p.activeVariantId ? updater(v) : v)),
      })),
    [updateProject]
  );

  const selectedEntries = useMemo(
    () => new Map(project.library.entries.map(entry => [entry.id, entry])),
    [project.library.entries]
  );

  function editProfile(field: 'name' | 'title' | 'email' | 'phone' | 'location', value: string) {
    if (Object.keys(active.profileOverrides).length) {
      updateVariant(v => ({ ...v, profileOverrides: { ...v.profileOverrides, [field]: value } }));
    } else {
      updateProject(p => ({
        ...p,
        library: { ...p.library, profile: { ...p.library.profile, [field]: value } },
      }));
    }
  }

  function editProfileLinks(links: ContactLink[]) {
    if (Object.keys(active.profileOverrides).length) {
      updateVariant(v => ({ ...v, profileOverrides: { ...v.profileOverrides, links } }));
    } else {
      updateProject(p => ({
        ...p,
        library: { ...p.library, profile: { ...p.library.profile, links } },
      }));
    }
  }

  function editEntry(entryId: string, patch: Partial<ContentEntry>) {
    updateVariant(v => ({
      ...v,
      entryOverrides: {
        ...v.entryOverrides,
        [entryId]: { ...v.entryOverrides[entryId], ...patch },
      },
    }));
  }

  function addEntry(sectionId: string) {
    const id = `entry-${crypto.randomUUID()}`;
    const entry: ContentEntry = {
      id,
      sectionId,
      title: 'New entry',
      subtitle: '',
      date: '',
      location: '',
      description: '',
      bullets: [],
      technologies: [],
      links: [],
    };
    updateProject(p => ({
      ...p,
      library: { ...p.library, entries: [...p.library.entries, entry] },
      variants: p.variants.map(v =>
        v.id === p.activeVariantId
          ? {
              ...v,
              selectedEntryIds: [...v.selectedEntryIds, id],
              sections: v.sections.map(s => (s.id === sectionId ? { ...s, entryIds: [...s.entryIds, id] } : s)),
            }
          : v
      ),
    }));
  }

  function duplicateEntry(entryId: string, sectionId: string) {
    const base = project.library.entries.find(item => item.id === entryId);
    if (!base) return;
    const id = `entry-${crypto.randomUUID()}`;
    const copy = {
      ...structuredClone(base),
      ...structuredClone(active.entryOverrides[entryId] ?? {}),
      id,
    } as ContentEntry;
    const section = active.sections.find(item => item.id === sectionId);
    const index = section?.entryIds.indexOf(entryId) ?? -1;
    updateProject(p => ({
      ...p,
      library: { ...p.library, entries: [...p.library.entries, copy] },
      variants: p.variants.map(v =>
        v.id !== p.activeVariantId
          ? v
          : {
              ...v,
              selectedEntryIds: [...v.selectedEntryIds, id],
              entryOverrides: { ...v.entryOverrides, [id]: {} },
              sections: v.sections.map(s =>
                s.id !== sectionId
                  ? s
                  : { ...s, entryIds: [...s.entryIds.slice(0, index + 1), id, ...s.entryIds.slice(index + 1)] }
              ),
            }
      ),
    }));
  }

  function addSection() {
    const id = `custom-${crypto.randomUUID()}`;
    updateVariant(v => ({
      ...v,
      sections: [...v.sections, { id, label: 'New section', entryIds: [], visible: true }],
    }));
  }

  function sectionIsCollapsed(sectionId: string) {
    return collapsedSections[active.id]?.includes(sectionId) ?? true;
  }

  function toggleSection(sectionId: string) {
    setCollapsedSections(current => {
      const ids = current[active.id] ?? active.sections.map(section => section.id);
      return {
        ...current,
        [active.id]: ids.includes(sectionId) ? ids.filter(id => id !== sectionId) : [...ids, sectionId],
      };
    });
  }

  function editSectionDesign(sectionId: string, patch: Partial<SectionDesignSettings>) {
    updateVariant(v => ({
      ...v,
      sections: v.sections.map(section =>
        section.id === sectionId ? { ...section, design: { ...section.design, ...patch } } : section
      ),
    }));
  }

  function reorderSection(index: number, offset: number) {
    updateVariant(v => {
      const sections = [...v.sections];
      const next = index + offset;
      if (next < 0 || next >= sections.length) return v;
      [sections[index], sections[next]] = [sections[next], sections[index]];
      return { ...v, sections };
    });
  }

  function reorderEntry(sectionId: string, entryId: string, offset: number) {
    updateVariant(v => ({
      ...v,
      sections: v.sections.map(s => {
        if (s.id !== sectionId) return s;
        const ids = [...s.entryIds];
        const index = ids.indexOf(entryId);
        const next = index + offset;
        if (index < 0 || next < 0 || next >= ids.length) return s;
        [ids[index], ids[next]] = [ids[next], ids[index]];
        return { ...s, entryIds: ids };
      }),
    }));
  }

  // --- DRAFT CREATION & COPYING ---
  function handleOpenNewDraftModal() {
    setNewDraftType('resume');
    setNewDraftName('');
    setShowNewDraftModal(true);
  }

  function handleCreateNewDraft() {
    const isCv = newDraftType === 'cv';
    const id = `variant-${crypto.randomUUID()}`;
    const templateId: TemplateId = isCv ? 't04-academic-cv' : 't01-simple-ats';
    const presetId: DesignPresetId = isCv ? 'academic' : 'classic-ats';
    const fallbackName = isCv
      ? `Academic CV Draft ${project.variants.filter(v => v.mode === 'cv').length + 1}`
      : `Resume Draft ${project.variants.filter(v => v.mode === 'resume').length + 1}`;
    const name = newDraftName.trim() || fallbackName;

    const sections = isCv
      ? [
          {
            id: 'education',
            label: 'Education',
            entryIds: project.library.entries.filter(e => e.sectionId === 'education').map(e => e.id),
            visible: true,
          },
          {
            id: 'experience',
            label: 'Experience',
            entryIds: project.library.entries.filter(e => e.sectionId === 'experience').map(e => e.id),
            visible: true,
          },
          {
            id: 'projects',
            label: 'Projects',
            entryIds: project.library.entries.filter(e => e.sectionId === 'projects').map(e => e.id),
            visible: true,
          },
          {
            id: 'skills',
            label: 'Skills',
            entryIds: project.library.entries.filter(e => e.sectionId === 'skills').map(e => e.id),
            visible: true,
          },
        ]
      : [
          {
            id: 'skills',
            label: 'Skills',
            entryIds: project.library.entries.filter(e => e.sectionId === 'skills').map(e => e.id),
            visible: true,
          },
          {
            id: 'experience',
            label: 'Experience',
            entryIds: project.library.entries.filter(e => e.sectionId === 'experience').map(e => e.id),
            visible: true,
          },
          {
            id: 'projects',
            label: 'Projects',
            entryIds: project.library.entries.filter(e => e.sectionId === 'projects').map(e => e.id),
            visible: true,
          },
          {
            id: 'education',
            label: 'Education',
            entryIds: project.library.entries.filter(e => e.sectionId === 'education').map(e => e.id),
            visible: true,
          },
        ];

    const selectedEntryIds = sections.flatMap(s => s.entryIds);

    const newVariant: ResumeVariant = {
      id,
      name,
      mode: newDraftType,
      templateId,
      selectedEntryIds,
      sections,
      profileOverrides: {},
      entryOverrides: {},
      design: getDesignPreset(presetId, templateId, newDraftType),
      targetPages: isCv ? 2 : 1,
      maxPages: isCv ? 3 : 1,
    };

    updateProject(p => ({
      ...p,
      variants: [...p.variants, newVariant],
      activeVariantId: id,
    }));
    setShowNewDraftModal(false);
    setMessage(`Created new ${isCv ? 'CV' : 'Resume'} draft: "${name}".`);
  }

  function duplicateDraft(variantId: string) {
    const source = project.variants.find(v => v.id === variantId) ?? active;
    const copy = structuredClone(source);
    copy.id = `variant-${crypto.randomUUID()}`;
    copy.name = `${source.name} (Copy)`;
    copy.entryOverrides = structuredClone(source.entryOverrides);
    copy.profileOverrides = structuredClone(source.profileOverrides);
    copy.design = structuredClone(source.design);
    copy.sections = structuredClone(source.sections);
    copy.selectedEntryIds = [...source.selectedEntryIds];

    const index = project.variants.findIndex(v => v.id === variantId);
    const nextVariants = [...project.variants];
    nextVariants.splice(index + 1, 0, copy);

    updateProject(p => ({
      ...p,
      variants: nextVariants,
      activeVariantId: copy.id,
    }));
    setMessage(`Created duplicate draft: "${copy.name}".`);
  }

  function deleteDraft(variantId: string) {
    if (project.variants.length <= 1) {
      alert('You must keep at least one resume or CV draft.');
      return;
    }
    const target = project.variants.find(v => v.id === variantId);
    if (!target) return;
    if (!window.confirm(`Delete draft "${target.name}"? This cannot be undone.`)) return;

    const nextVariants = project.variants.filter(v => v.id !== variantId);
    const nextActiveId = project.activeVariantId === variantId ? nextVariants[0].id : project.activeVariantId;

    updateProject(p => ({
      ...p,
      variants: nextVariants,
      activeVariantId: nextActiveId,
    }));
    setMessage(`Deleted draft "${target.name}".`);
  }

  const compile = useCallback(async () => {
    const rev = projectRevision.current;
    compileController.current?.abort();
    const controller = new AbortController();
    compileController.current = controller;
    const requestId = ++compileRequestId.current;
    setBusy(true);
    setMessage('Compiling with local pdflatex…');
    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, variantId: active.id }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? 'Compilation failed.');
      }
      const metadata = parseCompileResponseMetadata(response);
      const result = (await response.json()) as { pdfBase64?: unknown };
      const pdfBytes = decodePdfBase64(result.pdfBase64);
      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      if (rev !== projectRevision.current) {
        setMessage('The document changed during compilation. Build a fresh preview.');
        return;
      }
      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl(old => {
        if (old) URL.revokeObjectURL(old);
        return nextUrl;
      });
      setPdfFile(blob);
      setCompiledRevision(rev);
      setPageCount(String(metadata.pageCount));
      setOverflow(metadata.overflow);
      setMessage('PDF compiled and verified locally.');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setMessage(error instanceof Error ? error.message : 'Compilation failed.');
      }
    } finally {
      if (compileRequestId.current === requestId) setBusy(false);
    }
  }, [active.id, project]);

  useEffect(() => {
    if (!ready || !preferences.autoPreview) return;
    const timer = window.setTimeout(() => {
      void compile();
    }, preferences.previewDelayMs);
    return () => window.clearTimeout(timer);
  }, [compile, preferences.autoPreview, preferences.previewDelayMs, ready]);

  function exportPdf() {
    if (!pdfFile || !pdfUrl) return;
    const anchor = document.createElement('a');
    anchor.href = pdfUrl;
    anchor.download = `${
      active.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'resume'
    }.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'resume-studio-backup.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = validateProject(JSON.parse(await file.text()));
      if (
        !window.confirm(
          `Import ${imported.variants.length} draft(s) and ${imported.library.entries.length} content item(s)? This replaces the current project.`
        )
      )
        return;
      compileController.current?.abort();
      projectRevision.current += 1;
      setRevision(projectRevision.current);
      setProject(imported);
      setPdfUrl(old => {
        if (old) URL.revokeObjectURL(old);
        return '';
      });
      setPdfFile(null);
      setPageCount('');
      setOverflow(false);
      setCompiledRevision(-1);
      setMessage('Backup validated and loaded. Saved to local storage.');
    } catch (error) {
      setMessage(`Import rejected: ${error instanceof Error ? error.message : 'invalid backup'}`);
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) || file.size > 3_000_000) {
      setMessage('Choose a PNG, JPEG, or PDF image smaller than 3 MB.');
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read photo.'));
      reader.readAsDataURL(file);
    });
    updateProject(p => ({
      ...p,
      library: { ...p.library, profile: { ...p.library.profile, photoDataUrl: data } },
    }));
    setMessage('Photo stored in your local project.');
  }

  return (
    <main className="app-shell">
      {/* Mobile view switchers */}
      <nav className="mobile-workspace-tabs" aria-label="Workspace view">
        <button
          className={workspacePane === 'editor' ? 'active' : ''}
          onClick={() => setWorkspacePane('editor')}
        >
          Edit draft
        </button>
        <button
          className={workspacePane === 'preview' ? 'active' : ''}
          onClick={() => setWorkspacePane('preview')}
        >
          PDF preview
        </button>
      </nav>

      {/* Main Fluid Workspace */}
      <section
        className={`workspace ${preferences.sidebarCollapsed ? 'library-collapsed' : ''} workspace-${workspacePane}`}
        style={{ '--editor-width': `${editorWidth}px` } as React.CSSProperties}
      >
        {/* =================================================================
            1. FLOWCV-INSPIRED UNIFIED SIDEBAR (NAV & DRAFTS)
            ================================================================= */}
        <aside className="sidebar" aria-label="Resume Studio sidebar">
          {/* Brand & Autosave Status */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span className="brand-mark" aria-hidden="true">
                R
              </span>
              <div className="brand-info">
                <span className="brand-title">Resume Studio</span>
                <span className="brand-badge">
                  <span
                    className={`save-pulse ${saveState === 'saving' ? 'saving' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{saveStateText}</span>
                </span>
              </div>
            </div>
            <button
              className="sidebar-collapse-btn"
              title={preferences.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={preferences.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setPreferences(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))}
            >
              {preferences.sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Sidebar Body */}
          <div className="sidebar-body">
            {/* Drafts & Documents Section */}
            <div>
              <div className="sidebar-section-head">
                <span className="sidebar-section-title">Resumes & CVs</span>
                <button
                  type="button"
                  className="new-draft-btn"
                  title="Create new resume or CV draft"
                  onClick={handleOpenNewDraftModal}
                >
                  <Plus size={13} />
                  <span>New Draft</span>
                </button>
              </div>

              <div className="drafts-list" role="list">
                {project.variants.map(variant => {
                  const isSelected = variant.id === active.id;
                  const isCv = variant.mode === 'cv';
                  const templateName = templates.find(t => t.id === variant.templateId)?.name ?? 'Template';
                  return (
                    <div
                      key={variant.id}
                      className={`draft-item ${isSelected ? 'active' : ''}`}
                      role="listitem"
                    >
                      <button
                        type="button"
                        className="draft-main"
                        onClick={() => {
                          updateProject(p => ({ ...p, activeVariantId: variant.id }));
                          setPdfFile(null);
                        }}
                      >
                        <span
                          className={`draft-mode-tag ${isCv ? 'cv' : 'resume'}`}
                          title={isCv ? 'Curriculum Vitae' : 'Resume'}
                        >
                          {isCv ? 'CV' : 'RESUME'}
                        </span>
                        <div className="draft-info">
                          <div className="draft-title" title={variant.name}>
                            {variant.name}
                          </div>
                          <div className="draft-subtitle">
                            <span>{variant.targetPages} pg</span>
                            <span>·</span>
                            <span>{templateName}</span>
                          </div>
                        </div>
                      </button>

                      <div className="draft-actions">
                        <button
                          type="button"
                          className="draft-action-btn"
                          title="Duplicate / Create copy of this draft"
                          aria-label={`Duplicate ${variant.name}`}
                          onClick={() => duplicateDraft(variant.id)}
                        >
                          <Copy size={13} />
                        </button>
                        {project.variants.length > 1 && (
                          <button
                            type="button"
                            className="draft-action-btn delete"
                            title="Delete this draft"
                            aria-label={`Delete ${variant.name}`}
                            onClick={() => deleteDraft(variant.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Editor Mode Nav Buttons */}
            <div>
              <div className="sidebar-section-head">
                <span className="sidebar-section-title">Editor Mode</span>
              </div>
              <div className="sidebar-nav">
                <button
                  type="button"
                  className={`sidebar-nav-btn ${activePane === 'editor' ? 'active' : ''}`}
                  onClick={() => setActivePane('editor')}
                >
                  <FileText size={16} />
                  <span>Content & Sections</span>
                </button>
                <button
                  type="button"
                  className={`sidebar-nav-btn ${activePane === 'design' ? 'active' : ''}`}
                  onClick={() => setActivePane('design')}
                >
                  <Sliders size={16} />
                  <span>Design & Typography</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Footer (Utility Dock) */}
          <div className="sidebar-footer">
            {/* Theme Toggle */}
            <div className="theme-switcher" role="radiogroup" aria-label="Color theme">
              <button
                type="button"
                className={`theme-tab-btn ${preferences.theme === 'light' ? 'active' : ''}`}
                onClick={() => setPreferences(p => ({ ...p, theme: 'light' }))}
                title="Light mode"
                aria-label="Light mode"
              >
                <Sun size={13} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-tab-btn ${preferences.theme === 'dark' ? 'active' : ''}`}
                onClick={() => setPreferences(p => ({ ...p, theme: 'dark' }))}
                title="Dark mode"
                aria-label="Dark mode"
              >
                <Moon size={13} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                className={`theme-tab-btn ${preferences.theme === 'system' ? 'active' : ''}`}
                onClick={() => setPreferences(p => ({ ...p, theme: 'system' }))}
                title="System theme"
                aria-label="System theme"
              >
                <Monitor size={13} />
                <span>Sys</span>
              </button>
            </div>

            {/* Backup actions */}
            <div className="sidebar-footer-actions">
              <Button
                variant="outline"
                size="sm"
                className="button secondary"
                onClick={exportBackup}
                title="Export JSON backup of all drafts and master content"
              >
                <Download size={13} />
                <span>Export Backup</span>
              </Button>
              <label
                className="button secondary file-button"
                title="Import JSON backup file"
              >
                <Upload size={13} />
                <span>Import</span>
                <input type="file" accept="application/json,.json" onChange={importBackup} />
              </label>
            </div>

            {/* Local Engine Status */}
            <div className="engine-status">
              <span className="engine-status-dot" aria-hidden="true" />
              <span>Local TeX Live pdflatex</span>
            </div>
          </div>
        </aside>

        {/* =================================================================
            2. CENTER FLUID EDITOR COLUMN
            ================================================================= */}
        <section className="editor-column" aria-label="Document editor">
          {/* Editor Header */}
          <div className="editor-header">
            <div className="editor-header-main">
              <div className="editor-breadcrumb">
                <span>{active.mode === 'cv' ? 'Curriculum Vitae' : 'Resume'}</span>
                <span>·</span>
                <span>
                  {active.targetPages} {active.targetPages === 1 ? 'Page Target' : 'Pages Target'}
                </span>
              </div>
              <input
                className="editor-title-input"
                value={active.name}
                aria-label="Draft name"
                placeholder="Name your resume draft"
                onChange={e => updateVariant(v => ({ ...v, name: e.target.value }))}
              />
            </div>

            <div className="editor-mode-tabs" role="tablist" aria-label="Editor tabs">
              <button
                role="tab"
                aria-selected={activePane === 'editor'}
                className={`editor-mode-tab ${activePane === 'editor' ? 'active' : ''}`}
                onClick={() => setActivePane('editor')}
              >
                <FileText size={14} />
                <span>Content</span>
              </button>
              <button
                role="tab"
                aria-selected={activePane === 'design'}
                className={`editor-mode-tab ${activePane === 'design' ? 'active' : ''}`}
                onClick={() => setActivePane('design')}
              >
                <Sliders size={14} />
                <span>Design</span>
              </button>
            </div>
          </div>

          {/* Editor Content Area */}
          {activePane === 'editor' ? (
            <div className="editor-content">
              {/* Profile Card */}
              <Card className="form-card gap-0">
                <CardHeader className="card-title p-0">
                  <div className="card-title-left">
                    <span className="step">01</span>
                    <CardTitle className="card-heading">Profile & Contact</CardTitle>
                  </div>
                  <div className="profile-header-actions">
                    <Button
                      variant="link"
                      className="text-button"
                      onClick={() =>
                        updateVariant(v => ({
                          ...v,
                          profileOverrides: Object.keys(v.profileOverrides).length
                            ? {}
                            : structuredClone(project.library.profile),
                        }))
                      }
                    >
                      {Object.keys(active.profileOverrides).length
                        ? 'Using custom overrides'
                        : 'Using master profile'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="section-collapse"
                      aria-label={profileCollapsed ? 'Expand profile' : 'Collapse profile'}
                      aria-expanded={!profileCollapsed}
                      onClick={() => setProfileCollapsed(value => !value)}
                    >
                      {profileCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </Button>
                  </div>
                </CardHeader>

                {!profileCollapsed && (
                  <CardContent className="p-0">
                    <div className="field-grid">
                      {(['name', 'title', 'email', 'phone', 'location'] as const).map(field => (
                        <label key={field} className={field === 'location' ? 'wide' : ''}>
                          <span>
                            {field === 'title'
                              ? 'Professional title'
                              : field[0].toUpperCase() + field.slice(1)}
                          </span>
                          <Input
                            value={active.profileOverrides[field] ?? project.library.profile[field]}
                            onChange={e => editProfile(field, e.target.value)}
                            placeholder={`Add ${field}`}
                          />
                        </label>
                      ))}

                      {/* Links */}
                      <div className="wide profile-links">
                        <span>Contact & Social Links</span>
                        {(active.profileOverrides.links ?? project.library.profile.links).map(
                          (link, index) => {
                            const Icon =
                              link.type === 'linkedin'
                                ? Linkedin
                                : link.type === 'github'
                                ? Github
                                : link.type === 'portfolio'
                                ? BriefcaseBusiness
                                : link.type === 'other'
                                ? LinkIcon
                                : Globe;
                            return (
                              <div
                                className="typed-link-row"
                                key={`${index}-${link.type}-${link.label}`}
                              >
                                <label>
                                  <span>Type</span>
                                  <NativeSelect
                                    size="default"
                                    aria-label="Link type"
                                    value={link.type}
                                    onChange={e => {
                                      const links = [
                                        ...(active.profileOverrides.links ?? project.library.profile.links),
                                      ];
                                      links[index] = {
                                        ...links[index],
                                        type: e.target.value as ContactLinkType,
                                      };
                                      editProfileLinks(links);
                                    }}
                                  >
                                    {contactTypes.map(item => (
                                      <NativeSelectOption key={item.id} value={item.id}>
                                        {item.label}
                                      </NativeSelectOption>
                                    ))}
                                  </NativeSelect>
                                </label>
                                <span className="link-type-icon" aria-hidden="true">
                                  <Icon size={18} />
                                </span>
                                <Input
                                  aria-label="Link label"
                                  value={link.label}
                                  onChange={e => {
                                    const links = [
                                      ...(active.profileOverrides.links ?? project.library.profile.links),
                                    ];
                                    links[index] = { ...links[index], label: e.target.value };
                                    editProfileLinks(links);
                                  }}
                                  placeholder="Label (e.g. GitHub)"
                                />
                                <Input
                                  aria-label="Link URL"
                                  value={link.url}
                                  onChange={e => {
                                    const links = [
                                      ...(active.profileOverrides.links ?? project.library.profile.links),
                                    ];
                                    links[index] = { ...links[index], url: e.target.value };
                                    editProfileLinks(links);
                                  }}
                                  placeholder="https://github.com/..."
                                />
                                <button
                                  type="button"
                                  title="Remove link"
                                  aria-label="Remove link"
                                  onClick={() =>
                                    editProfileLinks(
                                      (
                                        active.profileOverrides.links ?? project.library.profile.links
                                      ).filter((_, i) => i !== index)
                                    )
                                  }
                                >
                                  ×
                                </button>
                              </div>
                            );
                          }
                        )}
                        <Button
                          variant="link"
                          className="text-button"
                          onClick={() =>
                            editProfileLinks([
                              ...(active.profileOverrides.links ?? project.library.profile.links),
                              { type: 'website', label: 'Website', url: 'https://' },
                            ])
                          }
                        >
                          ＋ Add contact link
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Sections List */}
              <div className="section-list">
                {active.sections.map((section, index) => {
                  const collapsed = sectionIsCollapsed(section.id);
                  return (
                    <Card
                      className={`form-card section-card gap-0 ${collapsed ? 'is-collapsed' : ''}`}
                      key={section.id}
                    >
                      <CardHeader className="card-title section-card-title p-0">
                        <div className="section-heading-group">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="section-collapse"
                            aria-label={collapsed ? `Expand ${section.label}` : `Collapse ${section.label}`}
                            aria-expanded={!collapsed}
                            onClick={() => toggleSection(section.id)}
                          >
                            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          </Button>
                          <span className="step">{String(index + 2).padStart(2, '0')}</span>
                          <Input
                            className="section-name"
                            value={section.label}
                            onChange={e =>
                              updateVariant(v => ({
                                ...v,
                                sections: v.sections.map(s =>
                                  s.id === section.id ? { ...s, label: e.target.value } : s
                                ),
                              }))
                            }
                          />
                        </div>

                        <div className="section-actions">
                          <button
                            type="button"
                            title="Move section up"
                            aria-label={`Move ${section.label} up`}
                            onClick={() => reorderSection(index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            title="Move section down"
                            aria-label={`Move ${section.label} down`}
                            onClick={() => reorderSection(index, 1)}
                          >
                            ↓
                          </button>
                          <label className="toggle">
                            <Switch
                              checked={section.visible}
                              onCheckedChange={checked =>
                                updateVariant(v => ({
                                  ...v,
                                  sections: v.sections.map(s =>
                                    s.id === section.id ? { ...s, visible: checked } : s
                                  ),
                                }))
                              }
                            />
                            <span>Visible</span>
                          </label>
                        </div>
                      </CardHeader>

                      {!collapsed && (
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
                                  value={section.design?.fontSizePt ?? active.design.fontSize}
                                  onChange={e =>
                                    editSectionDesign(section.id, {
                                      fontSizePt: Math.max(
                                        8,
                                        Math.min(24, Number(e.target.value) || active.design.fontSize)
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
                                    editSectionDesign(section.id, {
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
                                    editSectionDesign(section.id, {
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
                                    editSectionDesign(section.id, {
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
                                    editSectionDesign(section.id, {
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
                                    editSectionDesign(section.id, {
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
                                    editSectionDesign(section.id, {
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
                                  value={section.design?.dividerWeightPt ?? active.design.dividerWeightPt}
                                  onChange={e =>
                                    editSectionDesign(section.id, {
                                      dividerWeightPt: Math.max(
                                        0.1,
                                        Math.min(3, Number(e.target.value) || active.design.dividerWeightPt)
                                      ),
                                    })
                                  }
                                />
                              </label>
                              <label className="setting-toggle">
                                <span>Divider under heading</span>
                                <Switch
                                  checked={section.design?.showDivider ?? active.design.showDividers}
                                  onCheckedChange={checked =>
                                    editSectionDesign(section.id, { showDivider: checked })
                                  }
                                />
                              </label>
                            </div>
                          </details>

                          {/* Entries */}
                          {section.entryIds.map((entryId, entryIndex) => {
                            const master = selectedEntries.get(entryId);
                            if (!master) return null;
                            const entry = { ...master, ...active.entryOverrides[entryId] };
                            return (
                              <div className="entry-editor" key={entryId}>
                                <div className="entry-title-row">
                                  <Input
                                    value={entry.title}
                                    aria-label="Entry title"
                                    onChange={e => editEntry(entryId, { title: e.target.value })}
                                    placeholder="Entry title (e.g. Senior Frontend Engineer)"
                                  />
                                  <span>
                                    <button
                                      type="button"
                                      title="Move entry up"
                                      onClick={() => reorderEntry(section.id, entryId, -1)}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      title="Move entry down"
                                      onClick={() => reorderEntry(section.id, entryId, 1)}
                                    >
                                      ↓
                                    </button>
                                    <button
                                      type="button"
                                      title="Duplicate entry"
                                      onClick={() => duplicateEntry(entryId, section.id)}
                                    >
                                      ⧉
                                    </button>
                                    <button
                                      type="button"
                                      title="Remove from this draft"
                                      onClick={() =>
                                        updateVariant(v => ({
                                          ...v,
                                          selectedEntryIds: v.selectedEntryIds.filter(id => id !== entryId),
                                          sections: v.sections.map(s => ({
                                            ...s,
                                            entryIds: s.entryIds.filter(id => id !== entryId),
                                          })),
                                        }))
                                      }
                                    >
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
                                      onChange={e => editEntry(entryId, { subtitle: e.target.value })}
                                    />
                                  </label>
                                  <label>
                                    <span>Date</span>
                                    <Input
                                      value={entry.date}
                                      placeholder="e.g. 2023 – Present"
                                      onChange={e => editEntry(entryId, { date: e.target.value })}
                                    />
                                  </label>
                                  <label>
                                    <span>Location</span>
                                    <Input
                                      value={entry.location}
                                      placeholder="e.g. Remote or City, Country"
                                      onChange={e => editEntry(entryId, { location: e.target.value })}
                                    />
                                  </label>
                                  <label className="wide">
                                    <span>Description</span>
                                    <Textarea
                                      rows={2}
                                      value={entry.description}
                                      placeholder="Summary or context"
                                      onChange={e => editEntry(entryId, { description: e.target.value })}
                                    />
                                  </label>
                                  <label className="wide">
                                    <span>Bullet points · one per line</span>
                                    <Textarea
                                      rows={3}
                                      value={entry.bullets.join('\n')}
                                      placeholder="Key accomplishment&#10;Quantifiable impact or project detail"
                                      onChange={e => editEntry(entryId, { bullets: e.target.value.split('\n') })}
                                    />
                                  </label>
                                  <label className="wide">
                                    <span>Technologies · comma separated</span>
                                    <Input
                                      value={entry.technologies.join(', ')}
                                      placeholder="React, TypeScript, Node.js"
                                      onChange={e =>
                                        editEntry(entryId, {
                                          technologies: e.target.value
                                            .split(',')
                                            .map(x => x.trim())
                                            .filter(Boolean),
                                        })
                                      }
                                    />
                                  </label>
                                </div>
                                {entryIndex < section.entryIds.length - 1 && <div className="entry-divider" />}
                              </div>
                            );
                          })}

                          {project.library.entries
                            .filter(
                              entry =>
                                entry.sectionId === section.id && !active.selectedEntryIds.includes(entry.id)
                            )
                            .map(entry => (
                              <Button
                                key={entry.id}
                                variant="link"
                                className="text-button restore-entry"
                                onClick={() =>
                                  updateVariant(v => ({
                                    ...v,
                                    selectedEntryIds: [...v.selectedEntryIds, entry.id],
                                    sections: v.sections.map(s =>
                                      s.id === section.id ? { ...s, entryIds: [...s.entryIds, entry.id] } : s
                                    ),
                                  }))
                                }
                              >
                                ＋ Restore {entry.title}
                              </Button>
                            ))}
                          <Button
                            variant="link"
                            className="text-button add-entry"
                            onClick={() => addEntry(section.id)}
                          >
                            ＋ Add entry to {section.label}
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}

                <Button variant="outline" className="add-section" onClick={addSection}>
                  ＋ Add Custom Section
                </Button>
              </div>
            </div>
          ) : (
            /* Design Tab */
            <div className={`editor-content design-content ${designMode}`}>
              <div className="design-mode-tabs" role="tablist" aria-label="Design controls">
                <button
                  role="tab"
                  aria-selected={designMode === 'quick'}
                  className={designMode === 'quick' ? 'active' : ''}
                  onClick={() => setDesignMode('quick')}
                >
                  Quick Settings
                </button>
                <button
                  role="tab"
                  aria-selected={designMode === 'advanced'}
                  className={designMode === 'advanced' ? 'active' : ''}
                  onClick={() => setDesignMode('advanced')}
                >
                  Advanced Spacing
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    updateVariant(v => ({
                      ...v,
                      design: getDesignPreset(
                        v.templateId === 't04-academic-cv'
                          ? 'academic'
                          : v.templateId === 't02-clean-compact'
                          ? 'compact'
                          : v.templateId === 't03-modern-developer'
                          ? 'developer-accent'
                          : 'classic-ats',
                        v.templateId,
                        v.mode
                      ),
                    }))
                  }
                >
                  Reset to Template Default
                </button>
              </div>

              {/* Design Presets */}
              <div className="preset-grid">
                {designPresets.map(preset => (
                  <button
                    type="button"
                    className="preset-button"
                    key={preset.id}
                    onClick={() =>
                      updateVariant(v => ({
                        ...v,
                        design: getDesignPreset(preset.id as DesignPresetId, v.templateId, v.mode),
                      }))
                    }
                  >
                    <strong>{preset.label}</strong>
                    <small>{preset.description}</small>
                  </button>
                ))}
              </div>

              {/* Templates Grid */}
              <Card className="form-card gap-0">
                <CardHeader className="card-title p-0">
                  <div className="card-title-left">
                    <span className="step">01</span>
                    <CardTitle className="card-heading">Template Layout</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="template-grid">
                    {templates.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateVariant(v => ({ ...v, templateId: item.id }))}
                        className={`template-card ${item.id === active.templateId ? 'chosen' : ''}`}
                      >
                        <span className="mini-page" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Typography & Page Settings */}
              <Card className="form-card gap-0">
                <CardHeader className="card-title p-0">
                  <div className="card-title-left">
                    <span className="step">02</span>
                    <CardTitle className="card-heading">Page & Typography</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="field-grid">
                    <label>
                      <span>Document Type</span>
                      <NativeSelect
                        value={active.mode}
                        onChange={e =>
                          updateVariant(v => {
                            const mode = e.target.value as 'resume' | 'cv';
                            return {
                              ...v,
                              mode,
                              targetPages: mode === 'cv' ? 2 : 1,
                              maxPages: mode === 'cv' ? 3 : 1,
                            };
                          })
                        }
                      >
                        <NativeSelectOption value="resume">Resume · 1 page default</NativeSelectOption>
                        <NativeSelectOption value="cv">CV · 2 pages target</NativeSelectOption>
                      </NativeSelect>
                    </label>

                    <label>
                      <span>Paper Size</span>
                      <NativeSelect
                        value={active.design.paper}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: { ...v.design, paper: e.target.value as 'a4' | 'letter' },
                          }))
                        }
                      >
                        <NativeSelectOption value="a4">A4 (Standard International)</NativeSelectOption>
                        <NativeSelectOption value="letter">US Letter</NativeSelectOption>
                      </NativeSelect>
                    </label>

                    <label>
                      <span>Font Family</span>
                      <NativeSelect
                        value={active.design.fontFamily}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: { ...v.design, fontFamily: e.target.value as FontFamily },
                          }))
                        }
                      >
                        <NativeSelectOption value="latin-modern-serif">
                          Latin Modern · Serif (Clean ATS)
                        </NativeSelectOption>
                        <NativeSelectOption value="latin-modern-sans">
                          Latin Modern · Sans
                        </NativeSelectOption>
                        <NativeSelectOption value="tex-gyre-termes">
                          TeX Gyre Termes · Times Roman
                        </NativeSelectOption>
                        <NativeSelectOption value="tex-gyre-heros">
                          TeX Gyre Heros · Helvetica / Arial
                        </NativeSelectOption>
                        <NativeSelectOption value="tex-gyre-pagella">
                          TeX Gyre Pagella · Palatino
                        </NativeSelectOption>
                        <NativeSelectOption value="tex-gyre-schola">
                          TeX Gyre Schola · Schoolbook
                        </NativeSelectOption>
                        <NativeSelectOption value="tex-gyre-cursor">
                          TeX Gyre Cursor · Monospace
                        </NativeSelectOption>
                      </NativeSelect>
                    </label>

                    <label>
                      <span>Font Size · 8–14 pt</span>
                      <Input
                        type="number"
                        min={8}
                        max={14}
                        step={0.5}
                        value={active.design.fontSize}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              fontSize: Math.max(8, Math.min(14, Number(e.target.value) || 10)),
                            },
                          }))
                        }
                      />
                    </label>

                    {(
                      [
                        ['marginTopMm', 'Top margin · mm'],
                        ['marginRightMm', 'Right margin · mm'],
                        ['marginBottomMm', 'Bottom margin · mm'],
                        ['marginLeftMm', 'Left margin · mm'],
                      ] as const
                    ).map(([field, label]) => (
                      <label key={field}>
                        <span>{label}</span>
                        <Input
                          type="number"
                          min={8}
                          max={40}
                          value={active.design[field]}
                          onChange={e =>
                            updateVariant(v => ({
                              ...v,
                              design: {
                                ...v.design,
                                [field]: Math.max(8, Math.min(40, Number(e.target.value) || 18)),
                              },
                            }))
                          }
                        />
                      </label>
                    ))}

                    <label>
                      <span>Accent Color</span>
                      <Input
                        className="color-input"
                        type="color"
                        value={active.design.accentColor}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: { ...v.design, accentColor: e.target.value },
                          }))
                        }
                      />
                    </label>

                    <label className="advanced-only">
                      <span>Text Color</span>
                      <Input
                        className="color-input"
                        type="color"
                        value={active.design.textColor}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: { ...v.design, textColor: e.target.value },
                          }))
                        }
                      />
                    </label>

                    <label className="advanced-only">
                      <span>Line Spacing</span>
                      <Input
                        type="number"
                        min={0.9}
                        max={1.5}
                        step={0.05}
                        value={active.design.lineSpacing}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              lineSpacing: Math.max(0.9, Math.min(1.5, Number(e.target.value) || 1)),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Layout & Contact Toggles */}
              <Card className="form-card gap-0 advanced-card">
                <CardHeader className="card-title p-0">
                  <div className="card-title-left">
                    <span className="step">03</span>
                    <CardTitle className="card-heading">Layout & Contact Visibility</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="field-grid">
                    <label>
                      <span>Date Alignment</span>
                      <NativeSelect
                        value={active.design.dateAlignment}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              dateAlignment: e.target.value as 'right' | 'below',
                            },
                          }))
                        }
                      >
                        <NativeSelectOption value="right">Align to the right</NativeSelectOption>
                        <NativeSelectOption value="below">Place on a new line</NativeSelectOption>
                      </NativeSelect>
                    </label>

                    <label>
                      <span>Bullet Spacing · 0–8 pt</span>
                      <Input
                        type="number"
                        min={0}
                        max={8}
                        step={0.5}
                        value={active.design.bulletSpacing}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              bulletSpacing: Math.max(0, Math.min(8, Number(e.target.value) || 0)),
                            },
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>Section Spacing · pt</span>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        value={active.design.sectionGapPt}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              sectionGapPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                            },
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>Entry Spacing · pt</span>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        value={active.design.entryGapPt}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              entryGapPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                            },
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>Bullet Indent · mm</span>
                      <Input
                        type="number"
                        min={2}
                        max={16}
                        step={0.2}
                        value={active.design.bulletIndentMm}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              bulletIndentMm: Math.max(2, Math.min(16, Number(e.target.value) || 4.4)),
                            },
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>Divider Weight · pt</span>
                      <Input
                        type="number"
                        min={0.1}
                        max={3}
                        step={0.1}
                        value={active.design.dividerWeightPt}
                        onChange={e =>
                          updateVariant(v => ({
                            ...v,
                            design: {
                              ...v.design,
                              dividerWeightPt: Math.max(0.1, Math.min(3, Number(e.target.value) || 0.45)),
                            },
                          }))
                        }
                      />
                    </label>

                    {(
                      [
                        ['showEmail', 'Show Email'],
                        ['showPhone', 'Show Phone'],
                        ['showLocation', 'Show Location'],
                        ['showLinks', 'Show Links'],
                        ['pageNumbers', 'Page Numbers'],
                        ['showDividers', 'Section Divider Lines'],
                        ['showContactIcons', 'Contact Icons'],
                      ] as const
                    ).map(([field, label]) => (
                      <label className="setting-toggle" key={field}>
                        <span>{label}</span>
                        <Switch
                          checked={active.design[field]}
                          onCheckedChange={checked =>
                            updateVariant(v => ({ ...v, design: { ...v.design, [field]: checked } }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Optional Portrait Card */}
              <Card className="form-card gap-0 advanced-card">
                <CardHeader className="card-title p-0">
                  <div className="card-title-left">
                    <span className="step">04</span>
                    <CardTitle className="card-heading">Optional Portrait (Profile CV)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="helper">
                    Stored securely in your local browser storage. PNG, JPEG, or PDF under 3 MB.
                  </p>
                  <div className="photo-actions">
                    <label className="button secondary file-button">
                      Choose Photo
                      <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={uploadPhoto} />
                    </label>
                    {project.library.profile.photoDataUrl && (
                      <Button
                        variant="link"
                        className="text-button"
                        onClick={() =>
                          updateProject(p => {
                            const profile = { ...p.library.profile };
                            delete profile.photoDataUrl;
                            return { ...p, library: { ...p.library, profile } };
                          })
                        }
                      >
                        Remove portrait
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* Resizable Divider Handle */}
        <div
          className="workspace-divider"
          role="separator"
          aria-label="Resize editor and PDF preview"
          aria-orientation="vertical"
          aria-valuemin={380}
          aria-valuemax={900}
          aria-valuenow={editorWidth}
          tabIndex={0}
          onPointerDown={event => {
            dragX.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            if (dragX.current === null) return;
            const delta = event.clientX - dragX.current;
            dragX.current = event.clientX;
            setEditorWidth(width => Math.max(380, Math.min(900, width + delta)));
          }}
          onPointerUp={() => {
            dragX.current = null;
          }}
          onPointerCancel={() => {
            dragX.current = null;
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              setEditorWidth(width => Math.max(380, width - (event.shiftKey ? 48 : 16)));
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              setEditorWidth(width => Math.min(900, width + (event.shiftKey ? 48 : 16)));
            }
          }}
        />

        {/* =================================================================
            3. RIGHT FLUID PDF PREVIEW COLUMN
            ================================================================= */}
        <section className="preview-column" aria-label="PDF preview and export">
          {/* Preview Toolbar */}
          <div className="preview-toolbar">
            <div className="preview-status">
              <div className="preview-status-top">
                <strong>{active.name}</strong>
                {pageCount && (
                  <span className={`page-badge ${overflow ? 'overflow' : ''}`}>
                    {pageCount} {pageCount === '1' ? 'Page' : 'Pages'}
                    {overflow ? ' · Over Limit' : ' · Verified'}
                  </span>
                )}
              </div>
              <div className="preview-settings">
                <label>
                  <Switch
                    checked={preferences.autoPreview}
                    onCheckedChange={checked => setPreferences(p => ({ ...p, autoPreview: checked }))}
                  />
                  <span>Auto preview</span>
                </label>
                <label>
                  <span>Wait</span>
                  <select
                    aria-label="Preview delay"
                    value={preferences.previewDelayMs}
                    onChange={e => setPreferences(p => ({ ...p, previewDelayMs: Number(e.target.value) }))}
                  >
                    <option value={500}>0.5 sec</option>
                    <option value={800}>0.8 sec</option>
                    <option value={1200}>1.2 sec</option>
                    <option value={1600}>1.6 sec</option>
                    <option value={2000}>2.0 sec</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="preview-actions">
              <Button
                variant="outline"
                className="button secondary"
                onClick={compile}
                disabled={busy}
                title="Compile with local pdflatex"
              >
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                <span>{busy ? 'Compiling…' : 'Recompile'}</span>
              </Button>

              <Button
                className="button primary"
                disabled={!pdfFile || compiledRevision !== revision}
                onClick={exportPdf}
                title="Download verified PDF compiled with pdflatex"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </Button>
            </div>
          </div>

          {/* Overflow Alert */}
          {overflow && (
            <Alert className="warning">
              <AlertTitle>Target page limit exceeded</AlertTitle>
              <AlertDescription>
                This draft exceeds its {active.targetPages}-page limit. All content is preserved in the
                compiled PDF. Adjust font size, margins, or entry bullets to fit.
              </AlertDescription>
            </Alert>
          )}

          {/* Status Message */}
          {message && (
            <div
              className={`status-message ${
                ['failed', 'rejected', 'error', 'not found'].some(token => message.toLowerCase().includes(token))
                  ? 'error'
                  : ''
              }`}
            >
              {message}
            </div>
          )}

          {/* PDF Paper Viewer Area */}
          <div className="paper-area">
            {pdfUrl ? (
              <CompiledPdfViewer
                key={pdfUrl}
                src={pdfUrl}
                expectedPageCount={pageCount ? Number(pageCount) : null}
                overflow={overflow}
                onPageCountChange={pages => setPageCount(String(pages))}
              />
            ) : (
              <div className="empty-preview">
                <div className="paper-illustration" aria-hidden="true">
                  <strong>{project.library.profile.name || 'Your Name'}</strong>
                  <span>{project.library.profile.title || 'Professional Title'}</span>
                  <i />
                  <b>EXPERIENCE</b>
                  <i />
                  <i />
                  <b>PROJECTS</b>
                  <i />
                </div>
                <h2>Ready when you are</h2>
                <p>Click below to compile this draft with your local TeX Live installation.</p>
                <Button className="button primary" onClick={compile} disabled={busy}>
                  <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                  <span>{busy ? 'Compiling…' : 'Build Preview'}</span>
                </Button>
              </div>
            )}
          </div>

          <div className="preview-footer">
            <span>● Compiled locally with TeX Live pdflatex</span>
            <span className="footer-spacer" />
            <span>
              {active.design.paper.toUpperCase()} · {active.design.fontSize} pt
            </span>
          </div>
        </section>
      </section>

      {/* =================================================================
          NEW DRAFT MODAL / DIALOG
          ================================================================= */}
      {showNewDraftModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-draft-modal-title"
        >
          <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 id="new-draft-modal-title" className="text-lg font-bold">
                Create New Draft
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                onClick={() => setShowNewDraftModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-muted-foreground -mt-3">
              Choose whether to create a compact 1-page Software Resume or a longer Academic/Professional
              CV. Your master profile and entries stay safely shared.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewDraftType('resume')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                  newDraftType === 'resume'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border bg-card/50 hover:bg-muted/50'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  1-Page Resume
                </span>
                <span className="text-sm font-semibold">Software Developer</span>
                <span className="text-xs text-muted-foreground">
                  Compact ATS layout · Centered header · Skills & Projects
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNewDraftType('cv')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                  newDraftType === 'cv'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border bg-card/50 hover:bg-muted/50'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
                  2-Page CV
                </span>
                <span className="text-sm font-semibold">Academic / Professional</span>
                <span className="text-xs text-muted-foreground">
                  Roomy academic rhythm · Education & Experience first
                </span>
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Draft Name</span>
              <Input
                placeholder={
                  newDraftType === 'resume' ? 'e.g. Senior Frontend Resume' : 'e.g. Research & Teaching CV'
                }
                value={newDraftName}
                onChange={e => setNewDraftName(e.target.value)}
                autoFocus
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="button secondary"
                onClick={() => setShowNewDraftModal(false)}
              >
                Cancel
              </Button>
              <Button className="button primary" onClick={handleCreateNewDraft}>
                <Plus size={14} />
                <span>Create Draft</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
