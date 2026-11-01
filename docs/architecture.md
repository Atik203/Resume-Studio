# Resume Studio architecture

## Current implementation brief

Build a local Windows-first personal editor with a validated, structured content library, independently overridable variants, five controlled LaTeX templates, browser-local persistence, real compiled-PDF preview/export, and portable backup. The renderer is strictly local TeX Live `pdflatex`; the app has no external service dependency. Page overflow is reported from the compiled PDF and never corrected by discarding content.

## Architecture choices

- Next.js App Router with strict TypeScript; local Node route handlers own PDF compilation.
- Zod validates imported and persisted data. IndexedDB holds the project document and optional image assets; JSON backup contains the versioned project data.
- Templates are application-owned `.tex` files. User strings are escaped through shared helpers, and links are separately validated.
- The compiler uses `spawn` with an argument array and `shell: false`, a unique temp directory, bounded logs, timeout, `-no-shell-escape`, output checks, and guaranteed cleanup.
- Browser preview uses the exact compiled PDF returned by the local route. Auto preview is debounced (800 ms by default) and can be turned off; in-flight requests are cancelled and stale results are rejected.
- App state and fixtures remain synthetic. The two private reference PDFs live in the gitignored `reference/` directory and remain read-only inputs.
- The optional Python service on `127.0.0.1:8000` provides lexical matching, regex skill extraction, ATS diagnostics, and Ollama-backed bullet polish. The app works fully when it is offline; live-ML HTTP tests skip with a clear message.

## Execution checklist

- [x] Inspect repository rules, roadmap, toolchain, PDF references, and local `pdflatex` availability.
- [x] Render and visually inspect each reference page; record grounded layout notes.
- [x] Create the typed data model, validation, variant resolution, and LaTeX escaping.
- [x] Implement T1 and secure local `pdflatex` compile/download with real PDF verification.
- [x] Build an editable local-first interface with autosave, variants, design settings, preview, and backup/import.
- [x] Implement T2–T5 on the shared model and renderer.
- [x] Run quality checks available in the environment and document limitations.

## Current environment notes

- `pdflatex` and `pdftotext` resolve on PATH from TeX Live 2025.
- The app runs on Node 24 with npm; Python 3.10+ is optional for the ML service.
- The repository is a Git checkout with the personal reference PDFs untracked in `reference/`.
- Visual inspection was completed for one developer page and both academic CV pages.
- The JS suite is self-contained (53 tests). The 3 live-ML HTTP tests skip unless the FastAPI service is running.
