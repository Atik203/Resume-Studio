# Resume Studio Hardening & Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the integrity, privacy, documentation, UI, and maintainability defects found in the 2026-11-01 audit without changing resume content, PDF output, stored-data compatibility, or existing editor behavior.

**Architecture:** Six gated phases. Phase 0 builds the safety net (self-contained tests, golden LaTeX snapshots). Phases 1–3 make independent, low-risk corrections to integrity, data validation, and UI. Phase 4 is an optional mechanical decomposition of `studio.tsx`. Phase 5 makes the documentation truthful and runs the final end-to-end matrix. Every phase ends with one green `npm run verify` and a manual smoke check before the next phase begins.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript 5.9, Tailwind v4, shadcn-style primitives, Zod (new), Node 24 test runner with type stripping, FastAPI/Pydantic, local TeX Live `pdflatex` + `pdftotext`.

**Spec:** `docs/superpowers/specs/2026-11-01-hardening-spec.md`

## Global Constraints

- Never change resume wording, PDF layout, template spacing, page-fit output, or page-limit behavior. The only text-behavior change allowed is the ML fallback in Task 1.2.
- Preserve backup compatibility: no field renames, no IndexedDB key changes, no backup version bump. v1 and v2 imports must behave exactly as today.
- Keep `pdflatex` as the only PDF engine; do not touch the compile route's `spawn`/escaping/security model.
- No new runtime dependency except `zod` (required by AGENTS.md). No new dev dependencies in this pass.
- Run every command from the repository root with PowerShell. `npm run verify` is the gate.
- Before editing Next.js-specific code, read the relevant guide under `node_modules/next/dist/docs/` as required by AGENTS.md.
- Use synthetic fixture data in tests and screenshots. Never write the user's real resume data into a test, fixture, screenshot, or commit.
- Do not run git history rewriting. Task 1.1 documents the procedure only.
- Each task ends with a commit. If a later task breaks an earlier invariant, revert that task's commit rather than stacking fixes.
- Manual browser checks use the `agent-browser` skill against `http://127.0.0.1:3000`; do not add Playwright or jsdom.
- `--shadow-xs` is provided by Tailwind v4's default theme (`node_modules/tailwindcss/theme.css:407`); do not redefine it.

## Invariants and their guards

| Invariant | Guard |
|---|---|
| All five templates still produce the same TeX | `tests/golden-latex.test.mjs` (Task 0.2) + render tests |
| PDFs still have selectable text and working links | `tests/render.test.mjs`, `tests/route.test.mjs`, `tests/latex-tools.test.mjs` |
| v1 backups still migrate; v2 imports still validate | `tests/resume.test.mjs` unchanged + new schema tests |
| Unknown/future backup keys are not dropped | Predicate-only validation (Task 2.1) + explicit test |
| No content is silently lost on overflow | Existing overflow tests + final manual matrix |
| The app works with the ML service offline | Task 0.1 skips + Task 1.2 fallback test + manual matrix |
| No stale compile replaces a newer preview | Existing abort/revision guards preserved in Task 4.1 |
| Light and dark themes both render | Screenshot checks in Tasks 1.5, 3.1–3.4, 4.4–4.5 |

## Review Focus

These are the failure modes the current tests do **not** cover and that are most likely to hurt the user. Each is pinned to a task below.

1. Running `npm test` with no dev server or Python service — it must exit 0, not fail with `ECONNREFUSED`. (Task 0.1)
2. Importing an old v2 backup that contains an unknown future key — the key must survive, not be stripped. (Task 2.1)
3. Editing while a compile is in flight — an older PDF must never replace the newer state. (Task 4.1, pure guard test + manual race check)
4. Opening a modal in light mode — no hardcoded dark panel or missing backdrop. (Tasks 1.5, 3.1, 3.3; pinned by light/dark screenshots because this pass adds no jsdom harness)
5. ML service offline — fallback suggestions must never contain a fabricated metric such as “35%”. (Task 1.2)

---

## Phase 0 — Safety net (no production behavior change)

### Task 0.1: Make the test suite self-contained and add the verify gate

**Files:**
- Create: `tests/helpers/services.mjs`
- Modify: `src/app/api/export-tex/route.ts` (relative imports only)
- Modify: `tests/latex-tools.test.mjs` (tests at current lines 27 and 66)
- Modify: `tests/bullet-polish.test.mjs` (tests at current lines 4, 38, 49)
- Modify: `package.json` (scripts only)
- Modify: `README.md` (“Development commands” section only)

**Interfaces:**
- Produces: `export const ML_HEALTH_URL = 'http://127.0.0.1:8000/health'`
- Produces: `export async function serviceIsUp(url: string, timeoutMs = 750): Promise<boolean>`

- [ ] **Step 1: Create the branch**

```powershell
git switch -c upgrade/hardening
```

- [ ] **Step 2: Write the service probe helper**

`tests/helpers/services.mjs` must fetch with an `AbortController`, clear the timer in `finally`, return `false` on any thrown error or non-2xx response, and never throw. It must not be named `*.test.mjs` (so the runner does not execute it).

- [ ] **Step 3: Run the suite to confirm the baseline failure**

Run: `npm test`
Expected: exit code 1, 45 tests, 40 pass, 5 fail with `ECONNREFUSED`.

- [ ] **Step 4: Make the export-tex route importable by Node**

Node's type-stripping test runner does not resolve the `@/` path alias. Change the two imports in `src/app/api/export-tex/route.ts` to relative `.ts` paths, matching `src/app/api/compile/route.ts`:

```ts
import { validateProject, resolveVariant } from '../../../lib/data.ts';
import { renderLatex } from '../../../lib/latex.ts';
```

Run `npm run build` and confirm the route still builds.

- [ ] **Step 5: Convert the two export-tex tests to direct route calls**

In `tests/latex-tools.test.mjs`, import the handler and replace both `fetch(...)` calls:

```js
import { POST as exportTex } from '../src/app/api/export-tex/route.ts';

const res = await exportTex(new Request('http://127.0.0.1/api/export-tex', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project, variantId: project.activeVariantId }),
}));
```

The assertions and ZIP checks stay unchanged.

- [ ] **Step 6: Skip only the three live-ML tests**

In `tests/bullet-polish.test.mjs`, import `{ ML_HEALTH_URL, serviceIsUp }` and change the three live tests to accept the test context:

```js
test('bullet polish API returns 3 distinct variations with Google XYZ scores', async (t) => {
  if (!(await serviceIsUp(ML_HEALTH_URL))) {
    t.skip('Python ML service is not running on 127.0.0.1:8000');
    return;
  }
  // existing body unchanged
});
```

Do the same for the Ollama status and entity extraction tests. Leave the pure replacement test untouched.

- [ ] **Step 7: Add scripts**

In `package.json`:

```json
"test:python": "python tests/test_ml_service.py",
"verify": "npm run typecheck && npm run lint && npm test && npm run test:python && npm run build"
```

