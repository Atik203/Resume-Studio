import test from 'node:test';
import assert from 'node:assert/strict';
import { explainCompileFailure } from '../src/lib/compile-errors.ts';

test('compile failures explain missing pdflatex and timeouts', () => {
  assert.match(
    explainCompileFailure({ log: '', executable: 'missing-pdflatex.exe', errorCode: 'ENOENT' }),
    /pdflatex was not found.*PDFLATEX_PATH/i
  );
  assert.match(
    explainCompileFailure({ log: '! TeX capacity exceeded', executable: 'pdflatex', timedOut: true }),
    /timed out after 30 seconds/i
  );
});

test('compile failures explain FontAwesome5 and other missing packages', () => {
  assert.match(
    explainCompileFailure({ log: "! LaTeX Error: File `fontawesome5.sty' not found.", executable: 'pdflatex' }),
    /fontawesome5.*Link Type Icons/i
  );
  assert.match(
    explainCompileFailure({ log: "! LaTeX Error: File `tgpagella.sty' not found.", executable: 'pdflatex' }),
    /LaTeX package "tgpagella"/i
  );
});

test('unknown compile failures keep the generic actionable message', () => {
  assert.match(
    explainCompileFailure({ log: '! Undefined control sequence.', executable: 'pdflatex' }),
    /could not compile.*unsupported characters/i
  );
});
