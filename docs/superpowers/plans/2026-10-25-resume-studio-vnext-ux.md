# Resume Studio V-next UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Resume Studio into a readable, customizable local document studio with light/dark themes, a collapsible responsive workspace, typed links, and debounced compiled-PDF preview.

**Architecture:** Keep the current Next.js 16 App Router and Node `pdflatex` route. Extract the large studio page into focused shell/editor/preview components, persist UI-only preferences locally, migrate project backups to schema v2, and render the verified PDF with a locally bundled PDF.js worker. A revision-aware preview controller debounces edits, cancels obsolete work where possible, and only enables export for the latest compiled revision.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react, IndexedDB, local TeX Live `pdflatex`, `react-pdf`/`pdfjs-dist`, `react-resizable-panels`, `@dnd-kit`, `next-themes`, and locally bundled DM Sans.

**Spec:** `docs/superpowers/specs/2026-10-25-resume-studio-vnext-ux-design.md`

## Global Constraints

- All profile data and photos stay in this browser and on this computer.
- Every preview and export uses the local Node route and installed `pdflatex`; no remote renderer, browser print-to-PDF, or HTML imitation is introduced.
- PDF document appearance remains print-oriented, white-page output by default. App dark mode changes the editor chrome, not the resume's paper/background colors.
- Content is never hidden, truncated, or rewritten to satisfy page limits. Any font/spacing changes are explicit user choices.
- No login, sync, telemetry, cloud database, AI, or public sharing is added.
- Compile only generated templates, with fixed arguments, `shell: false`, `-no-shell-escape`, timeouts, bounded logs, output validation, and safe cleanup.
- Keep theme, sidebar, and auto-preview preferences separate from resume variants and store them in localStorage.

## Review Focus

- A version-1 backup must migrate without losing profile, entries, overrides, photos, existing margins, or page settings; pin this in migration round-trip tests.
- A stale or aborted compile must never replace a newer PDF or remain exportable as current; pin this in preview-controller race tests.
- A long document must continue to show all content and report actual over-limit pages; retain and extend the existing overflow renderer test.
- Collapsed/resized panels and drag ordering must remain usable by keyboard and at phone widths; cover this in browser smoke checks.
- An invalid/unsupported link or missing optional TeX icon package must preserve a safe, selectable text link; cover URL validation, TeX compilation, and fallback behavior.

---

## File Map

- `src/app/studio.tsx` becomes the stateful composition point rather than containing every editor view.
- `src/app/layout.tsx` and new `src/app/providers.tsx` provide hydration-safe theme initialization.
- `src/app/style.css` defines readable typography, semantic light/dark tokens, and responsive studio layout.
- `src/lib/ui-preferences.ts` reads/writes theme, sidebar collapse, and auto-preview preferences.
- New `src/components/studio/` modules own the header, library/sidebar, editor sections, design panel, and responsive workspace.
- New `src/components/pdf/compiled-pdf-viewer.tsx` renders actual PDF pages and viewer controls.
- New `src/app/hooks/use-live-pdf-preview.ts` owns debouncing, revisions, fetch cancellation, Blob URL cleanup, and current/stale status.
- `src/lib/data.ts`, `src/lib/fixture.ts`, `src/lib/latex.ts`, and `src/app/api/compile/route.ts` add schema-v2 migration, typed links, richer layout settings, and abort propagation.
- `tests/resume.test.mjs`, `tests/render.test.mjs`, `tests/route.test.mjs`, plus new focused tests cover migration, link rendering, preferences, and preview races.

## Task 1: Stabilize PDF metadata and add a real page viewer

**Files:**
- Create: `src/components/pdf/compiled-pdf-viewer.tsx`
- Modify: `src/app/studio.tsx`, `src/app/api/compile/route.ts`, `package.json`, `package-lock.json`
- Test: `tests/route.test.mjs`, `tests/render.test.mjs`

