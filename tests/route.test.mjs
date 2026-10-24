import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('x-resume-page-count'), '1');
  assert.equal(response.headers.get('x-resume-overflow'), 'false');
  const pdf = new Uint8Array(await response.arrayBuffer());
  assert.ok(pdf.byteLength > 1000);
  const parsed = await PDFDocument.load(pdf);
  assert.equal(parsed.getPageCount(), 1);
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
