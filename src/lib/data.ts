export type TemplateId = 't01-simple-ats' | 't02-clean-compact' | 't03-modern-developer' | 't04-academic-cv' | 't05-profile-cv';
export type DocumentMode = 'resume' | 'cv';
export type ContactLinkType = 'website' | 'linkedin' | 'github' | 'portfolio' | 'other';
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
  showLinks: boolean;
  pageNumbers: boolean;
  sectionGapPt: number;
  entryGapPt: number;
  bulletIndentMm: number;
  dividerWeightPt: number;
  showDividers: boolean;
  showContactIcons: boolean;
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
function isString(v: unknown): v is string { return typeof v === 'string'; }
function isLink(v: unknown): v is ContactLink {
  if (!isObject(v) || !['website', 'linkedin', 'github', 'portfolio', 'other'].includes(String(v.type)) || !isString(v.label) || !isString(v.url)) return false;
  try { return ['http:', 'https:', 'mailto:'].includes(new URL(v.url).protocol); } catch { return false; }
}
function isPhotoDataUrl(v: unknown): v is string {
  return isString(v) && v.length <= 4_000_000 && /^data:image\/(?:png|jpeg|pdf);base64,[A-Za-z0-9+/]+=*$/.test(v);
}
function isProfile(v: unknown): v is Profile {
  return isObject(v) && ['name', 'title', 'email', 'phone', 'location'].every(k => isString(v[k])) &&
    Array.isArray(v.links) && v.links.every(isLink) &&
    (v.photoDataUrl === undefined || isPhotoDataUrl(v.photoDataUrl));
}
function isEntry(v: unknown): v is ContentEntry {
  return isObject(v) && ['id', 'sectionId', 'title', 'subtitle', 'date', 'location', 'description'].every(k => isString(v[k])) &&
    Array.isArray(v.bullets) && v.bullets.every(isString) && Array.isArray(v.technologies) && v.technologies.every(isString) &&
    Array.isArray(v.links) && v.links.every(isLink);
}
const templateIds: TemplateId[] = ['t01-simple-ats', 't02-clean-compact', 't03-modern-developer', 't04-academic-cv', 't05-profile-cv'];
function isDesign(v: unknown): v is DesignSettings {
  return isObject(v) && (v.paper === 'a4' || v.paper === 'letter') && ['serif', 'sans', 'latin-modern-serif', 'latin-modern-sans', 'tex-gyre-termes', 'tex-gyre-heros', 'tex-gyre-pagella', 'tex-gyre-schola', 'tex-gyre-cursor'].includes(String(v.fontFamily)) &&
    typeof v.fontSize === 'number' && Number.isFinite(v.fontSize) && v.fontSize >= 8 && v.fontSize <= 14 &&
    ['marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]) && (v[k] as number) >= 8 && (v[k] as number) <= 40) &&
    typeof v.lineSpacing === 'number' && Number.isFinite(v.lineSpacing) && v.lineSpacing >= 0.9 && v.lineSpacing <= 1.5 &&
    typeof v.bulletSpacing === 'number' && Number.isFinite(v.bulletSpacing) && v.bulletSpacing >= 0 && v.bulletSpacing <= 8 &&
    (v.dateAlignment === 'right' || v.dateAlignment === 'below') && ['showEmail', 'showPhone', 'showLocation', 'showLinks', 'pageNumbers'].every(k => typeof v[k] === 'boolean') &&
    isString(v.accentColor) && /^#[\da-fA-F]{6}$/.test(v.accentColor) && isString(v.textColor) && /^#[\da-fA-F]{6}$/.test(v.textColor) &&
    typeof v.sectionGapPt === 'number' && Number.isFinite(v.sectionGapPt) && v.sectionGapPt >= 0 && v.sectionGapPt <= 24 &&
    typeof v.entryGapPt === 'number' && Number.isFinite(v.entryGapPt) && v.entryGapPt >= 0 && v.entryGapPt <= 24 &&
    typeof v.bulletIndentMm === 'number' && Number.isFinite(v.bulletIndentMm) && v.bulletIndentMm >= 2 && v.bulletIndentMm <= 16 &&
    typeof v.dividerWeightPt === 'number' && Number.isFinite(v.dividerWeightPt) && v.dividerWeightPt >= 0.1 && v.dividerWeightPt <= 3 &&
    typeof v.showDividers === 'boolean' && typeof v.showContactIcons === 'boolean';
}
function isVariant(v: unknown): v is ResumeVariant {
  return isObject(v) && isString(v.id) && isString(v.name) && (v.mode === 'resume' || v.mode === 'cv') &&
    templateIds.includes(v.templateId as TemplateId) && Array.isArray(v.selectedEntryIds) && v.selectedEntryIds.every(isString) &&
    Array.isArray(v.sections) && v.sections.every(s => isObject(s) && isString(s.id) && isString(s.label) && Array.isArray(s.entryIds) && s.entryIds.every(isString) && typeof s.visible === 'boolean' && (s.design === undefined || isSectionDesign(s.design))) &&
    isObject(v.profileOverrides) && Object.entries(v.profileOverrides).every(([key, value]) =>
      (['name', 'title', 'email', 'phone', 'location'].includes(key) && isString(value)) ||
      (key === 'links' && Array.isArray(value) && value.every(isLink)) ||
      (key === 'photoDataUrl' && isPhotoDataUrl(value))) &&
    isObject(v.entryOverrides) && Object.entries(v.entryOverrides).every(([id, override]) => isString(id) && isObject(override) && Object.keys(override).every(key => ['title', 'subtitle', 'date', 'location', 'description', 'bullets', 'technologies', 'links'].includes(key)) && ['title', 'subtitle', 'date', 'location', 'description'].every(key => override[key] === undefined || isString(override[key])) && ['bullets', 'technologies'].every(key => override[key] === undefined || (Array.isArray(override[key]) && override[key].every(isString))) && (override.links === undefined || (Array.isArray(override.links) && override.links.every(isLink)))) && isDesign(v.design) &&
    typeof v.targetPages === 'number' && Number.isInteger(v.targetPages) && v.targetPages >= 1 && v.targetPages <= 10 && typeof v.maxPages === 'number' && Number.isInteger(v.maxPages) && v.maxPages >= v.targetPages && v.maxPages <= 10;
}

function isSectionDesign(value: unknown): value is SectionDesignSettings {
  if (!isObject(value)) return false;
  const ranges: Record<string, [number, number]> = {
    fontSizePt: [8, 24], marginLeftMm: [0, 25], marginRightMm: [0, 25],
    marginTopPt: [0, 36], marginBottomPt: [0, 36], paddingTopPt: [0, 24], paddingBottomPt: [0, 24], dividerWeightPt: [0.1, 3],
  };
  return Object.entries(value).every(([key, item]) => key === 'showDivider' ? typeof item === 'boolean' :
    key in ranges && typeof item === 'number' && Number.isFinite(item) && item >= ranges[key][0] && item <= ranges[key][1]);
}
