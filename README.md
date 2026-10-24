# Resume Studio

Resume Studio is a local-first resume/CV editor for Windows. It edits structured content, stores it in this browser, and compiles real PDFs with the local TeX Live `pdflatex` executable.

## Run locally

Prerequisites: Node.js 20.9 or newer, npm, and TeX Live with `pdflatex` on `PATH`.

```powershell
npm install
npm run dev
```

The development server binds to `127.0.0.1`. Open the local address printed by Next.js.

The production build uses Next.js 16's Webpack fallback because Turbopack's PostCSS worker could not start reliably in the restricted build environment. Development keeps Next.js 16's default Turbopack mode.

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
- Design presets change presentation only. Quick and Advanced controls include independent page margins, font size/family, line and section spacing, bullet indentation/spacing, colors, dividers, page policy, and contact visibility. Each content section can collapse and has its own font size, side margins, vertical margins, padding, and divider controls.
- Profile links have Website, LinkedIn, GitHub, Portfolio, and Other types with matching editor icons. Version 1 JSON backups are migrated to the current typed-link schema without changing their content.
- The interface font and PDF viewer worker are bundled locally; neither requires a remote font or PDF service. PDF font choices use the locally verified TeX Live Latin Modern and TeX Gyre families.
- The first run loads synthetic sample content. Replace it with your own details. Personal data stays out of source fixtures.

## Rendering and templates

The app has five template options: Simple ATS, Clean Compact, Modern Developer, Academic CV, and Profile CV. They share structured content and common escaping/link helpers. T1 follows the rendered developer reference's centered header, thin section rules, bold entry hierarchy, right-aligned dates, and compact single-column spacing. See [reference design notes](docs/reference-design-notes.md).

The local Node route writes application-generated TeX into a unique temporary directory and invokes `pdflatex` with `shell-escape` disabled. It validates the output file, page count, and selectable text, then cleans up the temporary files. Only generated templates are compiled; arbitrary uploaded TeX is not accepted. Unsupported characters report their code point so the user can replace them. PDF font choices include Latin Modern and locally verified TeX Gyre families.

Overflow is reported from the compiled PDF page count. The editor never removes or truncates content to satisfy a page limit.

## Development commands

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

The tests compile synthetic fixture content through all five templates using local `pdflatex`, verify selectable text, exercise photos, escaping, v1 backup migration, independent layout settings, cancellation, variants, and over-limit content.

## Add a template

Add the template ID and UI label in `src/app/studio.tsx`, then implement its layout variation in `src/lib/latex.ts`. Keep all wording in structured fields; never put personal resume text in the template source. Extend the renderer tests and render a fixture PDF with local TeX Live before considering the template complete.
