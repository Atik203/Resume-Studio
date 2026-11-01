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
import Link from 'next/link';
import { getDesignPreset, type DesignPresetId } from '@/lib/design-presets';
import {
  Download,
  Eye,
  FileEdit,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Code2,
  History,
  FileArchive,
  ChevronDown,
  MoreVertical,
  FileText,
  Check,
  Sun,
  Moon,
  Home,
  PanelLeft,
  User,
  Zap,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Layers,
} from 'lucide-react';

function getSectionChipIcon(id: string) {
  const lower = id.toLowerCase();
  if (lower.includes('skill')) return <Zap size={12} className="text-amber-500 shrink-0" />;
  if (lower.includes('exp') || lower.includes('work')) return <Briefcase size={12} className="text-emerald-500 shrink-0" />;
  if (lower.includes('proj')) return <FolderGit2 size={12} className="text-purple-500 shrink-0" />;
  if (lower.includes('edu')) return <GraduationCap size={12} className="text-sky-500 shrink-0" />;
  return <Layers size={12} className="text-neutral-400 shrink-0" />;
}

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
import { useDismiss } from '@/hooks/use-dismiss';
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
  const [showDraftDropdown, setShowDraftDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const dragX = useRef<number | null>(null);
  const draftMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useDismiss(draftMenuRef, () => setShowDraftDropdown(false), showDraftDropdown);
  useDismiss(exportMenuRef, () => setShowExportMenu(false), showExportMenu);
  useDismiss(moreMenuRef, () => setShowMoreMenu(false), showMoreMenu);

  const active = project.variants.find(v => v.id === project.activeVariantId) ?? project.variants[0];
  const resolvedActive = useMemo(() => resolveVariant(project, active), [project, active]);
  const { saveState, saveStateText, markSaving, markLoaded, reportLoadError } = useAutosave(project, ready);

  const {
    pdfUrl,
    pdfFile,
    pageCount,
    overflow,
    compiledRevision,
    busy,
    message,
    setMessage,
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
        setMessage(`Local storage error: ${err instanceof Error ? err.message : 'unknown error'}`);
        reportLoadError();
      })
      .finally(() => setReady(true));
  }, [setMessage, markLoaded, reportLoadError]);

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
      const container = document.querySelector('.editor-content');
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
    setMessage('Applied orphan trim to bullet point.');
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
      alert(err instanceof Error ? err.message : 'Failed to export LaTeX package');
    } finally {
      setExportingZip(false);
    }
  }, [active.id, resolvedActive.profile.name, project]);

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
      className={`app-shell ${preferences.theme === 'dark' ? 'dark' : ''}`}
    >
      {/* 0. FLOWCV-GRADE FLOATING TOPBAR */}
      <header className="studio-topbar">
        <div className="studio-topbar-left">
          <Link href="/" className="studio-brand" title="Return to Landing Page">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs">
              <FileText size={17} />
            </div>
            <span className="font-extrabold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight hidden sm:inline">
              Resume Studio
            </span>
          </Link>

          {/* Dedicated Sidebar Toggle Button */}
          <button
            type="button"
            className="studio-icon-btn hidden md:inline-flex"
            onClick={() =>
              setPreferences(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))
            }
            title={preferences.sidebarCollapsed ? 'Expand library sidebar' : 'Collapse library sidebar'}
            aria-label="Toggle library sidebar"
          >
            <PanelLeft size={16} />
          </button>

          {/* Floating Pill Navigation Tabs */}
          <div className="studio-nav-pills" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activePane === 'editor'}
              className={`studio-pill-btn ${activePane === 'editor' ? 'active' : ''}`}
              onClick={() => setActivePane('editor')}
            >
              <FileEdit size={13} />
              <span>Content</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePane === 'design'}
              className={`studio-pill-btn ${activePane === 'design' ? 'active' : ''}`}
              onClick={() => setActivePane('design')}
            >
              <Sliders size={13} />
              <span>Customize</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePane === 'ats'}
              className={`studio-pill-btn ${activePane === 'ats' ? 'active' : ''}`}
              onClick={() => setActivePane('ats')}
            >
              <Sparkles size={13} />
              <span>AI Tools</span>
            </button>
          </div>
        </div>

        {/* Right: Draft Switcher + Primary Download + More Menu */}
        <div className="studio-topbar-right">
          {/* Draft Selector Dropdown */}
          <div className="relative" ref={draftMenuRef}>
            <button
              type="button"
              className="draft-selector-btn"
              onClick={() => setShowDraftDropdown(v => !v)}
              title="Switch or manage drafts"
            >
              <span className="truncate max-w-[130px] sm:max-w-[180px]">{active.name}</span>
              <ChevronDown size={13} />
            </button>

            {showDraftDropdown && (
              <div
                className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1 z-50 text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowDraftDropdown(false)}
              >
                <div className="px-3 py-1.5 font-bold text-[11px] text-neutral-400 uppercase tracking-wider">
                  Resume & CV Drafts
                </div>
                {project.variants.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      updateProject(p => ({ ...p, activeVariantId: v.id }));
                      setShowDraftDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                      v.id === active.id ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : ''
                    }`}
                  >
                    <span className="truncate">{v.name}</span>
                    {v.id === active.id && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))}
                <div className="border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewDraftModal(true);
                      setShowDraftDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Create New Draft…</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      duplicateDraft(active.id);
                      setShowDraftDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Duplicate Current Draft
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary Download Split Button */}
          <div className="relative inline-flex items-center" ref={exportMenuRef}>
            <Button
              className="download-primary-btn"
              disabled={busy}
              onClick={pdfFile ? exportPdf : compile}
              title="Download Verified PDF (Ctrl+S)"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{busy ? 'Compiling…' : 'Download'}</span>
            </Button>
            <button
              type="button"
              className="download-split-arrow"
              onClick={() => setShowExportMenu(v => !v)}
              title="Export options"
            >
              <ChevronDown size={13} />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1 z-50 text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportPdf();
                    setShowExportMenu(false);
                  }}
                  disabled={!pdfFile}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  <Download size={13} className="text-emerald-600" />
                  <span>Download Verified PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportLatexZip();
                    setShowExportMenu(false);
                  }}
                  disabled={exportingZip}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                >
                  <FileArchive size={13} className="text-amber-500" />
                  <span>Export Standalone LaTeX (.zip)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    compile();
                    setShowExportMenu(false);
                  }}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800"
                >
                  <RefreshCw size={13} className="text-sky-500" />
                  <span>Force Recompile (Ctrl+B)</span>
                </button>
              </div>
            )}
          </div>

          {/* More Menu (⋮) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              className="studio-icon-btn"
              onClick={() => setShowMoreMenu(v => !v)}
              title="Developer tools & backups"
            >
              <MoreVertical size={16} />
            </button>

            {showMoreMenu && (
              <div
                className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1 z-50 text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowMoreMenu(false)}
              >
                <div className="px-3 py-1 font-bold text-[10px] text-neutral-400 uppercase tracking-wider">
                  Developer & History
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowLatexInspectorModal(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Code2 size={13} className="text-emerald-500" />
                  <span>Inspect LaTeX Source</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSnapshotModal(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                >
                  <History size={13} className="text-sky-500" />
                  <span>Snapshot Time Machine</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPageFitModal(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Sparkles size={13} className="text-purple-500" />
                  <span>Page-Fit Assistant</span>
                </button>

                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                <div className="px-3 py-1 font-bold text-[10px] text-neutral-400 uppercase tracking-wider">
                  Project Backup
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportBackup();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Export JSON Backup
                </button>
                <label className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer block">
                  <span>Import JSON Backup</span>
                  <input type="file" accept="application/json" onChange={importBackup} className="hidden" />
                </label>

                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setPreferences(p => ({
                      ...p,
                      theme: p.theme === 'dark' ? 'light' : 'dark',
                    }));
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between"
                >
                  <span>Toggle Dark Theme</span>
                  {preferences.theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                </button>

                <Link
                  href="/"
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-500 border-t border-neutral-100 dark:border-neutral-800"
                >
                  <Home size={13} />
                  <span>Public Landing Page</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

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
          {/* Context-Aware Editor Header */}
          {activePane === 'editor' ? (
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
                    <User size={12} className="text-emerald-500 shrink-0" />
                    <span>Profile</span>
                  </button>
                  {active.sections.map(section => (
                    <button
                      key={section.id}
                      type="button"
                      className="section-chip"
                      onClick={() => scrollToSection(section.id)}
                    >
                      {getSectionChipIcon(section.id)}
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : activePane === 'design' ? (
            <div className="editor-header design-header">
              <div className="editor-header-main">
                <div className="editor-breadcrumb">
                  <span>Document Styling</span>
                  <span>·</span>
                  <span>Template: {active.templateId}</span>
                </div>
                <h2 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Design, Typography & Spacing
                </h2>
              </div>
            </div>
          ) : (
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
          )}

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
          setMessage('Profile photo updated.');
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
          setMessage('Applied page-fit spacing optimizations.');
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
