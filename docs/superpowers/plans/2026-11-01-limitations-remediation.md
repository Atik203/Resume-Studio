# Remaining Limitations Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the accessibility, feedback, PDF-robustness, structural, and AI-usability limitations documented after the UI polish pass, without changing resume content or the local-first security model.

**Spec:** `docs/known-limitations.md` (current limitation list) plus the hardened behavior in `docs/architecture.md`.

**Current baseline (main at `fa501db`):** 55/55 JS tests, 10/10 Python tests, production build passing. The private reference PDFs are untracked but still exist in public Git history; that remains a separate owner decision.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind v4, `radix-ui` (already installed), local TeX Live, FastAPI, optional Ollama.

## Global constraints

- Keep the app local-first: no cloud API, login, telemetry, or external PDF engine.
- Do not change resume wording, PDF layout, or page-limit behavior except where a task explicitly names it.
- Preserve backup compatibility; no field renames or IndexedDB key changes.
- Prefer primitives already installed. `radix-ui` is in `package.json`; do not add a second UI library.
- New dependencies must be opt-in and must not make the core editor unusable when absent.
- Every task ends with `npm run verify` and a browser smoke check in light and dark themes.
- Keep synthetic fixture data in tests; never commit personal resume data.

---

## Phase 1 — Accessible dialogs and menus (highest user impact)

### Task 1.1: Introduce a Radix Dialog primitive and migrate three modals

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Modify: `src/components/studio/new-draft-modal.tsx`
- Modify: `src/components/studio/page-fit-modal.tsx`
- Modify: `src/components/studio/photo-cropper-modal.tsx`

**Interfaces:**
- `Dialog` re-exports `Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close`.
- `DialogContent` accepts `className`, `children`, and forwards `aria-labelledby`/`aria-describedby` supplied by each caller.
- Each modal keeps its existing props and business logic; only its outer shell changes.

- [ ] **Step 1: Build the primitive**

Wrap the unified package:

```tsx
import { Dialog as DialogPrimitive } from 'radix-ui';
```

Style the overlay as `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`, and the content as a centered, token-themed card with `max-h-[90vh] overflow-y-auto`, `role="dialog"`, and `aria-modal` supplied by Radix. Radix provides the focus trap, escape, outside click, scroll lock, and return-focus behavior.

- [ ] **Step 2: Migrate New Draft**

Replace the custom fixed overlay with `Dialog.Root`/`Dialog.Portal`/`Dialog.Content`; keep the existing form, type cards, and submit logic. Ensure `Dialog.Title` is the visible heading.

- [ ] **Step 3: Migrate Page-Fit**

Keep the `.page-fit-tabs-bar`, `.page-fit-modal-body`, and footer layout. Pass `className="page-fit-modal-box"` to the content. Remove the now-unused custom `.modal-overlay`/`.modal-box` CSS if no other component uses it.

- [ ] **Step 4: Migrate Photo Cropper**

Keep the canvas, pan/zoom, file validation, and `onSave` behavior. The content should be full-height-friendly (`max-h-[92vh]`), with the canvas body scrolling internally.

- [ ] **Step 5: Verify**

- Keyboard: open each modal, Tab cycles only inside it, Shift+Tab reverses, Escape closes, focus returns to the trigger.
- Mouse: clicking the overlay closes; clicking inside does not.
- Light and dark screenshots match the pre-migration look.
- `npm run verify` passes.

- [ ] **Step 6: Commit**

```powershell
git add src/components/ui/dialog.tsx src/components/studio/new-draft-modal.tsx src/components/studio/page-fit-modal.tsx src/components/studio/photo-cropper-modal.tsx
git commit -m "feat(a11y): migrate core modals to Radix Dialog"
```

### Task 1.2: Migrate the remaining three modals

**Files:**
- Modify: `src/components/studio/bullet-polish-modal.tsx`
- Modify: `src/components/studio/latex-inspector-modal.tsx`
- Modify: `src/components/studio/snapshot-modal.tsx`
- Delete after migration: `src/hooks/use-modal-behavior.ts` (if no callers remain)

