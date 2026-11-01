import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProject } from '../src/lib/data.ts';
import { fixtureProject } from '../src/lib/fixture.ts';
import {
  contactLinkSchema,
  profileSchema,
  sectionDesignSchema,
  designSchema,
} from '../src/lib/schema.ts';

test('fixture project validates and unknown future keys survive', () => {
  const project = structuredClone(fixtureProject);
  project.__future = { note: 'keep me' };
  const validated = validateProject(project);
  assert.equal(validated.version, 2);
  assert.deepEqual(validated.__future, { note: 'keep me' });
});

test('contact links accept safe protocols and reject unsafe ones', () => {
  assert.equal(contactLinkSchema.safeParse({ type: 'website', label: 'Site', url: 'https://example.test' }).success, true);
  assert.equal(contactLinkSchema.safeParse({ type: 'website', label: 'Mail', url: 'mailto:hello@example.test' }).success, true);
  assert.equal(contactLinkSchema.safeParse({ type: 'website', label: 'X', url: 'javascript:alert(1)' }).success, false);
  assert.equal(contactLinkSchema.safeParse({ type: 'unknown', label: 'X', url: 'https://example.test' }).success, false);
});

test('profile, design, and section-design ranges match existing constraints', () => {
  const profile = structuredClone(fixtureProject.library.profile);
  assert.equal(profileSchema.safeParse(profile).success, true);
  assert.equal(profileSchema.safeParse({ ...profile, name: undefined }).success, false);
  assert.equal(profileSchema.safeParse({ ...profile, photoDataUrl: 'data:image/webp;base64,abc' }).success, false);

  const design = structuredClone(fixtureProject.variants[0].design);
  assert.equal(designSchema.safeParse(design).success, true);
  assert.equal(designSchema.safeParse({ ...design, fontSize: 40 }).success, false);
  assert.equal(designSchema.safeParse({ ...design, marginTopMm: 2 }).success, false);
  assert.equal(designSchema.safeParse({ ...design, accentColor: 'red' }).success, false);
  assert.equal(designSchema.safeParse({ ...design, linkDisplay: 'both', linkUnderline: false, showEntryLocations: false, dividerWidth: 'half' }).success, true);
  assert.equal(designSchema.safeParse({ ...design, linkDisplay: 'full' }).success, false);

  assert.equal(sectionDesignSchema.safeParse({ fontSizePt: 11 }).success, true);
  assert.equal(sectionDesignSchema.safeParse({ fontSizePt: 40 }).success, false);
  assert.equal(sectionDesignSchema.safeParse({ unexpected: 1 }).success, false);
  assert.equal(sectionDesignSchema.safeParse({ dividerWidth: 'label' }).success, true);
  assert.equal(sectionDesignSchema.safeParse({ dividerWidth: 'quarter' }).success, false);
});

test('validateProject preserves its actionable error messages', () => {
  const invalidUrl = structuredClone(fixtureProject);
  invalidUrl.library.entries[0].links = [{ type: 'website', label: 'Unsafe', url: 'javascript:alert(1)' }];
  assert.throws(() => validateProject(invalidUrl), /invalid/i);

  const invalidSection = structuredClone(fixtureProject);
  invalidSection.variants[0].sections[0].design = { fontSizePt: 40 };
  assert.throws(() => validateProject(invalidSection), /valid variant/i);

  const duplicateEntries = structuredClone(fixtureProject);
  duplicateEntries.library.entries.push(structuredClone(duplicateEntries.library.entries[0]));
  assert.throws(() => validateProject(duplicateEntries), /duplicate entry IDs/i);

  const duplicateVariants = structuredClone(fixtureProject);
  duplicateVariants.variants.push(structuredClone(duplicateVariants.variants[0]));
  assert.throws(() => validateProject(duplicateVariants), /duplicate variant IDs/i);

  const selectedWithoutSection = structuredClone(fixtureProject);
  selectedWithoutSection.library.entries.push({ ...structuredClone(selectedWithoutSection.library.entries[0]), id: 'extra-entry' });
  selectedWithoutSection.variants[0].selectedEntryIds.push('extra-entry');
  assert.throws(() => validateProject(selectedWithoutSection), /selected content without a section/i);

  const sectionItemNotSelected = structuredClone(fixtureProject);
  sectionItemNotSelected.library.entries.push({ ...structuredClone(sectionItemNotSelected.library.entries[0]), id: 'extra-entry' });
  sectionItemNotSelected.variants[0].sections[0].entryIds.push('extra-entry');
  assert.throws(() => validateProject(sectionItemNotSelected), /section item that is not selected/i);

  const duplicatePlacement = structuredClone(fixtureProject);
  duplicatePlacement.variants[0].sections[1].entryIds.push(duplicatePlacement.variants[0].sections[0].entryIds[0]);
  assert.throws(() => validateProject(duplicatePlacement), /places a content item more than once/i);

  const overrideMissingEntry = structuredClone(fixtureProject);
  overrideMissingEntry.variants[0].entryOverrides['missing-entry'] = {};
  assert.throws(() => validateProject(overrideMissingEntry), /overrides a missing library item/i);

  const missingActiveVariant = structuredClone(fixtureProject);
  missingActiveVariant.activeVariantId = 'missing-variant';
  assert.throws(() => validateProject(missingActiveVariant), /Active variant does not exist/i);
});
