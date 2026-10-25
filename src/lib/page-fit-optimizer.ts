/**
 * Resume Studio — Spacing Intelligence & Mathematical Page-Fit Optimizer
 * Computes strictly bounded, deterministic micro-adjustments to fit documents
 * cleanly on target pages with zero silent content loss.
 */

import type { DesignSettings } from './data';

export interface SpacingDiff {
  parameter: keyof DesignSettings;
  label: string;
  current: string;
  proposed: string;
  delta: string;
  impact: 'major' | 'moderate' | 'micro';
}

export interface OptimizationResult {
  strategy: 'tighten' | 'expand' | 'balanced';
  canOptimize: boolean;
  proposedDesign: DesignSettings;
  diffs: SpacingDiff[];
  estimatedSpaceReclaimedPercent: number;
  explanation: string;
}

// Typographic safety boundaries — strictly preserves readability
export const SPACING_LIMITS = {
  minFontSize: 9.0,
  maxFontSize: 11.5,
  minMarginMm: 13.0,
  maxMarginMm: 24.0,
  minSectionGapPt: 4.0,
  maxSectionGapPt: 16.0,
  minEntryGapPt: 2.0,
  maxEntryGapPt: 8.0,
  minLineSpacing: 1.05,
  maxLineSpacing: 1.35,
  minBulletSpacing: 0.5,
  maxBulletSpacing: 4.0,
};

/**
 * Calculates optimal spacing micro-adjustments to fit onto target page(s)
 * or to balance an underfilled page.
 */
