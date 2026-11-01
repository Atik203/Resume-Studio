# Pull Request

## Summary

<!-- What user-visible behavior does this change? -->

## Type

- [ ] Bug fix
- [ ] Feature
- [ ] Accessibility / UX polish
- [ ] Refactor
- [ ] Documentation / repository
- [ ] Tests

## Verification

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:python` (if the ML service changed)
- [ ] `npm run test:e2e` (if the UI changed)
- [ ] `npm run build`
- [ ] Manually checked light and dark themes
- [ ] Manually checked the generated PDF (if the renderer/template changed)

## Checklist

- [ ] No personal resume data, phone numbers, emails, portraits, or private PDFs are included.
- [ ] Resume content is not silently deleted, truncated, or rewritten.
- [ ] User text is escaped through the shared LaTeX helpers and links use the validated URL path.
- [ ] Templates remain content-independent.
- [ ] `README.md`, `CHANGELOG.md`, and `docs/known-limitations.md` are updated when needed.