- [ ] **Step 8: Update README test instructions**

State that `npm test` is green with no services, that the 3 live-ML tests report `skipped` unless the FastAPI service is running, how to start it (`services/ml/run-ml.ps1`), and that `npm run verify` is the full gate.

- [ ] **Step 9: Verify**

Run: `npm test`
Expected: exit code 0, 45 tests, 42 pass, 3 skipped, 0 fail.

Run: `npm run test:python`
Expected: `ALL PYTHON ML TESTS PASSED SUCCESSFULLY!`

Run: `npm run verify`
Expected: exit code 0.

Optional integration proof: start `npm run dev` and the ML service, run `npm test`, expect 45 pass / 0 skipped.

- [ ] **Step 10: Commit**

```powershell
git add package.json README.md src/app/api/export-tex/route.ts tests/helpers/services.mjs tests/latex-tools.test.mjs tests/bullet-polish.test.mjs
git commit -m "test: make suite self-contained and add verify gate"
```

---

### Task 0.2: Add golden LaTeX snapshots

**Files:**
- Create: `scripts/generate-golden-latex.mjs`
- Create: `tests/golden-latex.test.mjs`
- Create: `tests/golden/t01-simple-ats.tex`
- Create: `tests/golden/t02-clean-compact.tex`
- Create: `tests/golden/t03-modern-developer.tex`
- Create: `tests/golden/t04-academic-cv.tex`
- Create: `tests/golden/t05-profile-cv.tex`
- Modify: `package.json` (`golden:update` script)

**Interfaces:**
- Consumes: `renderLatex`, `resolveVariant`, `fixtureProject`
- Produces: `npm run golden:update`, which overwrites the five golden files from the synthetic fixture.

- [ ] **Step 1: Write the generator**

`scripts/generate-golden-latex.mjs` loops over the five template IDs, renders the fixture variant with that template, and writes `tests/golden/<templateId>.tex` with **exactly** the returned string (no extra newline). Add `"golden:update": "node --experimental-strip-types scripts/generate-golden-latex.mjs"`.

- [ ] **Step 2: Generate and inspect**

Run: `npm run golden:update`
Expected: five files. Confirm they contain only `Synthetic Developer` fixture data and no real personal data.

- [ ] **Step 3: Write the failing test first (against a deliberately wrong expectation)**

Create `tests/golden-latex.test.mjs` that asserts exact string equality for each template:

```js
for (const templateId of templateIds) {
  const latex = renderLatex(resolveVariant(fixtureProject, { ...fixtureProject.variants[0], templateId }));
  assert.equal(latex, await readFile(new URL(`./golden/${templateId}.tex`, import.meta.url), 'utf8'), templateId);
}
```

Run: `node --experimental-strip-types --test tests/golden-latex.test.mjs`
Expected: FAIL only if the goldens were generated from a different fixture; if it passes immediately, temporarily append one character to `tests/golden/t01-simple-ats.tex`, re-run to see it fail, then restore it.

- [ ] **Step 4: Verify**

Run: `node --experimental-strip-types --test tests/golden-latex.test.mjs`
Expected: 1 test, pass.

Run: `npm test`
Expected: 46 tests, 43 pass, 3 skipped, 0 fail.

- [ ] **Step 5: Commit**

```powershell
git add package.json scripts tests/golden tests/golden-latex.test.mjs
git commit -m "test: add golden LaTeX snapshots for all templates"
```

**Phase 0 gate:** `npm run verify` green; browser opens `/editor` and compiles the fixture. Do not start Phase 1 until this gate passes.

---

## Phase 1 — Integrity, privacy, and correctness

### Task 1.1: Untrack private reference PDFs and Python bytecode

**Files:**
- Modify: `.gitignore` (add `/reference/`)
- Move: `Md.Atikur_Rahaman_Full_Stack_Dev.pdf` → `reference/Md.Atikur_Rahaman_Full_Stack_Dev.pdf`
- Move: `Md.Atikur-Rahaman-CV.pdf` → `reference/Md.Atikur-Rahaman-CV.pdf`
- Untrack: both PDFs and the five tracked `__pycache__/*.pyc` files
- Create: `docs/privacy-cleanup.md`
- Modify: `docs/reference-design-notes.md` (add a private-input note)

**Interfaces:** none; this task must not change application code.

- [ ] **Step 1: Move the reference PDFs out of the tracked tree**

```powershell
New-Item -ItemType Directory -Force reference | Out-Null
Move-Item 'Md.Atikur_Rahaman_Full_Stack_Dev.pdf' 'reference/'
Move-Item 'Md.Atikur-Rahaman-CV.pdf' 'reference/'
```

- [ ] **Step 2: Untrack the files without deleting local copies**

```powershell
git rm --cached 'Md.Atikur_Rahaman_Full_Stack_Dev.pdf' 'Md.Atikur-Rahaman-CV.pdf'
git rm --cached services/ml/__pycache__/*.pyc tests/__pycache__/*.pyc
```

- [ ] **Step 3: Ignore the reference directory**

Append `/reference/` to `.gitignore`. `__pycache__/` is already ignored; no change needed there.

- [ ] **Step 4: Document the local input location**

Add to `docs/reference-design-notes.md`: the two PDFs are private, read-only design inputs kept in `reference/` (gitignored); they are not part of the app or its fixtures.

- [ ] **Step 5: Write the history-cleanup runbook (do not execute)**

`docs/privacy-cleanup.md` must state:
- Removing files from `HEAD` does not remove them from existing commits or GitHub.
- Two options: rewrite history with `git filter-repo --path <file> --invert-paths` (or BFG) and force-push all branches/tags, or delete/recreate the remote repository.
- Rewriting invalidates clones and commit hashes; any collaborator must re-clone.
- GitHub may retain unreachable objects and forks; contact GitHub Support to purge if required.
- No secrets were in the PDFs, but they contain personal contact details; treat them as exposed.
- The command block is reference only and must not be run by an agent without explicit user approval.

- [ ] **Step 6: Verify**

Run: `git ls-files | Select-String -Pattern '\.pdf$|__pycache__'`
Expected: no output.

Run: `Test-Path reference/Md.Atikur_Rahaman_Full_Stack_Dev.pdf; Test-Path reference/Md.Atikur-Rahaman-CV.pdf`
Expected: `True` and `True`.

Run: `npm run typecheck; npm run lint`
Expected: pass (application is unaffected).

- [ ] **Step 7: Commit**

```powershell
git add .gitignore docs/reference-design-notes.md docs/privacy-cleanup.md
git commit -m "chore: untrack private reference PDFs and Python bytecode"
```

The `git rm --cached` calls in Step 2 already staged the deletions, so the commit includes them.

---

### Task 1.2: Stop the ML fallback from inventing metrics and surface fallback in the UI

**Files:**
- Modify: `services/ml/ollama_client.py` (`generate_rule_based_fallback`, current lines 134–176)
- Modify: `tests/test_ml_service.py` (add one test)
- Modify: `src/components/studio/bullet-polish-modal.tsx` (header badge and fallback notice)

