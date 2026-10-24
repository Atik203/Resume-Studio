# Resume Studio — Roadmap

## 1. Product brief

Build a local-first resume/CV studio for personal use on Windows. The user likes FlowCV's simple, professional, minimal templates and wants full control over content, layout settings, document variants, and PDF compilation. The user has TeX Live installed locally and wants all PDFs compiled with local `pdflatex`.

### Success criteria

- Match the general layout and spacing of the one-page reference PDF before designing additional templates.
- Produce selectable-text PDFs using local TeX Live `pdflatex`.
- Support five minimal templates and both short resume and longer CV workflows.
- Maintain one reusable master content library and multiple independent variants.
- Keep all profile data and photos local, with a robust export/restore workflow.
- Never silently drop content to satisfy page limits.

## 2. Scope

### V1 must include

- Local web app, no mandatory login or external APIs.
- Master profile/content library and named resume/CV variants.
- Five templates:
  1. Simple ATS (primary, FlowCV-like one-page design)
  2. Clean Compact
  3. Modern Developer
  4. Academic CV
  5. Profile CV with optional photo
- Editable standard sections and user-defined custom sections.
- Section/entry visibility, ordering, addition, deletion, and duplication.
- Template-level and global design settings.
- Local `pdflatex` compilation, real PDF preview, and verified PDF export.
- IndexedDB autosave and JSON/ZIP backup/import.
- Clear compile errors, page overflow messages, and validation.
- Synthetic test fixtures; never commit the user's personal resume data.

### Explicitly out of scope for V1

- Authentication or user accounts.
- Cloud database, cloud rendering, synchronization, collaboration, public sharing.
- Billing or subscription management.
- Mandatory LLM/AI integration.
- Arbitrary user-supplied TeX execution through the UI.
- Public production deployment.

## 3. Reference-PDF review (Phase 0)

The user will attach two reference PDFs to Codex. Before coding:

1. Locate both PDF files in the workspace or attachment mount.
2. Determine which PDF is the one-page FlowCV-like developer resume and which is the academic/longer CV.
3. Inspect every page visually. Text extraction alone is insufficient because spacing, alignment, font hierarchy, separators, page breaks, and the portrait/layout treatment matter.
4. Record a compact design specification: page size, margins, name/title alignment, contact row, section headings, date alignment, bullet indentation, divider thickness/color, fonts, and vertical spacing.
5. Use the one-page PDF as the pixel/layout reference for Template 1. Use the second CV to guide section structure and longer-document behavior.
6. Do not change the source PDFs. Keep them as read-only references.

Deliverable: `docs/reference-design-notes.md` with observations and any visual ambiguities.

## 4. Proposed architecture

### Frontend

- Next.js App Router + TypeScript if the repository is empty; otherwise preserve the existing stack if sensible.
- Tailwind CSS; shadcn/ui only where it provides useful primitives.
- React Hook Form + Zod for complex forms and validation, if appropriate.
- PDF.js or an equivalent local viewer to show the actual output PDF.

### Data and persistence

- IndexedDB stores profile data, content entities, resume variants, settings, and photo blobs.
- Small UI preferences may use LocalStorage.
- Data schema is versioned and validated.
- JSON/ZIP backup contains profile/library, variants, settings, and image assets.
- Import shows a preview/validation result and never silently overwrites current content.

### Rendering

- Author templates as controlled `.tex` files with shared LaTeX macros/utilities.
- Run `pdflatex` on the same computer through a Node.js runtime route/service. The browser must not try to execute it directly.
- Resolve executable from `PDFLATEX_PATH` if configured, otherwise `pdflatex` on `PATH`.
- Use `spawn`/`execFile` with fixed arguments and `shell: false`; no shell interpolation.
- Compile with non-interactive, halt-on-error, file-line-error, and no-shell-escape flags. Use unique temporary directories, a timeout, bounded logs, output verification, and cleanup.
- Escape user-provided text before it reaches LaTeX. Templates, not imported resume content, are allowed to define LaTeX commands.
- PDF preview and export must use the same compiled PDF output; do not create a separate browser-only imitation of the template.

### Local-only constraints

- No remote services or mandatory API keys.
- No telemetry or analytics.
- Default to loopback-only local development.
- No user resume data in source control.

## 5. Data model outline

Use a versioned schema with stable IDs. Exact interface definitions should be refined after inspection, but should cover:

