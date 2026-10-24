# Resume Studio V-next UX and Preview Design

## Status

Design proposal for user review. This document authorizes no implementation by itself.

## Intent and constraints

Resume Studio should feel like a clear, responsive document studio for one person editing local resume/CV variants. The next version should make the controls comfortable to read and discover, keep the resulting document visible while editing, and expose more useful layout choices without turning the editor into a dense settings form.

User-stated priorities: a major UI/UX polish, larger interface text, dark theme, collapsible sidebar, real-time PDF preview, control of margins/padding/fonts, and type-aware icons for links such as LinkedIn, GitHub, and websites.

Constraints retained from V1:

- All profile data and photos stay in this browser and on this computer.
- Every preview and export uses the local Node route and installed `pdflatex`; no remote renderer, browser print-to-PDF, or HTML imitation is introduced.
- PDF document appearance remains print-oriented, white-page output by default. App dark mode changes the editor chrome, not the resume's paper/background colors.
- Content is never hidden, truncated, or rewritten to satisfy page limits. Any font/spacing changes are explicit user choices.
- No login, sync, telemetry, cloud database, AI, or public sharing is added.

## Current UI review

Inspected the app running at `http://127.0.0.1:3000` using agent-browser at a 1262 × 568 viewport.

- The three-column workspace is visible, but editor labels are mostly about 9 px, inputs about 11 px, and toolbar actions about 10–12 px. The CSS declares DM Sans/Manrope but does not load local font files, so the browser falls back to Arial.
- The library occupies a fixed 242 px column with no collapse control. At narrow widths the workspace stacks, making the editor and PDF a long vertical flow.
- Content and design are separate tabs. The design tab includes many settings but no quick/advanced distinction; low text size and a long scroll make the options difficult to scan.
- Preview is currently manual via “Build preview”, although the panel is labeled “LIVE DOCUMENT”. After successful compilation the download action became available, but the browser capture showed a white preview area and the page status read “unknown pages”. Determine whether the white area is a headless Chromium PDF-viewer capture limitation or a real browser rendering problem, and correct page metadata handling.
- Profile links are freeform label/URL pairs. There are no link-type icons or link-specific fields.

## Recommended interaction model

### 1. Resizable studio workspace

On wide screens, keep three coordinated regions: a collapsible resume/content library, the editor, and the actual compiled PDF preview. The library collapses to a narrow icon rail and remembers its state. The editor and preview widths can be adjusted with keyboard-accessible resize handles; the preview never drops below a usable document width.

At tablet widths, allow the library to become a drawer and provide a clear Edit/Preview switch. On phones, use full-width Edit and Preview tabs rather than squeezing a paper page beside form fields. Preserve the selected variant and scroll positions when switching panes.

The top bar contains the app mark, active variant selector, save state, theme control, backup actions, and one primary preview/export action. Keep page count, current/stale state, and overflow status next to the preview controls.

### 2. Readable editor and navigation

Use 15–16 px body/control text, 14 px field labels, and at least 12 px secondary metadata. Replace the current tiny uppercase labels and symbolic-only edit controls with readable text or tooltips, consistent icon buttons, clear focus rings, and keyboard-operable controls.

Use a section outline for fast navigation. Drag-and-drop reordering is available with pointer and keyboard input; retain explicit move-up/move-down actions as an accessible alternative. Keep content editing, section visibility, template choice, and design controls discoverable without repeating section numbers as the only hierarchy.

### 3. Theme and local typography

Offer Light, Dark, and System modes; default to System on first use and persist the choice in localStorage. Use semantic CSS tokens and verify contrast in both themes. The PDF uses its own selected document colors and remains unchanged by editor theme.

Bundle a variable interface font locally (no Google Fonts or runtime network fetch). Continue to expose only fonts supported by the local pdfLaTeX setup; show the chosen font name and a clear unsupported-character message.

### 4. Quick and Advanced design controls

Quick mode presents a small set of non-destructive presets (Classic ATS, Compact, Developer Accent, Academic) and common settings. Selecting a preset updates only design settings on the active variant; it never edits content or section visibility.

Advanced mode groups controls into Page, Typography, Spacing, Color, Header and Links, and Pagination:

- Paper size; independent top/right/bottom/left margins in mm.
- Font family from a curated pdfLaTeX-compatible list, document point size, and line height.
- Section gap, entry gap, bullet indentation/spacing, and date alignment.
- Text/accent colors and section-divider visibility/weight.
- Contact field visibility and optional icon presentation.
- Target/max page policy and page numbers.

Every setting that affects the exported document must feed the LaTeX renderer. Provide a reset-to-template-default action and a clear indicator when a variant differs from its template preset. Settings may offer sliders plus numeric inputs, but must use explicit units and allow precise values. Minimum font size and safe bounds remain enforced; no automatic force-fit is introduced.

### 5. Typed contact links and icons

Replace link-only freeform identity with a typed contact-link record while preserving the current label and URL. Supported initial types: website, LinkedIn, GitHub, portfolio, and other. Profile email and phone remain dedicated fields with visibility toggles. Show matching Lucide icons in the editor and type-aware labels in the PDF.