**Interfaces:**
- `generate_rule_based_fallback(bullet: str, context: Optional[Dict[str, str]] = None) -> Dict[str, str]` keeps its signature and the three keys `quantified`, `action`, `compact`.
- `PolishBulletResponse.source` remains a string: `"ollama:<model>"` or `"rule_based_fallback"`.

- [ ] **Step 1: Write the failing Python test**

Add to `tests/test_ml_service.py`:

```python
def test_fallback_never_invents_metrics():
    fallback = generate_rule_based_fallback(
        "Worked on fixing bugs and helped the team with tests."
    )
    joined = " ".join(fallback.values())
    assert not re.search(r"\d+\s*%", joined), "Fallback must not invent percentages"
    assert "35%" not in joined
    assert "automated test suites" not in joined.lower()
    assert "[add a verified metric" in fallback["quantified"].lower()
    assert all(len(value) > 10 for value in fallback.values())
```

Add `import re` at the top if it is not already present.

- [ ] **Step 2: Run it and confirm it fails**

Run: `python tests/test_ml_service.py`
Expected: assertion failure containing `35%`.

- [ ] **Step 3: Replace the fabricated templates**

In `generate_rule_based_fallback`, keep the weak→strong verb substitution and the trailing-period cleanup. Replace the three constructions with text derived only from the user's bullet:

```python
quantified = f"{action_text} [add a verified metric: %, time saved, or scale]."
action = f"{action_text}."
compact_text = action_text
for filler in ("in order to ", "various ", "successfully ", "a lot of "):
    compact_text = compact_text.replace(filler, "")
compact = f"{compact_text}."
```

`compact_text` may only remove filler phrases; it must not add claims.

- [ ] **Step 4: Run the Python tests**

Run: `python tests/test_ml_service.py`
Expected: all tests pass, including the new one.

- [ ] **Step 5: Update the modal badge and notice**

In `bullet-polish-modal.tsx`:
- Change the header title from `Local Qwen 3.5 4B Bullet Polish` to `Bullet Polish` so the title does not claim a model that may not be running.
- Replace the static `100% Offline · GPU` badge with a source-aware badge:
  - `data?.source?.startsWith('ollama:')` → green “Local model · GPU”
  - `data?.source === 'rule_based_fallback'` → amber “Rule-based · offline”
  - otherwise → neutral “Generating…”
- When `data?.source === 'rule_based_fallback'`, render an amber notice above the variations: “Rule-based rewrite: the local model is offline. Replace the bracketed metric placeholder with a real result before applying.”

Do not change the fetch, apply, copy, or append logic.

- [ ] **Step 6: Verify manually**

Open the editor with the ML service stopped, click Polish on a bullet, and confirm the amber badge/notice appears and the quantified text contains the bracketed placeholder, not a percentage. Then start the ML service and confirm the green badge appears when Ollama is available.

- [ ] **Step 7: Commit**

```powershell
git add services/ml/ollama_client.py tests/test_ml_service.py src/components/studio/bullet-polish-modal.tsx
git commit -m "fix: remove fabricated metrics from ML fallback and label it in UI"
```

---

### Task 1.3: Harden the Python ML service

**Files:**
- Modify: `services/ml/taxonomy.py` (typing imports and annotations)
- Modify: `services/ml/ats_simulator.py` (phone regex, year validation)
- Modify: `services/ml/main.py` (logging, generic 500s, request limits)
- Modify: `services/ml/train_ner.py` (docstring only)
- Modify: `tests/test_ml_service.py` (add three tests)

**Interfaces:** no endpoint paths or response shapes change. `simulate_ats_parse(project_data, variant_id=None)` keeps its signature.

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_ml_service.py` the imports `re`, `from pydantic import ValidationError`, `PHONE_REGEX` alongside `simulate_ats_parse`, and `MatchRequest` from `main`. Extract the existing `mock_project` dictionary in `test_ats_simulator` into a module-level `_fixture_project()` helper so both tests use the same synthetic project.

```python
def test_ats_accepts_pre_2020_date_ranges():
    project = _fixture_project()
    project["library"]["entries"][0]["date"] = "January 2019"
    result = simulate_ats_parse(project, "v1")
    assert "chronology" not in [warning["type"] for warning in result["warnings"]]


def test_phone_regex_returns_full_match():
    assert PHONE_REGEX.findall("Call +1 (555) 123-4567") == ["+1 (555) 123-4567"]


def test_match_request_rejects_oversized_input():
    try:
        MatchRequest(resume_text="x" * 100_001, job_description="engineer")
        raise AssertionError("oversized input should fail validation")
    except ValidationError:
        pass
