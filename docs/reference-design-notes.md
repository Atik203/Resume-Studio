# Reference design notes

Inspected the rendered pages at 120 dpi on 2026-10-25. These notes describe visible design only; reference text and personal details are not used as application fixtures.

## Preferred one-page developer resume

- A4 portrait, one page. The content uses a single column with broad, balanced left and right margins (roughly 7–8% of page width). There is no sidebar, photo, page number, or footer.
- The name is centered, bold, and the largest text. A smaller centered role title sits directly below it.
- Contact details appear as a centered horizontal row with small icons, followed by a second centered location line. The header has a generous gap before the first section.
- Section labels are bold and left aligned. A thin black rule spans the content width immediately below each label.
- Entry titles and skill-group labels are bold. Dates align at the far right on the same line when space allows.
- Bullets are conventional filled dots with a modest hanging indent. Project descriptions and technologies are compact, with links underlined. Body text is serif-like in the render; the exact font family cannot be determined visually.
- Vertical spacing is compact but consistent. The page is filled close to the bottom while retaining a small bottom margin. No content appears clipped.
- The hierarchy is restrained: black text, white background, no colored panels, charts, skill bars, or decorative graphics.

## Longer academic/professional CV

- A4 portrait, two pages, single-column layout, with similarly broad margins and a centered name/contact header on page one.
- Section headings are bold and followed by noticeably heavier black horizontal rules than the one-page developer resume.
- The first page includes a justified summary paragraph, education entries, work experience, and projects. Dates align to the right; role, organization, descriptions, and bullets remain left aligned.
- The second page continues with skills, relevant courses, certificates, awards, and languages. It does not repeat the header or show a visible page number.
- List items and section gaps are more generous than the developer resume. The text remains black on white, with no photo or sidebar.
- The exact typeface, point sizes, and physical margin values are not identifiable from the render alone. Template controls should make those tunable.

## Implementation implications

- T1 should prioritize centered header/contact alignment, thin section dividers, bold inline labels, right-aligned dates, conventional bullets, and compact single-column spacing.
- Academic/CV templates can reuse the single-column hierarchy while allowing longer lists, larger section gaps, and natural page continuation.
- Contact icons are visible in the references, but their exact glyph source is unclear. The initial implementation should prioritize readable text labels/links and may use simple package-provided symbols only if they compile reliably under pdfLaTeX.
- No personal resume content from either PDF is copied into source code or synthetic fixtures.