**Interfaces:**
- Produces `CompiledPdfViewer({ src: string; expectedPageCount: number | null; overflow: boolean; onPageCountChange: (pages: number) => void })`.
- `src` is an object URL for the verified PDF Blob returned by `/api/compile`; PDF.js worker assets are bundled locally and version-matched.
- The route continues to return `X-Resume-Page-Count`, `X-Resume-Max-Pages`, and `X-Resume-Overflow`; the client treats missing/malformed metadata as an error state rather than displaying “unknown pages” as success.

- [ ] **Step 1: Add route metadata assertions**

Extend the existing local compile route test to assert valid integer page count/max-page headers, a boolean overflow header, and a non-empty selectable-text PDF for both within-limit and over-limit fixtures.

- [ ] **Step 2: Run the route test and observe current behavior**

Run: `node --experimental-strip-types --test tests/route.test.mjs`
Expected: current route-level metadata checks pass; record the browser-only mismatch (“unknown pages”) for client verification.

- [ ] **Step 3: Install and implement the local PDF viewer**

Add `react-pdf` and its matching `pdfjs-dist`; dynamically load the viewer on the client and configure a bundled worker URL. Render every page from `src` and implement previous/next page, zoom in/out, fit width, fit page, actual page count, overflow badge, and open/download controls.

- [ ] **Step 4: Connect the viewer to the existing compiled Blob**

Replace the native PDF iframe in `src/app/studio.tsx` with `CompiledPdfViewer`. Keep the same Blob for the viewer and export action; do not convert or re-render it through HTML.

- [ ] **Step 5: Verify local rendering**

Run: `npm test`, `npm run typecheck`, `npm run build`.
Then use agent-browser at 1440 × 900 to compile a synthetic variant and confirm the canvas/page renders, page count matches the PDF, zoom/page controls work, and download remains the verified PDF.
Expected: no white preview canvas or “unknown pages” state after successful compile.

- [ ] **Step 6: Commit the viewer slice**

```powershell
git add package.json package-lock.json src/app/studio.tsx src/app/api/compile/route.ts src/components/pdf/compiled-pdf-viewer.tsx tests/route.test.mjs tests/render.test.mjs
git commit -m "feat: render compiled PDFs in a local viewer"
```

## Task 2: Add theme, typography, and a responsive collapsible workspace

**Files:**
- Create: `src/app/providers.tsx`, `src/lib/ui-preferences.ts`, `src/components/studio/studio-header.tsx`, `src/components/studio/resume-library.tsx`, `src/components/studio/studio-workspace.tsx`
- Modify: `src/app/layout.tsx`, `src/app/studio.tsx`, `src/app/style.css`, `package.json`, `package-lock.json`
- Test: new `tests/ui-preferences.test.mjs`; browser smoke checks

**Interfaces:**
- `UiPreferences` is `{ theme: 'light' | 'dark' | 'system'; sidebarCollapsed: boolean; autoPreview: boolean; previewDelayMs: number }`.
- `loadUiPreferences(): UiPreferences` returns safe defaults on missing or invalid localStorage; `saveUiPreferences(prefs: UiPreferences): void` stores only these UI preferences.
- `StudioWorkspace` receives `library`, `editor`, and `preview` React nodes and owns desktop/tablet/mobile layout state.

- [ ] **Step 1: Write preference tests**

Create tests for default preferences, valid round trip, corrupt JSON recovery, and range validation for `previewDelayMs` (500–2000 ms).

- [ ] **Step 2: Run preference tests to establish failure**

Run: `node --experimental-strip-types --test tests/ui-preferences.test.mjs`
Expected: FAIL because `ui-preferences.ts` is not implemented.

- [ ] **Step 3: Implement UI preference storage and theme provider**

Add `next-themes` if needed by the provider, set the default to `system`, add Light/Dark/System controls, and persist the sidebar and auto-preview preferences separately. Add a locally bundled variable DM Sans font; do not import Google Fonts or request font assets at runtime.

- [ ] **Step 4: Extract shell regions and implement responsive panels**

Add `react-resizable-panels`; use a collapsible library rail with accessible button/tooltip, persist collapse state, and provide keyboard-accessible resize handles. At tablet width use a library drawer and Edit/Preview switch; at phone width show full-width Edit and Preview tabs while preserving selected variant and scroll position.

