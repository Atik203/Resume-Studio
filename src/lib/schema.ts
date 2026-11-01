import { z } from 'zod';

const finiteNumber = z.number().finite();
const hexColor = z.string().regex(/^#[\da-fA-F]{6}$/, 'Invalid color value');

export const contactLinkSchema = z.object({
  type: z.enum(['website', 'linkedin', 'github', 'portfolio', 'other']),
  label: z.string(),
  url: z.string().refine(value => {
    try {
      return ['http:', 'https:', 'mailto:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'Invalid URL protocol'),
});

export const photoDataUrlSchema = z
  .string()
  .max(4_000_000)
  .regex(/^data:image\/(?:png|jpeg|pdf);base64,[A-Za-z0-9+/]+=*$/);

export const profileSchema = z.object({
  name: z.string(),
  title: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  links: z.array(contactLinkSchema),
  photoDataUrl: photoDataUrlSchema.optional(),
});

export const sectionDesignSchema = z
  .object({
    fontSizePt: finiteNumber.min(8).max(24).optional(),
    marginLeftMm: finiteNumber.min(0).max(25).optional(),
    marginRightMm: finiteNumber.min(0).max(25).optional(),
    marginTopPt: finiteNumber.min(0).max(36).optional(),
    marginBottomPt: finiteNumber.min(0).max(36).optional(),
    paddingTopPt: finiteNumber.min(0).max(24).optional(),
    paddingBottomPt: finiteNumber.min(0).max(24).optional(),
    showDivider: z.boolean().optional(),
    dividerWeightPt: finiteNumber.min(0.1).max(3).optional(),
    pageBreakBefore: z.boolean().optional(),
  })
  .strict();

export const designSchema = z.object({
  paper: z.enum(['a4', 'letter']),
  fontSize: finiteNumber.min(8).max(14),
  fontFamily: z.enum([
    'serif',
    'sans',
    'latin-modern-serif',
    'latin-modern-sans',
    'tex-gyre-termes',
    'tex-gyre-heros',
    'tex-gyre-pagella',
    'tex-gyre-schola',
    'tex-gyre-cursor',
  ]),
  marginTopMm: finiteNumber.min(8).max(40),
  marginRightMm: finiteNumber.min(8).max(40),
  marginBottomMm: finiteNumber.min(8).max(40),
  marginLeftMm: finiteNumber.min(8).max(40),
  accentColor: hexColor,
  textColor: hexColor,
  lineSpacing: finiteNumber.min(0.9).max(1.5),
  bulletSpacing: finiteNumber.min(0).max(8),
  dateAlignment: z.enum(['right', 'below']),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showLocation: z.boolean(),
  showLinks: z.boolean(),
  pageNumbers: z.boolean(),
  sectionGapPt: finiteNumber.min(0).max(24),
  entryGapPt: finiteNumber.min(0).max(24),
  bulletIndentMm: finiteNumber.min(2).max(16),
  dividerWeightPt: finiteNumber.min(0.1).max(3),
  showDividers: z.boolean(),
  showContactIcons: z.boolean(),
  headerLayout: z.enum(['centered', 'left', 'split']).optional(),
  dividerStyle: z.enum(['solid', 'accent', 'dotted', 'none']).optional(),
  pdfaCompliant: z.boolean().optional(),
});

export const entrySchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  date: z.string(),
  location: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
  technologies: z.array(z.string()),
  links: z.array(contactLinkSchema),
});

export const sectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  entryIds: z.array(z.string()),
  visible: z.boolean(),
  design: sectionDesignSchema.optional(),
});

const profileOverrideSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(contactLinkSchema).optional(),
    photoDataUrl: photoDataUrlSchema.optional(),
  })
  .strict();

const entryOverrideSchema = z
  .object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    technologies: z.array(z.string()).optional(),
    links: z.array(contactLinkSchema).optional(),
  })
  .strict();

export const variantSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mode: z.enum(['resume', 'cv']),
    templateId: z.enum(['t01-simple-ats', 't02-clean-compact', 't03-modern-developer', 't04-academic-cv', 't05-profile-cv']),
    selectedEntryIds: z.array(z.string()),
    sections: z.array(sectionSchema),
    profileOverrides: profileOverrideSchema,
    entryOverrides: z.record(z.string(), entryOverrideSchema),
    design: designSchema,
    targetPages: z.number().int().min(1).max(10),
    maxPages: z.number().int().min(1).max(10),
  })
  .refine(value => value.maxPages >= value.targetPages, {
    message: 'maxPages must be greater than or equal to targetPages',
    path: ['maxPages'],
  });

export const projectSchema = z.object({
  version: z.literal(2),
  library: z.object({
    profile: profileSchema,
    entries: z.array(entrySchema),
  }),
  variants: z.array(variantSchema).min(1),
  activeVariantId: z.string(),
});