```

`pytest` is not installed on this machine, so do not use `pytest.raises`; use the plain `try/except` above.

- [ ] **Step 2: Run and confirm the failures**

Run: `python tests/test_ml_service.py`
Expected: failures for the date range, the phone tuple, and the missing request limits.

- [ ] **Step 3: Fix the typing and phone regex**

- `taxonomy.py`: import `Any` from `typing`, remove unused `Set`, change both `Dict[str, any]` annotations to `Dict[str, Any]`.
- `ats_simulator.py`: make the optional country-code group non-capturing:

```python
PHONE_REGEX = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
```

Prefer `PHONE_REGEX.search(text).group(0)` over `findall` at the extraction site.

- [ ] **Step 4: Replace the hard-coded year list**

In `ats_simulator.py`, add `YEAR_REGEX = re.compile(r"\b(?:19|20)\d{2}\b")` and change the check to:

```python
has_standard_date = bool(DATE_RANGE_REGEX.search(date_str) or YEAR_REGEX.search(date_str))
```

- [ ] **Step 5: Add logging and request limits**

In `main.py`:
- Add `import logging`, `logger = logging.getLogger("resume_studio_ml")`.
- In each `except Exception` handler, call `logger.exception("...")` and return `HTTPException(status_code=500, detail="Internal ML service error. Check the service log.")`.
- Add Pydantic limits: `resume_text`, `job_description`, and `text` use `Field(min_length=1, max_length=100_000)`; `bullet` uses `Field(min_length=1, max_length=5_000)`; `bullets` uses `Field(min_length=1, max_length=200)` with each string capped at 5,000 characters; `context` keys/values stay as-is.
- In `/api/simulate-ats`, reject a serialized project larger than 5 MB with `HTTPException(413, "Project payload is too large.")`.

- [ ] **Step 6: Make the NER docstring truthful**

Change the `train_ner.py` module docstring to: “Generate synthetic NER-style training data and benchmark the regex taxonomy extractor. This script does not train a model and is not used at runtime.”

- [ ] **Step 7: Verify**

Run: `python tests/test_ml_service.py`
Expected: all tests pass.

Start the service (`services/ml/run-ml.ps1`) and run: `npm test`
Expected: the three live-ML tests now run and pass (42+3 = 45 pass, plus the golden test).

- [ ] **Step 8: Commit**

```powershell
git add services/ml tests/test_ml_service.py
git commit -m "fix(ml): correct parsing limits, logging, and service hygiene"
```

---

### Task 1.4: Align ZIP export photo handling with the compile route

**Files:**
- Modify: `src/app/api/export-tex/route.ts` (photo extraction/replacement, current lines 24–40)
- Modify: `tests/latex-tools.test.mjs` (add a test)

**Interfaces:** `POST(req: Request)` keeps its signature and ZIP layout (`main.tex`, `resume-data.json`, `README.md`, `assets/`).

- [ ] **Step 1: Write the failing test**

Add a test that builds a valid 1-page PDF with `pdf-lib`, sets `profile.photoDataUrl` to `data:image/pdf;base64,...`, selects `t05-profile-cv`, calls the route directly, opens the ZIP with `JSZip`, asserts `assets/profile.pdf` exists, asserts `main.tex` references `assets/profile.pdf`, extracts the ZIP to a temp directory, and runs:

```powershell
pdflatex -interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape main.tex
```

Expected: exit code 0 and a non-empty `main.pdf`.

- [ ] **Step 2: Run and confirm the failure**

Run: `node --experimental-strip-types --test tests/latex-tools.test.mjs`
Expected: failure because the photo regex rejects `image/pdf` and the asset is missing.

- [ ] **Step 3: Fix extraction and replacement**

- Extend the data-URL regex to `^data:image\/(png|jpeg|pdf);base64,(.+)$`.
- Map extensions: `png` → `png`, `jpeg` → `jpg`, `pdf` → `pdf`.
- Replace the broad `latexSource.replace(/\\includegraphics\[.*?\]\{.*?\}/g, ...)` with a deterministic replacement of the exact renderer macro when `resolved.templateId === 't05-profile-cv'`:

```ts
latexSource = latexSource.replace(
  /\\includegraphics\[width=22mm,height=26mm,keepaspectratio\]\{profile-photo\}/,
  `\\includegraphics[width=22mm,height=26mm,keepaspectratio]{assets/profile.${ext}}`
);
```

If the macro is absent while a photo exists, return HTTP 422 with a clear message rather than emitting a broken `.tex`.

- [ ] **Step 4: Verify**

Run: `node --experimental-strip-types --test tests/latex-tools.test.mjs`
Expected: all tests pass, including the standalone compile.

Run: `npm test`
Expected: no regressions.

- [ ] **Step 5: Commit**

```powershell
git add src/app/api/export-tex/route.ts tests/latex-tools.test.mjs
git commit -m "fix: export profile photos consistently with local compile"
```

---

### Task 1.5: Make PDF/A labeling truthful

**Files:**
- Modify: `src/components/studio/design-tab.tsx` (current lines 623–643)
- Modify: `src/lib/data.ts` (comment on `pdfaCompliant` only)

- [ ] **Step 1: Change the copy and theme token**

In the PDF/A toggle:
- Change `PDF/A Archival Metadata` to `PDF document metadata`.
- Change the description to `Adds title, author, and subject tags. This does not certify PDF/A compliance.`
- Change `text-white` to `text-foreground` so the label respects the theme.
- Add a short comment above `pdfaCompliant` in `data.ts`: “Adds PDF metadata tags only; not a PDF/A conformance flag. Field name kept for backup compatibility.”

- [ ] **Step 2: Verify visually**

Open the editor → Customize → Advanced. Screenshot the toggle in light and dark themes. Confirm readable contrast and the corrected copy.

- [ ] **Step 3: Commit**

```powershell
git add src/components/studio/design-tab.tsx src/lib/data.ts
git commit -m "fix: describe PDF metadata accurately in design settings"
```

**Phase 1 gate:** `npm run verify` green; privacy check passes; fallback test proves no invented percentage; ZIP export compiles standalone. Pause for review before Phase 2.

---

## Phase 2 — Zod validation without behavior change

### Task 2.1: Introduce Zod schemas as the shape predicates

**Files:**
- Modify: `package.json` / `package-lock.json` (add `zod`)
- Create: `src/lib/schema.ts`
- Modify: `src/lib/data.ts` (replace predicate internals only)
- Create: `tests/schema.test.mjs`

**Interfaces:**
- `validateProject(value: unknown): ProjectData` — unchanged.
- `migrateProject(value: unknown): ProjectData` — unchanged.
- `resolveVariant(projectInput: ProjectData, variantInput: ResumeVariant): ResolvedVariant` — unchanged.
- New exports from `src/lib/schema.ts`: `contactLinkSchema`, `photoDataUrlSchema`, `profileSchema`, `entrySchema`, `sectionDesignSchema`, `designSchema`, `sectionSchema`, `variantSchema`, `projectSchema`.

**Design rule:** schemas are used **only inside the existing `isX` predicates**. `validateProject` keeps its current staged checks, cross-field invariants, error strings, and `structuredClone` return. This preserves unknown keys and all existing messages.

- [ ] **Step 1: Install Zod**

Run: `npm install zod@^4`
Expected: `zod` appears in `dependencies`; lockfile updates.

- [ ] **Step 2: Write the failing schema tests first**

Create `tests/schema.test.mjs` covering:
- `validateProject(fixtureProject)` returns version 2.
- A v2 project with `__future: { note: 'keep me' }` survives `validateProject` intact.
- `contactLinkSchema.safeParse({ type: 'website', label: 'x', url: 'javascript:alert(1)' })` is false.
- `sectionDesignSchema.safeParse({ fontSizePt: 40 })` is false.
- `validateProject` still throws `/valid variant/i` for `fontSizePt: 40`.
- Duplicate entry IDs, duplicate variant IDs, selected-without-section, section-item-not-selected, duplicate placement, override-missing-entry, and missing active variant each throw the existing message (see `data.ts:134-152`).

Run: `node --experimental-strip-types --test tests/schema.test.mjs`
Expected: FAIL because `src/lib/schema.ts` does not exist.

- [ ] **Step 3: Implement the schemas**

In `src/lib/schema.ts`, mirror every constraint currently in `data.ts:210-267`:
- `contactLinkSchema`: enum type; string label/url; URL protocol allowlist (`http:`, `https:`, `mailto:`) with message containing “Invalid URL”.
- `photoDataUrlSchema`: string, max 4,000,000 chars, regex `/^data:image\/(?:png|jpeg|pdf);base64,[A-Za-z0-9+/]+=*$/`.
- `profileSchema`: all five strings required; `links` array; optional photo.
- `sectionDesignSchema`: optional numeric ranges exactly as `isSectionDesign` (font 8–24, margins 0–25mm, margins/padding 0–36/24pt, divider 0.1–3pt); booleans optional.
- `designSchema`: paper enum; fontFamily enum (all nine values); fontSize 8–14; margins 8–40; lineSpacing 0.9–1.5; bulletSpacing 0–8; dateAlignment enum; five booleans; hex colors; section/entry gaps 0–24; bulletIndent 2–16; divider weight 0.1–3; showDividers/showContactIcons booleans; optional headerLayout/dividerStyle/pdfaCompliant.
- `entrySchema`: the seven strings, two string arrays, links array.
- `sectionSchema`: id/label strings, entryIds string array, visible boolean, optional design.
- `variantSchema`: all fields from `isVariant`, including `profileOverrides` key/type checks, `entryOverrides` key/type checks, design, targetPages 1–10, maxPages ≥ targetPages and ≤10.
- `projectSchema`: version literal 2, library `{ profile, entries }`, non-empty variants, activeVariantId string.

Use `.optional()` for optional fields. Do not add `.strict()`; defaults are fine because the parsed object is not returned.

- [ ] **Step 4: Replace predicate bodies in `data.ts`**

Keep every `isX` function and its type predicate. Replace the body with `schema.safeParse(v).success`. Keep `isObject` for `migrateProject`. Remove `isString` only if it becomes unused. Do not change `validateProject`, `migrateProject`, `resolveVariant`, or any error message.

- [ ] **Step 5: Verify parity**

Run: `node --experimental-strip-types --test tests/schema.test.mjs`
Expected: all pass.

Run: `npm test`
Expected: all previous tests pass unchanged (including `tests/resume.test.mjs`).

Run: `npm run typecheck; npm run lint`
Expected: pass.

- [ ] **Step 6: Check the browser bundle**

Run: `npm run build`
Expected: build succeeds. Note the route table is unchanged. Zod adds a small client bundle cost; record it in the final summary but do not optimize in this task.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json src/lib/schema.ts src/lib/data.ts tests/schema.test.mjs
git commit -m "refactor: validate project shapes with zod schemas"
```