- [ ] **Step 5: Raise interface text sizes and use semantic tokens**

Rework `style.css` into maintainable sections with CSS variables for light/dark surface, text, border, focus, and status colors. Use 15–16 px body/control text, 14 px field labels, and at least 12 px secondary metadata. Ensure dark theme does not affect the PDF page.

- [ ] **Step 6: Verify themes, preferences, and layout**

Run: `node --experimental-strip-types --test tests/ui-preferences.test.mjs`; `npm run typecheck`; `npm run lint`; `npm run build`.
Use agent-browser at 1440, 1024, 768, and 390 CSS px to test Light/Dark/System, persisted theme/collapse state, resize handles, mobile Edit/Preview switching, keyboard access, and primary-text contrast.
Expected: no horizontal page overflow; editor fields remain readable and reachable at each width.

- [ ] **Step 7: Commit the shell and theme slice**

```powershell
git add src/app/layout.tsx src/app/providers.tsx src/app/studio.tsx src/app/style.css src/lib/ui-preferences.ts src/components/studio package.json package-lock.json tests/ui-preferences.test.mjs
git commit -m "feat: add themes and responsive studio workspace"
```

## Task 3: Migrate to typed links and add accessible ordering

**Files:**
- Modify: `src/lib/data.ts`, `src/lib/fixture.ts`, `src/app/studio.tsx`, `src/lib/latex.ts`, `tests/resume.test.mjs`, `tests/render.test.mjs`
- Create: `src/components/studio/contact-link-editor.tsx`, `tests/migration.test.mjs`
- Test: `tests/migration.test.mjs`, `tests/resume.test.mjs`, `tests/render.test.mjs`

**Interfaces:**
- `ContactLinkType = 'website' | 'linkedin' | 'github' | 'portfolio' | 'other'`.
- `ContactLink = { id: string; type: ContactLinkType; label: string; url: string }`.
- `migrateProject(input: unknown): ProjectDataV2` accepts v1 or v2; v1 link IDs are deterministically derived from owner ID and array index, existing links map to type `website`, and old uniform margins map to all four sides.
- `validateProject(input: unknown): ProjectDataV2` validates only the normalized v2 shape; callers import through `migrateProject` first.
- In v2, `DesignSettings` replaces `marginMm` with `marginsMm: { top: number; right: number; bottom: number; left: number }` and adds `sectionGapPt: number`, `entryGapPt: number`, `bulletIndentMm: number`, `dividerVisible: boolean`, `dividerWeightPt: number`, and `showContactIcons: boolean`. Existing `fontSize`, `fontFamily`, `lineSpacing`, `bulletSpacing`, colors, date/contact/page flags remain present.

- [ ] **Step 1: Write migration preservation tests**

Add v1 fixture tests asserting each migrated link preserves label/URL, receives a stable ID/type, all variant overrides and photos survive, existing `marginMm` becomes top/right/bottom/left margins, and new settings use documented defaults. Include corrupt/missing values that produce actionable validation errors.

- [ ] **Step 2: Run migration tests to establish failure**

Run: `node --experimental-strip-types --test tests/migration.test.mjs`
Expected: FAIL because `migrateProject` and schema v2 are not implemented.

- [ ] **Step 3: Implement schema v2 migration and validators**

Update `ProjectData`, `ContactLink`, and `DesignSettings`; migrate library, profile overrides, entry links, and entry-override links. Map `marginMm` to all sides. Derive `sectionGapPt`, `entryGapPt`, and `dividerWeightPt` from each template's current baseline so migrated PDFs keep their existing hierarchy; set bullet indent to 4.4 mm, divider visibility to true, and contact icons to false. Preserve every existing v1 value and reject invalid ranges rather than clamping imported content silently.

- [ ] **Step 4: Add typed link editing and icons**

Create an editor control with explicit link type, label, and URL; render corresponding lucide-react icon and text label. Validate URL protocols using the current safe URL rules. Keep profile email/phone as dedicated fields and expose simple add/remove controls.

- [ ] **Step 5: Render ATS-safe links**

