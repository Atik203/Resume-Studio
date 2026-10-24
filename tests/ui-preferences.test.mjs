import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUiPreferences, saveUiPreferences, defaultUiPreferences } from '../src/lib/ui-preferences.ts';

function memoryStorage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (_key, next) => { value = next; }, value: () => value };
}

test('uses safe defaults when no preference has been stored', () => {
  assert.deepEqual(loadUiPreferences(memoryStorage()), defaultUiPreferences);
});

test('round trips UI preferences without including project data', () => {
  const storage = memoryStorage();
  const prefs = { theme: 'dark', sidebarCollapsed: true, autoPreview: false, previewDelayMs: 1200 };
  saveUiPreferences(prefs, storage);
  assert.deepEqual(loadUiPreferences(storage), prefs);
  assert.equal(storage.value().includes('profile'), false);
});

test('recovers from corrupt JSON and rejects invalid fields', () => {
  assert.deepEqual(loadUiPreferences(memoryStorage('{oops')), defaultUiPreferences);
  const storage = memoryStorage(JSON.stringify({ theme: 'purple', sidebarCollapsed: 'yes', autoPreview: true, previewDelayMs: 20 }));
  assert.deepEqual(loadUiPreferences(storage), defaultUiPreferences);
});

test('accepts only preview delays between 500 and 2000 ms', () => {
  assert.equal(loadUiPreferences(memoryStorage(JSON.stringify({ ...defaultUiPreferences, previewDelayMs: 500 }))).previewDelayMs, 500);
  assert.equal(loadUiPreferences(memoryStorage(JSON.stringify({ ...defaultUiPreferences, previewDelayMs: 2000 }))).previewDelayMs, 2000);
  assert.equal(loadUiPreferences(memoryStorage(JSON.stringify({ ...defaultUiPreferences, previewDelayMs: 2500 }))).previewDelayMs, 800);
});