- [ ] **Step 1: Migrate Bullet Polish and LaTeX Inspector**

Keep the intentionally dark code pane in the LaTeX inspector, but let Radix own the shell, focus trap, and close behavior. Keep the source pane scrollable inside the content.

- [ ] **Step 2: Migrate Snapshot**

Keep the inline restore confirmation and snapshot timeline. Remove `useModalBehavior` from all three files.

- [ ] **Step 3: Verify**

Repeat the keyboard/mouse matrix from Task 1.1. Confirm the LaTeX source pane still copies and scrolls, and the Bullet Polish fetch/apply flow still works with the ML service on and off.

- [ ] **Step 4: Commit**

```powershell
git add src/components/studio/bullet-polish-modal.tsx src/components/studio/latex-inspector-modal.tsx src/components/studio/snapshot-modal.tsx src/hooks/use-modal-behavior.ts
git commit -m "feat(a11y): migrate remaining modals to Radix Dialog"
```

### Task 1.3: Migrate topbar menus to Radix DropdownMenu

**Files:**
- Create: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/app/studio.tsx` (three topbar menus)
- Delete after migration: `src/hooks/use-dismiss.ts` (if unused)

**Interfaces:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel` wrapped from `radix-ui`.

- [ ] **Step 1: Build the primitive**

Style items as full-width, token-themed rows with `px-3 py-2`, hover/focus background, and destructive variants. Add `aria-haspopup="menu"` and `aria-expanded` to triggers (Radix supplies them when using `DropdownMenuTrigger`).

- [ ] **Step 2: Migrate the draft, export, and more menus**

Keep all item labels, icons, disabled states, and callbacks. Remove `onMouseLeave` closing and manual refs. The trigger should be a `DropdownMenuTrigger asChild` wrapping the existing button.

- [ ] **Step 3: Verify**

- Arrow Up/Down moves through items; Home/End jump; Enter activates; Escape closes; focus returns to the trigger.
- Outside click closes.
- Draft select/duplicate/delete, PDF download, LaTeX ZIP, recompile, inspector, snapshots, page-fit, backup import/export, and theme toggle all still work.

- [ ] **Step 4: Commit**

```powershell
git add src/components/ui/dropdown-menu.tsx src/app/studio.tsx src/hooks/use-dismiss.ts
git commit -m "feat(a11y): use Radix DropdownMenu for topbar menus"
```

### Task 1.4: Reduced-motion and focus-visible audit

**Files:** `src/app/style.css`, component files found by the audit.

- [ ] **Step 1: Add reduced-motion support**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Audit custom buttons**

Grep for `<button` outside `src/components/ui/` and confirm each has either a `focus-visible:ring-*` class or the shared button styles. Add `aria-label` to every icon-only button.

- [ ] **Step 3: Verify**

Use keyboard-only navigation through the topbar, sidebar, editor, design, AI Tools, and all modals. Check visible focus in light and dark themes. Screenshot with `prefers-reduced-motion: reduce` emulated in browser devtools.

- [ ] **Step 4: Commit**

```powershell
git add src/app/style.css src/components
git commit -m "fix(a11y): reduced motion and focus-visible audit"
```

---

## Phase 2 — Feedback and destructive actions

### Task 2.1: Add an accessible toast system

**Files:**
- Create: `src/components/ui/toast.tsx`
- Modify: `src/app/studio.tsx` (provider + transient messages)
- Modify: `src/app/editor/page.tsx` if the provider belongs above `Studio`

**Interfaces:**
- `ToastProvider` wraps the editor.
- `useToast()` returns `toast({ title, description?, variant?: 'default' | 'success' | 'error' })`.
- Toasts auto-dismiss after 5s; errors stay until dismissed; `aria-live="polite"` for success and `assertive` for errors.

- [ ] **Step 1: Build on Radix Toast**

Use `radix-ui`'s Toast primitives. Style with semantic tokens; include a close button and a progress indicator. Limit the viewport to three visible toasts.

- [ ] **Step 2: Replace transient messages**

Use toasts for backup export/import, duplicate/delete draft, add/remove section, photo update, page-fit applied, and copy failures. Keep compile status inline in the preview pane.

