import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizePageFit, SPACING_LIMITS } from '../src/lib/page-fit-optimizer.ts';
import { analyzeBulletOrphans, scanEntryOrphans } from '../src/lib/orphan-hunter.ts';
import { renderLatex } from '../src/lib/latex.ts';
import { fixtureProject } from '../src/lib/fixture.ts';
import { resolveVariant } from '../src/lib/data.ts';

test('page-fit optimizer tightens spacing within strict safety boundaries', () => {
  const currentDesign = structuredClone(fixtureProject.variants[0].design);
  currentDesign.marginTopMm = 18;
  currentDesign.sectionGapPt = 8;
  currentDesign.entryGapPt = 4;
  currentDesign.fontSize = 10;
  currentDesign.lineSpacing = 1.15;
  currentDesign.bulletSpacing = 2;

  const result = optimizePageFit(currentDesign, 'tighten');

  assert.equal(result.strategy, 'tighten');
  assert.equal(result.canOptimize, true);
  assert.ok(result.diffs.length >= 4, 'Multiple spacing parameters adjusted');
  assert.ok(result.proposedDesign.marginTopMm < currentDesign.marginTopMm);
  assert.ok(result.proposedDesign.sectionGapPt < currentDesign.sectionGapPt);
  assert.ok(result.proposedDesign.entryGapPt < currentDesign.entryGapPt);
  assert.ok(result.proposedDesign.fontSize < currentDesign.fontSize);
  assert.ok(result.proposedDesign.fontSize >= SPACING_LIMITS.minFontSize, 'Font size never drops below safety floor');
  assert.ok(result.proposedDesign.marginTopMm >= SPACING_LIMITS.minMarginMm, 'Margins never drop below safety floor');
  assert.ok(result.estimatedSpaceReclaimedPercent > 5);
});

test('page-fit optimizer expands spacing to balance an underfilled page', () => {
  const currentDesign = structuredClone(fixtureProject.variants[0].design);
  currentDesign.sectionGapPt = 6;
  currentDesign.entryGapPt = 3;
  currentDesign.marginTopMm = 14;

  const result = optimizePageFit(currentDesign, 'expand');

  assert.equal(result.strategy, 'expand');
  assert.equal(result.canOptimize, true);
  assert.ok(result.proposedDesign.sectionGapPt > currentDesign.sectionGapPt);
  assert.ok(result.proposedDesign.entryGapPt > currentDesign.entryGapPt);
  assert.ok(result.proposedDesign.marginTopMm > currentDesign.marginTopMm);
});

test('orphan hunter detects trailing single-word wraps and wordy fillers', () => {
  // A bullet that wraps onto line 2 with just 1 trailing word ("scale.")
  const bulletWithOrphan =
    'Architected a resilient event-driven microservices backend using Go and gRPC for scale.';
  const candidate = analyzeBulletOrphans(bulletWithOrphan);

  assert.ok(candidate !== null, 'Orphan detected');
  assert.ok(candidate.trailingSnippet.includes('scale.'));
  assert.ok(candidate.charsNeededToSaveLine > 0);

  // A bullet with wordy filler "in order to"
  const bulletWithFiller =
    'Spearheaded architectural refactoring of monolithic backend in order to drastically reduce response latency.';
  const fillerCandidate = analyzeBulletOrphans(bulletWithFiller);

  if (fillerCandidate) {
    assert.ok(fillerCandidate.fillerFound !== undefined);
    assert.equal(fillerCandidate.fillerFound.phrase.trim(), 'in order to');
    assert.ok(fillerCandidate.suggestedReplacement.includes(' to '));
  }
});

test('scanEntryOrphans handles empty and clean bullets without false positives', () => {
  const shortBullets = ['Led team of 5 engineers.', 'Created clean React components.'];
  const orphans = scanEntryOrphans(shortBullets);
  assert.equal(orphans.length, 0);
});

test('section pageBreakBefore emits clearpage in LaTeX rendering', () => {
  const project = structuredClone(fixtureProject);
  const variant = structuredClone(project.variants[0]);
  variant.sections[1].design = { pageBreakBefore: true };
  const resolved = resolveVariant(project, variant);
  const latex = renderLatex(resolved);

  assert.ok(latex.includes('\\clearpage\\noindent'), 'Emits clearpage before section');
});
