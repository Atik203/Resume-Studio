# Privacy cleanup runbook — reference PDFs

**Status: history rewrite executed on 2026-11-01; remote purge is still incomplete.**
The PDFs are no longer in the current tree or in local `git log --all` / `git rev-list --all`,
but GitHub still resolves the old commit SHAs and serves the PDFs from
`raw.githubusercontent.com` at those old commits. A force-push alone does not purge GitHub's cached
objects.

**Required next step:** either delete and recreate the GitHub repository, or open a GitHub Support
request asking for the unreachable commit objects and cached views to be purged. Do not treat the
rewrite as complete erasure until the old raw URLs return 404.

### Verification performed

```powershell
git log --all --oneline -- '*.pdf'                 # empty
git rev-list --objects --all | Select-String '\.pdf$'  # empty
# Old commit still resolves on 2026-11-01:
# https://raw.githubusercontent.com/Atik203/Resume-Studio/01646d6/Md.Atikur-Rahaman-CV.pdf -> 200
```

A local safety bundle was created before the rewrite at
`%TEMP%\opencode\resume-studio-pre-rewrite-2026-11-01.bundle`.

## What was removed from tracking

The two design-reference PDFs previously lived at the repository root and were tracked by git:

- `Md.Atikur_Rahaman_Full_Stack_Dev.pdf`
- `Md.Atikur-Rahaman-CV.pdf`

They contain personal contact details. They are now moved to `reference/`, which is gitignored,
and removed from the current tree with `git rm --cached`.

## Why removing them from HEAD is not enough

Git keeps every object reachable from existing commits. If the repository was pushed, the PDFs
remain downloadable from the remote's history and may exist in clones, forks, or GitHub's
unreachable-object cache. Removing them from the latest commit only stops future commits from
including them.

## Options

### Option A — rewrite history and force-push

Use `git filter-repo` (recommended over `git filter-branch`):

```bash
# Install once in an isolated Python environment if needed:
#   pip install git-filter-repo

git filter-repo --path Md.Atikur_Rahaman_Full_Stack_Dev.pdf --invert-paths
git filter-repo --path Md.Atikur-Rahaman-CV.pdf --invert-paths
```

Then force-push every branch and tag:

```bash
git push --force --all
git push --force --tags
```

Consequences:

- Every commit hash after the first rewritten commit changes.
- Every existing clone becomes incompatible and must be re-cloned.
- Open pull requests may need to be recreated.
- GitHub may still serve cached objects; contact GitHub Support to purge unreachable objects or
  delete/recreate the repository if the data must be fully gone.

### Option B — delete and recreate the remote repository

If no commit history matters, delete the GitHub repository and push a fresh history from the
cleaned local tree. This is simpler and guarantees the old objects are not served from the new
repository, but it loses stars, issues, and pull requests.

## What to tell anyone with a clone

Assume the PDFs are already exposed. Re-clone after a rewrite; do not merge an old clone back.
The PDFs contain contact information but no credentials, API keys, or passwords. Rotating
credentials is therefore not required.

## Verification after either option

```powershell
git log --all --oneline -- '*.pdf'
git rev-list --objects --all | Select-String -Pattern '\.pdf$'
```

Both commands must return no reference PDFs.