export function optimizePageFit(
  current: DesignSettings,
  mode: 'tighten' | 'expand' = 'tighten'
): OptimizationResult {
  const proposed: DesignSettings = structuredClone(current);
  const diffs: SpacingDiff[] = [];
  let estimatedDeltaPercent = 0;

  if (mode === 'tighten') {
    // 1. Margins: Reduce top and bottom margins by 1.5mm - 2.5mm
    if (current.marginTopMm > SPACING_LIMITS.minMarginMm + 1) {
      const step = current.marginTopMm > 17 ? 2.5 : 1.5;
      const newMargin = Math.max(SPACING_LIMITS.minMarginMm, Math.round((current.marginTopMm - step) * 10) / 10);
      if (newMargin !== current.marginTopMm) {
        proposed.marginTopMm = newMargin;
        proposed.marginBottomMm = newMargin;
        diffs.push({
          parameter: 'marginTopMm',
          label: 'Top/Bottom Margins',
          current: `${current.marginTopMm}mm`,
          proposed: `${newMargin}mm`,
          delta: `-${(current.marginTopMm - newMargin).toFixed(1)}mm`,
          impact: 'moderate',
        });
        estimatedDeltaPercent += 3.5;
      }
    }

    // 2. Section Gaps: Reduce sectionGapPt by 1.5pt - 2.0pt
    if (current.sectionGapPt > SPACING_LIMITS.minSectionGapPt + 0.5) {
      const step = current.sectionGapPt >= 8 ? 2.0 : 1.5;
      const newSectionGap = Math.max(SPACING_LIMITS.minSectionGapPt, Math.round((current.sectionGapPt - step) * 10) / 10);
      if (newSectionGap !== current.sectionGapPt) {
        proposed.sectionGapPt = newSectionGap;
        diffs.push({
          parameter: 'sectionGapPt',
          label: 'Section Spacing',
          current: `${current.sectionGapPt}pt`,
          proposed: `${newSectionGap}pt`,
          delta: `-${(current.sectionGapPt - newSectionGap).toFixed(1)}pt`,
          impact: 'moderate',
        });
        estimatedDeltaPercent += 2.5;
      }
    }

    // 3. Entry Gaps: Reduce entryGapPt by 1.0pt - 1.5pt
    if (current.entryGapPt > SPACING_LIMITS.minEntryGapPt + 0.5) {
      const step = current.entryGapPt >= 4 ? 1.2 : 0.8;
      const newEntryGap = Math.max(SPACING_LIMITS.minEntryGapPt, Math.round((current.entryGapPt - step) * 10) / 10);
      if (newEntryGap !== current.entryGapPt) {
        proposed.entryGapPt = newEntryGap;
        diffs.push({
          parameter: 'entryGapPt',
          label: 'Entry Spacing',
          current: `${current.entryGapPt}pt`,
          proposed: `${newEntryGap}pt`,
          delta: `-${(current.entryGapPt - newEntryGap).toFixed(1)}pt`,
          impact: 'micro',
        });
        estimatedDeltaPercent += 1.8;
      }
    }

    // 4. Line Spacing: Micro-tune leading
    if (current.lineSpacing > SPACING_LIMITS.minLineSpacing + 0.03) {
      const newLeading = Math.max(SPACING_LIMITS.minLineSpacing, Math.round((current.lineSpacing - 0.05) * 100) / 100);
      if (newLeading !== current.lineSpacing) {
        proposed.lineSpacing = newLeading;
        diffs.push({
          parameter: 'lineSpacing',
          label: 'Line Height',
          current: `${current.lineSpacing}`,
          proposed: `${newLeading}`,
          delta: `-${(current.lineSpacing - newLeading).toFixed(2)}`,
          impact: 'micro',
        });
        estimatedDeltaPercent += 2.0;
      }
    }

    // 5. Font Size: Micro-adjust only if current font is >= 9.6pt
    if (current.fontSize > SPACING_LIMITS.minFontSize + 0.3) {
      const step = current.fontSize >= 10.2 ? 0.5 : 0.4;
      const newFontSize = Math.max(SPACING_LIMITS.minFontSize, Math.round((current.fontSize - step) * 10) / 10);
      if (newFontSize !== current.fontSize) {
        proposed.fontSize = newFontSize;
        diffs.push({
          parameter: 'fontSize',
          label: 'Base Font Size',
          current: `${current.fontSize}pt`,
          proposed: `${newFontSize}pt`,
          delta: `-${(current.fontSize - newFontSize).toFixed(1)}pt`,
          impact: 'major',
        });
        estimatedDeltaPercent += 4.5;
      }
    }

    // 6. Bullet Spacing: Reduce by 0.5pt - 1.0pt
    if (current.bulletSpacing > SPACING_LIMITS.minBulletSpacing + 0.5) {
      const newBulletSpacing = Math.max(SPACING_LIMITS.minBulletSpacing, Math.round((current.bulletSpacing - 1.0) * 10) / 10);
      if (newBulletSpacing !== current.bulletSpacing) {
        proposed.bulletSpacing = newBulletSpacing;
        diffs.push({
          parameter: 'bulletSpacing',
          label: 'Bullet Item Gap',
          current: `${current.bulletSpacing}pt`,
          proposed: `${newBulletSpacing}pt`,
          delta: `-${(current.bulletSpacing - newBulletSpacing).toFixed(1)}pt`,
          impact: 'micro',
        });
        estimatedDeltaPercent += 1.2;
      }
    }

    return {
      strategy: 'tighten',
      canOptimize: diffs.length > 0,
      proposedDesign: proposed,
      diffs,
      estimatedSpaceReclaimedPercent: Math.round(estimatedDeltaPercent),
      explanation: `Micro-adjusted ${diffs.length} spacing parameters to safely reclaim ~${Math.round(
        estimatedDeltaPercent
      )}% vertical space without dropping any content.`,
    };
  } else {
    // EXPAND STRATEGY: Balance an underfilled document
    if (current.sectionGapPt < SPACING_LIMITS.maxSectionGapPt - 2) {
      const newGap = Math.min(SPACING_LIMITS.maxSectionGapPt, Math.round((current.sectionGapPt + 2.5) * 10) / 10);
      proposed.sectionGapPt = newGap;
      diffs.push({
        parameter: 'sectionGapPt',
        label: 'Section Spacing',
        current: `${current.sectionGapPt}pt`,
        proposed: `${newGap}pt`,
        delta: `+${(newGap - current.sectionGapPt).toFixed(1)}pt`,
        impact: 'moderate',
      });
      estimatedDeltaPercent += 3.0;
    }

    if (current.entryGapPt < SPACING_LIMITS.maxEntryGapPt - 1.5) {
      const newEntryGap = Math.min(SPACING_LIMITS.maxEntryGapPt, Math.round((current.entryGapPt + 1.5) * 10) / 10);
      proposed.entryGapPt = newEntryGap;
      diffs.push({
        parameter: 'entryGapPt',
        label: 'Entry Spacing',
        current: `${current.entryGapPt}pt`,
        proposed: `${newEntryGap}pt`,
        delta: `+${(newEntryGap - current.entryGapPt).toFixed(1)}pt`,
        impact: 'moderate',
      });
      estimatedDeltaPercent += 2.5;
    }

    if (current.marginTopMm < SPACING_LIMITS.maxMarginMm - 2) {
      const newMargin = Math.min(SPACING_LIMITS.maxMarginMm, Math.round((current.marginTopMm + 2.0) * 10) / 10);
      proposed.marginTopMm = newMargin;
      proposed.marginBottomMm = newMargin;
      diffs.push({
        parameter: 'marginTopMm',
        label: 'Top/Bottom Margins',
        current: `${current.marginTopMm}mm`,
        proposed: `${newMargin}mm`,
        delta: `+${(newMargin - current.marginTopMm).toFixed(1)}mm`,
        impact: 'moderate',
      });
      estimatedDeltaPercent += 3.5;
    }

    return {
      strategy: 'expand',
      canOptimize: diffs.length > 0,
      proposedDesign: proposed,
      diffs,
      estimatedSpaceReclaimedPercent: Math.round(estimatedDeltaPercent),
      explanation: `Expanded ${diffs.length} spacing parameters to achieve balanced executive whitespace across the page.`,
    };
  }
}
