'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ContactLink,
  ContentEntry,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { defaultUiPreferences, loadUiPreferences, saveUiPreferences, type UiPreferences } from '@/lib/ui-preferences';
import { getDesignPreset, type DesignPresetId } from '@/lib/design-presets';
import {
  Download,
  Eye,
  FileEdit,
  Plus,
  RefreshCw,
  Sliders,
  Target,
} from 'lucide-react';

import { Sidebar } from '@/components/studio/sidebar';
import { ProfileCard } from '@/components/studio/profile-card';
import { SectionCard } from '@/components/studio/section-card';
import { EntryCard } from '@/components/studio/entry-card';
import { DesignTab } from '@/components/studio/design-tab';
import { AtsPanel } from '@/components/studio/ats-panel';
import { NewDraftModal } from '@/components/studio/new-draft-modal';
import { PhotoCropperModal } from '@/components/studio/photo-cropper-modal';

const PREMADE_SECTIONS = [
  { id: 'experience', label: 'Work Experience', defaultTitle: 'Software Engineer', icon: '💼' },
  { id: 'education', label: 'Education', defaultTitle: 'BSc Computer Science', icon: '🎓' },
  { id: 'projects', label: 'Key Projects', defaultTitle: 'Project Name', icon: '🚀' },
  { id: 'skills', label: 'Technical Skills', defaultTitle: 'Languages & Tools', icon: '⚡' },
  { id: 'certifications', label: 'Certifications', defaultTitle: 'AWS Certified Solutions Architect', icon: '📜' },
  { id: 'awards', label: 'Honors & Awards', defaultTitle: 'Dean’s Honor List', icon: '🏆' },
  { id: 'languages', label: 'Languages', defaultTitle: 'English (Fluent), Spanish', icon: '🌐' },
  { id: 'custom', label: 'Custom Section', defaultTitle: 'New Item', icon: '📝' },
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
  const [activePane, setActivePane] = useState<'editor' | 'design' | 'ats'>('editor');
  const [designMode, setDesignMode] = useState<'quick' | 'advanced'>('quick');
  const [preferences, setPreferences] = useState<UiPreferences>(defaultUiPreferences);
  const [editorWidth, setEditorWidth] = useState(540);
  const [isResizing, setIsResizing] = useState(false);
  const [workspacePane, setWorkspacePane] = useState<'editor' | 'preview'>('editor');
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, string[]>>({});
  const [showNewDraftModal, setShowNewDraftModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);
  const dragX = useRef<number | null>(null);

  // Drag and drop state
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const [draggedEntryInfo, setDraggedEntryInfo] = useState<{ sectionId: string; index: number } | null>(null);
  const [dragOverEntryIndex, setDragOverEntryIndex] = useState<number | null>(null);

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

  function editProfilePhoto(photoDataUrl?: string) {
    if (Object.keys(active.profileOverrides).length) {
      updateVariant(v => ({ ...v, profileOverrides: { ...v.profileOverrides, photoDataUrl } }));
    } else {
      updateProject(p => ({
        ...p,
        library: { ...p.library, profile: { ...p.library.profile, photoDataUrl } },
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
    const base = selectedEntries.get(entryId);
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

  function removeEntry(entryId: string) {
    updateVariant(v => ({
      ...v,
      selectedEntryIds: v.selectedEntryIds.filter(id => id !== entryId),
      sections: v.sections.map(s => ({
        ...s,
        entryIds: s.entryIds.filter(id => id !== entryId),
      })),
    }));
  }

  function addPredefinedSection(premade: (typeof PREMADE_SECTIONS)[number]) {
    const sectionId = `${premade.id}-${crypto.randomUUID().slice(0, 8)}`;
    const entryId = `entry-${crypto.randomUUID()}`;
    const newEntry: ContentEntry = {
      id: entryId,
      sectionId,
      title: premade.defaultTitle,
      subtitle: '',
      date: '',
      location: '',
      description: '',
      bullets: premade.id === 'experience' || premade.id === 'projects' ? ['Key impact or achievement with measurable result.'] : [],
      technologies: premade.id === 'skills' || premade.id === 'projects' ? ['TypeScript', 'React'] : [],
      links: [],
    };

    updateProject(p => ({
      ...p,
      library: { ...p.library, entries: [...p.library.entries, newEntry] },
      variants: p.variants.map(v =>
        v.id === p.activeVariantId
          ? {
              ...v,
              selectedEntryIds: [...v.selectedEntryIds, entryId],
              sections: [...v.sections, { id: sectionId, label: premade.label, entryIds: [entryId], visible: true }],
            }
          : v
      ),
    }));

    setShowAddSectionMenu(false);
    setMessage(`Added ${premade.label} section.`);
    setTimeout(() => {
      document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function deleteSection(sectionId: string, sectionLabel: string) {
    if (active.sections.length <= 1) {
      alert('You must keep at least one section in the resume.');
      return;
    }
    if (!window.confirm(`Delete section "${sectionLabel}" from this draft?`)) {
      return;
    }

    const section = active.sections.find(s => s.id === sectionId);
    const entryIdsToRemove = new Set(section?.entryIds ?? []);

    updateVariant(v => ({
      ...v,
      sections: v.sections.filter(s => s.id !== sectionId),
      selectedEntryIds: v.selectedEntryIds.filter(id => !entryIdsToRemove.has(id)),
    }));
    setMessage(`Removed section "${sectionLabel}".`);
  }

  function addSkillToResume(skillName: string) {
    updateProject(p => {
      const activeVar = p.variants.find(v => v.id === p.activeVariantId) ?? p.variants[0];
      let skillsSection = activeVar.sections.find(
        s => s.id === 'skills' || s.label.toLowerCase().includes('skill')
      );

      const newEntries = [...p.library.entries];
      const newVariants = p.variants.map(v => {
        if (v.id !== p.activeVariantId) return v;
        const nextVar = structuredClone(v);

        if (!skillsSection) {
          skillsSection = {
            id: 'skills',
            label: 'Technical Skills',
            visible: true,
            entryIds: [],
          };
          nextVar.sections.push(skillsSection);
        } else {
          const s = nextVar.sections.find(sec => sec.id === skillsSection!.id);
          if (s) s.visible = true;
        }

        const existingEntryId = skillsSection.entryIds[0];
        const targetEntry = existingEntryId ? newEntries.find(e => e.id === existingEntryId) : null;

        if (!targetEntry) {
          const newId = `entry-${Date.now()}`;
          const newEntry: ContentEntry = {
            id: newId,
            sectionId: skillsSection.id,
            title: 'Key Competencies & Tools',
            subtitle: '',
            date: '',
            location: '',
            description: '',
            bullets: [],
            technologies: [skillName],
            links: [],
          };
          newEntries.push(newEntry);
          const s = nextVar.sections.find(sec => sec.id === skillsSection!.id);
          if (s) s.entryIds.push(newId);
          nextVar.selectedEntryIds.push(newId);
        } else {
          const curTechs = targetEntry.technologies || [];
          if (!curTechs.some(t => t.toLowerCase() === skillName.toLowerCase())) {
            const updated = {
              ...targetEntry,
              technologies: [...curTechs, skillName],
            };
            const idx = newEntries.findIndex(e => e.id === targetEntry.id);
            if (idx >= 0) newEntries[idx] = updated;
          }
        }
        return nextVar;
      });

      return {
        ...p,
        library: { ...p.library, entries: newEntries },
        variants: newVariants,
      };
    });
    setMessage(`Added "${skillName}" to technical skills.`);
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

  function scrollToSection(sectionId: string) {
    if (sectionId === 'profile') {
      setProfileCollapsed(false);
      document.getElementById('card-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setCollapsedSections(current => {
      const ids = current[active.id] ?? active.sections.map(s => s.id);
      return { ...current, [active.id]: ids.filter(id => id !== sectionId) };
    });
    setTimeout(() => {
      document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
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

  // Drag and drop handlers
  function onSectionDragStart(e: React.DragEvent, index: number) {
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `section:${index}`);
  }

  function onSectionDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedSectionIndex !== null && draggedSectionIndex !== index) {
      setDragOverSectionIndex(index);
    }
  }

  function onSectionDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (draggedSectionIndex !== null && draggedSectionIndex !== targetIndex) {
      updateVariant(v => {
        const sections = [...v.sections];
        const [removed] = sections.splice(draggedSectionIndex, 1);
        sections.splice(targetIndex, 0, removed);
        return { ...v, sections };
      });
    }
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  }

  function onSectionDragEnd() {
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  }

  function onEntryDragStart(e: React.DragEvent, sectionId: string, index: number) {
    setDraggedEntryInfo({ sectionId, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `entry:${sectionId}:${index}`);
  }

  function onEntryDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedEntryInfo !== null && draggedEntryInfo.index !== index) {
      setDragOverEntryIndex(index);
    }
  }

  function onEntryDrop(e: React.DragEvent, sectionId: string, targetIndex: number) {
    e.preventDefault();
    if (
      draggedEntryInfo !== null &&
      draggedEntryInfo.sectionId === sectionId &&
      draggedEntryInfo.index !== targetIndex
    ) {
      updateVariant(v => ({
        ...v,
        sections: v.sections.map(s => {
          if (s.id !== sectionId) return s;
          const ids = [...s.entryIds];
          const [removed] = ids.splice(draggedEntryInfo.index, 1);
          ids.splice(targetIndex, 0, removed);
          return { ...s, entryIds: ids };
        }),
      }));
    }
    setDraggedEntryInfo(null);
    setDragOverEntryIndex(null);
  }

  function onEntryDragEnd() {
    setDraggedEntryInfo(null);
    setDragOverEntryIndex(null);
  }

  // Formatting helpers
  function insertBulletFormatting(entryId: string, prefix: string, suffix: string) {
    const master = selectedEntries.get(entryId);
    if (!master) return;
    const entry = { ...master, ...active.entryOverrides[entryId] };
    const bullets = [...entry.bullets];
    if (bullets.length === 0) {
      bullets.push(`${prefix}Text${suffix}`);
    } else {
      const lastIndex = bullets.length - 1;
      bullets[lastIndex] = `${bullets[lastIndex]} ${prefix}Text${suffix}`;
    }
    editEntry(entryId, { bullets });
  }

  function insertActionVerb(entryId: string, verb: string) {
    const master = selectedEntries.get(entryId);
    if (!master) return;
    const entry = { ...master, ...active.entryOverrides[entryId] };
    const bullets = [...entry.bullets];
    if (bullets.length === 0) {
      bullets.push(`${verb} `);
    } else {
      const lastIndex = bullets.length - 1;
      bullets[lastIndex] = bullets[lastIndex].trim() ? `${bullets[lastIndex]}\n${verb} ` : `${verb} `;
    }
    editEntry(entryId, { bullets: bullets.join('\n').split('\n') });
  }

  function handleCreateNewDraft(type: 'resume' | 'cv', name: string) {
    const isCv = type === 'cv';
    const id = `variant-${crypto.randomUUID()}`;
    const templateId: TemplateId = isCv ? 't04-academic-cv' : 't01-simple-ats';
    const presetId: DesignPresetId = isCv ? 'academic' : 'classic-ats';

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

    const newVariant: ResumeVariant = {
      id,
      name,
      mode: type,
      templateId,
      selectedEntryIds: sections.flatMap(s => s.entryIds),
      sections,
      profileOverrides: {},
      entryOverrides: {},
      design: getDesignPreset(presetId, templateId, type),
      targetPages: isCv ? 2 : 1,
      maxPages: isCv ? 3 : 1,
    };

    updateProject(p => ({
      ...p,
      variants: [...p.variants, newVariant],
      activeVariantId: id,
    }));

    setShowNewDraftModal(false);
    setMessage(`Created new ${isCv ? 'Academic CV' : 'Software Resume'} draft: "${name}".`);
  }

  function duplicateDraft(variantId: string) {
    const source = project.variants.find(v => v.id === variantId);
    if (!source) return;

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

  const exportPdf = useCallback(() => {
    if (!pdfFile || !pdfUrl) return;
    const anchor = document.createElement('a');
    anchor.href = pdfUrl;
    anchor.download = `${
      active.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'resume'
    }.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [active.name, pdfFile, pdfUrl]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        compile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (pdfFile) exportPdf();
        else compile();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [compile, exportPdf, pdfFile]);

  function exportBackup() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `resume-studio-backup-v${project.version}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Exported JSON backup successfully.');
  }

  function importBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const validated = validateProject(parsed);
        setProject(validated);
        setMessage('Project restored from backup.');
      } catch (err) {
        setMessage(`Import failed: ${err instanceof Error ? err.message : 'invalid backup format'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <main
      className={`app-shell ${preferences.sidebarCollapsed ? 'sidebar-hidden' : ''} ${
        preferences.theme === 'dark' ? 'dark' : ''
      }`}
    >
      {/* Mobile Workspace Tabs */}
      <div className="mobile-workspace-tabs" role="tablist" aria-label="Mobile workspace view">
        <button
          role="tab"
          aria-selected={workspacePane === 'editor'}
          className={workspacePane === 'editor' ? 'active' : ''}
          onClick={() => setWorkspacePane('editor')}
        >
          <FileEdit size={14} />
          <span>Editor</span>
        </button>
        <button
          role="tab"
          aria-selected={workspacePane === 'preview'}
          className={workspacePane === 'preview' ? 'active' : ''}
          onClick={() => {
            setWorkspacePane('preview');
            if (compiledRevision !== projectRevision.current) compile();
          }}
        >
          <Eye size={14} />
          <span>PDF Preview</span>
        </button>
      </div>

      <section
        className={`workspace workspace-${workspacePane} ${
          preferences.sidebarCollapsed ? 'library-collapsed' : ''
        } ${isResizing ? 'is-resizing' : ''}`}
        style={{ '--editor-width': `${editorWidth}px` } as React.CSSProperties}
      >
        {/* 1. COLLAPSIBLE LEFT SIDEBAR */}
        <Sidebar
          project={project}
          activeVariantId={active.id}
          collapsed={preferences.sidebarCollapsed}
          onToggleCollapse={() =>
            setPreferences(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))
          }
          saveState={saveState}
          saveStateText={saveStateText}
          preferences={preferences}
          onUpdatePreferences={updater => setPreferences(updater)}
          onSelectVariant={id => updateProject(p => ({ ...p, activeVariantId: id }))}
          onRenameVariant={(id, name) =>
            updateProject(p => ({
              ...p,
              variants: p.variants.map(v => (v.id === id ? { ...v, name } : v)),
            }))
          }
          onOpenNewDraftModal={() => setShowNewDraftModal(true)}
          onDuplicateVariant={duplicateDraft}
          onDeleteVariant={deleteDraft}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
        />

        {/* 2. CENTER FLUID EDITOR COLUMN */}
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
              {/* Section Quick Nav Chips */}
              <div className="section-quick-nav" aria-label="Jump to section">
                <button
                  type="button"
                  className="section-chip"
                  onClick={() => scrollToSection('profile')}
                >
                  👤 Profile
                </button>
                {active.sections.map(section => (
                  <button
                    key={section.id}
                    type="button"
                    className="section-chip"
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switch Tabs (Editor vs Design vs ATS) */}
            <div className="editor-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activePane === 'editor'}
                className={`editor-mode-tab ${activePane === 'editor' ? 'active' : ''}`}
                onClick={() => setActivePane('editor')}
              >
                <FileEdit size={14} />
                <span>Content</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePane === 'design'}
                className={`editor-mode-tab ${activePane === 'design' ? 'active' : ''}`}
                onClick={() => setActivePane('design')}
              >
                <Sliders size={14} />
                <span>Design</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePane === 'ats'}
                className={`editor-mode-tab ${activePane === 'ats' ? 'active' : ''}`}
                onClick={() => setActivePane('ats')}
              >
                <Target size={14} />
                <span>ATS Matcher</span>
              </button>
            </div>
          </div>

          {/* Editor Content Area */}
          {activePane === 'editor' ? (
            <div className="editor-content">
              {/* Profile Card */}
              <ProfileCard
                profile={project.library.profile}
                profileOverrides={active.profileOverrides}
                isCollapsed={profileCollapsed}
                onToggleCollapse={() => setProfileCollapsed(v => !v)}
                onToggleOverrides={() =>
                  updateVariant(v => ({
                    ...v,
                    profileOverrides: Object.keys(v.profileOverrides).length
                      ? {}
                      : structuredClone(project.library.profile),
                  }))
                }
                onEditField={editProfile}
                onEditLinks={editProfileLinks}
                onOpenPhotoModal={() => setShowPhotoModal(true)}
                onRemovePhoto={() => editProfilePhoto(undefined)}
              />

              {/* Sections List */}
              <div className="section-list">
                {active.sections.map((section, index) => {
                  const collapsed = sectionIsCollapsed(section.id);
                  const dragDirection =
                    dragOverSectionIndex === index
                      ? draggedSectionIndex !== null && draggedSectionIndex < index
                        ? 'bottom'
                        : 'top'
                      : null;

                  return (
                    <SectionCard
                      key={section.id}
                      section={section}
                      index={index}
                      isCollapsed={collapsed}
                      isDragging={draggedSectionIndex === index}
                      dragOverDirection={dragDirection}
                      onToggleCollapse={() => toggleSection(section.id)}
                      onRename={label =>
                        updateVariant(v => ({
                          ...v,
                          sections: v.sections.map(s => (s.id === section.id ? { ...s, label } : s)),
                        }))
                      }
                      onMoveUp={() => reorderSection(index, -1)}
                      onMoveDown={() => reorderSection(index, 1)}
                      onToggleVisibility={visible =>
                        updateVariant(v => ({
                          ...v,
                          sections: v.sections.map(s => (s.id === section.id ? { ...s, visible } : s)),
                        }))
                      }
                      onDeleteSection={() => deleteSection(section.id, section.label)}
                      onDragStart={e => onSectionDragStart(e, index)}
                      onDragEnd={onSectionDragEnd}
                      onDragOver={e => onSectionDragOver(e, index)}
                      onDrop={e => onSectionDrop(e, index)}
                      onEditDesign={patch => editSectionDesign(section.id, patch)}
                      defaultFontSize={active.design.fontSize}
                      defaultDividerWeight={active.design.dividerWeightPt}
                      defaultShowDividers={active.design.showDividers}
                    >
                      {/* Entries */}
                      {section.entryIds.map((entryId, entryIndex) => {
                        const master = selectedEntries.get(entryId);
                        if (!master) return null;
                        const entry = { ...master, ...active.entryOverrides[entryId] };
                        const isEntryDragging =
                          draggedEntryInfo?.sectionId === section.id && draggedEntryInfo.index === entryIndex;
                        const entryDragDirection =
                          draggedEntryInfo?.sectionId === section.id && dragOverEntryIndex === entryIndex
                            ? draggedEntryInfo.index < entryIndex
                              ? 'bottom'
                              : 'top'
                            : null;

                        return (
                          <EntryCard
                            key={entryId}
                            entry={entry}
                            sectionId={section.id}
                            index={entryIndex}
                            isDragging={isEntryDragging}
                            dragOverDirection={entryDragDirection}
                            onDragStart={e => onEntryDragStart(e, section.id, entryIndex)}
                            onDragEnd={onEntryDragEnd}
                            onDragOver={e => onEntryDragOver(e, entryIndex)}
                            onDrop={e => onEntryDrop(e, section.id, entryIndex)}
                            onEdit={patch => editEntry(entryId, patch)}
                            onMoveUp={() => reorderEntry(section.id, entryId, -1)}
                            onMoveDown={() => reorderEntry(section.id, entryId, 1)}
                            onDuplicate={() => duplicateEntry(entryId, section.id)}
                            onRemove={() => removeEntry(entryId)}
                            onInsertFormatting={(prefix, suffix) =>
                              insertBulletFormatting(entryId, prefix, suffix)
                            }
                            onInsertActionVerb={verb => insertActionVerb(entryId, verb)}
                          />
                        );
                      })}

                      {/* Restore unselected entries */}
                      {project.library.entries
                        .filter(
                          entry =>
                            entry.sectionId === section.id && !section.entryIds.includes(entry.id)
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
                    </SectionCard>
                  );
                })}

                {/* Pre-made Section Selector */}
                {showAddSectionMenu ? (
                  <div className="p-4 bg-card border border-border rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <strong className="text-sm font-semibold">Choose Section to Add</strong>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setShowAddSectionMenu(false)}
                      >
                        ×
                      </Button>
                    </div>
                    <div className="add-section-grid">
                      {PREMADE_SECTIONS.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className="premade-section-btn"
                          onClick={() => addPredefinedSection(item)}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="add-section"
                    onClick={() => setShowAddSectionMenu(true)}
                  >
                    <Plus size={15} />
                    <span>Add New Section (Experience, Education, Skills, Custom…)</span>
                  </Button>
                )}
              </div>
            </div>
          ) : activePane === 'design' ? (
            /* Design Tab */
            <DesignTab
              active={active}
              designMode={designMode}
              onChangeDesignMode={setDesignMode}
              onUpdateVariant={updateVariant}
            />
          ) : (
            /* ATS Matcher & Robot Simulator Tab */
            <AtsPanel
              project={project}
              activeVariant={active}
              onAddSkillToResume={addSkillToResume}
            />
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
            setIsResizing(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            if (dragX.current === null) return;
            const delta = event.clientX - dragX.current;
            dragX.current = event.clientX;
            setEditorWidth(width => Math.max(340, Math.min(950, width + delta)));
          }}
          onPointerUp={() => {
            dragX.current = null;
            setIsResizing(false);
          }}
          onPointerCancel={() => {
            dragX.current = null;
            setIsResizing(false);
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

        {/* 3. RIGHT FLUID PDF PREVIEW COLUMN */}
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
              <small>
                {compiledRevision === revision
                  ? 'Up to date with current editor content'
                  : 'Edits pending · Recompile to verify'}
              </small>
            </div>

            <div className="preview-actions">
              <Button
                className="button primary"
                onClick={compile}
                disabled={busy}
                title="Compile with local pdflatex (Shortcut: Ctrl+B)"
              >
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                <span>{busy ? 'Compiling…' : 'Compile PDF'}</span>
              </Button>
              <Button
                variant="outline"
                className="button secondary download-btn"
                disabled={!pdfFile}
                onClick={exportPdf}
                title="Download verified PDF (Shortcut: Ctrl+S)"
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

      {/* NEW DRAFT MODAL */}
      <NewDraftModal
        isOpen={showNewDraftModal}
        onClose={() => setShowNewDraftModal(false)}
        onCreate={handleCreateNewDraft}
        existingResumeCount={project.variants.filter(v => v.mode === 'resume').length}
        existingCvCount={project.variants.filter(v => v.mode === 'cv').length}
      />

      {/* PHOTO CROPPER MODAL */}
      <PhotoCropperModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        initialImage={active.profileOverrides.photoDataUrl ?? project.library.profile.photoDataUrl ?? null}
        onSave={dataUrl => {
          editProfilePhoto(dataUrl);
          setShowPhotoModal(false);
          setMessage('Profile photo updated.');
        }}
      />
    </main>
  );
}