**Phase 2 gate:** `npm run verify` green; import a v2 backup with an extra key and confirm the exported backup still contains it. Pause for review.

---

## Phase 3 — UI correctness and accessibility

### Task 3.1: Repair the Page-Fit modal shell

**Files:**
- Modify: `src/app/style.css` (add `.modal-overlay`, `.modal-box`, `.modal-header`, `.modal-footer`; keep `.page-fit-modal-box`)

**Interfaces:** CSS-only; no component API changes.

- [ ] **Step 1: Reproduce the defect**

Open `/editor`, trigger overflow, open Page-Fit. Screenshot: the modal has no backdrop and is not centered. Save the screenshot under `.tmp/` (gitignored) for comparison.

- [ ] **Step 2: Add the missing shared classes**

Define, near `.page-fit-modal-box`:
- `.modal-overlay`: fixed inset 0, z-index 50, flex center, padding 16px, `background: rgb(0 0 0 / 0.6)`, `backdrop-filter: blur(4px)`.
- `.modal-box`: `background: var(--card)`, `color: var(--card-foreground)`, 1px `var(--border)` border, 16px radius, large shadow, width 100%, max-height 90vh, overflow hidden.
- `.modal-header`: flex, space-between, gap 12px, padding 18px 18px 10px, border-bottom `1px solid var(--studio-line)`.
- `.modal-footer`: flex, justify-end, align-center, gap 8px, padding 12px 18px 18px, border-top `1px solid var(--studio-line)`.

Do not add padding to `.modal-box`: `.page-fit-tabs-bar` (8px 18px 0) and `.page-fit-modal-body` (16px 18px) already own their spacing.

- [ ] **Step 3: Verify visually**

Screenshot Page-Fit at 1440×900 and 960×700 in light and dark themes. Confirm backdrop, centering, reachable footer buttons, and internal scrolling (body max-height 60vh).

- [ ] **Step 4: Commit**

```powershell
git add src/app/style.css
git commit -m "fix: add missing Page-Fit modal shell styles"
```

---

### Task 3.2: Define the missing fade animation and remove dead class usage

**Files:**
- Modify: `src/app/style.css` (add `@keyframes fadeIn` and `.animate-fade-in`)
- Modify: `src/app/studio.tsx` (remove `sidebar-hidden` from the app-shell className)

- [ ] **Step 1: Confirm the actual gaps**

Run: `Select-String -Path src/app/style.css -Pattern 'fadeIn|animate-fade-in'`
Expected: `animation: fadeIn` at the ATS panel, no keyframes. Run `Select-String -Path src/app/studio.tsx -Pattern 'sidebar-hidden'` and confirm it is applied but has no CSS rule (`library-collapsed` is the real class).

- [ ] **Step 2: Add the animation**

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

