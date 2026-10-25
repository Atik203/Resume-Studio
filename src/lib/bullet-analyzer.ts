/**
 * Resume Studio — Instant Client-Side Bullet Analyzer
 * Mirrors Google XYZ formula heuristics for 0ms lag feedback.
 */

const STRONG_VERBS = new Set([
  'accelerated', 'achieved', 'architected', 'automated', 'built', 'centralized',
  'championed', 'consolidated', 'created', 'decreased', 'delivered', 'deployed',
  'designed', 'developed', 'devised', 'directed', 'eliminated', 'engineered',
  'established', 'executed', 'expanded', 'expedited', 'formulated', 'generated',
  'headed', 'implemented', 'improved', 'increased', 'initiated', 'instituted',
  'launched', 'maximized', 'migrated', 'modernized', 'optimized', 'orchestrated',
  'overhauled', 'pioneered', 'reduced', 'refactored', 'resolved', 'restructured',
  'revamped', 'scaled', 'simplified', 'spearheaded', 'standardized', 'streamlined',
  'strengthened', 'transformed', 'upgraded',
]);

const WEAK_VERBS = new Set([
  'helped', 'assisted', 'worked', 'responsible', 'handled', 'participated',
  'supported', 'involved', 'aided', 'served', 'contributed', 'tried', 'attempted',
]);

const METRIC_PATTERNS = [
  /\b\d+(?:\.\d+)?%/i, // 25%, 3.5%
  /\b(?:increased|decreased|reduced|boosted|grew|cut)\b.{1,25}\b\d+/i,
  /\b\d+(?:\.\d+)?\s*(?:k|m|b|million|billion|thousand)\b/i, // 2M, 500k
  /\b\$\d+(?:,\d{3})*(?:\.\d+)?\b/i, // $50,000
  /\b\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds|minutes|hours|days)\b/i, // 120ms
  /\b\d+(?:\.\d+)?x\b/i, // 10x, 2.5x
  /\b\d+\s*(?:users|clients|customers|rps|qps|endpoints|requests|engineers)\b/i,
];

const METHOD_KEYWORDS = [
  'by', 'using', 'via', 'leveraging', 'utilizing', 'through', 'with', 'implementing', 'employing',
];

export interface ClientBulletScore {
  verbStrength: 'strong' | 'moderate' | 'weak';
  firstVerb: string;
  hasMetrics: boolean;
  metricSnippets: string[];
  hasMethodology: boolean;
  score: number;
  suggestions: string[];
}

export function analyzeBulletClient(bulletText: string): ClientBulletScore {
  const text = bulletText.trim();
  if (!text) {
    return {
      verbStrength: 'weak',
      firstVerb: '',
      hasMetrics: false,
      metricSnippets: [],
      hasMethodology: false,
      score: 0,
      suggestions: [],
    };
  }

  const words = text.split(/\s+/);
  const firstWordClean = words[0].toLowerCase().replace(/[^a-z]/g, '');

  let verbStrength: 'strong' | 'moderate' | 'weak' = 'moderate';
  if (STRONG_VERBS.has(firstWordClean)) {
    verbStrength = 'strong';
  } else if (WEAK_VERBS.has(firstWordClean) || text.toLowerCase().startsWith('responsible for')) {
    verbStrength = 'weak';
  }

  // Metrics
  const metricSnippets: string[] = [];
  for (const pat of METRIC_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      metricSnippets.push(m[0]);
    }
  }
  const hasMetrics = metricSnippets.length > 0;

  // Methodology
  const lower = text.toLowerCase();
  const hasMethodology = METHOD_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(lower));

  // Score computation (Google XYZ: 40% action verb, 40% metrics, 20% methodology)
  let score = 0;
  if (verbStrength === 'strong') score += 40;
  else if (verbStrength === 'moderate') score += 20;

  if (hasMetrics) score += 40;
  if (hasMethodology) score += 20;

  // Suggestions
  const suggestions: string[] = [];
  if (verbStrength === 'weak') {
    suggestions.push(`Replace "${words[0]}" with a power action verb (e.g. Spearheaded, Architected, Optimized).`);
  }
  if (!hasMetrics) {
    suggestions.push('Add quantifiable metric [Y] (e.g. reduced latency by 35%, scaled to 2M users, saved $15k).');
  }
  if (!hasMethodology) {
    suggestions.push('Describe method or tech stack [Z] (e.g. "...by leveraging Redis caching and async queues").');
  }

  return {
    verbStrength,
    firstVerb: words[0] || '',
    hasMetrics,
    metricSnippets,
    hasMethodology,
    score,
    suggestions,
  };
}