Keep text labels as clickable selectable PDF content. T1 defaults to text-only; other templates may show optional local TeX icon marks only when compile-tested, never replacing labels. Unsupported TeX icon support falls back to text.

- [ ] **Step 6: Add accessible sortable section/entry ordering**

Add `@dnd-kit/core` and `@dnd-kit/sortable` with pointer and keyboard sensors. Retain move-up/move-down buttons as keyboard and non-drag alternatives. Do not alter ordering in sibling variants.

- [ ] **Step 7: Verify compatibility and PDF output**

Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
Expected: v1 JSON import, v2 round-trip, link validation, keyboard reorder, and all five local LaTeX template compiles pass without content loss.

- [ ] **Step 8: Commit the migration and link slice**

```powershell
git add src/lib/data.ts src/lib/fixture.ts src/app/studio.tsx src/lib/latex.ts src/components/studio/contact-link-editor.tsx tests
git commit -m "feat: migrate typed contact links and sortable sections"
```

## Task 4: Rebuild design controls as Quick and Advanced modes

**Files:**
- Create: `src/components/studio/design-panel.tsx`, `src/lib/design-presets.ts`
- Modify: `src/app/studio.tsx`, `src/app/style.css`, `src/lib/data.ts`, `src/lib/latex.ts`, `tests/resume.test.mjs`, `tests/render.test.mjs`
- Test: `tests/resume.test.mjs`, `tests/render.test.mjs`

**Interfaces:**
- `DesignPresetId = 'classic-ats' | 'compact' | 'developer-accent' | 'academic'`.
- `getDesignPreset(id: DesignPresetId, templateId: TemplateId, mode: DocumentMode): DesignSettings` returns complete design values without editing content.
- `DesignPanel` receives the active variant, `onChange(patch: Partial<DesignSettings>)`, and `onReset()`.

- [ ] **Step 1: Write renderer tests for new design values**

Test independent margins in generated geometry, section and entry gaps, bullet indentation, divider visibility/weight, and optional contact icons. Assert color/font/page settings remain connected and T1 has no decorative contact icons by default.

- [ ] **Step 2: Run renderer tests to establish failure**

Run: `node --experimental-strip-types --test tests/resume.test.mjs tests/render.test.mjs`
Expected: FAIL because settings and preset functions are not implemented.

- [ ] **Step 3: Implement design presets and safe validators**

Define complete presets per template/mode, preserve explicit user values after selecting a preset only when the UI says “apply preset”, and provide reset-to-template-default. Validate independent margin bounds, spacing bounds, and divider weight in schema v2.

- [ ] **Step 4: Build Quick and Advanced controls with shadcn primitives**

Quick mode shows the four presets and the most-used font size, margins, and accent color controls. Advanced mode groups Page, Typography, Spacing, Color, Header & Links, and Pagination. Use labeled slider-plus-number inputs with explicit mm/pt units and reset action.

- [ ] **Step 5: Wire every setting into LaTeX rendering**

Update geometry options and shared macros so all exposed settings affect actual compiled output. Never alter entry wording or reduce below configured font size. Add overflow warnings based on actual output page count.

- [ ] **Step 6: Verify each template and preset**

Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
Expected: fixture compiles through all templates; changing each exposed design property changes the generated TeX/PDF; all existing text remains present in extracted PDF text.

- [ ] **Step 7: Commit the design panel slice**

```powershell
git add src/components/studio/design-panel.tsx src/lib/design-presets.ts src/app/studio.tsx src/app/style.css src/lib/data.ts src/lib/latex.ts tests
git commit -m "feat: add quick and advanced document styling"
```

## Task 5: Add debounced, revision-aware local preview

**Files:**
- Create: `src/app/hooks/use-live-pdf-preview.ts`, `tests/preview-controller.test.mjs`
- Modify: `src/app/studio.tsx`, `src/app/api/compile/route.ts`, `tests/route.test.mjs`, `src/lib/ui-preferences.ts`
- Test: `tests/preview-controller.test.mjs`, `tests/route.test.mjs`