.animate-fade-in {
  animation: fadeIn 0.35s ease-out both;
}
```

Place it near the other animation rules. Do not redefine `--shadow-xs`; Tailwind v4 supplies it.

- [ ] **Step 3: Remove the dead class**

Change the `<main>` className to use `library-collapsed` only (keep the collapsed state behavior). Do not remove any other class.

- [ ] **Step 4: Verify visually**

Screenshot the landing hero (uses `animate-fade-in`) and the ATS panel (uses `fadeIn`). Confirm no console errors and both appear. Toggle the sidebar collapse and confirm the 60px rail still works.

- [ ] **Step 5: Commit**

```powershell
git add src/app/style.css src/app/studio.tsx
git commit -m "fix: define fade animation and remove dead sidebar class"
```

---

### Task 3.3: Theme the dark-only modals

**Files:**
- Modify: `src/components/studio/bullet-polish-modal.tsx`
- Modify: `src/components/studio/snapshot-modal.tsx`
- Modify: `src/components/studio/latex-inspector-modal.tsx`

**Rule:** shells, headers, cards, and text use semantic tokens. A code/source pane may remain dark in both themes, but must be wrapped in an explicitly commented “intentionally dark code pane” container. Do not change layout, sizes, or behavior.

- [ ] **Step 1: Capture the current visuals**

Open each modal in light theme and screenshot. Expected current result: hardcoded dark panels that ignore the theme.

- [ ] **Step 2: Replace hardcoded colors using this mapping**

- `bg-[#111813]`, `bg-[#141e17]`, `bg-[#18231c]` → `bg-card`, `bg-muted/60`, `bg-muted/40`
- `border-[#233529]`, `border-[#263a2d]` → `border-border`
- `text-[#e6f4ea]`, `text-white` → `text-foreground` (except inside the dark code pane)
- `text-[#8ba393]`, `text-[#a0b8a8]`, `text-[#93a89a]` → `text-muted-foreground`
- `hover:bg-white/5` → `hover:bg-muted`
- Emerald/amber/rose semantic accents stay. In `bullet-polish-modal.tsx`, preserve the source-aware badge and fallback notice introduced in Task 1.2; only change their colors if they are hardcoded.

For `latex-inspector-modal.tsx`, keep the source `<pre>` on a dark slate background and add the comment `{/* Intentionally dark: code pane stays dark in both themes */}`. Theme its header, toolbar, and footer.

- [ ] **Step 3: Verify visually**

For each modal, screenshot light and dark at 1440×900. Check: readable body text, visible borders, no white-on-white, no dark-on-dark outside the code pane, buttons visible.

- [ ] **Step 4: Commit**

```powershell
git add src/components/studio/bullet-polish-modal.tsx src/components/studio/snapshot-modal.tsx src/components/studio/latex-inspector-modal.tsx
git commit -m "fix: make technical modals respect light and dark themes"
```

---

### Task 3.4: Dismiss menus on outside click/Escape and restore modal focus

**Files:**
- Create: `src/hooks/use-dismiss.ts`
- Create: `src/hooks/use-modal-behavior.ts`
- Modify: `src/app/studio.tsx` (three topbar menus)
- Modify: `src/components/studio/new-draft-modal.tsx`
- Modify: `src/components/studio/photo-cropper-modal.tsx`
- Modify: `src/components/studio/page-fit-modal.tsx`
- Modify: `src/components/studio/bullet-polish-modal.tsx`
- Modify: `src/components/studio/latex-inspector-modal.tsx`
- Modify: `src/components/studio/snapshot-modal.tsx`

**Interfaces:**
- `useDismiss(ref: React.RefObject<HTMLElement | null>, onDismiss: () => void, enabled: boolean): void` — listens for `pointerdown` outside the ref and `Escape`; cleans up both.
- `useModalBehavior(ref: React.RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean): void` — on `enabled` true, stores `document.activeElement`, focuses the first focusable element inside `ref`, listens for `Escape`, and on cleanup restores the previous focus. It does **not** trap Tab; that is a documented follow-up.

**React rule:** call these hooks before any `if (!isOpen) return null` early return, passing `enabled={isOpen}`. The ref may be null while closed.

- [ ] **Step 1: Implement the hooks**

Return early when `!enabled`. Use `document.addEventListener('pointerdown', handler, true)` and `document.addEventListener('keydown', handler)`. Remove the same handlers in cleanup. In `useModalBehavior`, query `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])` and call `.focus()` on the first match.

- [ ] **Step 2: Apply to the three topbar menus**

Attach refs to the draft, export, and more-menu containers. Call `useDismiss(ref, close, open)`. Remove the current `onMouseLeave` close handlers only after outside-click works; keep them if they are still useful for hover behavior.

- [ ] **Step 3: Apply to all six modals**

Add a ref to each outer dialog `<div>` and call `useModalBehavior(ref, onClose, isOpen)`. Ensure `onClose` is stable enough or the hook re-runs only on `enabled`/`onClose` changes; wrap the handler in `useCallback` in the parent if needed.

- [ ] **Step 4: Verify with keyboard only**

For each menu: open, press Escape → closes; open, click elsewhere → closes.
For each modal: open → focus lands inside; press Escape → closes; focus returns to the button that opened it. Tab still moves through controls (no trap yet; document this).

- [ ] **Step 5: Commit**

```powershell
git add src/hooks src/app/studio.tsx src/components/studio/*.tsx
git commit -m "feat: dismiss menus and modals with escape and outside click"
```

**Phase 3 gate:** `npm run verify` green; screenshots for every modal in both themes; keyboard checks pass. Pause for review.

---

## Phase 4 — Studio decomposition (optional, highest risk)

Start only after explicit approval. Do not combine these tasks. Each is a mechanical move with no logic rewrite. If `studio.tsx` behavior changes in any way not listed, revert the task.

### Task 4.1: Extract compile/preview state into a hook

**Files:**
- Create: `src/hooks/use-compile-preview.ts`
- Create: `src/lib/compile-guard.ts`
- Create: `tests/compile-guard.test.mjs`
- Modify: `src/app/studio.tsx` (remove `compile`, `pdfUrl`, `pdfFile`, `pageCount`, `overflow`, `busy`, `compiledRevision`, `message`, compile refs, and the auto-preview effect; consume the hook)

**Interfaces:**

```ts
export interface UseCompilePreviewOptions {
  project: ProjectData;
  variantId: string;
  revision: number;
  ready: boolean;
  autoPreview: boolean;
  previewDelayMs: number;
}

export interface UseCompilePreviewResult {
  pdfUrl: string;
  pdfFile: Blob | null;
  pageCount: string;
  overflow: boolean;
  compiledRevision: number;
  busy: boolean;
  message: string;
  setMessage: (value: string) => void;
  compile: () => Promise<void>;
  invalidate: () => void;
}

export function useCompilePreview(options: UseCompilePreviewOptions): UseCompilePreviewResult;
```

`invalidate()` aborts the in-flight controller, clears `pdfFile`, `pageCount`, and `overflow`, and revokes the old object URL. `compile()` preserves the current request-id/revision guards and the `499` cancellation handling. The hook revokes the last object URL on unmount.

**Stale-result guard:** add `src/lib/compile-guard.ts` with `export function isStaleCompile(requestRevision: number, currentRevision: number): boolean { return requestRevision !== currentRevision; }`. The hook must call it before accepting a PDF, and `tests/compile-guard.test.mjs` must assert `isStaleCompile(4, 5) === true` and `isStaleCompile(5, 5) === false`.

- [ ] **Step 1: Record behavior**

Before editing, write down the current behavior: `updateProject` aborts + clears preview; auto effect runs on `ready`, `revision`, `active.id`, `autoPreview`, `previewDelayMs`; stale revision shows “The document changed during compilation…”.

- [ ] **Step 2: Write the failing guard test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaleCompile } from '../src/lib/compile-guard.ts';

test('stale compile revisions are rejected', () => {
  assert.equal(isStaleCompile(4, 5), true);
  assert.equal(isStaleCompile(5, 5), false);
  assert.equal(isStaleCompile(5, 4), true);
});
```

Run: `node --experimental-strip-types --test tests/compile-guard.test.mjs`
Expected: FAIL because `src/lib/compile-guard.ts` does not exist. Create it with the one-line function, then re-run to pass.

- [ ] **Step 3: Implement the hook**

Move the code, not a rewrite. Keep `parseCompileResponseMetadata` and `decodePdfBase64` usage identical.

- [ ] **Step 4: Wire Studio**

Replace the state and `compile` with `const preview = useCompilePreview({...})`. In `updateProject`, call `preview.invalidate()` instead of the manual abort/clear block. Keep `exportPdf` in Studio using `preview.pdfFile`/`preview.pdfUrl`.

- [ ] **Step 5: Verify**

Run: `npm run verify`.
Browser: edit the name → preview recompiles after the configured delay; make 5 rapid edits → only the latest document is shown; stop TeX Live path → error message appears; Ctrl+S downloads the compiled PDF; download button disabled when no PDF.

- [ ] **Step 6: Commit**

```powershell
git add src/hooks/use-compile-preview.ts src/lib/compile-guard.ts tests/compile-guard.test.mjs src/app/studio.tsx
git commit -m "refactor: extract compile preview state into hook"
```

---

### Task 4.2: Extract autosave into a hook

**Files:**
- Create: `src/hooks/use-autosave.ts`
- Modify: `src/app/studio.tsx` (remove `saveState`, `saveStateText`, the 500ms save effect, and the load-effect save-state writes; consume the hook)

**Interfaces:**

```ts
export type SaveState = 'saving' | 'saved' | 'idle' | 'error';

