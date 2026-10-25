import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBulletClient } from '../src/lib/bullet-analyzer.ts';

test('client-side bullet analyzer detects strong power verb, metrics, and methodology', () => {
  const strongBullet =
    'Spearheaded migration to microservices architecture, reducing P99 latency by 35% across 2M daily requests by leveraging Go and gRPC.';
  const analysis = analyzeBulletClient(strongBullet);

  assert.equal(analysis.verbStrength, 'strong');
  assert.equal(analysis.firstVerb.toLowerCase(), 'spearheaded');
  assert.equal(analysis.hasMetrics, true);
  assert.equal(analysis.hasMethodology, true);
  assert.equal(analysis.score, 100);
  assert.equal(analysis.suggestions.length, 0);
});

test('client-side bullet analyzer flags weak passive verbs and missing metrics', () => {
  const weakBullet = 'Helped the team fix bugs in the frontend.';
  const analysis = analyzeBulletClient(weakBullet);

  assert.equal(analysis.verbStrength, 'weak');
  assert.equal(analysis.hasMetrics, false);
  assert.ok(analysis.score < 50);
  assert.ok(analysis.suggestions.length >= 2);
  assert.ok(analysis.suggestions.some(s => s.includes('power action verb')));
  assert.ok(analysis.suggestions.some(s => s.includes('metric')));
});

test('handles empty or whitespace bullets without throwing', () => {
  const emptyAnalysis = analyzeBulletClient('   ');
  assert.equal(emptyAnalysis.score, 0);
  assert.equal(emptyAnalysis.hasMetrics, false);
});
