# AGENTS.md — Resume Studio

## Product goal

Build a local-first personal resume/CV editor for Windows. The first design target is the user's clean, simple, one-page FlowCV-style software-engineering resume. The second uploaded PDF is the reference for a longer academic/professional CV. Inspect the actual rendered pages of both reference PDFs, not only extracted text, before implementing the first template.

This is a personal tool, not a public SaaS product.

## Non-negotiable requirements

- **Compile PDFs using the user's locally installed TeX Live `pdflatex`.** Do not use a cloud LaTeX service, remote PDF API, browser print-to-PDF as the primary export, or an HTML-to-PDF substitute.
- PDF compilation must happen on the same computer where the app is running, through a local Node.js server-side route or local service. A browser cannot directly spawn `pdflatex`; keep process execution in the local Node runtime.
- Use a configurable executable path such as `PDFLATEX_PATH`; default to `pdflatex` resolved from `PATH`. Detect and report a missing executable clearly. Do not silently switch engines.
- Keep user data local. No mandatory login, cloud database, analytics/telemetry, external API, subscription, or LLM API.
- Preserve content. Never silently delete, truncate, hide, or rewrite content to force a page limit. Show a clear overflow warning and let the user choose what to change.
- Templates must be independent of content data. Do not hard-code the user's resume content in `.tex` templates.
- Build one validated PDF pipeline before adding all templates. Test generated PDF files, not just the browser UI.
- Avoid overengineering. Build a dependable personal utility, not a full FlowCV clone.

## Reference inputs

The user will attach two PDFs to the Codex session. Locate them in the workspace/attachments and identify which is the one-page FlowCV-like developer resume and which is the longer CV. Inspect every page visually (use a PDF viewer or render pages to images if available). Record layout observations such as header placement, margins, type hierarchy, section dividers, date alignment, bullets, spacing, links, and page breaks. Do not invent details that are not visible in the references.

## Initial product scope

### Templates (five)

1. `t01-simple-ats`: primary template; closely follows the simple one-page reference, restrained black/white styling, clear hierarchy, compact bullets, no decorative sidebars or skill bars.
2. `t02-clean-compact`: left-aligned, compact single-column layout.
3. `t03-modern-developer`: single-column layout with a restrained accent color and strong project/technical-skill hierarchy.
4. `t04-academic-cv`: text-first, suitable for a two-page CV with support for a third page when needed.
5. `t05-profile-cv`: clean CV with a small optional portrait; removing the portrait must still leave a balanced layout.

These are separate templates sharing the same resume data model and common LaTeX utilities. Start by matching `t01-simple-ats`; do not implement all five before validating the PDF engine.

### Document/page defaults

- Resume mode: one page by default and maximum one page unless the user explicitly changes that policy.
- CV mode: two pages by default; up to three pages maximum by default.
- A4 is the default page size; US Letter may be added as a setting.
- Offer configurable fonts, font sizes, colors, margins, section order, section/entry visibility, line spacing, bullet spacing, date alignment, contact-field visibility, optional photo, and page numbering where relevant.
- A page-limit violation should produce a readable warning with actionable suggestions. Never force-fit by shrinking below a configured minimum or dropping content.

## Technical conventions

- Inspect the existing repository before choosing tools or changing files. Respect the current package manager, scripts, and conventions. Do not replace an existing working setup without a clear reason.
- Preferred app stack if the repository is empty: Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui only where useful. Keep components simple.
- Use strict TypeScript and Zod (or an existing equivalent) for validating persisted/imported data.
- Use IndexedDB for durable local application data; LocalStorage is acceptable only for small UI preferences. Autosave and show a visible save state.
- Keep a single master content library plus independently named resume/CV variants. Variants select content by stable IDs and can override individual fields/bullets without mutating the master copy.
- Include versioned JSON export/import. A full project backup should include profile data, variants, template settings, and locally stored photo assets. Verify imports and show validation errors rather than overwriting data silently.
- Keep source code and personal resume data separate. Never commit the user's private resume, phone number, email, or photo as sample data. Use synthetic fixture data for automated tests.
- Prefer the smallest dependency set that solves the task.

## Local `pdflatex` execution requirements

