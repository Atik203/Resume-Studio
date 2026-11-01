'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { loadProject } from '@/lib/storage';
import { useAutosave } from '@/hooks/use-autosave';
import { useCompilePreview } from '@/hooks/use-compile-preview';
import { useEntryDrag, useSectionDrag } from '@/hooks/use-drag-reorder';
import { Button } from '@/components/ui/button';
import { defaultUiPreferences, loadUiPreferences, saveUiPreferences, type UiPreferences } from '@/lib/ui-preferences';
import { getDesignPreset, type DesignPresetId } from '@/lib/design-presets';
import {
  Eye,
  FileEdit,
  Plus,
} from 'lucide-react';

import { Sidebar } from '@/components/studio/sidebar';
import { ProfileCard } from '@/components/studio/profile-card';
import { SectionCard } from '@/components/studio/section-card';
import { EntryCard } from '@/components/studio/entry-card';
import { DesignTab } from '@/components/studio/design-tab';
import { AtsPanel } from '@/components/studio/ats-panel';
import { PageFitModal } from '@/components/studio/page-fit-modal';
import { NewDraftModal } from '@/components/studio/new-draft-modal';
import { PhotoCropperModal } from '@/components/studio/photo-cropper-modal';
import { LatexInspectorModal } from '@/components/studio/latex-inspector-modal';
import { SnapshotModal } from '@/components/studio/snapshot-modal';
import { PreviewPane } from '@/components/studio/preview-pane';
import { Topbar } from '@/components/studio/topbar';
import { EditorHeader } from '@/components/studio/editor-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { resolveVariant, type ResumeSnapshot } from '@/lib/data';

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

