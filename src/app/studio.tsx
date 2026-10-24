'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ContentEntry, ProjectData, ResumeVariant, TemplateId, validateProject } from '@/lib/data';
import { fixtureProject } from '@/lib/fixture';
import { loadProject, saveProject } from '@/lib/storage';
import { parseCompileResponseMetadata } from '@/lib/compile-response';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const templates: { id: TemplateId; name: string }[] = [
  { id: 't01-simple-ats', name: 'Simple ATS' }, { id: 't02-clean-compact', name: 'Clean Compact' },
  { id: 't03-modern-developer', name: 'Modern Developer' }, { id: 't04-academic-cv', name: 'Academic CV' }, { id: 't05-profile-cv', name: 'Profile CV' },
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [activePane, setActivePane] = useState<'editor' | 'design'>('editor');
  const active = project.variants.find(v => v.id === project.activeVariantId) ?? project.variants[0];

  useEffect(() => {
    loadProject().then(saved => { if (saved) setProject(validateProject(saved)); }).catch(err => setMessage(`Local storage could not be opened: ${err instanceof Error ? err.message : 'unknown error'}`)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setSaveState('Saving…');
      saveProject(project).then(() => setSaveState('Saved locally')).catch(err => setSaveState(`Save failed: ${err instanceof Error ? err.message : 'unknown error'}`));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project, ready]);

  const updateProject = useCallback((updater: (current: ProjectData) => ProjectData) => {
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
  function editProfileLinks(links: { label: string; url: string }[]) {
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
  async function compile() {
    const revision = projectRevision.current;
    setBusy(true); setMessage('Compiling with local pdflatex…');
    try {
      const response = await fetch('/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, variantId: active.id }) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error ?? 'Compilation failed.'); }
      const metadata = parseCompileResponseMetadata(response);
      const blob = await response.blob();
      if (blob.size < 100 || blob.type !== 'application/pdf' || new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer()) !== '%PDF-') {
        throw new Error('The local compiler returned an empty or invalid PDF. Retry the preview and check the compile service.');
      }
      if (revision !== projectRevision.current) { setMessage('The document changed during compilation. Build a fresh preview.'); return; }
      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl(old => { if (old) URL.revokeObjectURL(old); return nextUrl; });
      setPdfFile(blob);
      setCompiledRevision(revision);
      setPageCount(String(metadata.pageCount));
      setOverflow(metadata.overflow);
      setMessage('PDF compiled and verified locally.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Compilation failed.'); }
    finally { setBusy(false); }
  }
  function exportPdf() {
    if (!pdfFile) return;
    const url = URL.createObjectURL(pdfFile); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${active.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'resume'}.pdf`; anchor.click(); URL.revokeObjectURL(url);
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'resume-studio-backup.json'; anchor.click(); URL.revokeObjectURL(url);
  }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const imported = validateProject(JSON.parse(await file.text()));
      if (!window.confirm(`Import ${imported.variants.length} variant(s) and ${imported.library.entries.length} library item(s)? This replaces the current local project.`)) return;
      projectRevision.current += 1; setRevision(projectRevision.current); setProject(imported); setPdfUrl(old => { if (old) URL.revokeObjectURL(old); return ''; }); setPdfFile(null); setPageCount(''); setOverflow(false); setCompiledRevision(-1); setMessage('Backup validated and loaded. It will be saved locally.');
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
      <div className="brand"><span className="brand-mark">R</span><div><strong>Resume Studio</strong><small>Private by default · Stored in this browser</small></div></div>
      <div className="toolbar"><Badge variant="secondary" className="save-state">{saveState}</Badge><Button variant="outline" className="button secondary" onClick={exportBackup}>Export backup</Button><label className="button secondary file-button">Import backup<input type="file" accept="application/json,.json" onChange={importBackup} /></label><Button className="button primary" onClick={compile} disabled={busy}>{busy ? 'Compiling…' : 'Build preview'}</Button></div>
    </header>
    <section className="workspace">
      <aside className="sidebar">
        <div className="side-heading"><span>RESUME LIBRARY</span><button title="Duplicate variant" onClick={createVariant}>＋</button></div>
        {project.variants.map(variant => <button className={`variant-item ${variant.id === active.id ? 'selected' : ''}`} key={variant.id} onClick={() => { updateProject(p => ({ ...p, activeVariantId: variant.id })); setPdfFile(null); }}><span className="variant-icon">{variant.mode === 'cv' ? 'CV' : 'R'}</span><span><b>{variant.name}</b><small>{variant.mode === 'cv' ? 'Curriculum vitae' : 'Resume'} · {templates.find(t => t.id === variant.templateId)?.name}</small></span></button>)}
        <div className="side-heading content-heading"><span>CONTENT LIBRARY</span><small>{project.library.entries.length} items</small></div>
        <p className="side-note">Master content stays reusable. Changes made to an entry in this variant are stored as overrides.</p>
        <div className="privacy-note"><span>●</span><p>Your data stays in this browser. PDF compilation runs on this computer using TeX Live.</p></div>
      </aside>
      <section className="editor-column">
        <div className="editor-header"><div><span className="eyebrow">{active.mode === 'cv' ? 'CURRICULUM VITAE' : 'RESUME'} · EDITOR</span><input className="variant-name" value={active.name} aria-label="Variant name" onChange={e => updateVariant(v => ({ ...v, name: e.target.value }))} /></div><div className="tabs"><button className={activePane === 'editor' ? 'active' : ''} onClick={() => setActivePane('editor')}>Content</button><button className={activePane === 'design' ? 'active' : ''} onClick={() => setActivePane('design')}>Design</button></div></div>
        {activePane === 'editor' ? <div className="editor-content">
        <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">01</span><CardTitle>Profile</CardTitle></div><Button variant="link" className="text-button" onClick={() => updateVariant(v => ({ ...v, profileOverrides: Object.keys(v.profileOverrides).length ? {} : structuredClone(project.library.profile) }))}>{Object.keys(active.profileOverrides).length ? 'Use shared profile' : 'Customize for this variant'}</Button></CardHeader><CardContent className="p-0"><div className="field-grid">
            {(['name', 'title', 'email', 'phone', 'location'] as const).map(field => <label key={field} className={field === 'location' ? 'wide' : ''}><span>{field === 'title' ? 'Professional title' : field[0].toUpperCase() + field.slice(1)}</span><Input value={active.profileOverrides[field] ?? project.library.profile[field]} onChange={e => editProfile(field, e.target.value)} placeholder={`Add ${field}`} /></label>)}
            <div className="wide profile-links"><span>Links</span>{(active.profileOverrides.links ?? project.library.profile.links).map((link, index) => <div className="profile-link-row" key={`${index}-${link.label}`}><Input aria-label="Link label" value={link.label} onChange={e => { const links = [...(active.profileOverrides.links ?? project.library.profile.links)]; links[index] = { ...links[index], label: e.target.value }; editProfileLinks(links); }} placeholder="Label" /><Input aria-label="Link URL" value={link.url} onChange={e => { const links = [...(active.profileOverrides.links ?? project.library.profile.links)]; links[index] = { ...links[index], url: e.target.value }; editProfileLinks(links); }} placeholder="https://" /><button title="Remove link" onClick={() => editProfileLinks((active.profileOverrides.links ?? project.library.profile.links).filter((_, i) => i !== index))}>×</button></div>)}<Button variant="link" className="text-button" onClick={() => editProfileLinks([...(active.profileOverrides.links ?? project.library.profile.links), { label: 'Website', url: 'https://' }])}>＋ Add link</Button></div>
          </div></CardContent></Card>
          <div className="section-list">
            {active.sections.map((section, index) => <Card className="form-card section-card gap-0" key={section.id}>
              <CardHeader className="card-title section-card-title p-0"><div><span className="step">{String(index + 2).padStart(2, '0')}</span><Input className="section-name" value={section.label} onChange={e => updateVariant(v => ({ ...v, sections: v.sections.map(s => s.id === section.id ? { ...s, label: e.target.value } : s) }))} /></div><div className="section-actions"><button title="Move section up" onClick={() => reorderSection(index, -1)}>↑</button><button title="Move section down" onClick={() => reorderSection(index, 1)}>↓</button><label className="toggle"><Switch checked={section.visible} onCheckedChange={checked => updateVariant(v => ({ ...v, sections: v.sections.map(s => s.id === section.id ? { ...s, visible: checked } : s) }))} /><span>Visible</span></label></div></CardHeader>
              <CardContent className="p-0">
              {section.entryIds.map((entryId, entryIndex) => {
                const master = selectedEntries.get(entryId); if (!master) return null;
                const entry = { ...master, ...active.entryOverrides[entryId] };
                return <div className="entry-editor" key={entryId}><div className="entry-title-row"><Input value={entry.title} aria-label="Entry title" onChange={e => editEntry(entryId, { title: e.target.value })} placeholder="Entry title" /><span><button title="Move entry up" onClick={() => reorderEntry(section.id, entryId, -1)}>↑</button><button title="Move entry down" onClick={() => reorderEntry(section.id, entryId, 1)}>↓</button><button title="Duplicate entry" onClick={() => duplicateEntry(entryId, section.id)}>⧉</button><button title="Remove from variant" onClick={() => updateVariant(v => ({ ...v, selectedEntryIds: v.selectedEntryIds.filter(id => id !== entryId), sections: v.sections.map(s => ({ ...s, entryIds: s.entryIds.filter(id => id !== entryId) })) }))}>×</button></span></div>
                  <div className="field-grid"><label><span>Organization / subtitle</span><Input value={entry.subtitle} onChange={e => editEntry(entryId, { subtitle: e.target.value })} /></label><label><span>Date</span><Input value={entry.date} onChange={e => editEntry(entryId, { date: e.target.value })} /></label><label><span>Location</span><Input value={entry.location} onChange={e => editEntry(entryId, { location: e.target.value })} /></label><label className="wide"><span>Description</span><Textarea rows={2} value={entry.description} onChange={e => editEntry(entryId, { description: e.target.value })} /></label><label className="wide"><span>Bullets · one per line</span><Textarea rows={3} value={entry.bullets.join('\n')} onChange={e => editEntry(entryId, { bullets: e.target.value.split('\n') })} /></label><label className="wide"><span>Technologies · comma separated</span><Input value={entry.technologies.join(', ')} onChange={e => editEntry(entryId, { technologies: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></label><label className="wide"><span>Links · one per line: label | URL</span><Textarea rows={2} value={entry.links.map(link => `${link.label} | ${link.url}`).join('\n')} onChange={e => editEntry(entryId, { links: e.target.value.split('\n').filter(Boolean).map(line => { const [label, ...url] = line.split('|'); return { label: label.trim(), url: url.join('|').trim() }; }) })} /></label></div>
                  {entryIndex < section.entryIds.length - 1 && <div className="entry-divider" />}</div>;
              })}
              {project.library.entries.filter(entry => entry.sectionId === section.id && !active.selectedEntryIds.includes(entry.id)).map(entry => <Button key={entry.id} variant="link" className="text-button restore-entry" onClick={() => updateVariant(v => ({ ...v, selectedEntryIds: [...v.selectedEntryIds, entry.id], sections: v.sections.map(s => s.id === section.id ? { ...s, entryIds: [...s.entryIds, entry.id] } : s) }))}>＋ Restore {entry.title}</Button>)}
              <Button variant="link" className="text-button add-entry" onClick={() => addEntry(section.id)}>＋ Add entry</Button>
              </CardContent>
            </Card>)}
            <Button variant="outline" className="add-section" onClick={addSection}>＋ Add custom section</Button>
          </div>
        </div> : <div className="editor-content">
          <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">01</span><CardTitle>Template</CardTitle></div></CardHeader><CardContent className="p-0"><div className="template-grid">{templates.map(item => <button key={item.id} onClick={() => updateVariant(v => ({ ...v, templateId: item.id }))} className={`template-card ${item.id === active.templateId ? 'chosen' : ''}`}><span className="mini-page"><i /><i /><i /></span><strong>{item.name}</strong><small>{item.id === 't01-simple-ats' ? 'Centered header · compact sections' : item.id === 't04-academic-cv' ? 'Room for longer academic content' : item.id === 't05-profile-cv' ? 'Optional portrait in header' : 'Single column · print ready'}</small></button>)}</div></CardContent></Card>
          <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">02</span><CardTitle>Page & typography</CardTitle></div></CardHeader><CardContent className="p-0"><div className="field-grid">
            <label><span>Document type</span><NativeSelect className="w-full" value={active.mode} onChange={e => updateVariant(v => { const mode = e.target.value as 'resume' | 'cv'; return { ...v, mode, targetPages: mode === 'cv' ? 2 : 1, maxPages: mode === 'cv' ? 3 : 1 }; })}><option value="resume">Resume · one page default</option><option value="cv">CV · two pages target</option></NativeSelect></label>
            <label><span>Target pages</span><Input type="number" min={1} max={10} value={active.targetPages} onChange={e => updateVariant(v => { const targetPages = Math.max(1, Math.min(10, Number(e.target.value) || 1)); return { ...v, targetPages, maxPages: Math.max(v.maxPages, targetPages) }; })} /></label>
            <label><span>Maximum pages</span><Input type="number" min={active.targetPages} max={10} value={active.maxPages} onChange={e => updateVariant(v => ({ ...v, maxPages: Math.max(v.targetPages, Math.min(10, Number(e.target.value) || v.targetPages)) }))} /></label>
            <label><span>Paper size</span><NativeSelect className="w-full" value={active.design.paper} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, paper: e.target.value as 'a4' | 'letter' } }))}><option value="a4">A4</option><option value="letter">US Letter</option></NativeSelect></label>
            <label><span>Font size · 8–14 pt</span><Input type="number" min={8} max={14} step={0.5} value={active.design.fontSize} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, fontSize: Math.max(8, Math.min(14, Number(e.target.value) || 10)) } }))} /></label>
            <label><span>Margins · 10–35 mm</span><Input type="number" min={10} max={35} value={active.design.marginMm} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, marginMm: Math.max(10, Math.min(35, Number(e.target.value) || 18)) } }))} /></label>
            <label><span>Line spacing</span><Input type="number" min={0.9} max={1.5} step={0.05} value={active.design.lineSpacing} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, lineSpacing: Math.max(0.9, Math.min(1.5, Number(e.target.value) || 1)) } }))} /></label>
            <label><span>Font family</span><NativeSelect className="w-full" value={active.design.fontFamily} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, fontFamily: e.target.value as 'serif' | 'sans' } }))}><option value="serif">Serif · Latin Modern</option><option value="sans">Sans serif · Latin Modern</option></NativeSelect></label>
            <label><span>Accent color</span><Input className="color-input" type="color" value={active.design.accentColor} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, accentColor: e.target.value } }))} /></label>
            <label><span>Text color</span><Input className="color-input" type="color" value={active.design.textColor} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, textColor: e.target.value } }))} /></label>
          </div></CardContent></Card>
          <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">03</span><CardTitle>Layout & contact fields</CardTitle></div></CardHeader><CardContent className="p-0"><div className="field-grid">
            <label><span>Date alignment</span><NativeSelect className="w-full" value={active.design.dateAlignment} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, dateAlignment: e.target.value as 'right' | 'below' } }))}><option value="right">Align to the right</option><option value="below">Place on a new line</option></NativeSelect></label>
            <label><span>Bullet spacing · 0–8 pt</span><Input type="number" min={0} max={8} step={0.5} value={active.design.bulletSpacing} onChange={e => updateVariant(v => ({ ...v, design: { ...v.design, bulletSpacing: Math.max(0, Math.min(8, Number(e.target.value) || 0)) } }))} /></label>
            {([['showEmail', 'Email'], ['showPhone', 'Phone'], ['showLocation', 'Location'], ['showLinks', 'Links'], ['pageNumbers', 'Page numbers']] as const).map(([field, label]) => <label className="setting-toggle" key={field}><span>{label}</span><Switch checked={active.design[field]} onCheckedChange={checked => updateVariant(v => ({ ...v, design: { ...v.design, [field]: checked } }))} /></label>)}
          </div></CardContent></Card>
          <Card className="form-card gap-0"><CardHeader className="card-title p-0"><div><span className="step">03</span><CardTitle>Optional portrait</CardTitle></div><small>Profile CV only</small></CardHeader><CardContent className="p-0"><p className="helper">Stored in this browser and included in backup files. PNG, JPEG, or PDF under 3 MB.</p><div className="photo-actions"><label className="button secondary file-button">Choose photo<input type="file" accept="image/png,image/jpeg,application/pdf" onChange={uploadPhoto} /></label>{project.library.profile.photoDataUrl && <Button variant="link" className="text-button" onClick={() => updateProject(p => { const profile = { ...p.library.profile }; delete profile.photoDataUrl; return { ...p, library: { ...p.library, profile } }; })}>Remove portrait</Button>}</div></CardContent></Card>
        </div>}
      </section>
      <section className="preview-column"><div className="preview-toolbar"><div><span className="eyebrow">LIVE DOCUMENT</span><strong>{active.name}</strong><small>{pageCount ? `${pageCount} page${pageCount === '1' ? '' : 's'} · compiled by local TeX Live` : pdfUrl && compiledRevision !== revision ? 'Preview is out of date · build again to export current content' : 'Preview appears after compilation'}</small></div><Button variant="outline" className="button secondary" disabled={!pdfFile} onClick={exportPdf}>Download PDF</Button></div>
        {overflow && <Alert className="warning"><AlertTitle>Page limit exceeded.</AlertTitle><AlertDescription>Review content, section visibility, spacing, or page limit. Nothing was removed.</AlertDescription></Alert>}
        {message && <div className={`status-message ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('rejected') || message.toLowerCase().includes('error') ? 'error' : ''}`}>{message}</div>}
        <div className="paper-area">{pdfUrl ? <CompiledPdfViewer key={pdfUrl} src={pdfUrl} expectedPageCount={pageCount ? Number(pageCount) : null} overflow={overflow} onPageCountChange={pages => setPageCount(String(pages))} /> : <div className="empty-preview"><div className="paper-illustration"><strong>Your Name</strong><span>Professional Title</span><i /><b>EXPERIENCE</b><i /><i /><i /><b>PROJECTS</b><i /><i /></div><h2>Ready when you are</h2><p>Build a preview to compile your current variant with local pdflatex.</p><Button className="button primary" onClick={compile} disabled={busy}>{busy ? 'Compiling…' : 'Build preview'}</Button></div>}</div>
        <div className="preview-footer"><span>●</span> Data and PDF compilation stay on this computer <span className="footer-spacer" /> A4 · {active.design.fontSize} pt</div>
      </section>
    </section>
  </main>;
}
