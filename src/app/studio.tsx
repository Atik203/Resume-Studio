'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ContactLink, ContactLinkType, ContentEntry, FontFamily, ProjectData, ResumeVariant, SectionDesignSettings, TemplateId, validateProject } from '@/lib/data';
import { fixtureProject } from '@/lib/fixture';
import { loadProject, saveProject } from '@/lib/storage';
import { decodePdfBase64, parseCompileResponseMetadata } from '@/lib/compile-response';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { defaultUiPreferences, loadUiPreferences, saveUiPreferences, type UiPreferences } from '@/lib/ui-preferences';
import { BriefcaseBusiness, ChevronDown, ChevronRight, Github, Globe, Linkedin, Link as LinkIcon } from 'lucide-react';
import { designPresets, getDesignPreset, type DesignPresetId } from '@/lib/design-presets';

const templates: { id: TemplateId; name: string }[] = [
  { id: 't01-simple-ats', name: 'Simple ATS' }, { id: 't02-clean-compact', name: 'Clean Compact' },
  { id: 't03-modern-developer', name: 'Modern Developer' }, { id: 't04-academic-cv', name: 'Academic CV' }, { id: 't05-profile-cv', name: 'Profile CV' },
];
const contactTypes: { id: ContactLinkType; label: string }[] = [
  { id: 'website', label: 'Website' }, { id: 'linkedin', label: 'LinkedIn' }, { id: 'github', label: 'GitHub' }, { id: 'portfolio', label: 'Portfolio' }, { id: 'other', label: 'Other' },
];

const CompiledPdfViewer = dynamic(() => import('@/components/pdf/compiled-pdf-viewer'), {
  ssr: false,
  loading: () => <div className="pdf-viewer-state">Loading local PDF viewer…</div>,
});