export default function Studio() {
  const [project, setProject] = useState<ProjectData>(() => structuredClone(fixtureProject));
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const projectRevision = useRef(0);
  const [activePane, setActivePane] = useState<'editor' | 'design' | 'ats'>('editor');
  const [designMode, setDesignMode] = useState<'quick' | 'advanced'>('quick');
  const [preferences, setPreferences] = useState<UiPreferences>(defaultUiPreferences);
  const [editorWidth, setEditorWidth] = useState(620);
  const [isResizing, setIsResizing] = useState(false);
  const [workspacePane, setWorkspacePane] = useState<'editor' | 'preview'>('editor');
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, string[]>>({});
  const [showNewDraftModal, setShowNewDraftModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPageFitModal, setShowPageFitModal] = useState(false);
  const [showLatexInspectorModal, setShowLatexInspectorModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);
  const dragX = useRef<number | null>(null);

  const active = project.variants.find(v => v.id === project.activeVariantId) ?? project.variants[0];
  const resolvedActive = useMemo(() => resolveVariant(project, active), [project, active]);
  const { saveState, saveStateText, markSaving, markLoaded, reportLoadError } = useAutosave(project, ready);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const {
    pdfUrl,
    pdfFile,
    pageCount,
    overflow,
    compiledRevision,
    busy,
    message,
    setPageCount,
    compile,
    invalidate: invalidatePreview,
  } = useCompilePreview({
    project,
    variantId: active.id,
    revision,
    ready,
    autoPreview: preferences.autoPreview,
    previewDelayMs: preferences.previewDelayMs,
  });

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        setPreferences(loadUiPreferences());
        return loadProject();
      })
      .then(saved => {
        if (saved) setProject(validateProject(saved));
        markLoaded();
      })
      .catch(err => {
        toast({ title: 'Local storage error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
        reportLoadError();
      })
      .finally(() => setReady(true));
  }, [toast, markLoaded, reportLoadError]);

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
    // Ensure editor content always resets gracefully to top on variant or pane switch
    const timer = setTimeout(() => {
      const container = document.querySelector('.editor-content, .editor-scroll');
      if (container) container.scrollTop = 0;
    }, 40);
    return () => clearTimeout(timer);
  }, [active.id, activePane]);

  const updateProject = useCallback((updater: (current: ProjectData) => ProjectData) => {
    invalidatePreview();
    projectRevision.current += 1;
    setRevision(projectRevision.current);
    markSaving();
    setProject(current => updater(structuredClone(current)));
  }, [invalidatePreview, markSaving]);

  const updateVariant = useCallback(
    (updater: (variant: ResumeVariant) => ResumeVariant) =>
      updateProject(p => ({
        ...p,
        variants: p.variants.map(v => (v.id === p.activeVariantId ? updater(v) : v)),
      })),
    [updateProject]
  );

  const {
    draggedIndex: draggedSectionIndex,
    overIndex: dragOverSectionIndex,
    onDragStart: onSectionDragStart,
    onDragOver: onSectionDragOver,
    onDrop: onSectionDrop,
    onDragEnd: onSectionDragEnd,
  } = useSectionDrag((from, to) => {
    updateVariant(v => {
      const sections = [...v.sections];
      const [removed] = sections.splice(from, 1);
      sections.splice(to, 0, removed);
      return { ...v, sections };
    });
  });

  const {
    draggedSectionId: draggedEntrySectionId,
    draggedIndex: draggedEntryIndex,
    overIndex: dragOverEntryIndex,
    onDragStart: onEntryDragStart,
    onDragOver: onEntryDragOver,
    onDrop: onEntryDrop,
    onDragEnd: onEntryDragEnd,
  } = useEntryDrag((sectionId, from, to) => {
    updateVariant(v => ({
      ...v,
      sections: v.sections.map(s => {
        if (s.id !== sectionId) return s;
        const ids = [...s.entryIds];
        const [removed] = ids.splice(from, 1);
        ids.splice(to, 0, removed);
        return { ...s, entryIds: ids };
      }),
    }));
  });

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

  async function removeEntry(entryId: string) {
    const entry = selectedEntries.get(entryId);
    const approved = await confirm({
      title: 'Remove this entry?',
      description: entry?.title
        ? `"${entry.title}" will be removed from this draft. The master library entry is preserved.`
        : 'This entry will be removed from this draft. The master library entry is preserved.',
      confirmLabel: 'Remove entry',
      destructive: true,
    });
    if (!approved) return;

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
    toast({ title: 'Section added', description: premade.label, variant: 'success' });
    setTimeout(() => {
      document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  async function deleteSection(sectionId: string, sectionLabel: string) {
    if (active.sections.length <= 1) {
      toast({ title: 'Cannot delete section', description: 'Keep at least one section in the draft.', variant: 'error' });
      return;
    }
    const approved = await confirm({
      title: 'Delete this section?',
      description: `"${sectionLabel}" and its placements will be removed from this draft. Master library entries are preserved.`,
      confirmLabel: 'Delete section',
      destructive: true,
    });
    if (!approved) return;

    const section = active.sections.find(s => s.id === sectionId);
    const entryIdsToRemove = new Set(section?.entryIds ?? []);

    updateVariant(v => ({
      ...v,
      sections: v.sections.filter(s => s.id !== sectionId),
      selectedEntryIds: v.selectedEntryIds.filter(id => !entryIdsToRemove.has(id)),
    }));
    toast({ title: 'Section removed', description: sectionLabel, variant: 'success' });
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
    toast({ title: 'Skill added', description: skillName, variant: 'success' });
  }

  function updateEntryBullet(entryId: string, bulletIndex: number, newText: string) {
    updateProject(p => {
      const newEntries = p.library.entries.map(e => {
        if (e.id !== entryId) return e;
        const newBullets = [...e.bullets];
        newBullets[bulletIndex] = newText;
        return { ...e, bullets: newBullets };
      });
      return { ...p, library: { ...p.library, entries: newEntries } };
    });
    toast({ title: 'Orphan trim applied', variant: 'success' });
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
    toast({ title: 'Draft created', description: name, variant: 'success' });
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
    toast({ title: 'Draft duplicated', description: copy.name, variant: 'success' });
  }

  async function deleteDraft(variantId: string) {
    if (project.variants.length <= 1) {
      toast({ title: 'Cannot delete draft', description: 'Keep at least one resume or CV draft.', variant: 'error' });
      return;
    }
    const target = project.variants.find(v => v.id === variantId);
    if (!target) return;
    const approved = await confirm({
      title: 'Delete this draft?',
      description: `"${target.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete draft',
      destructive: true,
    });
    if (!approved) return;

    const nextVariants = project.variants.filter(v => v.id !== variantId);
    const nextActiveId = project.activeVariantId === variantId ? nextVariants[0].id : project.activeVariantId;

    updateProject(p => ({
      ...p,
      variants: nextVariants,
      activeVariantId: nextActiveId,
    }));
    toast({ title: 'Draft deleted', description: target.name, variant: 'success' });
  }

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

  const exportLatexZip = useCallback(async () => {
    setExportingZip(true);
    try {
      const res = await fetch('/api/export-tex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          variantId: active.id,
        }),
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || `Export failed with HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = resolvedActive.profile.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Resume';
      a.download = `${safeName}_latex_package.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast({
        title: 'LaTeX export failed',
        description: err instanceof Error ? err.message : 'Failed to export LaTeX package',
        variant: 'error',
      });
    } finally {
      setExportingZip(false);
    }
  }, [active.id, resolvedActive.profile.name, project, toast]);

  const handleRestoreProject = useCallback((restoredProject: ProjectData) => {
    setProject(restoredProject);
  }, []);

  const handleForkVariant = useCallback((snapshot: ResumeSnapshot) => {
    const targetVariant =
      snapshot.projectData.variants.find((v) => v.id === snapshot.variantId) ||
      snapshot.projectData.variants[0];
    const cloned = structuredClone(targetVariant);
    cloned.id = `var_${Date.now()}`;
    cloned.name = `${snapshot.name} (Fork)`;
    setProject((prev) => ({
      ...prev,
      variants: [...prev.variants, cloned],
      activeVariantId: cloned.id,
    }));
  }, []);

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
    toast({ title: 'Backup exported', variant: 'success' });
  }

  async function importBackup(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = validateProject(parsed);
      const approved = await confirm({
        title: 'Replace the current project?',
        description:
          'This import replaces the project in this browser profile. Export a backup first if you want to keep the current version.',
        confirmLabel: 'Replace project',
        destructive: true,
      });
      if (!approved) return;
      setProject(validated);
      toast({ title: 'Project restored', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Invalid backup format',
        variant: 'error',
      });
    } finally {
      input.value = '';
    }
  }

  return (
    <main
      className={`app-shell ${preferences.theme === 'dark' ? 'dark' : ''}`}
    >
      <Topbar
        activePane={activePane}
        onPaneChange={setActivePane}
        libraryCollapsed={preferences.sidebarCollapsed}
        onToggleLibrary={() => setPreferences(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))}
        drafts={project.variants}
        activeDraftId={active.id}
        activeDraftName={active.name}
        onSelectDraft={(id: string) => updateProject(p => ({ ...p, activeVariantId: id }))}
        onNewDraft={() => setShowNewDraftModal(true)}
        onDuplicateDraft={duplicateDraft}
        hasPdf={Boolean(pdfFile)}
        busy={busy}
        exportingZip={exportingZip}
        onDownloadPdf={exportPdf}
        onCompile={compile}
        onExportLatex={exportLatexZip}
        onOpenLatexInspector={() => setShowLatexInspectorModal(true)}
        onOpenSnapshots={() => setShowSnapshotModal(true)}
        onOpenPageFit={() => setShowPageFitModal(true)}
        onExportBackup={exportBackup}
        onImportBackup={importBackup}
        onToggleTheme={() => setPreferences(p => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
        theme={preferences.theme}
      />

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
          <EditorHeader
            activePane={activePane}
            mode={active.mode}
            targetPages={active.targetPages}
            templateId={active.templateId}
            name={active.name}
            sections={active.sections}
            onRename={(name: string) => updateVariant(v => ({ ...v, name }))}
            onSectionClick={scrollToSection}
          />

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
                      defaultDividerWidth={active.design.dividerWidth ?? 'full'}
                      defaultShowDividers={active.design.showDividers}
                    >
                      {/* Entries */}
                      {section.entryIds.map((entryId, entryIndex) => {
                        const master = selectedEntries.get(entryId);
                        if (!master) return null;
                        const entry = { ...master, ...active.entryOverrides[entryId] };
                        const isEntryDragging =
                          draggedEntrySectionId === section.id && draggedEntryIndex === entryIndex;
                        const entryDragDirection =
                          draggedEntrySectionId === section.id && dragOverEntryIndex === entryIndex
                            ? draggedEntryIndex !== null && draggedEntryIndex < entryIndex
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
            <div className="editor-scroll">
              <DesignTab
                active={active}
                designMode={designMode}
                onChangeDesignMode={setDesignMode}
                onUpdateVariant={updateVariant}
                onOpenPageFitModal={() => setShowPageFitModal(true)}
                onOpenLatexInspector={() => setShowLatexInspectorModal(true)}
                onExportZip={exportLatexZip}
                onOpenSnapshots={() => setShowSnapshotModal(true)}
              />
            </div>
          ) : (
            /* ATS Matcher & Robot Simulator Tab */
            <div className="editor-scroll">
              <AtsPanel
                project={project}
                activeVariant={active}
                onAddSkillToResume={addSkillToResume}
              />
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
        <PreviewPane
          draftName={active.name}
          pageCount={pageCount}
          overflow={overflow}
          compiledRevision={compiledRevision}
          revision={revision}
          busy={busy}
          message={message}
          pdfUrl={pdfUrl}
          targetPages={active.targetPages}
          paper={active.design.paper}
          fontSize={active.design.fontSize}
          profileName={project.library.profile.name}
          profileTitle={project.library.profile.title}
          onCompile={compile}
          onOpenPageFit={() => setShowPageFitModal(true)}
          onPageCountChange={pages => setPageCount(String(pages))}
        />
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
          toast({ title: 'Profile photo updated', variant: 'success' });
        }}
      />

      {/* PAGE-FIT ASSISTANT MODAL */}
      <PageFitModal
        isOpen={showPageFitModal}
        onClose={() => setShowPageFitModal(false)}
        activeVariant={active}
        project={project}
        isOverflowing={overflow}
        onApplyDesign={updatedDesign => {
          updateVariant(v => ({ ...v, design: updatedDesign }));
          toast({ title: 'Page-fit spacing applied', variant: 'success' });
        }}
        onUpdateEntryBullet={updateEntryBullet}
      />

      {/* LATEX INSPECTOR & DIFF MODAL */}
      <LatexInspectorModal
        isOpen={showLatexInspectorModal}
        onClose={() => setShowLatexInspectorModal(false)}
        activeVariant={resolvedActive}
        onExportZip={exportLatexZip}
      />

      {/* SNAPSHOT TIME MACHINE MODAL */}
      <SnapshotModal
        isOpen={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        project={project}
        activeVariant={resolvedActive}
        onRestoreProject={handleRestoreProject}
        onForkVariant={handleForkVariant}
      />
    </main>
  );
}