- Call the executable using Node's `spawn`/`execFile` with an argument array and `shell: false`; never interpolate user values into a shell command.
- Compile only templates generated/selected by the application. Do not expose an endpoint that runs arbitrary user-provided shell commands or arbitrary uploaded TeX source.
- Escape all plain-text resume content before inserting it into LaTeX. Handle at least `\`, `{`, `}`, `$`, `&`, `%`, `#`, `_`, `~`, `^`, and line breaks safely. URLs should use a dedicated safe link path/package. Avoid treating user content as TeX commands.
- Use a unique temporary directory per compilation. Write only generated `.tex` and validated local assets there. Clean it up in a `finally` block when safe to do so.
- Use flags equivalent to `-interaction=nonstopmode -halt-on-error -file-line-error -no-shell-escape`. Set a working directory explicitly. Add a compile timeout and cap captured logs/output.
- Compile a second time where needed for cross-references/bookmarks. Check for a successful exit code and an actual non-empty output PDF before returning success.
- Provide a useful error message for missing `pdflatex`, compilation errors, unsupported glyphs, and timeouts. Preserve a redacted/safe diagnostic log for debugging, but do not expose machine secrets or arbitrary environment variables.
- Keep the route/service on Node.js runtime, not Edge. Bind the local development app to loopback (`127.0.0.1`) when configurable. Never expose it publicly by default.
- Use local fonts/packages available with TeX Live. Because this requirement specifically uses `pdflatex`, choose a compatible font setup (for example Latin Modern and T1 font encoding). Do not assume XeLaTeX/LuaLaTeX. If a character is not supported, report it clearly rather than silently losing it.
- Accept common photo formats supported by `pdflatex` (PNG/JPEG/PDF where appropriate); reject or explicitly convert unsupported formats such as WebP. Validate file size and image type.

## UX expectations

- Main areas: Resume Library, Content Library/Profile, Editor, Templates, Design Settings, Import/Export.
- Editor: section list/navigation, edit forms, add/remove entries, reorder sections and entries, toggle visibility, duplicate variants, and template switcher.
- Preview: render the actual generated PDF (PDF.js or equivalent), show page count and overflow status, and provide an explicit Export PDF action.
- Avoid generating a PDF for every keystroke at first. Debounce preview generation and prevent stale results from replacing newer previews.
- Never claim that PDF export succeeded until the local compiler has returned a verified output file.
- Keyboard access, readable contrast, useful empty states, and responsive editor layout are required; the generated documents remain print-oriented.

## Testing and quality gates

- Add unit tests for schema validation, variant overrides, section selection/order, and LaTeX escaping.
- Add renderer tests that compile synthetic data through every implemented template using local `pdflatex`.
- Test empty optional fields, ampersands/percent signs/underscores/braces in text, long URLs, special punctuation, missing photos, and long entries that cause overflow.
- Verify that no content is silently lost and that output PDFs have selectable text and working links.
- Test import/export round trips and browser reload persistence.
- Run lint, typecheck, tests, and production build when available. Report which checks actually ran and any environment limitations; never claim a check passed when it did not run.

## Implementation workflow for Codex

1. Inspect the repository, identify the package manager, locate the two reference PDFs, and visually inspect them.
2. Check `pdflatex` availability (`where.exe pdflatex` in PowerShell or an equivalent PATH check). If not available to the process, support `PDFLATEX_PATH` and explain the precise setup needed; do not change the rendering strategy.
3. Write a brief implementation plan and list uncertainties/blockers grounded in inspection.
4. Implement a vertical slice: typed data model → first LaTeX template → local compile route → validated PDF download/preview.
5. Compile and visually inspect the generated PDF against the reference before moving on.
6. Implement durable local data and multi-version editing, then the remaining templates.
7. Test all changes and summarize files created, commands run, outcomes, and unfinished work.

## Product behavior principles

- Full control belongs to the user: content, order, visibility, typography, spacing, colors, page size, and template choice.
- Templates control presentation; content data controls wording.
- No AI may rewrite content without presenting a proposed change and obtaining explicit user action.
- Keep the first release focused on local editing and dependable exports. Do not add authentication, collaboration, payments, public sharing, cloud sync, or AI features to V1.
