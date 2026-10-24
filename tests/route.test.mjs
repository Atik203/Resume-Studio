import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { POST } from '../src/app/api/compile/route.ts';
import { fixtureProject } from '../src/lib/fixture.ts';

test('local compile route returns a verified PDF and page metadata', async () => {
  const request = new Request('http://127.0.0.1/api/compile', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project: fixtureProject, variantId: 'variant-resume' }),
  });
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('content-disposition'), null);
  assert.equal(response.headers.get('x-resume-page-count'), '1');
  assert.equal(response.headers.get('x-resume-max-pages'), '1');
  assert.equal(response.headers.get('x-resume-overflow'), 'false');
  const { pdfBase64 } = await response.json();
  const pdf = Buffer.from(pdfBase64, 'base64');
  assert.ok(pdf.byteLength > 1000);
  const parsed = await PDFDocument.load(pdf);
  assert.equal(parsed.getPageCount(), 1);
});

test('local compile route reports actual over-limit page metadata without dropping text', async () => {
  const project = structuredClone(fixtureProject);
  const variant = project.variants.find(item => item.id === 'variant-resume');
  const experience = project.library.entries.find(item => item.id === 'exp-1');
  experience.bullets = Array.from({ length: 65 }, (_, index) => `Synthetic long-form detail ${index + 1} preserves every selected statement.`);
  const request = new Request('http://127.0.0.1/api/compile', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project, variantId: variant.id }),
  });
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.ok(Number(response.headers.get('x-resume-page-count')) > 1);
  assert.equal(response.headers.get('x-resume-max-pages'), '1');
  assert.equal(response.headers.get('x-resume-overflow'), 'true');
  const { pdfBase64 } = await response.json();
  const pdf = Buffer.from(pdfBase64, 'base64');
  const dir = await mkdtemp(path.join(tmpdir(), 'resume-studio-route-test-'));
  try {
    await writeFile(path.join(dir, 'route.pdf'), pdf);
    const extracted = await new Promise((resolve, reject) => {
      const child = spawn('pdftotext', [path.join(dir, 'route.pdf'), '-'], { cwd: dir, shell: false, windowsHide: true });
      let text = '';
      child.stdout.on('data', chunk => { if (text.length < 100_000) text += chunk.toString(); });
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve(text) : reject(new Error(`pdftotext exited ${code}`)));
    });
    assert.match(extracted, /Synthetic long-form detail 65 preserves every selected statement/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('local compile route reports a missing configured pdflatex executable', async () => {
  const original = process.env.PDFLATEX_PATH;
  process.env.PDFLATEX_PATH = 'missing-pdflatex-for-test.exe';
  try {
    const request = new Request('http://127.0.0.1/api/compile', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: fixtureProject, variantId: 'variant-resume' }),
    });
    const response = await POST(request);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /pdflatex was not found.*PDFLATEX_PATH/i);
  } finally {
    if (original === undefined) delete process.env.PDFLATEX_PATH;
    else process.env.PDFLATEX_PATH = original;
  }
});

test('local compile route cancels the child process when the preview request is aborted', async () => {
  const controller = new AbortController();
  const request = new Request('http://127.0.0.1/api/compile', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project: fixtureProject, variantId: 'variant-resume' }), signal: controller.signal,
  });
  const compilation = POST(request);
  setTimeout(() => controller.abort(), 50);
  const response = await compilation;
  assert.equal(response.status, 499);
});
