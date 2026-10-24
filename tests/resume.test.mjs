import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateProject, resolveVariant, validateProject } from '../src/lib/data.ts';
import { escapeLatex, renderLatex } from '../src/lib/latex.ts';
import { fixtureProject } from '../src/lib/fixture.ts';

test('project fixture validates and invalid versions are rejected', () => {
  assert.equal(validateProject(fixtureProject).version, 2);
  assert.throws(() => validateProject({ ...fixtureProject, version: 99 }), /version/i);
  const oldV2 = structuredClone(fixtureProject);
  oldV2.variants[0].design.fontFamily = 'serif';
  const current = validateProject(oldV2);
  assert.equal(current.variants[0].design.fontFamily, 'latin-modern-serif');
  assert.equal(oldV2.variants[0].design.fontFamily, 'serif');
});

test('v1 backups migrate without losing profile, entries, overrides, photos, or design values', () => {
  const legacy = structuredClone(fixtureProject);
  legacy.version = 1;
  const legacyLinks = links => links.map(({ label, url }) => ({ label, url }));
  legacy.library.profile.links = legacyLinks(legacy.library.profile.links);
  legacy.library.entries.forEach(entry => { entry.links = legacyLinks(entry.links); });
  legacy.variants.forEach(variant => {
    variant.design.marginMm = variant.design.marginTopMm;
    for (const key of ['marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm', 'sectionGapPt', 'entryGapPt', 'bulletIndentMm', 'dividerWeightPt', 'showDividers', 'showContactIcons']) delete variant.design[key];
    if (variant.profileOverrides.links) variant.profileOverrides.links = legacyLinks(variant.profileOverrides.links);
    Object.values(variant.entryOverrides).forEach(override => { if (override.links) override.links = legacyLinks(override.links); });
  });
  legacy.library.profile.photoDataUrl = 'data:image/png;base64,aGVsbG8=';
  legacy.variants[0].profileOverrides = { title: 'Variant title', links: [{ label: 'GitHub', url: 'https://github.com/example' }] };
  legacy.variants[0].entryOverrides['exp-1'] = { bullets: ['Keep this bullet'] };
  legacy.variants[0].design.marginMm = 23;
  const migrated = migrateProject(legacy);
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.library.profile.photoDataUrl, legacy.library.profile.photoDataUrl);
  assert.deepEqual(migrated.variants[0].profileOverrides.links, [{ type: 'website', label: 'GitHub', url: 'https://github.com/example' }]);
  assert.deepEqual(migrated.variants[0].entryOverrides['exp-1'].bullets, ['Keep this bullet']);
  assert.deepEqual([migrated.variants[0].design.marginTopMm, migrated.variants[0].design.marginRightMm, migrated.variants[0].design.marginBottomMm, migrated.variants[0].design.marginLeftMm], [23, 23, 23, 23]);
  assert.equal(migrated.variants[0].design.fontSize, legacy.variants[0].design.fontSize);
  assert.deepEqual(validateProject(legacy), migrated);
});

test('variant overrides do not mutate master entries or sibling variants', () => {
  const project = structuredClone(fixtureProject);
  const resolved = resolveVariant(project, project.variants[0]);
  resolved.profile.name = 'Variant Name';
  resolved.entries[0].title = 'Variant Role';
  assert.equal(project.library.profile.name, fixtureProject.library.profile.name);
  assert.equal(project.library.entries[0].title, fixtureProject.library.entries[0].title);
  assert.notEqual(resolveVariant(project, project.variants[1]).profile.name, 'Variant Name');
});

test('section ordering is kept per variant and JSON backup round-trips', () => {
  const project = structuredClone(fixtureProject);
  project.variants[0].sections.reverse();
  const copy = validateProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(copy.variants[0].sections.map(section => section.id), ['education', 'projects', 'experience', 'skills']);
  assert.deepEqual(copy.library, project.library);
});

test('invalid URLs and unsupported glyphs produce actionable validation errors', () => {
  const project = structuredClone(fixtureProject);
  project.library.entries[0].links = [{ label: 'Unsafe', url: 'javascript:alert(1)' }];
  assert.throws(() => validateProject(project), /invalid/i);
  assert.throws(() => escapeLatex('Rocket 🚀'), /Unsupported character.*U\+1F680/);
});

test('LaTeX escaping protects metacharacters and line breaks', () => {
  assert.equal(escapeLatex('\\{}$&%#_~^\r\nNext'), '\\textbackslash{}\\{\\}\\$\\&\\%\\#\\_\\textasciitilde{}\\textasciicircum{}\\\\Next');
});

