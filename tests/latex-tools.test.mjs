import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { resolveVariant } from '../src/lib/data.ts';
import { fixtureProject } from '../src/lib/fixture.ts';
import { renderLatex } from '../src/lib/latex.ts';
import { POST as exportTex } from '../src/app/api/export-tex/route.ts';

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    let output = '';
    child.stdout.on('data', chunk => { if (output.length < 20000) output += chunk.toString(); });
    child.stderr.on('data', chunk => { if (output.length < 20000) output += chunk.toString(); });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve(output) : reject(new Error(output.slice(-3000))));
  });
}

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
  const res = await exportTex(new Request('http://127.0.0.1/api/export-tex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, variantId: project.activeVariantId }),
  }));

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

  const res = await exportTex(new Request('http://127.0.0.1/api/export-tex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, variantId: variant.id }),
  }));

  assert.equal(res.status, 200);
  const arrayBuffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const photoFile = zip.file('assets/profile.png');
  assert.ok(photoFile, 'ZIP must extract profile photo to assets/profile.png');

  const mainTex = await zip.file('main.tex').async('string');
  assert.ok(mainTex.includes('assets/profile.png'), 'main.tex must reference local asset path');
});

test('POST /api/export-tex supports PDF portraits and compiles standalone', async () => {
  const project = structuredClone(fixtureProject);
  const variant = project.variants[0];
  variant.templateId = 't05-profile-cv';

  const photoDoc = await PDFDocument.create();
  photoDoc.addPage([10, 10]);
  const photoBytes = await photoDoc.save();
  project.library.profile.photoDataUrl = `data:image/pdf;base64,${Buffer.from(photoBytes).toString('base64')}`;

  const res = await exportTex(new Request('http://127.0.0.1/api/export-tex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, variantId: variant.id }),
  }));

  assert.equal(res.status, 200);
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  assert.ok(zip.file('assets/profile.pdf'), 'ZIP must extract a PDF portrait to assets/profile.pdf');

  const mainTex = await zip.file('main.tex').async('string');
  assert.ok(mainTex.includes('assets/profile.pdf'), 'main.tex must reference the extracted PDF asset');

  const dir = await mkdtemp(path.join(tmpdir(), 'resume-studio-export-test-'));
  try {
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const target = path.join(dir, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, await entry.async('nodebuffer'));
    }
    await run(process.env.PDFLATEX_PATH || 'pdflatex', ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-no-shell-escape', 'main.tex'], dir);
    const compiled = await readFile(path.join(dir, 'main.pdf'));
    assert.ok(compiled.length > 1000, 'standalone exported package must compile to a PDF');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
