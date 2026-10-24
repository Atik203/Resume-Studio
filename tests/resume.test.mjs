import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVariant, validateProject } from '../src/lib/data.ts';
import { escapeLatex, renderLatex } from '../src/lib/latex.ts';
import { fixtureProject } from '../src/lib/fixture.ts';

test('project fixture validates and invalid versions are rejected', () => {
  assert.equal(validateProject(fixtureProject).version, 1);
  assert.throws(() => validateProject({ ...fixtureProject, version: 99 }), /version/i);
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
  assert.match(rendered, /\\par\{\\small 2023 -- Present\}/);
});