- `Profile`: identity/contact details, links, default preferences.
- `EducationEntry`: institution, qualification, dates, location, GPA/CGPA, descriptions, bullets.
- `ExperienceEntry`: organization, role, employment type, location, dates, bullets.
- `ProjectEntry`: name, tagline/description, bullets, technologies, live URL, source URL.
- `SkillGroup`: label, ordered skills.
- `AwardEntry`, `CertificateEntry`, `PublicationEntry`, `CourseEntry`, `LanguageEntry`.
- `CustomSection`: user-defined heading and entries.
- `ContentLibrary`: the canonical reusable entries.
- `ResumeVariant`: ID/name, document type (`resume` or `cv`), template ID, selected content IDs, section order/visibility, variant-specific overrides, layout settings, page policy, optional photo reference.
- `AppSettings`: theme/editor preferences, `pdflatex` executable override, default paper size and default typography settings.

Variant content must not accidentally mutate the master library. A variant should select master entries by ID and store any local override explicitly.

## 6. Template specifications

### T1 — Simple ATS (build first)

- Primary visual target: first uploaded one-page developer resume.
- Single column, monochrome or near-monochrome.
- Clear name and job-title hierarchy, compact contact details, readable section headings, restrained divider lines, right-aligned dates where appropriate, conventional bullets.
- No photo, charts, icons as content substitutes, tables for main page layout, or decorative sidebars.
- One-page resume default. Must pass PDF text-order checks.

### T2 — Clean Compact

- Left-aligned heading and single-column content.
- Slightly denser spacing while keeping a configurable minimum font size.
- Best for concise project-heavy applications.

### T3 — Modern Developer

- Single column with one configurable, restrained accent color.
- Clear technical skill categories, project names, role/date alignment, and technology summaries.
- Avoid skill bars, rating dots, or decorative graphics that are difficult for ATS parsers.

### T4 — Academic CV

- Traditional, text-first structure with flexible sections for research interests, education, experience, projects, publications, coursework, teaching, awards, certificates, and languages.
- Two-page default, maximum three pages by default.
- Repeated header/page numbers may be configurable.
- Keep headings attached to following content when possible.

### T5 — Profile CV

- Minimal CV with optional portrait in the header.
- Balanced layout when photo is absent.
- Photo is optional, local, size/type validated, and never automatically added to T1–T4.
- Use formats supported by `pdflatex` (PNG/JPEG/PDF as appropriate); reject or explicitly convert WebP rather than producing a broken PDF.

## 7. Page and layout rules

- Resume: default one page, maximum one page unless the user explicitly changes the rule.
- CV: default two pages, maximum three pages by default.
- Default paper size: A4; optionally support US Letter.
- All font/margin/spacing settings should have safe defaults and validation bounds.
- Do not silently shrink font, remove bullets, hide sections, or truncate wording.
- Detect page overflow using a robust approach. If the engine cannot reliably predict overflow before compilation, compile the PDF and inspect actual page count plus template/page-policy metadata.
- Provide actionable overflow suggestions: shorten a selected bullet, hide an item, adjust section order, use the compact template, or modify spacing/font settings.
- Do not block exporting an over-limit CV without telling the user why; the user can explicitly override a warning if appropriate.

## 8. Implementation phases

### Phase 0 — Inspect references and environment

- Inspect repository and toolchain.
- Find and visually inspect the two PDFs.
- Check local `pdflatex` availability.
- Write `docs/reference-design-notes.md` and `docs/architecture.md`.
- Do not install an alternative PDF renderer.

**Exit criteria:** a written visual spec and verified local compilation capability (or a precise documented PATH/configuration blocker).

### Phase 1 — Schema and persistence foundation

- Define versioned Zod/TypeScript schemas.
- Implement IDs, content library, variant selection and local overrides.
- Add IndexedDB persistence and autosave status.
- Add import/export schema and round-trip tests.
- Use synthetic fixture data in tests.

**Exit criteria:** create/edit/reload a profile and multiple variants without losing or cross-mutating data.

### Phase 2 — First vertical slice: T1 + pdflatex

- Implement shared LaTeX escaping and safe URL handling.
- Build the simple ATS `.tex` template from the reference notes.
- Implement local Node compile route/service using `pdflatex`.
- Verify PDF exit status, existence, non-empty output, timeout, and errors.
- Add a basic preview/download flow.
- Compare the generated PDF visually with the original reference and iterate on layout.

**Exit criteria:** realistic synthetic content compiles locally; special characters work; PDF text is selectable; links are clickable; no remote service is used.

### Phase 3 — Editor and variant UX

- Implement profile/content editing, add/remove entries, bullet editing, section order/visibility, duplicate variant, and template selector.
- Use the actual compiled PDF as the preview.
- Debounce preview requests and prevent stale compile responses from replacing the latest preview.
- Provide explicit Export PDF and saved-status indicators.