PDF link labels remain selectable text and clickable. Decorative PDF icons are optional and must not replace labels; keep them disabled in Simple ATS by default. Do not add a remote icon service. Include a schema-v1-to-v2 migration that maps existing links to `website`, preserves their label/URL, and leaves all other content and variants intact.

### 6. Debounced compiled PDF preview

The preview is the actual PDF returned by the local `pdflatex` route. When auto-preview is enabled (default), wait 800 ms after the last edit before compiling. Keep the previous compiled PDF visible while a new revision builds and label it “Updating” or “Preview out of date”. Export is enabled only for a PDF matching the current document revision. Retain a manual refresh action and an option to turn auto-preview off.

Allow at most one active client compile per workspace: debounce before dispatch, cancel the previous request when possible, and always ignore responses for stale revisions. Propagate cancellation to the child process where supported so rapid edits do not queue expensive TeX runs. Keep timeout, bounded logs, temp-directory cleanup, validation, and `shell: false` guarantees.

Use a client-only PDF.js viewer (React-PDF or equivalent, with its worker bundled locally) to render page canvases and expose fit-width, fit-page, zoom, page navigation, and actual page count. Do not proxy PDF bytes to another service. Offer a separate open/download action for the same verified Blob. Investigate and fix the current blank capture/unknown page-count state before considering preview work complete.

## Technical approach and dependencies

Keep Next.js 16 App Router, strict TypeScript, Tailwind v4, existing shadcn/ui primitives, and the current local compile route. Add dependencies only where they provide the interactions described:

- `next-themes` for local theme state if the current CSS-token setup cannot provide equivalent hydration-safe behavior.
- A local PDF.js viewer (`react-pdf` plus its matching `pdfjs-dist`) for deterministic page rendering and controls.
- `react-resizable-panels` for accessible workspace sizing.
- `@dnd-kit/core` and `@dnd-kit/sortable` for accessible section/entry reordering.
- A locally bundled font package such as `@fontsource-variable/dm-sans`; no external font fetch.

Reuse shadcn/Radix controls and lucide-react icons. Do not add a large form or state-management framework unless implementation reveals a concrete validation/state problem.

## Data and compatibility

Increment the project backup schema from version 1 to version 2 only for the typed link representation. Add a pure migration from version 1 that preserves all existing profile, section, entry, override, variant, photo, and design values. Theme and sidebar preferences are UI preferences and remain outside resume variants in localStorage. The current page/design settings remain variant-scoped.

## Acceptance criteria

1. Light, Dark, and System themes work after reload, honor reduced motion, and pass a contrast check for primary text and controls. Theme never changes exported PDF colors.
2. The sidebar collapses/expands by mouse and keyboard, survives reload, and the layout remains usable at 1440, 1024, 768, and 390 CSS px.
3. Editor text and fields meet the specified minimum sizes; controls have visible labels, focus states, and accessible names.
4. Editing content or design starts a local compile after 800 ms idle when auto-preview is enabled. The preview updates to the latest revision only; rapid changes do not leave the UI showing a stale PDF as current.
5. The PDF viewer renders every page from the actual compiled PDF, reports accurate page count/overflow, provides zoom/page controls, and download returns identical PDF bytes.
6. Changes to margins, font, spacing, colors, link presentation, and page policy are reflected in compiled output. No content is dropped or resized without explicit user settings.
7. Existing v1 backups import through a tested migration. Typed links preserve labels and URLs, show the right editor icon, and remain clickable/selectable in generated PDFs.
8. Section reorder works with pointer and keyboard. Collapse, theme, editing, preview, and export remain functional with browser storage and local TeX only.

## Implementation phases

1. Fix and instrument current preview metadata/rendering; establish browser screenshots and responsive/contrast baselines.
2. Build theme tokens, locally bundled font, larger controls, collapsible/resizable desktop layout, and tablet/mobile presentation.
3. Add typed links and v1→v2 migration; improve section navigation and accessible sorting.
4. Rework design controls into Quick and Advanced groups; wire each exposed control to the shared LaTeX renderer and add the reset action.
5. Add the PDF.js viewer and revision-aware debounced local compilation with cancellation/stale-state handling.
6. Run unit, migration, renderer, route, browser, and accessibility checks; compare the editor at standard viewport sizes and verify PDF output with local TeX Live.

## Risks and decisions

- Local TeX compilation time varies by machine. If 800 ms debounce still causes a poor editing experience, retain auto-preview as default but add a configurable delay and make “pause/disable auto-preview” easy to find.
- PDF.js worker bundling with Next.js 16 needs an integration spike early in Phase 1. If its client bundle is too large or worker deployment is fragile, use a verified alternative that still renders the actual PDF locally.
- Local TeX installations may lack an icon/font package. Keep accessible text labels in all PDFs and make any decorative icon rendering optional and compile-tested.
- Browser PDF rendering behavior may differ from the agent-browser capture; Phase 1 must compare a normal headed browser with automated capture before attributing the white preview to the route.