export function useAutosave(project: ProjectData, ready: boolean): {
  saveState: SaveState;
  saveStateText: string;
  markSaving: () => void;
  reportLoadError: (message: string) => void;
};
```

Preserve the 500ms debounce, the exact “Saving…”, “Saved locally”, and “Save failed: …” strings, and the behavior that the timer sets “saving” when it fires.

- [ ] **Step 1: Implement and wire**

Move the effect wholesale. `updateProject` calls `markSaving()`. The initial load effect calls `reportLoadError(...)` on failure.

- [ ] **Step 2: Verify**

Run: `npm run verify`.
Browser: edit a field → pulse shows “Saving…” then “Saved locally”; reload → change persists; block IndexedDB (private window with storage disabled, if available) → error state appears; no unhandled rejection.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/use-autosave.ts src/app/studio.tsx
git commit -m "refactor: extract autosave state into hook"
```

---

### Task 4.3: Extract drag-and-drop state into hooks

**Files:**
- Create: `src/hooks/use-drag-reorder.ts`
- Modify: `src/app/studio.tsx` (remove the eight drag state values and ten handlers; consume hooks)

**Interfaces:**

```ts
export function useSectionDrag(onReorder: (from: number, to: number) => void): {
  draggedIndex: number | null;
  overIndex: number | null;
  onDragStart: (event: React.DragEvent, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, targetIndex: number) => void;
  onDragEnd: () => void;
};

export function useEntryDrag(onReorder: (sectionId: string, from: number, to: number) => void): {
  draggedSectionId: string | null;
  draggedIndex: number | null;
  overIndex: number | null;
  onDragStart: (event: React.DragEvent, sectionId: string, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, sectionId: string, targetIndex: number) => void;
  onDragEnd: () => void;
};
```

Preserve `dataTransfer.effectAllowed = 'move'`, `setData('text/plain', ...)`, `dropEffect = 'move'`, and the `from === to` no-op. Studio supplies reorder callbacks that perform the same array moves as today.

- [ ] **Step 1: Implement and wire**

Move the handlers. Keep the existing `onSectionDrop`/`onEntryDrop` index math inside Studio's callbacks so the hook stays generic.

- [ ] **Step 2: Verify**

Run: `npm run verify`.
Browser: drag a section above/below another → order changes and drop indicator shows; drag an entry within a section and across sections (if supported today — preserve exactly what works now); keyboard move-up/down buttons still work; dragged card dims; dropping outside cancels cleanly.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/use-drag-reorder.ts src/app/studio.tsx
git commit -m "refactor: extract drag reorder state into hooks"
```

---

### Task 4.4: Extract the top bar component

**Files:**
- Create: `src/components/studio/topbar.tsx`
- Modify: `src/app/studio.tsx` (replace the topbar JSX; keep pane state in Studio)
- Modify: `src/app/style.css` only if a selector depended on the old DOM nesting (verify first)

**Interfaces:**

```ts
export interface TopbarProps {
  activePane: 'editor' | 'design' | 'ats';
  onPaneChange: (pane: 'editor' | 'design' | 'ats') => void;
  libraryCollapsed: boolean;
  onToggleLibrary: () => void;
  drafts: Array<{ id: string; name: string; mode: 'resume' | 'cv' }>;
  activeDraftId: string;
  onSelectDraft: (id: string) => void;
  onNewDraft: () => void;
  onDuplicateDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onDownloadPdf: () => void;
  onExportLatex: () => void;
  onRecompile: () => void;
  canDownload: boolean;
  onOpenLatexInspector: () => void;
  onOpenSnapshots: () => void;
  onOpenPageFit: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark' | 'system';
  exportingZip: boolean;
}
```

Menu open/close state and refs move into `Topbar`. It uses `useDismiss` from Task 3.4. Do not move pane state, project state, or handlers' logic.

- [ ] **Step 1: Move the JSX and local menu state**

Keep every `aria-*`, label, and icon. Preserve the sidebar toggle, pane pill tablist, draft dropdown, split download button, and more menu.

- [ ] **Step 2: Verify**

Run: `npm run verify`.
Browser: all three pane tabs; draft select/duplicate/delete; download PDF; LaTeX ZIP; force recompile; LaTeX inspector; snapshots; page-fit; backup export/import; theme cycle; home link; sidebar collapse. Confirm dropdowns still dismiss (Task 3.4).

- [ ] **Step 3: Commit**

```powershell
git add src/components/studio/topbar.tsx src/app/studio.tsx src/app/style.css
git commit -m "refactor: extract studio top bar component"
```

---

### Task 4.5: Extract the preview pane component

**Files:**
- Create: `src/components/studio/preview-pane.tsx`
- Modify: `src/app/studio.tsx` (replace the preview column JSX)
- Modify: `src/app/style.css` only if needed

**Interfaces:**

```ts
export interface PreviewPaneProps {
  draftName: string;
  pageCount: string;
  overflow: boolean;
  busy: boolean;
  pdfUrl: string;
  message: string;
  onRecompile: () => void;
  onOpenPageFit: () => void;
}
```

Move the page-count pill, overflow alert, error message, paper area (empty/compiling/PDF), and footer. Keep the exact strings and the `CompiledPdfViewer` import.

- [ ] **Step 1: Move the JSX**

No logic changes. Move the `dynamic(() => import('@/components/pdf/compiled-pdf-viewer'), { ssr: false, ... })` declaration into `preview-pane.tsx`; `PreviewPane` is already a client component, and Studio imports it normally. Keep the loading placeholder string unchanged.

- [ ] **Step 2: Verify**

Run: `npm run verify`.
Browser: empty state before first compile; compiling spinner; PDF renders; overflow banner + “Fit to 1 Page” opens the modal; error message displays; page count pill matches the PDF; two-page spread still works for CVs; zoom controls work.

- [ ] **Step 3: Record the size reduction**

Run: `(Get-Content src/app/studio.tsx | Measure-Object -Line).Lines`
Expected: below 1,100 lines (target ~700–900). If still above 1,100, stop and report rather than starting another extraction in this pass.

- [ ] **Step 4: Commit**

```powershell
git add src/components/studio/preview-pane.tsx src/app/studio.tsx src/app/style.css
git commit -m "refactor: extract studio preview pane component"
```

**Phase 4 gate:** full verify + complete manual matrix in Task 5.2. If any behavior differs, revert the specific commit and re-run the gate.

---

## Phase 5 — Documentation and final proof

### Task 5.1: Make the documentation truthful

**Files:**
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/architecture.md`
- Modify: `docs/reference-design-notes.md` (if not already complete from Task 1.1)
- Create: `docs/known-limitations.md`