**Exit criteria:** edit → preview → export works end-to-end and reload restores data.

### Phase 4 — Templates T2–T5

- Add templates incrementally and validate output after each one.
- Add optional photo support and photo removal/balanced header behavior.
- Add shared global style settings and per-template overrides.

**Exit criteria:** five distinct templates render the same schema without template-specific data duplication.

### Phase 5 — Page controls and backup hardening

- Add resume/CV defaults and max-page preferences.
- Detect actual output page count and show overflow warnings.
- Implement full ZIP backup/import including photos and variants.
- Add data migration handling for schema changes.

**Exit criteria:** long-content cases fail visibly and safely; project restore is verified.

### Phase 6 — QA and local usability

- Run lint, typecheck, unit/integration tests and production build.
- Compile all templates using local `pdflatex` in tests.
- Verify edge cases, text extraction, links, image inclusion, and page counts.
- Document setup, running, backup/restore, `PDFLATEX_PATH`, and troubleshooting.
- Optional: only after the web app is stable, assess Tauri packaging for a Windows desktop executable.

**Exit criteria:** reproducible local setup, written usage instructions, and no known silent data-loss paths.

## 9. Required tests

- LaTeX escaping: backslash, braces, `$`, `&`, `%`, `#`, `_`, `~`, `^`, newlines, and Unicode punctuation supported by the chosen pdfLaTeX setup.
- Empty/missing optional sections and empty contact fields.
- Long projects/bullets/URLs, long organization names, dates, and unusual text lengths.
- All implemented templates compile with fixture data via local `pdflatex`.
- Photo present, photo absent, unsupported format, and oversized photo.
- Resume overflow and CV 1/2/3/4-page edge cases; show warning/over-limit behavior rather than discarding content.
- Data save/reload and backup/import round trip.
- Multiple variants do not overwrite each other's overrides.
- PDF has nonzero size, selectable text, working links, and expected page count.
- Missing `pdflatex`, compile failure, timeout, and invalid import produce actionable errors.

## 10. Developer workflow and documentation

Document:

- Prerequisites: supported Node.js version and TeX Live with `pdflatex` available on PATH.
- Install/dev/build/test commands using the repository's package manager.
- How to set `PDFLATEX_PATH` on Windows if PATH detection fails.
- Where local data is stored and how to export a backup.
- How to add/change a template safely.
- Known pdfLaTeX character/font limitations; never silently omit unsupported glyphs.

At the end of every implementation phase, report:

1. What was built.
2. Files changed/created.
3. Commands and tests actually run.
4. Test/build outcomes.
5. Known limitations and the next phase.

## 11. Progress checklist

- [x] Inspect instructions, repository, toolchain, reference files, and local `pdflatex` availability.
- [x] Render and visually inspect all three reference pages; write `docs/reference-design-notes.md`.
- [x] Implement validated project schema, IndexedDB autosave, independent variants, and versioned JSON backup/import.
- [x] Implement T1 and the guarded local `pdflatex` route; compile and visually inspect a synthetic PDF against the reference.
- [x] Implement the editor, templates T2–T5, actual PDF preview/download, overflow reporting, photo option, and project backup/import.
- [x] Run automated checks and production build; record actual results below.

### Delivery status

- Implemented with Next.js 16 App Router, TypeScript, Tailwind CSS v4, and shadcn/ui primitives. The checked-in build command uses Next's supported Webpack mode because the sandbox's Turbopack PostCSS worker could not start; development keeps the default Turbopack mode.
- Local Windows TeX Live `pdflatex` was found and used. The route runs in the Node.js runtime, resolves `PDFLATEX_PATH` or `PATH`, uses fixed arguments with `shell: false`, disables shell escape, bounds execution/logs, validates text and page count, and cleans per-request temporary files.
- The editor includes a synthetic starter library, master content plus variant overrides, section/entry visibility and ordering, editing and duplication, style/page controls, optional photo, IndexedDB save status, validated JSON backup/import, and compiled preview/export.
- Verification run on 2026-10-25: `npm test` (11 passed; includes real local `pdflatex` compilation of all five templates, selectable-text/link checks, overflow preservation, route behavior, and missing-executable behavior), `npm run typecheck`, `npm run lint`, and `npm run build` (passed). The latest T1 synthetic PDF was rendered and visually inspected.
- Remaining QA: browser-driven edit → reload → restore workflow was not automated in this restricted environment; photo coverage checks the profile-photo template compile path, while broad image-format/oversize UI interactions still need manual browser QA. Backup format is a versioned JSON file with photo data embedded, not ZIP. `pdflatex` availability and supported glyphs depend on the local TeX Live installation.