test('all templates render structured content without embedding raw TeX', () => {
  for (const templateId of ['t01-simple-ats', 't02-clean-compact', 't03-modern-developer', 't04-academic-cv', 't05-profile-cv']) {
    const variant = fixtureProject.variants[0];
    const latex = renderLatex(resolveVariant(fixtureProject, { ...variant, templateId }));
    assert.match(latex, /\\documentclass/);
    assert.match(latex, /Synthetic Developer/);
    assert.doesNotMatch(latex, /\\input\{.*\.tex/);
  }
});

test('design settings control contact visibility, dates, color, font, and page numbering', () => {
  const project = structuredClone(fixtureProject);
  const variant = structuredClone(project.variants[0]);
  project.library.entries.forEach(entry => { entry.location = ''; });
  variant.design = { ...variant.design, showEmail: false, showPhone: false, showLocation: false, showLinks: false, dateAlignment: 'below', textColor: '#234567', fontFamily: 'sans', pageNumbers: true, bulletSpacing: 4 };
  const rendered = renderLatex(resolveVariant(project, variant));
  assert.doesNotMatch(rendered, /hello@example\.test|\+1 555 0100|Example City/);
  assert.match(rendered, /\\renewcommand\{\\familydefault\}\{\\sfdefault\}/);
  assert.match(rendered, /\\definecolor\{bodytext\}\{HTML\}\{234567\}/);
  assert.match(rendered, /\\pagestyle\{plain\}/);
  assert.match(rendered, /itemsep=4pt/);
  assert.match(rendered, /top=18mm,right=18mm,bottom=18mm,left=18mm/);
  assert.match(rendered, /leftmargin=4\.4mm/);
  assert.match(rendered, /\\par\{\\small 2023 -- Present\}/);
});

test('independent margins, gaps, bullet indentation, and divider visibility reach LaTeX', () => {
  const variant = structuredClone(fixtureProject.variants[0]);
  variant.design = { ...variant.design, marginTopMm: 12, marginRightMm: 15, marginBottomMm: 17, marginLeftMm: 21, sectionGapPt: 11, entryGapPt: 8, bulletIndentMm: 6, dividerWeightPt: 1.1, showDividers: false };
  const rendered = renderLatex(resolveVariant(fixtureProject, variant));
  assert.match(rendered, /top=12mm,right=15mm,bottom=17mm,left=21mm/);
  assert.match(rendered, /\\addvspace\{11pt\}/);
  assert.match(rendered, /\\vspace\{8pt\}/);
  assert.match(rendered, /leftmargin=6mm/);
  assert.doesNotMatch(rendered, /\\rule\{\\linewidth\}\{1\.1pt\}/);
});

test('optional typed-link marks keep the human-readable link label and URL', () => {
  const project = structuredClone(fixtureProject);
  project.variants[0].design.showContactIcons = true;
  const rendered = renderLatex(resolveVariant(project, project.variants[0]));
  assert.match(rendered, /\[PORT\].*Portfolio/);
  assert.match(rendered, /\\href\{\\detokenize\{https:\/\/example\.test\/?\}\}/);
});

test('section-scoped font, margin, padding, and divider settings render into their own section', () => {
  const project = structuredClone(fixtureProject);
  project.variants[0].sections[0].design = { fontSizePt: 11, marginLeftMm: 5, marginRightMm: 3, marginTopPt: 4, marginBottomPt: 6, paddingTopPt: 2, paddingBottomPt: 3, showDivider: false, dividerWeightPt: 1.1 };
  const rendered = renderLatex(resolveVariant(project, project.variants[0]));
  assert.match(rendered, /setlength\{\\leftskip\}\{5mm\}.*linewidth-5mm-3mm/s);
  assert.match(rendered, /fontsize\{11pt\}\{13\.20pt\}/);
  assert.match(rendered, /vspace\{2pt\}\\fontsize\{11pt\}/);
  assert.match(rendered, /ResumeSection\{Skills\}\{0pt\}\{\\dimexpr\\linewidth-5mm-3mm/);
  assert.throws(() => validateProject({ ...project, variants: [{ ...project.variants[0], sections: [{ ...project.variants[0].sections[0], design: { fontSizePt: 40 } }, ...project.variants[0].sections.slice(1)] }] }), /valid variant/i);
});

test('validated local font choices select the matching TeX Live package', () => {
  const project = structuredClone(fixtureProject);
  const variant = project.variants[0];
  for (const [fontFamily, packageName] of [['latin-modern-serif', 'lmodern'], ['latin-modern-sans', 'lmodern'], ['tex-gyre-termes', 'tgtermes'], ['tex-gyre-heros', 'tgheros'], ['tex-gyre-pagella', 'tgpagella'], ['tex-gyre-schola', 'tgschola'], ['tex-gyre-cursor', 'tgcursor']]) {
    const output = renderLatex(resolveVariant(project, { ...variant, design: { ...variant.design, fontFamily } }));
    assert.match(output, new RegExp(`\\\\usepackage\\{${packageName}\\}`));
  }
});
