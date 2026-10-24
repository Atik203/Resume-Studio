# Resume Studio — Codex handoff pack

This pack gives Codex persistent project rules, an implementation roadmap, and a starter prompt.

## Files

- `AGENTS.md` — product constraints, implementation conventions, local `pdflatex` requirements, safety, and QA rules. Copy this to the project root.
- `ROADMAP.md` — phased plan, architecture, five templates, data model, and acceptance criteria. Copy this to the project root.
- `CODEX_START_PROMPT.md` — paste this into the initial Codex task, and attach your two reference PDFs to that Codex conversation.

## How to use

1. Create/open the repository you want Codex to build in.
2. Copy `AGENTS.md` and `ROADMAP.md` into the repository root.
3. Attach both reference PDFs in the Codex conversation: your one-page FlowCV-style resume and your longer CV.
4. Paste the contents of `CODEX_START_PROMPT.md` as the first instruction.
5. Verify that local TeX Live `pdflatex` is on PATH. If needed, set `PDFLATEX_PATH` to the executable path on your own machine; do not commit a machine-specific absolute path.

The instructions explicitly require local `pdflatex` compilation and prohibit remote rendering services.
