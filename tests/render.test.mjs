import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { resolveVariant } from '../src/lib/data.ts';
import { fixtureProject } from '../src/lib/fixture.ts';
import { renderLatex } from '../src/lib/latex.ts';

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

function minimalPng() {
  const crc32 = buffer => {
    let crc = 0xffffffff;
    for (const byte of buffer) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const name = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, checksum]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([0,70,110,70,255]))), chunk('IEND', Buffer.alloc(0))]);
}

test('all five templates compile to selectable-text PDFs with local pdflatex', async () => {
  const special = structuredClone(fixtureProject);
  const experience = special.library.entries.find(entry => entry.id === 'exp-1');
  experience.bullets[0] = 'Escaping test: \\ { } $ & % # _ ~ ^ with café and “quotes”.';
  experience.links = [{ label: 'Long link', url: `https://example.test/${'long-path-segment-'.repeat(8)}?alpha=first&beta=second` }];
  special.library.profile.links = [];
  const templates = ['t01-simple-ats', 't02-clean-compact', 't03-modern-developer', 't04-academic-cv', 't05-profile-cv'];
  for (const templateId of templates) {
    const dir = await mkdtemp(path.join(tmpdir(), 'resume-studio-render-test-'));
    try {
      const variant = { ...special.variants[0], templateId };
      if (templateId === 't05-profile-cv') {
        const photo = minimalPng();
        special.library.profile.photoDataUrl = `data:image/png;base64,${photo.toString('base64')}`;
        await writeFile(path.join(dir, 'profile-photo.png'), photo);
      }
      await writeFile(path.join(dir, 'resume.tex'), renderLatex(resolveVariant(special, variant)), 'utf8');
      await run(process.env.PDFLATEX_PATH || 'pdflatex', ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-no-shell-escape', 'resume.tex'], dir);
      const pdf = await readFile(path.join(dir, 'resume.pdf'));
      assert.ok(pdf.length > 1000, `${templateId} produced an empty PDF`);
      const parsed = await PDFDocument.load(pdf);
      assert.ok(parsed.getPageCount() >= 1);
      const links = parsed.getPages().flatMap(page => page.node.Annots()?.asArray() ?? []).filter(reference => {
        const annotation = parsed.context.lookup(reference);
        return annotation instanceof PDFDict && annotation.get(PDFName.of('Subtype'))?.toString() === '/Link';
      });
      assert.ok(links.length >= 4, `${templateId} should preserve profile, project, and email links`);
      const text = await run('pdftotext', ['resume.pdf', '-'], dir);
      assert.match(text, /Synthetic Developer/);
      assert.match(text, /Escaping test:/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('overflowing content stays in the compiled selectable-text PDF', async () => {
  const project = structuredClone(fixtureProject);
  const experience = project.library.entries.find(entry => entry.id === 'exp-1');
  experience.bullets = Array.from({ length: 90 }, (_, i) => `Preserved content marker ${i + 1}: ${'long work detail '.repeat(10)}`);
  const dir = await mkdtemp(path.join(tmpdir(), 'resume-studio-overflow-test-'));
  try {
    await writeFile(path.join(dir, 'resume.tex'), renderLatex(resolveVariant(project, project.variants[0])), 'utf8');
    await run(process.env.PDFLATEX_PATH || 'pdflatex', ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-no-shell-escape', 'resume.tex'], dir);
    const info = await run('pdfinfo', ['resume.pdf'], dir);
    const pages = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
    assert.ok(pages > project.variants[0].maxPages, `expected overflow, got ${pages} page(s)`);
    const text = await run('pdftotext', ['resume.pdf', '-'], dir);
    assert.match(text, /Preserved content marker 90/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
