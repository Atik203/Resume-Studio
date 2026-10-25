/**
 * Resume Studio — Orphan Hunter & Line-Wrap Optimizer
 * Detects runaway single-word trailing lines (orphans) and identifies
 * high-yield character trims that reclaim entire vertical lines.
 */

export interface OrphanCandidate {
  bulletIndex: number;
  originalText: string;
  trailingWordCount: number;
  trailingSnippet: string;
  suggestedReplacement?: string;
  charsNeededToSaveLine: number;
  estimatedLines: number;
  fillerFound?: { phrase: string; replacement: string; charsSaved: number };
}

const COMMON_FILLERS: Array<{ phrase: RegExp; replacement: string }> = [
  { phrase: /\bin order to\b/gi, replacement: 'to' },
  { phrase: /\bresponsible for leading\b/gi, replacement: 'led' },
  { phrase: /\bresponsible for managing\b/gi, replacement: 'managed' },
  { phrase: /\bresponsible for\b/gi, replacement: '' },
  { phrase: /\bsuccessfully\b\s*/gi, replacement: '' },
  { phrase: /\bworked closely with\b/gi, replacement: 'partnered with' },
  { phrase: /\bfor the purpose of\b/gi, replacement: 'for' },
  { phrase: /\bwith the goal of\b/gi, replacement: 'to' },
  { phrase: /\ba wide range of\b/gi, replacement: 'various' },
  { phrase: /\ba variety of\b/gi, replacement: 'various' },
  { phrase: /\bdue to the fact that\b/gi, replacement: 'because' },
  { phrase: /\bat the present time\b/gi, replacement: 'currently' },
  { phrase: /\butilizing\b/gi, replacement: 'using' },
  { phrase: /\bleveraging\b/gi, replacement: 'using' },
];

// Average character capacity of a bullet line on A4 with 15-18mm margins at 10pt
const CHARS_PER_LINE = 78;

export function analyzeBulletOrphans(bulletText: string, index = 0): OrphanCandidate | null {
  const text = bulletText.trim();
  if (!text || text.length < CHARS_PER_LINE) return null;

  const totalLength = text.length;
  const estimatedLines = Math.ceil(totalLength / CHARS_PER_LINE);
  if (estimatedLines <= 1) return null;

  // Remainder on the final line
  const remainder = totalLength % CHARS_PER_LINE;

  // If the final line has fewer than 22 characters, it is very likely an orphan (1-2 trailing words)
  if (remainder > 0 && remainder <= 24) {
    const words = text.split(/\s+/);
    const trailingWords = words.slice(-3).join(' ');

    // Check if any filler phrase can be trimmed to pull the line back
    let fillerFound: { phrase: string; replacement: string; charsSaved: number } | undefined;
    let suggestedReplacement: string | undefined;

    for (const filler of COMMON_FILLERS) {
      if (filler.phrase.test(text)) {
        const afterReplace = text.replace(filler.phrase, filler.replacement).replace(/\s{2,}/g, ' ');
        const charsSaved = text.length - afterReplace.length;
        if (charsSaved > 0) {
          fillerFound = {
            phrase: filler.phrase.source.replace(/\\b/g, ''),
            replacement: filler.replacement,
            charsSaved,
          };
          suggestedReplacement = afterReplace;
          break;
        }
      }
    }

    return {
      bulletIndex: index,
      originalText: text,
      trailingWordCount: words.slice(-2).length,
      trailingSnippet: trailingWords,
      suggestedReplacement,
      charsNeededToSaveLine: remainder + 1,
      estimatedLines,
      fillerFound,
    };
  }

  return null;
}

export function scanEntryOrphans(bullets: string[]): OrphanCandidate[] {
  const results: OrphanCandidate[] = [];
  bullets.forEach((bullet, idx) => {
    const orphan = analyzeBulletOrphans(bullet, idx);
    if (orphan) results.push(orphan);
  });
  return results;
}