- [ ] **Step 3: Verify**

Trigger success and error paths (including ML offline and invalid import). Confirm screen-reader announcement is sensible and toasts do not cover the primary actions.

- [ ] **Step 4: Commit**

```powershell
git add src/components/ui/toast.tsx src/app/studio.tsx src/app/editor/page.tsx
git commit -m "feat(ui): add accessible toast feedback"
```

### Task 2.2: Replace native confirm with an accessible AlertDialog

**Files:**
- Create: `src/components/ui/confirm-dialog.tsx`
- Modify: `src/app/studio.tsx` (delete draft/section/entry, import replace)
- Modify: `src/components/studio/entry-card.tsx` / `section-card.tsx` if they own confirmations

**Interfaces:**
- `ConfirmProvider` + `useConfirm()` returning `(options: { title: string; description: string; confirmLabel?: string; destructive?: boolean }) => Promise<boolean>`.
- Destructive confirm button uses the rose/destructive variant.

- [ ] **Step 1: Build the provider**

Use Radix AlertDialog. The promise resolves `true` on confirm and `false` on cancel/Escape/overlay. Cancel receives initial focus.

- [ ] **Step 2: Replace `window.confirm` calls**

Search: `Select-String -Path src -Pattern 'window.confirm|confirm\\('`. Replace every confirmation that guards destructive data loss. Keep informational `alert()` only if it cannot be a toast.

- [ ] **Step 3: Verify**

Delete a draft, section, and entry; cancel and confirm each. Import a backup and confirm replacement. Check focus return and Escape behavior in both themes.

- [ ] **Step 4: Commit**

```powershell
git add src/components/ui/confirm-dialog.tsx src/app/studio.tsx src/components/studio
git commit -m "feat(ui): replace native confirms with AlertDialog"
```

---

## Phase 3 — PDF robustness

### Task 3.1: Break long URLs safely

**Files:** `src/lib/latex.ts`, `tests/render.test.mjs`, `tests/golden/*` (regenerate).

- [ ] **Step 1: Write the failing test**

Render a 200-character URL with `linkDisplay: 'url'` and `'both'`. Compile with pdflatex. Assert:
- exit code 0,
- PDF has selectable text,
- the URL text appears in `pdftotext`,
- the compile log has no `Overfull \hbox` warning for the URL line (or the page count does not grow unexpectedly).

- [ ] **Step 2: Add `xurl`**

Add `\usepackage{xurl}` to the preamble. For `linkDisplay: 'url'`/`'both'`, render URL text through `\nolinkurl{...}` inside `\href`, or use `\url{...}` with `\href`; test which keeps links clickable.

- [ ] **Step 3: Regenerate goldens and verify**

Run `npm run golden:update`, `npm test`, and inspect a long-URL PDF page visually.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/latex.ts tests/render.test.mjs tests/golden
git commit -m "fix(pdf): wrap long URLs with xurl"
```

### Task 3.2: Friendly missing-font-package errors

**Files:** `src/app/api/compile/route.ts`, `tests/route.test.mjs`.

- [ ] **Step 1: Map known package failures**

When the log contains `fontawesome5.sty` / `fontawesome5` not found, return a clear message: "The PDF uses link-type icons. Install the TeX Live `fontawesome5` package or disable Link Type Icons." Include the safe log tail.

- [ ] **Step 2: Test**

Unit-test the log-to-error mapping by extracting a pure `explainCompileFailure(log, executable)` helper; assert the FontAwesome message and the existing missing-`pdflatex` message.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/compile/route.ts tests/route.test.mjs
git commit -m "fix(pdf): explain missing TeX packages clearly"
```

---

## Phase 4 — Finish the studio decomposition

### Task 4.1: Extract the topbar

**Files:** create `src/components/studio/topbar.tsx`; modify `src/app/studio.tsx`.

Use the prop interface from the original hardening plan (pane, drafts, download/export/recompile, inspector, snapshots, page-fit, backup, theme). Menu state and Radix DropdownMenu triggers move into `Topbar`. Keep all labels and behaviors unchanged.

