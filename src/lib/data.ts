import { entrySchema, profileSchema, variantSchema } from './schema.ts';

export type TemplateId = 't01-simple-ats' | 't02-clean-compact' | 't03-modern-developer' | 't04-academic-cv' | 't05-profile-cv';
export type DocumentMode = 'resume' | 'cv';
export type ContactLinkType = 'website' | 'linkedin' | 'github' | 'portfolio' | 'other';
export type LinkDisplay = 'label' | 'url' | 'both';
export type DividerWidth = 'full' | 'half' | 'label';
export type FontFamily = 'serif' | 'sans' | 'latin-modern-serif' | 'latin-modern-sans' | 'tex-gyre-termes' | 'tex-gyre-heros' | 'tex-gyre-pagella' | 'tex-gyre-schola' | 'tex-gyre-cursor';
export interface ContactLink { type: ContactLinkType; label: string; url: string }

export interface SectionDesignSettings {
  fontSizePt?: number;
  marginLeftMm?: number;
  marginRightMm?: number;
  marginTopPt?: number;
  marginBottomPt?: number;
  paddingTopPt?: number;
  paddingBottomPt?: number;
  showDivider?: boolean;
  dividerWeightPt?: number;
  dividerWidth?: DividerWidth;
  pageBreakBefore?: boolean;
}

export interface Profile {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: ContactLink[];
  photoDataUrl?: string;
}

export interface ContentEntry {
  id: string;
  sectionId: string;
  title: string;
  subtitle: string;
  date: string;
  location: string;
  description: string;
  bullets: string[];
  technologies: string[];
  links: ContactLink[];
}

export interface Section {
  id: string;
  label: string;
  entryIds: string[];
  visible: boolean;
  design?: SectionDesignSettings;
}

export type HeaderLayout = 'centered' | 'left' | 'split';
export type DividerStyle = 'solid' | 'accent' | 'dotted' | 'none';

export interface DesignSettings {
  paper: 'a4' | 'letter';
  fontSize: number;
  fontFamily: FontFamily;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  accentColor: string;
  textColor: string;
  lineSpacing: number;
  bulletSpacing: number;
  dateAlignment: 'right' | 'below';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showEntryLocations?: boolean;
  showLinks: boolean;
  pageNumbers: boolean;
  sectionGapPt: number;
  entryGapPt: number;
  bulletIndentMm: number;
  dividerWeightPt: number;
  dividerWidth?: DividerWidth;
  showDividers: boolean;
  showContactIcons: boolean;
  linkDisplay?: LinkDisplay;
  linkUnderline?: boolean;
  headerLayout?: HeaderLayout;
  dividerStyle?: DividerStyle;
  /**
   * Adds PDF metadata tags (title/author/subject) only; it is not a PDF/A
   * conformance flag. The field name is kept for backup compatibility.
   */
  pdfaCompliant?: boolean;
}

export interface ResumeSnapshot {
  id: string;
  name: string;
  variantId: string;
  variantName: string;
  templateId: string;
  createdAt: string;
  pageCount?: number;
  projectData: ProjectData;
}

export interface ResumeVariant {
  id: string;
  name: string;
  mode: DocumentMode;
  templateId: TemplateId;
  selectedEntryIds: string[];
  sections: Section[];
  profileOverrides: Partial<Profile>;
  entryOverrides: Record<string, Partial<ContentEntry>>;
  design: DesignSettings;
  targetPages: number;
  maxPages: number;
}

export interface ProjectData {
  version: 2;
  library: { profile: Profile; entries: ContentEntry[] };
  variants: ResumeVariant[];
  activeVariantId: string;
}

export interface ResolvedVariant extends Omit<ResumeVariant, 'profileOverrides' | 'entryOverrides'> {
  profile: Profile;
  entries: ContentEntry[];
}

