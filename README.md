# Resume Studio

Resume Studio is a local-first resume/CV editor for Windows. It edits structured content, stores it in this browser, and compiles real PDFs with the local TeX Live `pdflatex` executable.

## Run locally

Prerequisites: Node.js 24.x (the test runner uses native TypeScript type stripping), npm, and TeX Live with both `pdflatex` and `pdftotext` on `PATH`. Python 3.10+ is optional and only needed for the local ML assistant.

```powershell
npm install
npm run dev
```

The development server binds to `127.0.0.1`. Open the local address printed by Next.js.

Production uses `npm run build` (`next build`); development uses `next dev`. The app keeps the Next.js 16 defaults for bundling.

If `pdflatex` is not on `PATH`, set the executable for the current PowerShell session:

```powershell
$env:PDFLATEX_PATH = 'C:\path\to\TeX Live\bin\windows\pdflatex.exe'
npm run dev
```

Resume Studio does not switch PDF engines. It reports a clear error if the configured executable cannot be started.

## Data and backups

- Resume content and optional portraits are saved in IndexedDB in the current browser profile.
- Use **Export backup** to download a versioned JSON project containing the master profile/content library, variants, template settings, and photo data. Import validates the file and asks before replacing the current local project.
- PDF preview and PDF download use the same compiled local PDF. The compiler sends a JSON envelope, so browser download managers do not treat each preview as a file download. Auto preview waits 800 ms after edits by default (configurable from 0.5–2 seconds); turn it off to build manually. Older in-flight requests are cancelled and stale output cannot be downloaded as current.
- Light, dark, and system themes, the collapsed library rail, and preview timing are local UI preferences. Drag the divider between the editor and PDF to resize either pane; use arrow keys when the divider is focused.
- Design presets change presentation only. Quick and Advanced controls include independent page margins, font size/family, line and section spacing, bullet indentation/spacing, colors, dividers, page policy, contact visibility, link display (label, full URL, or both), link underline, link-type icons, header/entry location visibility, and divider width (full, half, or heading width). Each content section can collapse and has its own font size, side margins, vertical margins, padding, divider width, and divider controls.
- Profile links have Website, LinkedIn, GitHub, Portfolio, and Other types with matching editor icons. Version 1 JSON backups are migrated to the current typed-link schema without changing their content.
- The interface font and PDF viewer worker are bundled locally; neither requires a remote font or PDF service. PDF font choices use the locally verified TeX Live Latin Modern and TeX Gyre families.
- The first run loads synthetic sample content. Replace it with your own details. Personal data stays out of source fixtures.
- The two private design-reference PDFs live in the gitignored `reference/` directory. They are inputs for visual comparison, not app data, and are never committed.

## Local ML assistant (optional)

The AI Tools panel talks to a loopback FastAPI service. It is optional; the editor and PDF pipeline work fully without it.

```powershell
# Terminal 1: app
npm run dev

# Terminal 2: local ML service
powershell -ExecutionPolicy Bypass -File services/ml/run-ml.ps1
```

Or start both together in separate PowerShell windows:

```powershell
npm run dev:full
```

`dev:full` also reports whether Ollama is reachable. Ollama is optional; when it is offline, Bullet Polish returns the labeled rule-based fallback.

- The service binds to `127.0.0.1:8000` and uses a curated skill taxonomy, lexical matching, and rule-based XYZ scoring. There are no cloud API keys.
- If `nomic-embed-text` is installed in Ollama (`ollama pull nomic-embed-text`), the matcher uses local embeddings for the context score and labels it in the ATS panel. Without it, lexical overlap is used and labeled as the fallback.
- The optional spaCy NER path is enabled with `python -m pip install -r services/ml/requirements-ner.txt`; without it, regex taxonomy extraction remains active.
- Bullet Polish uses Ollama (`qwen3.5:4b` by default) when available. When Ollama is offline, the service returns an explicitly labeled rule-based rewrite and never invents a metric.
- Health checks are proxied through `/api/ml/health`; the ATS panel shows the local engine and model status.

## Known limitations

See [docs/known-limitations.md](docs/known-limitations.md) for the regex taxonomy, lexical matching, PDF metadata (not PDF/A certification), modal focus behavior, and other intentional scope limits.

## Rendering and templates

The app has five template options: Simple ATS, Clean Compact, Modern Developer, Academic CV, and Profile CV. They share structured content and common escaping/link helpers. T1 follows the rendered developer reference's centered header, thin section rules, bold entry hierarchy, right-aligned dates, and compact single-column spacing. See [reference design notes](docs/reference-design-notes.md).

The local Node route writes application-generated TeX into a unique temporary directory and invokes `pdflatex` with `shell-escape` disabled. It validates the output file, page count, and selectable text, then cleans up the temporary files. Only generated templates are compiled; arbitrary uploaded TeX is not accepted. Unsupported characters report their code point so the user can replace them. PDF font choices include Latin Modern and locally verified TeX Gyre families.

Overflow is reported from the compiled PDF page count. The editor never removes or truncates content to satisfy a page limit.

## Development commands

```powershell
npm test          # 59 Node/TypeScript tests; 3 live-ML tests skip when the Python service is offline
npm run test:python
npm run test:e2e  # Playwright against installed Chrome; starts/reuses the dev server
npm run golden:update
npm run typecheck
npm run lint
npm run build
npm run verify    # typecheck + lint + JS tests + Python tests + production build
```

The JS suite is self-contained: it compiles synthetic fixture content through all five templates with local `pdflatex`, verifies selectable text and links, and exercises photos, escaping, v1 backup migration, independent layout settings, cancellation, variants, and over-limit content. It also pins the exact generated LaTeX for every template (`tests/golden/`). The three tests in `tests/bullet-polish.test.mjs` that call the FastAPI service skip with a clear message unless `services/ml/run-ml.ps1` is running on `127.0.0.1:8000`. The Python suite has 12 tests. Playwright covers landing scroll/theme, modal focus trapping, menu escape/focus return, and profile-link validation.

## Add a template

Add the template ID and UI label in `src/app/studio.tsx`, then implement its layout variation in `src/lib/latex.ts`. Keep all wording in structured fields; never put personal resume text in the template source. Extend the renderer tests and render a fixture PDF with local TeX Live before considering the template complete.