- [ ] **Step 1: Move the JSX and menu state**

No logic changes. Keep `aria-*` attributes and `title` strings.

- [ ] **Step 2: Verify**

Run the full action matrix: pane tabs, draft select/duplicate/delete, download, LaTeX ZIP, force recompile, inspector, snapshots, page-fit, backup export/import, theme cycle, home link, sidebar collapse. Keyboard-check the menus.

- [ ] **Step 3: Commit**

```powershell
git add src/components/studio/topbar.tsx src/app/studio.tsx
git commit -m "refactor: extract studio topbar"
```

### Task 4.2: Extract the editor header and section quick-nav

**Files:** create `src/components/studio/editor-header.tsx`; modify `studio.tsx`.

Move the breadcrumb, editable title, section chips, and scroll-to-section callbacks. Target `studio.tsx` under 1,100 lines. If it remains above, stop and report rather than starting a third extraction in the same pass.

- [ ] **Step 1: Move the header**

Keep the exact `aria-label`, title input, and chip icon logic.

- [ ] **Step 2: Verify**

Draft rename, section jump, pane switch, mobile layout, and autosave still work.

- [ ] **Step 3: Commit**

```powershell
git add src/components/studio/editor-header.tsx src/app/studio.tsx
git commit -m "refactor: extract editor header"
```

---

## Phase 5 — AI usability and optional accuracy

### Task 5.1: One-command local startup and visible retry

**Files:** `scripts/start-local.ps1` (or `.cmd`), `package.json`, `src/components/studio/ats-panel.tsx`, README.

- [ ] **Step 1: Add a launcher**

`npm run dev:full` starts the Next dev server and the Python service in separate PowerShell windows/processes, waits for `127.0.0.1:3000` and `127.0.0.1:8000/health`, and prints clear status. Do not auto-start Ollama; report whether it is reachable.

- [ ] **Step 2: Add a retry control**

Expose `checkHealth` from `useMlService` as a "Retry connection" button when offline. Add a non-intrusive 15s retry while the AI Tools tab is open, with a clear "Local ML service offline" message and a link to the README setup.

- [ ] **Step 3: Verify**

Stop the service, open AI Tools, confirm offline + retry; start the service, click retry, confirm online. Confirm the editor and PDF still work when the service is absent.

- [ ] **Step 4: Commit**

```powershell
git add scripts/start-local.ps1 package.json src/components/studio/ats-panel.tsx README.md
git commit -m "feat(ml): one-command local startup and retry"
```

### Task 5.2: Hybrid embeddings via Ollama (optional, recommended first ML step)

**Files:** `services/ml/ollama_client.py`, `services/ml/matcher.py`, `services/ml/main.py`, `tests/test_ml_service.py`.

- [ ] **Step 1: Add an embedding path**

If an embedding model is installed (default `nomic-embed-text`, configurable), call Ollama `/api/embeddings` for the resume and JD, compute cosine similarity, and blend it with the existing lexical score. If unavailable, keep the current lexical result and report `source: "lexical"`.

- [ ] **Step 2: Keep it optional**

Do not require a model pull. Add a `/api/ollama/status` field for the embedding model and a UI note when semantic mode is unavailable.

- [ ] **Step 3: Test**

Mock the Ollama embedding response in Python tests; assert the cosine path, the fallback path, and stable result keys. Run a live check with the local model if available.

- [ ] **Step 4: Commit**

```powershell
git add services/ml tests/test_ml_service.py
git commit -m "feat(ml): optional Ollama embeddings with lexical fallback"
```

### Task 5.3: NER upgrade (separate scope decision)

**Files:** `services/ml/requirements-ner.txt`, `services/ml/taxonomy.py`, optional `services/ml/ner.py`.

- [ ] **Step 1: Decide the dependency budget**

Option A: stay regex (current). Option B: add spaCy `en_core_web_sm` + an `EntityRuler` seeded from the taxonomy (~40MB). Option C: add a transformer NER model (hundreds of MB; not recommended for V1).

- [ ] **Step 2: Implement only if Option B is approved**

Load spaCy lazily; if the model is missing, fall back to regex and report the fallback in `/health`. Add tests for the fallback and for entity offsets.