export default function Studio() {
  const [project, setProject] = useState<ProjectData>(() => structuredClone(fixtureProject));
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState('Loading local library…');
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
  const dragX = useRef<number | null>(null);
  const active = project.variants.find(v => v.id === project.activeVariantId) ?? project.variants[0];

  useEffect(() => {
    Promise.resolve().then(() => {
      setPreferences(loadUiPreferences());
      return loadProject();
    }).then(saved => { if (saved) setProject(validateProject(saved)); }).catch(err => setMessage(`Local storage could not be opened: ${err instanceof Error ? err.message : 'unknown error'}`)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveUiPreferences(preferences);
    const root = document.documentElement;
    const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    if (preferences.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => { root.classList.toggle('dark', media.matches); root.style.colorScheme = media.matches ? 'dark' : 'light'; };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [preferences, ready]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setSaveState('Saving…');
      saveProject(project).then(() => setSaveState('Saved locally')).catch(err => setSaveState(`Save failed: ${err instanceof Error ? err.message : 'unknown error'}`));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project, ready]);

  const updateProject = useCallback((updater: (current: ProjectData) => ProjectData) => {
    compileController.current?.abort();
    projectRevision.current += 1;
    setRevision(projectRevision.current);
    setPdfFile(null); setPageCount(''); setOverflow(false);
    setProject(current => updater(structuredClone(current)));
  }, []);
  const updateVariant = useCallback((updater: (variant: ResumeVariant) => ResumeVariant) => updateProject(p => ({ ...p, variants: p.variants.map(v => v.id === p.activeVariantId ? updater(v) : v) })), [updateProject]);
  const selectedEntries = useMemo(() => new Map(project.library.entries.map(entry => [entry.id, entry])), [project.library.entries]);

  function editProfile(field: 'name' | 'title' | 'email' | 'phone' | 'location', value: string) {
    if (Object.keys(active.profileOverrides).length) updateVariant(v => ({ ...v, profileOverrides: { ...v.profileOverrides, [field]: value } }));
    else updateProject(p => ({ ...p, library: { ...p.library, profile: { ...p.library.profile, [field]: value } } }));
  }
  function editProfileLinks(links: ContactLink[]) {
    if (Object.keys(active.profileOverrides).length) updateVariant(v => ({ ...v, profileOverrides: { ...v.profileOverrides, links } }));
    else updateProject(p => ({ ...p, library: { ...p.library, profile: { ...p.library.profile, links } } }));
  }
  function editEntry(entryId: string, patch: Partial<ContentEntry>) {
    updateVariant(v => ({ ...v, entryOverrides: { ...v.entryOverrides, [entryId]: { ...v.entryOverrides[entryId], ...patch } } }));
  }
  function addEntry(sectionId: string) {
    const id = `entry-${crypto.randomUUID()}`;
    const entry: ContentEntry = { id, sectionId, title: 'New entry', subtitle: '', date: '', location: '', description: '', bullets: [], technologies: [], links: [] };
    updateProject(p => ({ ...p, library: { ...p.library, entries: [...p.library.entries, entry] }, variants: p.variants.map(v => v.id === p.activeVariantId ? { ...v, selectedEntryIds: [...v.selectedEntryIds, id], sections: v.sections.map(s => s.id === sectionId ? { ...s, entryIds: [...s.entryIds, id] } : s) } : v) }));
  }
  function duplicateEntry(entryId: string, sectionId: string) {
    const base = project.library.entries.find(item => item.id === entryId);
    if (!base) return;
    const id = `entry-${crypto.randomUUID()}`;
    const copy = { ...structuredClone(base), ...structuredClone(active.entryOverrides[entryId] ?? {}), id } as ContentEntry;
    const section = active.sections.find(item => item.id === sectionId);
    const index = section?.entryIds.indexOf(entryId) ?? -1;
    updateProject(p => ({ ...p, library: { ...p.library, entries: [...p.library.entries, copy] }, variants: p.variants.map(v => v.id !== p.activeVariantId ? v : {
      ...v, selectedEntryIds: [...v.selectedEntryIds, id], entryOverrides: { ...v.entryOverrides, [id]: {} },
      sections: v.sections.map(s => s.id !== sectionId ? s : { ...s, entryIds: [...s.entryIds.slice(0, index + 1), id, ...s.entryIds.slice(index + 1)] }),
    }) }));
  }
  function addSection() {
    const id = `custom-${crypto.randomUUID()}`;
    updateVariant(v => ({ ...v, sections: [...v.sections, { id, label: 'New section', entryIds: [], visible: true }] }));
  }
  function sectionIsCollapsed(sectionId: string) {
    return collapsedSections[active.id]?.includes(sectionId) ?? true;
  }
  function toggleSection(sectionId: string) {
    setCollapsedSections(current => {
      const ids = current[active.id] ?? active.sections.map(section => section.id);
      return { ...current, [active.id]: ids.includes(sectionId) ? ids.filter(id => id !== sectionId) : [...ids, sectionId] };
    });
  }
  function editSectionDesign(sectionId: string, patch: Partial<SectionDesignSettings>) {
    updateVariant(v => ({ ...v, sections: v.sections.map(section => section.id === sectionId ? { ...section, design: { ...section.design, ...patch } } : section) }));
  }
  function reorderSection(index: number, offset: number) {
    updateVariant(v => { const sections = [...v.sections]; const next = index + offset; if (next < 0 || next >= sections.length) return v; [sections[index], sections[next]] = [sections[next], sections[index]]; return { ...v, sections }; });
  }
  function reorderEntry(sectionId: string, entryId: string, offset: number) {
    updateVariant(v => ({ ...v, sections: v.sections.map(s => {
      if (s.id !== sectionId) return s;
      const ids = [...s.entryIds]; const index = ids.indexOf(entryId); const next = index + offset;
      if (index < 0 || next < 0 || next >= ids.length) return s;
      [ids[index], ids[next]] = [ids[next], ids[index]]; return { ...s, entryIds: ids };
    }) }));
  }
  function createVariant() {
    const copy = structuredClone(active);
    copy.id = `variant-${crypto.randomUUID()}`;
    copy.name = `${active.name} Copy`;
    copy.entryOverrides = structuredClone(active.entryOverrides);
    updateProject(p => ({ ...p, variants: [...p.variants, copy], activeVariantId: copy.id }));
  }
  const compile = useCallback(async () => {
    const revision = projectRevision.current;
    compileController.current?.abort();
    const controller = new AbortController();
    compileController.current = controller;
    const requestId = ++compileRequestId.current;
    setBusy(true); setMessage('Compiling with local pdflatex…');
    try {
      const response = await fetch('/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, variantId: active.id }), signal: controller.signal });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error ?? 'Compilation failed.'); }
      const metadata = parseCompileResponseMetadata(response);
      const result = await response.json() as { pdfBase64?: unknown };
      const pdfBytes = decodePdfBase64(result.pdfBase64);
      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      if (revision !== projectRevision.current) { setMessage('The document changed during compilation. Build a fresh preview.'); return; }
      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl(old => { if (old) URL.revokeObjectURL(old); return nextUrl; });
      setPdfFile(blob);
      setCompiledRevision(revision);
      setPageCount(String(metadata.pageCount));
      setOverflow(metadata.overflow);
      setMessage('PDF compiled and verified locally.');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage(error instanceof Error ? error.message : 'Compilation failed.');
    } finally {
      if (compileRequestId.current === requestId) setBusy(false);
    }
  }, [active.id, project]);

  useEffect(() => {
    if (!ready || !preferences.autoPreview) return;
    const timer = window.setTimeout(() => { void compile(); }, preferences.previewDelayMs);
    return () => window.clearTimeout(timer);
  }, [compile, preferences.autoPreview, preferences.previewDelayMs, ready]);
  function exportPdf() {
    if (!pdfFile || !pdfUrl) return;
    const anchor = document.createElement('a'); anchor.href = pdfUrl; anchor.download = `${active.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'resume'}.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'resume-studio-backup.json'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const imported = validateProject(JSON.parse(await file.text()));
      if (!window.confirm(`Import ${imported.variants.length} variant(s) and ${imported.library.entries.length} library item(s)? This replaces the current local project.`)) return;
      compileController.current?.abort(); projectRevision.current += 1; setRevision(projectRevision.current); setProject(imported); setPdfUrl(old => { if (old) URL.revokeObjectURL(old); return ''; }); setPdfFile(null); setPageCount(''); setOverflow(false); setCompiledRevision(-1); setMessage('Backup validated and loaded. It will be saved locally.');
    } catch (error) { setMessage(`Import rejected: ${error instanceof Error ? error.message : 'invalid backup'}`); }
  }
  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) || file.size > 3_000_000) { setMessage('Choose a PNG, JPEG, or PDF image smaller than 3 MB.'); return; }
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read photo.')); reader.readAsDataURL(file); });
    updateProject(p => ({ ...p, library: { ...p.library, profile: { ...p.library.profile, photoDataUrl: data } } })); setMessage('Photo stored in your local project.');
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">R</span><div><strong>Resume Studio</strong></div></div>
      <div className="toolbar"><Badge variant="secondary" className="save-state">{saveState}</Badge><label className="theme-control" aria-label="Color theme"><span>Theme</span><select value={preferences.theme} onChange={e => setPreferences(p => ({ ...p, theme: e.target.value as UiPreferences['theme'] }))}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><Button variant="outline" className="button secondary" onClick={exportBackup}>Export backup</Button><label className="button secondary file-button">Import backup<input type="file" accept="application/json,.json" onChange={importBackup} /></label><Button className="button primary" onClick={compile} disabled={busy}>{busy ? 'Compiling…' : 'Build preview'}</Button></div>
    </header>
    <nav className="mobile-workspace-tabs" aria-label="Workspace view"><button className={workspacePane === 'editor' ? 'active' : ''} onClick={() => setWorkspacePane('editor')}>Edit resume</button><button className={workspacePane === 'preview' ? 'active' : ''} onClick={() => setWorkspacePane('preview')}>PDF preview</button></nav>
    <section className={`workspace ${preferences.sidebarCollapsed ? 'library-collapsed' : ''} workspace-${workspacePane}`} style={{ '--editor-width': `${editorWidth}px` } as React.CSSProperties}>
      <aside className="sidebar">
        <div className="side-heading"><button className="collapse-library" title={preferences.sidebarCollapsed ? 'Expand resume library' : 'Collapse resume library'} aria-label={preferences.sidebarCollapsed ? 'Expand resume library' : 'Collapse resume library'} onClick={() => setPreferences(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))}>{preferences.sidebarCollapsed ? '›' : '‹'}</button><span>RESUME LIBRARY</span><button title="Duplicate variant" aria-label="Duplicate variant" onClick={createVariant}>＋</button></div>
        {project.variants.map(variant => <button className={`variant-item ${variant.id === active.id ? 'selected' : ''}`} key={variant.id} onClick={() => { updateProject(p => ({ ...p, activeVariantId: variant.id })); setPdfFile(null); }}><span className="variant-icon">{variant.mode === 'cv' ? 'CV' : 'R'}</span><span><b>{variant.name}</b><small>{variant.mode === 'cv' ? 'Curriculum vitae' : 'Resume'} · {templates.find(t => t.id === variant.templateId)?.name}</small></span></button>)}
        <div className="side-heading content-heading"><span>CONTENT LIBRARY</span><small>{project.library.entries.length} items</small></div>
        <p className="side-note">Master content stays reusable. Changes made to an entry in this variant are stored as overrides.</p>
        <div className="privacy-note"><span>●</span><p>Your data stays in this browser. PDF compilation runs on this computer using TeX Live.</p></div>
      </aside>
      <section className="editor-column">
        <div className="editor-header"><div><span className="eyebrow">{active.mode === 'cv' ? 'CURRICULUM VITAE' : 'RESUME'} · EDITOR</span><input className="variant-name" value={active.name} aria-label="Variant name" onChange={e => updateVariant(v => ({ ...v, name: e.target.value }))} /></div><div className="tabs"><button className={activePane === 'editor' ? 'active' : ''} onClick={() => setActivePane('editor')}>Content</button><button className={activePane === 'design' ? 'active' : ''} onClick={() => setActivePane('design')}>Design</button></div></div>
        {activePane === 'editor' ? <div className="editor-content">
        <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">01</span><CardTitle>Profile</CardTitle></div><div className="profile-header-actions"><Button variant="link" className="text-button" onClick={() => updateVariant(v => ({ ...v, profileOverrides: Object.keys(v.profileOverrides).length ? {} : structuredClone(project.library.profile) }))}>{Object.keys(active.profileOverrides).length ? 'Use shared profile' : 'Customize for this variant'}</Button><Button variant="ghost" className="section-collapse" aria-label={profileCollapsed ? 'Expand profile section' : 'Collapse profile section'} aria-expanded={!profileCollapsed} onClick={() => setProfileCollapsed(value => !value)}>{profileCollapsed ? <ChevronRight /> : <ChevronDown />}</Button></div></CardHeader>{!profileCollapsed && <CardContent className="p-0"><div className="field-grid">
            {(['name', 'title', 'email', 'phone', 'location'] as const).map(field => <label key={field} className={field === 'location' ? 'wide' : ''}><span>{field === 'title' ? 'Professional title' : field[0].toUpperCase() + field.slice(1)}</span><Input value={active.profileOverrides[field] ?? project.library.profile[field]} onChange={e => editProfile(field, e.target.value)} placeholder={`Add ${field}`} /></label>)}
            <div className="wide profile-links"><span>Links</span>{(active.profileOverrides.links ?? project.library.profile.links).map((link, index) => { const Icon = link.type === 'linkedin' ? Linkedin : link.type === 'github' ? Github : link.type === 'portfolio' ? BriefcaseBusiness : link.type === 'other' ? LinkIcon : Globe; return <div className="profile-link-row typed-link-row" key={`${index}-${link.label}`}><label><span>Type</span><NativeSelect className="w-full" aria-label="Link type" value={link.type} onChange={e => { const links = [...(active.profileOverrides.links ?? project.library.profile.links)]; links[index] = { ...links[index], type: e.target.value as ContactLinkType }; editProfileLinks(links); }}>{contactTypes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</NativeSelect></label><span className="link-type-icon" aria-hidden="true"><Icon size={18} /></span><Input aria-label="Link label" value={link.label} onChange={e => { const links = [...(active.profileOverrides.links ?? project.library.profile.links)]; links[index] = { ...links[index], label: e.target.value }; editProfileLinks(links); }} placeholder="Label" /><Input aria-label="Link URL" value={link.url} onChange={e => { const links = [...(active.profileOverrides.links ?? project.library.profile.links)]; links[index] = { ...links[index], url: e.target.value }; editProfileLinks(links); }} placeholder="https://" /><button title="Remove link" aria-label="Remove link" onClick={() => editProfileLinks((active.profileOverrides.links ?? project.library.profile.links).filter((_, i) => i !== index))}>×</button></div>; })}<Button variant="link" className="text-button" onClick={() => editProfileLinks([...(active.profileOverrides.links ?? project.library.profile.links), { type: 'website', label: 'Website', url: 'https://' }])}>＋ Add link</Button></div>
          </div></CardContent>}</Card>
          <div className="section-list">
            {active.sections.map((section, index) => { const collapsed = sectionIsCollapsed(section.id); return <Card className={`form-card section-card gap-0 ${collapsed ? 'is-collapsed' : ''}`} key={section.id}>
              <CardHeader className="card-title section-card-title p-0"><div className="section-heading-group"><Button variant="ghost" className="section-collapse" aria-label={collapsed ? `Expand ${section.label}` : `Collapse ${section.label}`} aria-expanded={!collapsed} onClick={() => toggleSection(section.id)}>{collapsed ? <ChevronRight /> : <ChevronDown />}</Button><span className="step">{String(index + 2).padStart(2, '0')}</span><Input className="section-name" value={section.label} onChange={e => updateVariant(v => ({ ...v, sections: v.sections.map(s => s.id === section.id ? { ...s, label: e.target.value } : s) }))} /></div><div className="section-actions"><button title="Move section up" aria-label={`Move ${section.label} up`} onClick={() => reorderSection(index, -1)}>↑</button><button title="Move section down" aria-label={`Move ${section.label} down`} onClick={() => reorderSection(index, 1)}>↓</button><label className="toggle"><Switch checked={section.visible} onCheckedChange={checked => updateVariant(v => ({ ...v, sections: v.sections.map(s => s.id === section.id ? { ...s, visible: checked } : s) }))} /><span>Visible</span></label></div></CardHeader>
              {!collapsed && <CardContent className="p-0"><details className="section-design-details"><summary>Section typography, spacing & divider</summary><div className="field-grid section-design-grid">
                <label><span>Section font · pt</span><Input type="number" min={8} max={24} step={0.5} value={section.design?.fontSizePt ?? active.design.fontSize} onChange={e => editSectionDesign(section.id, { fontSizePt: Math.max(8, Math.min(24, Number(e.target.value) || active.design.fontSize)) })} /></label>
                <label><span>Left margin · mm</span><Input type="number" min={0} max={25} step={0.5} value={section.design?.marginLeftMm ?? 0} onChange={e => editSectionDesign(section.id, { marginLeftMm: Math.max(0, Math.min(25, Number(e.target.value) || 0)) })} /></label>
                <label><span>Right margin · mm</span><Input type="number" min={0} max={25} step={0.5} value={section.design?.marginRightMm ?? 0} onChange={e => editSectionDesign(section.id, { marginRightMm: Math.max(0, Math.min(25, Number(e.target.value) || 0)) })} /></label>
                <label><span>Margin above · pt</span><Input type="number" min={0} max={36} step={0.5} value={section.design?.marginTopPt ?? 0} onChange={e => editSectionDesign(section.id, { marginTopPt: Math.max(0, Math.min(36, Number(e.target.value) || 0)) })} /></label>
                <label><span>Margin below · pt</span><Input type="number" min={0} max={36} step={0.5} value={section.design?.marginBottomPt ?? 0} onChange={e => editSectionDesign(section.id, { marginBottomPt: Math.max(0, Math.min(36, Number(e.target.value) || 0)) })} /></label>
                <label><span>Padding top · pt</span><Input type="number" min={0} max={24} step={0.5} value={section.design?.paddingTopPt ?? 0} onChange={e => editSectionDesign(section.id, { paddingTopPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)) })} /></label>
                <label><span>Padding bottom · pt</span><Input type="number" min={0} max={24} step={0.5} value={section.design?.paddingBottomPt ?? 0} onChange={e => editSectionDesign(section.id, { paddingBottomPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)) })} /></label>
                <label><span>Divider weight · pt</span><Input type="number" min={0.1} max={3} step={0.1} value={section.design?.dividerWeightPt ?? active.design.dividerWeightPt} onChange={e => editSectionDesign(section.id, { dividerWeightPt: Math.max(0.1, Math.min(3, Number(e.target.value) || active.design.dividerWeightPt)) })} /></label>
                <label className="setting-toggle"><span>Divider under heading</span><Switch checked={section.design?.showDivider ?? active.design.showDividers} onCheckedChange={checked => editSectionDesign(section.id, { showDivider: checked })} /></label>
              </div></details>
              {section.entryIds.map((entryId, entryIndex) => {
                const master = selectedEntries.get(entryId); if (!master) return null;
                const entry = { ...master, ...active.entryOverrides[entryId] };
                return <div className="entry-editor" key={entryId}><div className="entry-title-row"><Input value={entry.title} aria-label="Entry title" onChange={e => editEntry(entryId, { title: e.target.value })} placeholder="Entry title" /><span><button title="Move entry up" onClick={() => reorderEntry(section.id, entryId, -1)}>↑</button><button title="Move entry down" onClick={() => reorderEntry(section.id, entryId, 1)}>↓</button><button title="Duplicate entry" onClick={() => duplicateEntry(entryId, section.id)}>⧉</button><button title="Remove from variant" onClick={() => updateVariant(v => ({ ...v, selectedEntryIds: v.selectedEntryIds.filter(id => id !== entryId), sections: v.sections.map(s => ({ ...s, entryIds: s.entryIds.filter(id => id !== entryId) })) }))}>×</button></span></div>
                  <div className="field-grid"><label><span>Organization / subtitle</span><Input value={entry.subtitle} onChange={e => editEntry(entryId, { subtitle: e.target.value })} /></label><label><span>Date</span><Input value={entry.date} onChange={e => editEntry(entryId, { date: e.target.value })} /></label><label><span>Location</span><Input value={entry.location} onChange={e => editEntry(entryId, { location: e.target.value })} /></label><label className="wide"><span>Description</span><Textarea rows={2} value={entry.description} onChange={e => editEntry(entryId, { description: e.target.value })} /></label><label className="wide"><span>Bullets · one per line</span><Textarea rows={3} value={entry.bullets.join('\n')} onChange={e => editEntry(entryId, { bullets: e.target.value.split('\n') })} /></label><label className="wide"><span>Technologies · comma separated</span><Input value={entry.technologies.join(', ')} onChange={e => editEntry(entryId, { technologies: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></label><label className="wide"><span>Links · one per line: type | label | URL</span><Textarea rows={2} value={entry.links.map(link => `${link.type} | ${link.label} | ${link.url}`).join('\n')} onChange={e => editEntry(entryId, { links: e.target.value.split('\n').filter(Boolean).map(line => { const [typeOrLabel, ...rest] = line.split('|').map(part => part.trim()); return contactTypes.some(item => item.id === typeOrLabel) ? { type: typeOrLabel as ContactLinkType, label: rest.shift() ?? '', url: rest.join('|').trim() } : { type: 'website', label: typeOrLabel, url: rest.join('|').trim() }; }) })} /></label></div>
                  {entryIndex < section.entryIds.length - 1 && <div className="entry-divider" />}</div>;
              })}
              {project.library.entries.filter(entry => entry.sectionId === section.id && !active.selectedEntryIds.includes(entry.id)).map(entry => <Button key={entry.id} variant="link" className="text-button restore-entry" onClick={() => updateVariant(v => ({ ...v, selectedEntryIds: [...v.selectedEntryIds, entry.id], sections: v.sections.map(s => s.id === section.id ? { ...s, entryIds: [...s.entryIds, entry.id] } : s) }))}>＋ Restore {entry.title}</Button>)}
              <Button variant="link" className="text-button add-entry" onClick={() => addEntry(section.id)}>＋ Add entry</Button>
              </CardContent>}
            </Card>; })}
            <Button variant="outline" className="add-section" onClick={addSection}>＋ Add custom section</Button>
          </div>
        </div> : <div className={`editor-content design-content ${designMode}`}>
          <div className="design-mode-tabs" role="tablist" aria-label="Design controls"><button role="tab" aria-selected={designMode === 'quick'} className={designMode === 'quick' ? 'active' : ''} onClick={() => setDesignMode('quick')}>Quick</button><button role="tab" aria-selected={designMode === 'advanced'} className={designMode === 'advanced' ? 'active' : ''} onClick={() => setDesignMode('advanced')}>Advanced</button><button type="button" className="reset-design" onClick={() => updateVariant(v => ({ ...v, design: getDesignPreset(v.templateId === 't04-academic-cv' ? 'academic' : v.templateId === 't02-clean-compact' ? 'compact' : v.templateId === 't03-modern-developer' ? 'developer-accent' : 'classic-ats', v.templateId, v.mode) }))}>Reset design</button></div>
          <div className="preset-grid">{designPresets.map(preset => <button type="button" className="preset-button" key={preset.id} onClick={() => updateVariant(v => ({ ...v, design: getDesignPreset(preset.id as DesignPresetId, v.templateId, v.mode) }))}><strong>{preset.label}</strong><small>{preset.description}</small></button>)}</div>
          <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">01</span><CardTitle>Template</CardTitle></div></CardHeader><CardContent className="p-0"><div className="template-grid">{templates.map(item => <button key={item.id} onClick={() => updateVariant(v => ({ ...v, templateId: item.id }))} className={`template-card ${item.id === active.templateId ? 'chosen' : ''}`}><span className="mini-page"><i /><i /><i /></span><strong>{item.name}</strong><small>{item.id === 't01-simple-ats' ? 'Centered header · compact sections' : item.id === 't04-academic-cv' ? 'Room for longer academic content' : item.id === 't05-profile-cv' ? 'Optional portrait in header' : 'Single column · print ready'}</small></button>)}</div></CardContent></Card>
          <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">02</span><CardTitle>Page & typography</CardTitle></div></CardHeader><CardContent className="p-0"><div className="field-grid">
            <label><span>Document type</span><NativeSelect className="w-full" value={active.mode} onChange={e => updateVariant(v => { const mode = e.target.value as 'resume' | 'cv'; return { ...v, mode, targetPages: mode === 'cv' ? 2 : 1, maxPages: mode === 'cv' ? 3 : 1 }; })}><option value="resume">Resume · one page default</option><option value="cv">CV · two pages target</option></NativeSelect></label>
            <label className="advanced-only"><span>Target pages</span><Input type="number" min={1} max={10} value={active.targetPages} onChange={e => updateVariant(v => { const targetPages = Math.max(1, Math.min(10, Number(e.target.value) || 1)); return { ...v, targetPages, maxPages: Math.max(v.maxPages, targetPages) }; })} /></label>
            <label className="advanced-only"><span>Maximum pages</span><Input type="number" min={active.targetPages} max={10} value={active.maxPages} onChange={e => updateVariant(v => ({ ...v, maxPages: Math.max(v.targetPages, Math.min(10, Number(e.target.value) || v.targetPages)) }))} /></label>
            <label><span>Paper size</span><NativeSelect className="w-full" value={active.design.paper} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, paper: e.target.value as 'a4' | 'letter' } }))}><option value="a4">A4</option><option value="letter">US Letter</option></NativeSelect></label>
            <label><span>Font size · 8–14 pt</span><Input type="number" min={8} max={14} step={0.5} value={active.design.fontSize} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, fontSize: Math.max(8, Math.min(14, Number(e.target.value) || 10)) } }))} /></label>
            {([['marginTopMm', 'Top margin · mm'], ['marginRightMm', 'Right margin · mm'], ['marginBottomMm', 'Bottom margin · mm'], ['marginLeftMm', 'Left margin · mm']] as const).map(([field, label]) => <label key={field}><span>{label}</span><Input type="number" min={8} max={40} value={active.design[field]} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, [field]: Math.max(8, Math.min(40, Number(e.target.value) || 18)) } }))} /></label>)}
            <label className="advanced-only"><span>Line spacing</span><Input type="number" min={0.9} max={1.5} step={0.05} value={active.design.lineSpacing} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, lineSpacing: Math.max(0.9, Math.min(1.5, Number(e.target.value) || 1)) } }))} /></label>
            <label><span>Font family</span><NativeSelect className="w-full" value={active.design.fontFamily} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, fontFamily: e.target.value as FontFamily } }))}><option value="latin-modern-serif">Latin Modern · Serif</option><option value="latin-modern-sans">Latin Modern · Sans</option><option value="tex-gyre-termes">TeX Gyre Termes · Times</option><option value="tex-gyre-heros">TeX Gyre Heros · Sans</option><option value="tex-gyre-pagella">TeX Gyre Pagella · Palatino</option><option value="tex-gyre-schola">TeX Gyre Schola · Schoolbook</option><option value="tex-gyre-cursor">TeX Gyre Cursor · Monospace</option></NativeSelect></label>
            <label><span>Accent color</span><Input className="color-input" type="color" value={active.design.accentColor} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, accentColor: e.target.value } }))} /></label>
            <label className="advanced-only"><span>Text color</span><Input className="color-input" type="color" value={active.design.textColor} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, textColor: e.target.value } }))} /></label>
          </div></CardContent></Card>
          <Card className="form-card gap-0 advanced-card"><CardHeader className="card-title p-0"><div><span className="step">03</span><CardTitle>Layout & contact fields</CardTitle></div></CardHeader><CardContent className="p-0"><div className="field-grid">
            <label><span>Date alignment</span><NativeSelect className="w-full" value={active.design.dateAlignment} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, dateAlignment: e.target.value as 'right' | 'below' } }))}><option value="right">Align to the right</option><option value="below">Place on a new line</option></NativeSelect></label>
            <label><span>Bullet spacing · 0–8 pt</span><Input type="number" min={0} max={8} step={0.5} value={active.design.bulletSpacing} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, bulletSpacing: Math.max(0, Math.min(8, Number(e.target.value) || 0)) } }))} /></label>
            <label><span>Section spacing · pt</span><Input type="number" min={0} max={24} step={0.5} value={active.design.sectionGapPt} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, sectionGapPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)) } }))} /></label>
            <label><span>Entry spacing · pt</span><Input type="number" min={0} max={24} step={0.5} value={active.design.entryGapPt} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, entryGapPt: Math.max(0, Math.min(24, Number(e.target.value) || 0)) } }))} /></label>
            <label><span>Bullet indent · mm</span><Input type="number" min={2} max={16} step={0.2} value={active.design.bulletIndentMm} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, bulletIndentMm: Math.max(2, Math.min(16, Number(e.target.value) || 4.4)) } }))} /></label>
            <label><span>Divider weight · pt</span><Input type="number" min={0.1} max={3} step={0.1} value={active.design.dividerWeightPt} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, dividerWeightPt: Math.max(0.1, Math.min(3, Number(e.target.value) || 0.45)) } }))} /></label>
            {([['showEmail', 'Email'], ['showPhone', 'Phone'], ['showLocation', 'Location'], ['showLinks', 'Links'], ['pageNumbers', 'Page numbers'], ['showDividers', 'Section dividers'], ['showContactIcons', 'Contact icons']] as const).map(([field, label]) => <label className="setting-toggle" key={field}><span>{label}</span><Switch checked={active.design[field]} onCheckedChange={checked => updateVariant(v => ({ ...v, design: { ...v.design, [field]: checked } }))} /></label>)}
          </div></CardContent></Card>
          <Card className="form-card gap-0 advanced-card"><CardHeader className="card-title p-0"><div><span className="step">04</span><CardTitle>Optional portrait</CardTitle></div><small>Profile CV only</small></CardHeader><CardContent className="p-0"><p className="helper">Stored in this browser and included in backup files. PNG, JPEG, or PDF under 3 MB.</p><div className="photo-actions"><label className="button secondary file-button">Choose photo<input type="file" accept="image/png,image/jpeg,application/pdf" onChange={uploadPhoto} /></label>{project.library.profile.photoDataUrl && <Button variant="link" className="text-button" onClick={() => updateProject(p => { const profile = { ...p.library.profile }; delete profile.photoDataUrl; return { ...p, library: { ...p.library, profile } }; })}>Remove portrait</Button>}</div></CardContent></Card>
        </div>}
      </section>
      <div className="workspace-divider" role="separator" aria-label="Resize editor and PDF preview" aria-orientation="vertical" aria-valuemin={360} aria-valuemax={900} aria-valuenow={editorWidth} tabIndex={0}
        onPointerDown={event => { dragX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { if (dragX.current === null) return; const delta = event.clientX - dragX.current; dragX.current = event.clientX; setEditorWidth(width => Math.max(360, Math.min(900, width + delta))); }}
        onPointerUp={() => { dragX.current = null; }}
        onPointerCancel={() => { dragX.current = null; }}
        onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); setEditorWidth(width => Math.max(360, width - (event.shiftKey ? 48 : 16))); } if (event.key === 'ArrowRight') { event.preventDefault(); setEditorWidth(width => Math.min(900, width + (event.shiftKey ? 48 : 16))); } }} />
      <section className="preview-column"><div className="preview-toolbar"><div><span className="eyebrow">LIVE DOCUMENT</span><strong>{active.name}</strong><small>{pageCount ? `${pageCount} page${pageCount === '1' ? '' : 's'} · compiled by local TeX Live` : pdfUrl && compiledRevision !== revision ? 'Preview is out of date · updating after edits settle' : 'Preview updates locally after edits settle'}</small><div className="preview-settings"><label><Switch checked={preferences.autoPreview} onCheckedChange={checked => setPreferences(p => ({ ...p, autoPreview: checked }))} /><span>Auto preview</span></label><label><span>Wait</span><select aria-label="Preview delay" value={preferences.previewDelayMs} onChange={e => setPreferences(p => ({ ...p, previewDelayMs: Number(e.target.value) }))}><option value={500}>0.5 sec</option><option value={800}>0.8 sec</option><option value={1200}>1.2 sec</option><option value={1600}>1.6 sec</option><option value={2000}>2 sec</option></select></label></div></div><Button variant="outline" className="button secondary" disabled={!pdfFile || compiledRevision !== revision} onClick={exportPdf}>Download PDF</Button></div>
        {overflow && <Alert className="warning"><AlertTitle>Page limit exceeded.</AlertTitle><AlertDescription>Review content, section visibility, spacing, or page limit. Nothing was removed.</AlertDescription></Alert>}
        {message && <div className={`status-message ${['failed', 'rejected', 'error', 'did not return'].some(token => message.toLowerCase().includes(token)) ? 'error' : ''}`}>{message}</div>}
        <div className="paper-area">{pdfUrl ? <CompiledPdfViewer key={pdfUrl} src={pdfUrl} expectedPageCount={pageCount ? Number(pageCount) : null} overflow={overflow} onPageCountChange={pages => setPageCount(String(pages))} /> : <div className="empty-preview"><div className="paper-illustration"><strong>Your Name</strong><span>Professional Title</span><i /><b>EXPERIENCE</b><i /><i /><i /><b>PROJECTS</b><i /><i /></div><h2>Ready when you are</h2><p>Build a preview to compile your current variant with local pdflatex.</p><Button className="button primary" onClick={compile} disabled={busy}>{busy ? 'Compiling…' : 'Build preview'}</Button></div>}</div>
        <div className="preview-footer"><span>●</span> Data and PDF compilation stay on this computer <span className="footer-spacer" /> A4 · {active.design.fontSize} pt</div>
      </section>
    </section>
  </main>;
}
