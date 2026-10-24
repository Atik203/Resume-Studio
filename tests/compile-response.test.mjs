import test from 'node:test';
import assert from 'node:assert/strict';
const compileResponse = await import('../src/lib/compile-response.ts').catch(() => null);

test('rejects a no-content response instead of treating it as a verified PDF', () => {
  assert.ok(compileResponse, 'compile response validator is implemented');
  const response = new Response(null, { status: 204 });
  assert.throws(() => compileResponse.parseCompileResponseMetadata(response), /did not return a PDF/i);
});

test('parses page metadata only from a successful PDF response', { skip: !compileResponse }, () => {
  const response = new Response('%PDF-synthetic', { status: 200, headers: {
    'content-type': 'application/pdf', 'x-resume-page-count': '2',
    'x-resume-max-pages': '3', 'x-resume-overflow': 'false',
  } });
  assert.deepEqual(compileResponse.parseCompileResponseMetadata(response), { pageCount: 2, maxPages: 3, overflow: false });
});

test('rejects malformed or missing page metadata', { skip: !compileResponse }, () => {
  const response = new Response('%PDF-synthetic', { status: 200, headers: { 'content-type': 'application/pdf', 'x-resume-overflow': 'maybe' } });
  assert.throws(() => compileResponse.parseCompileResponseMetadata(response), /page metadata/i);
});