- [ ] **Step 3: Commit**

```powershell
git add services/ml tests/test_ml_service.py
git commit -m "feat(ml): optional spaCy NER with regex fallback"
```

---

## Phase 6 — Privacy history cleanup (owner decision)

**Files:** `docs/privacy-cleanup.md` (exists), no code changes.

- [ ] **Step 1: Decide**

The two reference PDFs are untracked now but remain in public Git history. Choose:
- rewrite history (`git filter-repo`) and force-push, or
- delete/recreate the remote repository.

- [ ] **Step 2: Execute only with explicit approval**

Follow `docs/privacy-cleanup.md`. Force-pushing rewrites every commit hash and invalidates clones. Afterward, verify:

```powershell
git log --all --oneline -- '*.pdf'
git rev-list --objects --all | Select-String -Pattern '\.pdf$'
```

Both must be empty.

---

## Phase 7 — Regression coverage and QA

### Task 7.1: Add browser-level regression tests (recommended)

**Files:** `playwright.config.ts`, `tests/e2e/*.spec.ts`, `package.json`.

- [ ] **Step 1: Add Playwright**

Install `@playwright/test` as a dev dependency and a `test:e2e` script. Start the dev server and ML service via the config's `webServer` array (or reuse `start-local.ps1`). Skip ML-dependent tests when `127.0.0.1:8000/health` is unreachable.

- [ ] **Step 2: Cover the new contracts**

- Landing: page scrolls; theme toggle switches and persists; sections anchor correctly.
- Editor: profile link add/edit/invalid URL; link display/underline; location toggles; divider width; PDF compiles with icons.
- A11y: modal focus trap, Escape, focus return; menu arrow keys.
- Feedback: toast success/error; confirm dialog cancel/confirm.
- AI: offline status + retry; ATS result renders without crashing.

- [ ] **Step 3: Run and commit**

```powershell
npm run test:e2e
git add playwright.config.ts tests/e2e package.json package-lock.json
git commit -m "test: add browser regression coverage"
```

### Task 7.2: Final matrix

- [ ] **Step 1:** `npm run verify` on `main`.
- [ ] **Step 2:** Manual viewport matrix: 360, 768, 960, 1280, 1440 widths; light/dark/system themes.
- [ ] **Step 3:** Error injection: stop ML service, block clipboard, corrupt import, delete photo, 200-char URL, missing `fontawesome5`, kill `pdflatex`, cancel compile.
- [ ] **Step 4:** Record results in `docs/verification-<date>.md` and commit.

---

## Effort and risk

| Phase | Effort | Risk | Notes |
|---|---|---|---|
| 1. Dialogs/menus | 4–6 h | Medium | Largest visual regression risk; migrate one modal at a time |
| 2. Toast/confirm | 3–4 h | Low–Medium | Add after Radix primitives are proven |
| 3. PDF URLs/errors | 2–3 h | Low | Golden snapshots will change |
| 4. Studio split | 3–5 h | Medium | Mechanical; smoke after each extraction |
| 5.1 AI startup | 2–3 h | Low | High UX value |
| 5.2 Embeddings | 1–2 days | Medium | Optional model; lexical fallback keeps core green |
| 5.3 NER | 1–2 days | Medium–High | Separate approval; dependency size |
| 6. Privacy rewrite | 30 min + coordination | High | Destructive; explicit approval only |
| 7. Playwright | 1 day | Low | Best long-term regression net |

**Recommended order:** 1 → 2 → 3 → 4 → 5.1 → 7.1 → optional 5.2 → optional 5.3 → 6.

## Definition of done

- All modals trap focus and return it; menus work with arrow keys.
- Toasts and in-app confirmations replace native dialogs for data-changing actions.
- Long URLs compile without overfull lines; missing TeX packages produce actionable messages.
- `studio.tsx` is below 1,100 lines and the topbar/editor header are separately testable.
- The AI panel has a one-command startup path and a visible retry.
- Browser tests cover the contracts above, or the manual matrix is recorded.
- `npm run verify` is green and the privacy decision is recorded.
