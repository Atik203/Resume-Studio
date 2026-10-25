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

  // Drag and drop state
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const [draggedEntryInfo, setDraggedEntryInfo] = useState<{ sectionId: string; index: number } | null>(null);
  const [dragOverEntryIndex, setDragOverEntryIndex] = useState<number | null>(null);

  const active = project.variants.find(v => v.id === project.activeVariantId) ?? project.variants[0];
  const resolvedActive = useMemo(() => resolveVariant(project, active), [project, active]);

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

  useEffect(() => {
    // Ensure editor content always resets gracefully to top on variant or pane switch
    const timer = setTimeout(() => {
      const container = document.querySelector('.editor-content');
      if (container) container.scrollTop = 0;
    }, 40);
    return () => clearTimeout(timer);
  }, [active.id, activePane]);

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

  // Auto-compile preview on initial mount & debounced changes
  useEffect(() => {
    if (!ready) return;
    if (!preferences.autoPreview) return;
    const timer = setTimeout(() => {
      compile();
    }, preferences.previewDelayMs || 800);
    return () => clearTimeout(timer);
  }, [ready, revision, active.id, preferences.autoPreview, preferences.previewDelayMs, compile]);

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
          <div className="relative">
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
          <div className="relative inline-flex items-center">
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
          <div className="relative">
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
        <section className="preview-column" aria-label="PDF preview and export">
          {/* Clean FlowCV Preview Status Bar */}
          <div className="preview-canvas-header flex items-center justify-between px-5 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">{active.name}</span>
              {pageCount && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    overflow
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {pageCount} {pageCount === '1' ? 'Page' : 'Pages'} · {overflow ? 'Over Limit' : 'Verified'}
                </span>
              )}
              <span className="text-[11px] text-neutral-400 hidden sm:inline">
                {compiledRevision === revision ? '· Up to date' : '· Edits pending'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs font-semibold text-neutral-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
                onClick={compile}
                disabled={busy}
                title="Compile with local pdflatex (Shortcut: Ctrl+B)"
              >
                <RefreshCw size={13} className={busy ? 'animate-spin text-emerald-500' : ''} />
                <span>{busy ? 'Compiling…' : 'Recompile'}</span>
              </button>
            </div>
          </div>

          {/* Overflow Alert */}
          {overflow && (
            <Alert className="warning">
              <AlertTitle className="flex items-center justify-between">
                <span>Target page limit exceeded ({pageCount}/{active.targetPages} pages)</span>
                <Button
                  variant="default"
                  size="icon-xs"
                  className="h-6 px-2 text-[11px] gap-1 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setShowPageFitModal(true)}
                >
                  <Sparkles size={11} />
                  <span>Fit to 1 Page</span>
                </Button>
              </AlertTitle>
              <AlertDescription className="text-xs">
                This draft spills onto Page {pageCount}. All content is preserved in the compiled PDF.
                Click <strong>Fit to 1 Page</strong> to mathematically micro-tune spacing with zero text loss.
              </AlertDescription>
            </Alert>
          )}

          {/* Status / Error Message (Only show genuine alerts, avoid redundant green success line) */}
          {message && ['failed', 'rejected', 'error', 'not found', 'exception'].some(token => message.toLowerCase().includes(token)) && (
            <div className="status-message error mx-4 my-2">
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
            ) : busy ? (
              <div className="empty-preview flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4 animate-spin">
                  <RefreshCw size={22} />
                </div>
                <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Compiling with local pdflatex…</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Generating verified PDF from your local TeX Live engine</p>
              </div>
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
