# Resume Studio architecture

## Current implementation brief

Build a local Windows-first personal editor with a validated, structured content library, independently overridable variants, five controlled LaTeX templates, browser-local persistence, real compiled-PDF preview/export, and portable backup. The renderer is strictly local TeX Live `pdflatex`; the app has no external service dependency. Page overflow is reported from the compiled PDF and never corrected by discarding content.

## Architecture choices

- Next.js App Router with strict TypeScript; local Node route handlers own PDF compilation.
- Zod validates imported and persisted data. IndexedDB holds the project document and optional image assets; JSON backup contains the versioned project data.
- Templates are application-owned `.tex` files. User strings are escaped through shared helpers, and links are separately validated.
- The compiler uses `spawn` with an argument array and `shell: false`, a unique temp directory, bounded logs, timeout, `-no-shell-escape`, output checks, and guaranteed cleanup.
- Browser preview uses the exact compiled PDF returned by the local route. The UI compiles on explicit preview/export actions rather than every keystroke.
- App state and fixtures remain synthetic. The two private reference PDFs remain external, read-only inputs.

## Execution checklist

- [x] Inspect repository rules, roadmap, toolchain, PDF references, and local `pdflatex` availability.
- [x] Render and visually inspect each reference page; record grounded layout notes.
- [ ] Create the typed data model, validation, variant resolution, and LaTeX escaping.
- [ ] Implement T1 and secure local `pdflatex` compile/download with real PDF verification.
- [ ] Build an editable local-first interface with autosave, variants, design settings, preview, and backup/import.
- [ ] Implement T2–T5 on the shared model and renderer.
- [ ] Run quality checks available in the environment and document limitations.

## Current environment notes

- `pdflatex` resolves on PATH to the local TeX Live 2025 installation.
- The repository initially contains only the handoff documentation and is not a Git checkout. No package manager or existing app conventions are present.
- Visual inspection was completed for one developer page and both academic CV pages.
