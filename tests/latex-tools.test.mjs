import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { resolveVariant } from '../src/lib/data.ts';
import { fixtureProject } from '../src/lib/fixture.ts';
import { renderLatex } from '../src/lib/latex.ts';

test('PDF/A archival metadata injection in renderLatex', () => {
  const project = structuredClone(fixtureProject);
  const variant = project.variants[0];
  
  // Test without pdfaCompliant
  variant.design.pdfaCompliant = false;
  const standardResolved = resolveVariant(project, variant);
  const standardTex = renderLatex(standardResolved);
  assert.ok(!standardTex.includes('pdftitle='), 'Standard preamble should not force pdftitle metadata');

  // Test with pdfaCompliant: true
  variant.design.pdfaCompliant = true;
  const pdfaResolved = resolveVariant(project, variant);
  const pdfaTex = renderLatex(pdfaResolved);
  assert.ok(pdfaTex.includes('pdftitle='), 'PDF/A compliant preamble must inject pdftitle');
  assert.ok(pdfaTex.includes('pdfauthor='), 'PDF/A compliant preamble must inject pdfauthor');
  assert.ok(pdfaTex.includes('pdfsubject='), 'PDF/A compliant preamble must inject pdfsubject');
});

test('POST /api/export-tex packages standalone LaTeX project into ZIP', async () => {
  const project = structuredClone(fixtureProject);
  const res = await fetch('http://127.0.0.1:3000/api/export-tex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, variantId: project.activeVariantId }),
  });

  assert.equal(res.status, 200, 'Status should be 200 OK');
  assert.equal(res.headers.get('content-type'), 'application/zip');
  const disposition = res.headers.get('content-disposition');
  assert.ok(disposition && disposition.includes('attachment'), 'Must have attachment disposition');
  assert.ok(disposition.includes('_latex_package.zip'), 'Must name the zip package');

  const arrayBuffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Check main.tex
  const mainTexFile = zip.file('main.tex');
  assert.ok(mainTexFile, 'ZIP must contain main.tex');
  const mainTex = await mainTexFile.async('string');
  assert.ok(mainTex.includes('\\documentclass'), 'main.tex must be valid LaTeX source');
  assert.ok(mainTex.includes(project.library.profile.name), 'main.tex must contain candidate name');

  // Check resume-data.json
  const dataFile = zip.file('resume-data.json');
  assert.ok(dataFile, 'ZIP must contain resume-data.json');
  const dataJson = JSON.parse(await dataFile.async('string'));
  assert.equal(dataJson.library.profile.name, project.library.profile.name);
  assert.equal(dataJson.version, 2);

  // Check README.md
  const readmeFile = zip.file('README.md');
  assert.ok(readmeFile, 'ZIP must contain README.md');
  const readme = await readmeFile.async('string');
  assert.ok(readme.includes('Resume LaTeX Package'));
  assert.ok(readme.includes('pdflatex -interaction=nonstopmode'));
});

test('POST /api/export-tex extracts photo assets for t05-profile-cv', async () => {
  const project = structuredClone(fixtureProject);
  const variant = project.variants[0];
  variant.templateId = 't05-profile-cv';
  // 1x1 transparent PNG data URL
  project.library.profile.photoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const res = await fetch('http://127.0.0.1:3000/api/export-tex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, variantId: variant.id }),
  });

  assert.equal(res.status, 200);
  const arrayBuffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const photoFile = zip.file('assets/profile.png');
  assert.ok(photoFile, 'ZIP must extract profile photo to assets/profile.png');

  const mainTex = await zip.file('main.tex').async('string');
  assert.ok(mainTex.includes('assets/profile.png'), 'main.tex must reference local asset path');
});
