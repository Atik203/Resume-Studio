import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveVariant } from '../src/lib/data.ts';
import { fixtureProject } from '../src/lib/fixture.ts';
import { renderLatex } from '../src/lib/latex.ts';

const templateIds = ['t01-simple-ats', 't02-clean-compact', 't03-modern-developer', 't04-academic-cv', 't05-profile-cv'];

test('all five templates render byte-identical golden LaTeX', async () => {
  for (const templateId of templateIds) {
    const variant = { ...fixtureProject.variants[0], templateId };
    const latex = renderLatex(resolveVariant(fixtureProject, variant));
    const golden = await readFile(new URL(`./golden/${templateId}.tex`, import.meta.url), 'utf8');
    assert.equal(latex, golden, `${templateId} LaTeX output drifted from the golden snapshot`);
  }
});