export function validateProject(value: unknown): ProjectData {
  if (!value || typeof value !== 'object') throw new Error('Backup must contain a project object.');
  const raw = value as { version?: unknown };
  const migrated = raw.version === 1 ? migrateProject(value) : structuredClone(value);
  const project = migrated as Partial<ProjectData>;
  if (project.version !== 2) throw new Error('Unsupported project version. Expected version 1 or 2.');
  for (const variant of project.variants ?? []) {
    if (variant.design.fontFamily === 'serif') variant.design.fontFamily = 'latin-modern-serif';
    if (variant.design.fontFamily === 'sans') variant.design.fontFamily = 'latin-modern-sans';
  }
  if (!project.library || !isObject(project.library) || !isProfile(project.library.profile) || !Array.isArray(project.library.entries)) {
    throw new Error('Project profile or content library is invalid.');
  }
  if (!project.library.entries.every(isEntry)) throw new Error('One or more content entries are invalid.');
  if (new Set(project.library.entries.map(entry => entry.id)).size !== project.library.entries.length) throw new Error('Content library contains duplicate entry IDs.');
  if (!Array.isArray(project.variants) || project.variants.length === 0 || !project.variants.every(isVariant)) {
    throw new Error('Project must include at least one valid variant.');
  }
  if (new Set(project.variants.map(variant => variant.id)).size !== project.variants.length) throw new Error('Project contains duplicate variant IDs.');
  const entryIds = new Set(project.library.entries.map(entry => entry.id));
  for (const variant of project.variants) {
    if (new Set(variant.sections.map(section => section.id)).size !== variant.sections.length) throw new Error(`Variant “${variant.name}” contains duplicate section IDs.`);
    if (new Set(variant.selectedEntryIds).size !== variant.selectedEntryIds.length) throw new Error(`Variant “${variant.name}” selects a content item more than once.`);
    if (variant.selectedEntryIds.some(id => !entryIds.has(id))) throw new Error(`Variant “${variant.name}” refers to a missing library item.`);
    if (Object.keys(variant.entryOverrides).some(id => !entryIds.has(id))) throw new Error(`Variant “${variant.name}” overrides a missing library item.`);
    const placements = variant.sections.flatMap(section => section.entryIds);
    if (new Set(placements).size !== placements.length) throw new Error(`Variant “${variant.name}” places a content item more than once.`);
    if (placements.some(id => !variant.selectedEntryIds.includes(id))) throw new Error(`Variant “${variant.name}” has a section item that is not selected.`);
    if (variant.selectedEntryIds.some(id => !placements.includes(id))) throw new Error(`Variant “${variant.name}” has selected content without a section.`);
  }
  if (typeof project.activeVariantId !== 'string' || !project.variants.some(v => v.id === project.activeVariantId)) {
    throw new Error('Active variant does not exist.');
  }
  return structuredClone(project as ProjectData);
}

export function migrateProject(value: unknown): ProjectData {
  if (!isObject(value) || value.version !== 1 || !isObject(value.library) || !Array.isArray(value.library.entries) || !Array.isArray(value.variants)) {
    throw new Error('Version 1 project is invalid and cannot be migrated.');
  }
  const project = structuredClone(value) as {
    [key: string]: unknown;
    version: number;
    library: { profile: Record<string, unknown>; entries: Record<string, unknown>[] };
    variants: Record<string, unknown>[];
  };
  const mapLinks = (links: unknown) => Array.isArray(links) ? links.map(link => {
    if (!isObject(link)) return link;
    return { type: 'website', label: link.label, url: link.url };
  }) : links;
  project.version = 2;
  if (isObject(project.library.profile)) project.library.profile.links = mapLinks(project.library.profile.links);
  for (const entry of project.library.entries) if (isObject(entry)) entry.links = mapLinks(entry.links);
  for (const variant of project.variants) {
    if (!isObject(variant)) continue;
    if (isObject(variant.profileOverrides) && variant.profileOverrides.links !== undefined) variant.profileOverrides.links = mapLinks(variant.profileOverrides.links);
    if (isObject(variant.entryOverrides)) for (const override of Object.values(variant.entryOverrides)) {
      if (isObject(override) && override.links !== undefined) override.links = mapLinks(override.links);
    }
    if (!isObject(variant.design)) continue;
    const design = variant.design;
    const margin = typeof design.marginMm === 'number' ? design.marginMm : 18;
    Object.assign(design, {
      marginTopMm: margin, marginRightMm: margin, marginBottomMm: margin, marginLeftMm: margin,
      sectionGapPt: variant.templateId === 't04-academic-cv' ? 9 : variant.templateId === 't02-clean-compact' ? 5 : 7,
      entryGapPt: variant.templateId === 't04-academic-cv' ? 4 : variant.templateId === 't03-modern-developer' ? 2 : 0,
      bulletIndentMm: 4.4, dividerWeightPt: variant.templateId === 't04-academic-cv' ? 1.2 : 0.45,
      showDividers: true, showContactIcons: false,
    });
    delete design.marginMm;
  }
  return validateProject(project);
}

export function resolveVariant(projectInput: ProjectData, variantInput: ResumeVariant): ResolvedVariant {
  const project = validateProject(projectInput);
  if (!project.variants.some(item => item.id === variantInput.id) || !isVariant(variantInput)) throw new Error('Selected variant does not belong to this project or is invalid.');
  const variant = structuredClone(variantInput);
  const entriesById = new Map(project.library.entries.map(entry => [entry.id, entry]));
  const entries = variant.selectedEntryIds.flatMap(id => {
    const entry = entriesById.get(id);
    return entry ? [{ ...structuredClone(entry), ...structuredClone(variant.entryOverrides[id] ?? {}) }] : [];
  });
  return {
    ...structuredClone(variant),
    profile: { ...structuredClone(project.library.profile), ...structuredClone(variant.profileOverrides) },
    entries,
  };
}

function isObject(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
function isProfile(v: unknown): v is Profile { return profileSchema.safeParse(v).success; }
function isEntry(v: unknown): v is ContentEntry { return entrySchema.safeParse(v).success; }
function isVariant(v: unknown): v is ResumeVariant { return variantSchema.safeParse(v).success; }
