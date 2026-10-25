import type { DesignSettings, DocumentMode, TemplateId } from './data.ts';

export type DesignPresetId = 'classic-ats' | 'compact' | 'developer-accent' | 'academic';
export const designPresets: { id: DesignPresetId; label: string; description: string }[] = [
  { id: 'classic-ats', label: 'Classic ATS', description: 'Clear black and white hierarchy' },
  { id: 'compact', label: 'Clean Compact', description: 'Tighter spacing with full content' },
  { id: 'developer-accent', label: 'Developer Accent', description: 'A restrained color for headings' },
  { id: 'academic', label: 'Academic', description: 'Roomier section rhythm for a CV' },
];

export function getDesignPreset(id: DesignPresetId, templateId: TemplateId, mode: DocumentMode): DesignSettings {
  const academic = id === 'academic' || templateId === 't04-academic-cv' || mode === 'cv';
  const compact = id === 'compact' || templateId === 't02-clean-compact';
  const accentColor = id === 'developer-accent' || templateId === 't03-modern-developer' ? '#315b78' : '#222222';
  return {
    paper: 'a4', fontSize: academic ? 10.5 : 10, fontFamily: 'latin-modern-serif',
    marginTopMm: academic ? 20 : compact ? 14 : 18,
    marginRightMm: academic ? 20 : compact ? 14 : 18,
    marginBottomMm: academic ? 20 : compact ? 14 : 18,
    marginLeftMm: academic ? 20 : compact ? 14 : 18,
    accentColor, textColor: '#171717', lineSpacing: academic ? 1.08 : 1,
    bulletSpacing: academic ? 3 : 2, dateAlignment: 'right',
    showEmail: true, showPhone: true, showLocation: true, showLinks: true, pageNumbers: false,
    sectionGapPt: academic ? 9 : compact ? 5 : 7, entryGapPt: academic ? 4 : compact ? 0 : 1,
    bulletIndentMm: 4.4, dividerWeightPt: academic ? 1.2 : 0.45,
    showDividers: true, showContactIcons: false,
    headerLayout: compact ? 'left' : 'centered',
    dividerStyle: 'solid',
  };
}
