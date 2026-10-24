import test from 'node:test';
import assert from 'node:assert/strict';
import { getDesignPreset } from '../src/lib/design-presets.ts';
import { fixtureProject } from '../src/lib/fixture.ts';

test('design presets return complete settings without changing content or policy', () => {
  const project = structuredClone(fixtureProject);
  const original = structuredClone(project.library);
  const preset = getDesignPreset('developer-accent', 't03-modern-developer', 'resume');
  project.variants[0].design = preset;
  assert.deepEqual(project.library, original);
  assert.equal(project.variants[0].targetPages, 1);
  assert.equal(project.variants[0].maxPages, 1);
  assert.match(preset.accentColor, /^#[0-9a-f]{6}$/i);
  assert.equal(preset.marginLeftMm, preset.marginRightMm);
});

test('presets distinguish compact and academic spacing with readable minimum type', () => {
  const compact = getDesignPreset('compact', 't02-clean-compact', 'resume');
  const academic = getDesignPreset('academic', 't04-academic-cv', 'cv');
  assert.ok(compact.entryGapPt <= academic.entryGapPt);
  assert.ok(compact.sectionGapPt <= academic.sectionGapPt);
  assert.ok(compact.fontSize >= 8 && academic.fontSize >= 8);
});
