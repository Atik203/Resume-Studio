import { mkdir, writeFile } from 'node:fs/promises';
import { resolveVariant } from '../src/lib/data.ts';
import { fixtureProject } from '../src/lib/fixture.ts';
import { renderLatex } from '../src/lib/latex.ts';

const templateIds = ['t01-simple-ats', 't02-clean-compact', 't03-modern-developer', 't04-academic-cv', 't05-profile-cv'];
const goldenDir = new URL('../tests/golden/', import.meta.url);

await mkdir(goldenDir, { recursive: true });

for (const templateId of templateIds) {
  const variant = { ...fixtureProject.variants[0], templateId };
  const latex = renderLatex(resolveVariant(fixtureProject, variant));
  await writeFile(new URL(`${templateId}.tex`, goldenDir), latex, 'utf8');
  console.log(`wrote tests/golden/${templateId}.tex`);
}
