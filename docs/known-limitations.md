# Known limitations

These are intentional scope limits for the local-first V1, not hidden behavior.

## PDF and LaTeX

- **PDF metadata is not PDF/A certification.** The “PDF document metadata” toggle adds title, author, and subject tags only. It does not produce an ISO 19005-conformant archive.
- The renderer supports the Latin Modern and TeX Gyre families available in the local TeX Live installation. Link-type icons use the `fontawesome5` package; it is bundled with TeX Live, and a missing package is reported as a compile error rather than dropped. Characters outside the pdfLaTeX font range are rejected with their Unicode code point instead of being silently dropped.
- `pdflatex` and `pdftotext` must both be on `PATH` (or `PDFLATEX_PATH` must point at the executable). The app never switches to another PDF engine.
- Page-fit suggestions are deterministic spacing adjustments within configured bounds. They are never applied without the user confirming the diff.

## Local ML assistant

- **The “ML” service is a rules engine, not a trained model.** Skill extraction uses a curated taxonomy with precompiled regular expressions; there is no spaCy, PyTorch, sentence-transformers, or NER model at runtime.
- Matching is **lexical** (token overlap plus taxonomy hits), not semantic embedding similarity. The function named `compute_tf_idf_cosine` computes term-frequency cosine without IDF because there is no corpus.
- The XYZ bullet scorer uses hand-curated verb lists, metric regexes, and a methodology keyword check. It is a heuristic, not a language model.
- `train_ner.py` generates synthetic NER-style offsets and benchmarks the regex extractor against that synthetic data. It does not train a model and is not used at runtime.
- Bullet Polish uses Ollama when available. The rule-based fallback never invents metrics; the UI labels it and asks the user to verify any generated number. Model-generated suggestions can still contain unverified numbers, so the UI shows a metric-provenance warning when the original bullet had none.
- The service is optional. The app, PDF preview, and export work with `127.0.0.1:8000` offline.

## Interface behavior

- Modals close on Escape and restore focus to the triggering control, but they do **not** trap Tab focus yet. Keyboard users can tab into the page behind an open modal.
- Dropdown menus close on outside click and Escape, but do not support arrow-key navigation.
- There is no global toast system. Feedback appears inline, in the save pulse, or inside the relevant modal.
- Destructive draft/section actions still use the browser's native `confirm()` dialog.
- Visual checks in this release are manual screenshots; there is no jsdom/Testing Library component suite.

## Data

- Project data lives in the current browser profile's IndexedDB. Clearing site data removes it; export a JSON backup for portability.
- Backups validate on import. Unknown future keys are preserved because validation is predicate-only, but older app versions may not understand new fields.
- The private reference PDFs live in `reference/` and are gitignored. They are not part of the application or its fixtures.
