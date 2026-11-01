import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaleCompile } from '../src/lib/compile-guard.ts';

test('stale compile revisions are rejected', () => {
  assert.equal(isStaleCompile(4, 5), true);
  assert.equal(isStaleCompile(5, 5), false);
  assert.equal(isStaleCompile(5, 4), true);
});