**Interfaces:**
- `useLivePdfPreview({ project, variantId, revision, enabled, delayMs }): { src: string | null; blob: Blob | null; status: 'idle' | 'scheduled' | 'compiling' | 'current' | 'stale' | 'error'; pageCount: number | null; overflow: boolean; error: string | null; compileNow(): void }`.
- The compile route attaches `request.signal` to the spawned `pdflatex` child; aborts terminate the child and still clean the temporary directory.

- [ ] **Step 1: Write preview race tests**

Use an injectable compile requester/fake timers to assert the 800 ms default debounce, no compile before idle, cancellation of the superseded request, stale responses ignored, current export disabled while stale, and disposal revokes Blob URLs.

- [ ] **Step 2: Run preview tests to establish failure**

Run: `node --experimental-strip-types --test tests/preview-controller.test.mjs`
Expected: FAIL because the preview controller does not exist.

- [ ] **Step 3: Implement preview controller and status model**

Add abortable request IDs/revisions, current/stale UI status, auto-preview toggle, configurable 500–2000 ms delay defaulting to 800 ms, explicit compile-now action, and safe Object URL lifecycle. Keep the previous PDF visible but mark it stale while the new revision compiles.

- [ ] **Step 4: Propagate cancellation into the Node route**

Pass the request abort signal to child process execution, handle `AbortError` as cancellation rather than a compilation error, and keep the timeout/error response behavior unchanged for active requests.

- [ ] **Step 5: Connect editor/design changes to revision state**

Every content, template, and design update increments the revision. Feed latest state to the hook; only a matching compiled revision enables export. Preserve explicit download and overflow metadata from the same PDF Blob.

- [ ] **Step 6: Verify debounce and browser behavior**

Run: `node --experimental-strip-types --test tests/preview-controller.test.mjs tests/route.test.mjs`; then `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Use agent-browser to type several rapid edits, observe one latest compile after idle, see the old page marked stale during compilation, and confirm the latest PDF renders and downloads.

- [ ] **Step 7: Commit live preview slice**

```powershell
git add src/app/hooks/use-live-pdf-preview.ts src/app/studio.tsx src/app/api/compile/route.ts src/lib/ui-preferences.ts tests
git commit -m "feat: add debounced local PDF preview"
```

## Task 6: Complete responsive, accessibility, and release verification

**Files:**
- Modify: `README.md`, `ROADMAP.md`, any focused components/tests uncovered above
- Test: `tests/`, running app through agent-browser, local TeX Live

**Interfaces:**
- No new product API. This task verifies the already-defined shell, settings, migration, preview, and compiler interfaces.

- [ ] **Step 1: Add edge-case regression tests**

Cover unsupported link protocol, old backup with empty optional links, long URL, long multi-page CV, missing `pdflatex`, missing/cancelled child, photo absent/present, and unsupported icon fallback. Assert all content remains extractable and page overflow is visible.

- [ ] **Step 2: Run the full automated quality gate**

Run sequentially to avoid the existing `.next/types` build/typecheck race:

```powershell
npm test
npm run lint
npm run build
npm run typecheck
```

Expected: all tests pass, lint/typecheck are clean, and the optimized Next.js build completes.

- [ ] **Step 3: Run browser acceptance at standard viewports**

At 1440 × 900, 1024 × 768, 768 × 1024, and 390 × 844 verify theme, collapse/resize, editor controls, section reorder, preview status, page controls, overflow and download. Check keyboard-only access and text contrast for both themes. Confirm no remote requests are made for fonts, icons, PDF rendering, or user data.

- [ ] **Step 4: Verify compiled documents**

Compile synthetic fixtures through all five templates using local `pdflatex`; inspect a T1 resume and T4 multi-page CV visually; check selectable text, link annotations, page count, and page limits.

- [ ] **Step 5: Update usage docs and roadmap**

Document theme/sidebar/auto-preview preferences, Quick/Advanced controls, typed link migration, viewer controls, and supported PDF font constraints. Mark only verified acceptance criteria complete in `ROADMAP.md`.

- [ ] **Step 6: Commit final QA and docs**

```powershell
git add README.md ROADMAP.md tests
git commit -m "docs: document Resume Studio v-next UX"
```
