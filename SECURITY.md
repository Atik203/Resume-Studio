# Security Policy

## Supported versions

Resume Studio is a personal local-first project. Security fixes target the latest `main` branch. Older commits are not maintained.

| Version | Supported |
| --- | --- |
| `main` / 0.1.x | Yes |

## Reporting a vulnerability

Please report security issues privately through GitHub's **Security Advisories** for this repository:

<https://github.com/Atik203/Resume-Studio/security/advisories/new>

Do not open a public issue for:

- exposed personal data,
- a way to execute arbitrary TeX or shell commands,
- a path-traversal or temporary-directory issue,
- a link/URL validation bypass,
- a dependency vulnerability with a practical exploit path.

Include the affected version, reproduction steps, impact, and any suggested fix. Do not include real resume data, phone numbers, emails, or private PDFs in the report. Response is best-effort for a personal project.

## Threat model and boundaries

- The app is designed to run on `127.0.0.1`. Do not expose the Next.js server or the Python ML service to a public network.
- `pdflatex` runs through `spawn` with an argument array, `shell: false`, `-no-shell-escape`, a temporary working directory, a timeout, and bounded output. Only application-generated TeX is compiled.
- User text is escaped before entering LaTeX. Links are restricted to `http:`, `https:`, and `mailto:`.
- Uploaded portraits are restricted to PNG/JPEG/PDF, size-checked, and magic-number checked.
- Resume data and photos stay in the browser's IndexedDB. Backups are explicit local JSON downloads.
- The optional ML service is loopback-only and does not call cloud APIs. Ollama is optional and local.

## Known data-history note

The private reference PDFs were removed from the current tree and from the rewritten Git history. GitHub may continue to serve cached old commit objects after a force-push; complete erasure may require GitHub Support or deleting/recreating the repository. See `docs/privacy-cleanup.md`.
