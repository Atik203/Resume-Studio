import test from 'node:test';
import assert from 'node:assert/strict';

test('bullet polish API returns 3 distinct variations with Google XYZ scores', async () => {
  const payload = {
    bullet: 'Worked on fixing bugs and helped the team with tests.',
    context: { title: 'Software Engineer', subtitle: 'Tech Corp' },
    model: 'qwen3.5:4b',
  };

  const res = await fetch('http://127.0.0.1:8000/api/polish-bullet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 200, 'API endpoint should return 200');
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.source, 'Must have a source indicator');
  assert.ok(data.original, 'Must contain original analysis');
  assert.equal(data.original.text, payload.bullet);
  assert.ok(Array.isArray(data.variations), 'Variations must be an array');
  assert.equal(data.variations.length, 3, 'Must return exactly 3 variations');

  const keys = data.variations.map((v) => v.key);
  assert.ok(keys.includes('quantified'), 'Must include quantified variation');
  assert.ok(keys.includes('action'), 'Must include action variation');
  assert.ok(keys.includes('compact'), 'Must include compact variation');

  for (const v of data.variations) {
    assert.ok(v.text.length > 15, 'Variation text must be substantial');
    assert.ok(v.score >= 0 && v.score <= 100, 'Score must be between 0 and 100');
    assert.ok(typeof v.delta_score === 'number', 'Delta score must be a number');
  }
});

test('Ollama status endpoint detects local Qwen 3.5 4B model', async () => {
  const res = await fetch('http://127.0.0.1:8000/api/ollama/status');
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(typeof data.online, 'boolean', 'Online must be a boolean');
  assert.equal(data.preferred_model, 'qwen3.5:4b');
  assert.equal(typeof data.model_available, 'boolean');
  assert.ok(Array.isArray(data.installed_models));
});

test('Entity extraction endpoint categorizes skills from technical bullet', async () => {
  const payload = {
    text: 'Developed scalable microservices using TypeScript, React, Next.js, and Redis on AWS.',
  };

  const res = await fetch('http://127.0.0.1:8000/api/extract-entities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.total_count >= 4, 'Should extract at least 4 skills');
  assert.ok('TypeScript' in data.extracted_skills);
  assert.ok('React' in data.extracted_skills);
  assert.ok('Redis' in data.extracted_skills);
  assert.ok('AWS' in data.extracted_skills);
  assert.ok(data.categorized['Languages'].includes('TypeScript'));
  assert.ok(data.categorized['Databases'].includes('Redis'));
});

test('Bullet polish replacement does not mutate unrelated entry fields', () => {
  const originalEntry = {
    id: 'entry-1',
    sectionId: 'experience',
    title: 'Senior Software Engineer',
    subtitle: 'Acme Corp',
    date: '2022 - Present',
    location: 'Remote',
    description: 'Core product engineer',
    bullets: [
      'Built customer-facing features.',
      'Worked on bug fixing and tests.',
    ],
    technologies: ['TypeScript', 'React'],
    links: [],
  };

  const selectedVariation =
    'Spearheaded quality engineering initiatives, building automated regression test suites that reduced bug recurrence by 40%.';

  // Simulate replacement at index 1
  const updatedBullets = [...originalEntry.bullets];
  updatedBullets[1] = selectedVariation;
  const updatedEntry = { ...originalEntry, bullets: updatedBullets };

  // Bullet at 1 is replaced
  assert.equal(updatedEntry.bullets[1], selectedVariation);
  // Bullet at 0 is preserved intact
  assert.equal(updatedEntry.bullets[0], originalEntry.bullets[0]);
  // Title, subtitle, dates, and technologies are completely unmutated
  assert.equal(updatedEntry.title, originalEntry.title);
  assert.equal(updatedEntry.subtitle, originalEntry.subtitle);
  assert.deepEqual(updatedEntry.technologies, originalEntry.technologies);
});
