# Reference PDF decision — closed

**Status: closed on 2026-11-01.** The repository owner confirmed that the two reference PDFs are their own resume and may remain public. No history purge, repository deletion, visibility change, or GitHub Support request is required.

## Current state

- The PDFs live locally in `reference/`, which is gitignored.
- They were removed from the current tree with `git rm --cached` and are not part of the application or test fixtures.
- Old commits may still contain and serve the PDFs. That is acceptable by owner decision.
- The current history was rewritten; the remote `main` was force-pushed and is the source of truth.

## If this decision changes later

1. Make the repository private immediately to stop public access while deciding.
2. Delete and recreate the repository, or ask GitHub Support to purge cached/unreachable objects.
3. Verify that old raw URLs return 404 before treating the cleanup as complete.

Do not force-push or rewrite history again without an explicit owner decision.
