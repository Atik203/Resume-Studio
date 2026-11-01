# Contributing to Resume Studio

Thanks for helping improve Resume Studio. This is a local-first Windows desktop-style web app: resume data, PDF compilation, and the optional AI assistant all stay on the user's machine.

## Before you start

- Node.js 24.x and npm
- TeX Live with `pdflatex` and `pdftotext` on `PATH`
- Optional: Python 3.10+ for the local ML service
- Optional: Ollama with `qwen3.5:4b` for bullet polish

```powershell
npm install
npm run dev          # app only
npm run dev:full     # app + local ML service
```

## Quality gates

Run these before opening a pull request:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:python
npm run test:e2e
npm run build
```

`npm run verify` runs typecheck, lint, the Node suite, Python tests, and the production build. The three live-ML HTTP tests skip when `127.0.0.1:8000` is offline. Playwright uses the installed Chrome channel locally and bundled Chromium in CI.

## Project rules

- **Local-first only.** No cloud database, login, telemetry, external PDF API, hosted AI, or mandatory network service.
- **Never commit personal data.** Use synthetic fixtures. Real names, phone numbers, emails, portraits, and reference PDFs stay out of source, tests, and screenshots.
- **Preserve content.** Never silently delete, truncate, hide, or rewrite resume content to satisfy a page limit. Show an overflow warning and let the user decide.
- **Templates are presentation only.** Do not put personal resume text in `.tex` templates or renderer code.
- **Escape user content.** All plain text goes through the shared LaTeX escaping helpers; links use the validated URL path.
- **Compile with local `pdflatex`.** Do not add cloud or HTML-to-PDF export paths.
- **Prefer the smallest dependency set.** The UI uses `radix-ui`, `lucide-react`, Tailwind v4, and a small set of utilities. Avoid adding overlapping UI libraries.

## Adding or changing a template

1. Add the template ID and UI label.
2. Implement the layout variation in the shared renderer.
3. Add renderer tests with synthetic data.
4. Regenerate the golden `.tex` snapshots with `npm run golden:update`.
5. Compile and visually inspect the PDF with local TeX Live.

## Commits and pull requests

- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- Keep a change focused and include its tests.
- Update `README.md`, `CHANGELOG.md`, and `docs/known-limitations.md` when behavior or limits change.
- PRs should describe user-visible behavior, testing performed, and any remaining limitations.

## Security and privacy reports

Do not open a public issue for a vulnerability or exposed personal data. Follow [SECURITY.md](SECURITY.md).