- [ ] **Step 1: README prerequisites and commands**

- Node 24.x (the test runner uses `--experimental-strip-types`; Node 20 cannot run `.ts` tests).
- TeX Live with **both** `pdflatex` and `pdftotext` on PATH (the compile route verifies selectable text).
- Optional: Python 3.10+ for the ML service; `services/ml/run-ml.ps1`; Ollama with `qwen3.5:4b` for LLM polish.
- Explain `npm test` skips the 3 live-ML tests when the service is offline.
- Document `npm run verify`, `npm run test:python`, `npm run golden:update`.
- Remove the README sentence claiming a “Webpack fallback” unless `next.config.ts` actually sets a webpack mode. `next.config.ts` currently only sets `poweredByHeader`, `devIndicators`, and `distDir`; the build script is plain `next build`. State instead: “Production uses `npm run build` (`next build`); the default bundler is whatever Next.js 16 selects.”
- Note that private reference PDFs live in `reference/` (gitignored).

- [ ] **Step 2: ROADMAP corrections**

- Replace the architecture diagram’s `PyTorch / spaCy` box with `FastAPI + Pydantic (regex taxonomy, lexical overlap, rule-based scoring)`.
- Replace `sentence-transformers` with the actual lexical cosine/overlap implementation.
- Replace `spaCy NER` with the regex taxonomy extractor.
- State that `train_ner.py` generates a synthetic benchmark and does not train a model.
- Replace `Vitest` with Node’s test runner.
- Replace “PDF/A compliance” claims with “PDF metadata tags”.
- Update the test count and note skipped integration tests.
- Mark Phase 4/5 items as implemented only where the code supports them.

- [ ] **Step 3: architecture.md**

- Confirm Zod is now accurate.
- Tick the execution checklist items that are complete.
- Replace “repository initially contains only handoff documentation” with the current state, and record Node 24 / TeX Live 2025 / optional Python.

- [ ] **Step 4: Known limitations**

Create `docs/known-limitations.md` listing: regex taxonomy instead of NER/embeddings; lexical (not semantic) matching; rule-based fallback quality; the XYZ methodology check is heuristic (a standalone “by”/“using” can count); PDF metadata is not PDF/A certification; no modal focus trap or arrow-key menu navigation; no global toast system (feedback is inline, the save pulse, or modal-local); native `confirm()` for destructive actions; visual checks are manual.

- [ ] **Step 5: Verify claims against code**

Run:

```powershell
Select-String -Path README.md,ROADMAP.md,docs/architecture.md -Pattern 'spaCy|PyTorch|sentence-transformers|Vitest|fine-tun|PDF/A compl'
```

Expected: only sentences that explicitly say these are **not** implemented, or no matches. Manually re-read the three docs against `services/ml/*.py`, `package.json`, and `tests/`.

- [ ] **Step 6: Commit**

```powershell
git add README.md ROADMAP.md docs/architecture.md docs/reference-design-notes.md docs/known-limitations.md
git commit -m "docs: align project documentation with implementation"
```

---

### Task 5.2: Final end-to-end verification

**Files:** none (record results in the plan or a short `docs/verification-2026-11-01.md` if the user wants a permanent record).

- [ ] **Step 1: Automated gates**

```powershell
npm run verify
```

Expected: typecheck pass, lint pass, JS tests pass (3 ML tests skipped if service is offline), Python tests pass, production build passes.

- [ ] **Step 2: Start the app and services**

```powershell
npm run dev
# second terminal:
powershell -ExecutionPolicy Bypass -File services/ml/run-ml.ps1
```

Use a fresh browser profile (not the user's normal profile) so manual checks never touch real data.

- [ ] **Step 3: Content and PDF matrix**

- First run loads synthetic sample content; create one resume and one CV draft.
- Compile all five templates; each produces a verified PDF with selectable text.
- Add `& % _ { } \ $ # ~ ^` and `café — “quotes”` to a bullet; compile; confirm no LaTeX error and correct text in the PDF.
- Add a long URL and a link to each entry type; confirm links are clickable in the PDF.
- Overflow: add 65 bullets; confirm the amber warning, page count > max, and every marker still present in the PDF text.
- Page-Fit: open, inspect diffs, apply, confirm content is preserved; test Orphan Hunter.
- Photo: crop and compile `t05-profile-cv`; remove the photo and confirm the layout is still balanced.
- Export PDF from the split button; verify the downloaded file opens and matches the preview.
- Export LaTeX ZIP; extract; run `pdflatex` locally; confirm it compiles.

- [ ] **Step 4: Data matrix**

- Export a v2 backup; edit; import the backup; confirm replacement prompt and restore.
- Construct a v1 backup from the fixture (as `tests/resume.test.mjs` does); import; confirm migration and no content loss.
- Add an unknown key to a v2 backup, import, export, and confirm the key survives.
- Reload the browser; confirm IndexedDB persistence.
- Create, rename, duplicate, and delete drafts; confirm the last draft cannot be deleted.

- [ ] **Step 5: UI/accessibility matrix**

- Light, dark, and system themes for: editor, preview, Design tab, ATS panel, all six modals.
- ≤960px width: editor/preview tabs work; sidebar rail works; no horizontal overflow.
- Keyboard: Tab reaches all controls; Escape closes menus/modals; divider arrow keys resize; Ctrl+B recompiles; Ctrl+S downloads.
- Verify focus returns to the trigger after closing each modal.
- Confirm the three technical modals are readable in both themes.

- [ ] **Step 6: Offline matrix**

- Stop the ML service: ATS panel shows idle/offline; bullet polish shows the rule-based badge and no invented percentage; core editing/PDF still works.
- Start the ML service with Ollama stopped: fallback is used and labeled.
- Start Ollama with `qwen3.5:4b`: polish uses the local model and shows the green badge.
- Disconnect the network entirely: app, compile, and all local features still work.

- [ ] **Step 7: Record and commit**

Write the outcomes (commands run, pass/fail, environment limitations) in the final response. If a permanent record is desired, add `docs/verification-2026-11-01.md` and commit it.

```powershell
git status --porcelain
git log --oneline -12
```

Expected: clean tree (or only the verification record), one commit per task.

---

## Execution order and rollback

| Phase | Risk | Can be skipped? | Rollback |
|---|---|---|---|
| 0 Safety net | Low | No — required before edits | Revert Task 0.1/0.2 commits |
| 1 Integrity | Low | No — privacy and fallback are urgent | Revert individual task commits |
| 2 Zod | Medium | Deferrable | Revert Task 2.1; `npm uninstall zod` |
| 3 UI | Medium | Deferrable | Revert individual CSS/component commits |
| 4 Decomposition | High | Yes — only with explicit approval | Revert per-task commit |
| 5 Docs/final | Low | No | Revert docs commit |

**Recommended execution:** complete Phases 0–2, pause for review, then 3, pause, then decide on 4, then 5. This keeps every risky change behind a green gate and a small revert surface.
