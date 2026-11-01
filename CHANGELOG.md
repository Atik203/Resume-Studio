# Changelog

All notable changes to Resume Studio are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Radix Dialog modals with focus trapping, Escape/outside-click dismissal, scroll locking, and focus return.
- Radix DropdownMenu topbar menus with arrow-key, Home/End, typeahead, and Escape support.
- Accessible toast notifications and AlertDialog confirmations for destructive actions.
- Playwright browser regression tests for landing scroll/theme, modal focus, menus, and profile-link validation.
- One-command local startup (`npm run dev:full`) with ML/Ollama status.
- Optional Ollama embeddings for semantic job matching, with a labeled lexical fallback.
- Optional spaCy EntityRuler path for skill extraction, with regex fallback.
- Link display options (label, full URL, or both), underline toggle, and FontAwesome5 link icons in the PDF.
- Separate header and entry location visibility, plus divider widths (full, half, heading width) globally and per section.
- Error boundary with recovery backup export.
- Public landing dark theme, theme toggle, and scroll fix.
- Repository docs: contributing, security, code of conduct, license, changelog, issue/PR templates, CI, Dependabot.

### Changed

- Theme bridge now maps `muted`, `accent`, `secondary-foreground`, `destructive`, and `popover` tokens, fixing silent missing Tailwind styles.
- Full-URL PDF links use `xurl`/`\nolinkurl` for safe line breaking.
- AI health status normalizes `online`, and the panel retries while offline.
- ATS simulator response now matches the panel contract (`contact_fields_found`, chronology, sections, clean text).
- Documentation now describes the actual regex/lexical/optional-spaCy implementation instead of spaCy/PyTorch claims.

### Fixed

- Profile link editor no longer inserts invalid URLs into validated state; inline validation and external-link actions added.
- ATS panel no longer crashes on a missing response shape.
- ML health indicator no longer reports online services as offline.
- Rule-based bullet fallback no longer fabricates metrics such as “35%”.
- Public page and AI/Design panes now scroll correctly.
- PDF/A labeling now says metadata tags, not certification.

### Security

- Reference PDFs and Python bytecode removed from tracking; reference PDFs moved to gitignored `reference/`.
- Git history rewritten to remove the PDF paths. GitHub may still cache old objects; see `docs/privacy-cleanup.md`.
- Added a security policy and private reporting path.

## [0.1.0] - 2026-10-25

### Added

- Initial local-first Resume Studio: structured profile/content library, variants, five LaTeX templates, local `pdflatex` compile/preview/export, IndexedDB persistence, JSON backups, snapshot checkpoints, design controls, page-fit assistance, and optional local ML/ATS tools.
