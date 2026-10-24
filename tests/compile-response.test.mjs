import test from 'node:test';
import assert from 'node:assert/strict';
const compileResponse = await import('../src/lib/compile-response.ts').catch(() => null);

function syntheticPdfBase64() {
  const bytes = Buffer.alloc(100);
  bytes.write('%PDF-synthetic');
  return bytes.toString('base64');
}

test('rejects a no-content response instead of treating it as a verified PDF', () => {
  assert.ok(compileResponse, 'compile response validator is implemented');
  const response = new Response(null, { status: 204 });
  assert.throws(() => compileResponse.parseCompileResponseMetadata(response), /did not return a PDF payload/i);
});

test('parses metadata from the local JSON envelope without exposing a PDF download response', { skip: !compileResponse }, () => {
  const response = new Response(JSON.stringify({ pdfBase64: syntheticPdfBase64() }), { status: 200, headers: {
    'content-type': 'application/json', 'x-resume-page-count': '2',
    'x-resume-max-pages': '3', 'x-resume-overflow': 'false',
  } });
  assert.deepEqual(compileResponse.parseCompileResponseMetadata(response), { pageCount: 2, maxPages: 3, overflow: false });
  assert.deepEqual(Array.from(compileResponse.decodePdfBase64(syntheticPdfBase64()).subarray(0, 5)), Array.from(Buffer.from('%PDF-')));
});

test('rejects malformed or missing page metadata', { skip: !compileResponse }, () => {
  const response = new Response(JSON.stringify({ pdfBase64: syntheticPdfBase64() }), { status: 200, headers: { 'content-type': 'application/json', 'x-resume-overflow': 'maybe' } });
  assert.throws(() => compileResponse.parseCompileResponseMetadata(response), /page metadata/i);
  assert.throws(() => compileResponse.decodePdfBase64('not-base64!'), /invalid PDF payload/i);
});
