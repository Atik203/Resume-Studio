"""
Resume Studio — Bullet Impact & Google XYZ Formula Scorer
Analyzes resume bullet points against the Google XYZ formula:
"Accomplished [X] as measured by [Y], by doing [Z]"
"""

import re
from typing import Dict, List, Any, Optional

# High-impact strong action verbs categorized by function
STRONG_ACTION_VERBS = {
    # Leadership & Architecture
    "architected", "spearheaded", "orchestrated", "engineered", "pioneered",
    "designed", "devised", "founded", "established", "headed", "championed",
    # Optimization & Performance
    "optimized", "streamlined", "accelerated", "reduced", "scaled", "boosted",
    "enhanced", "amplified", "maximized", "minimized", "refactored", "consolidated",
    # Delivery & Execution
    "implemented", "deployed", "delivered", "built", "developed", "launched",
    "executed", "automated", "integrated", "constructed", "migrated", "authored",
    # Analysis & Research
    "analyzed", "benchmarked", "diagnosed", "audited", "quantified", "evaluated",
    "identified", "formulated", "validated", "investigated", "discovered"
}

MODERATE_VERBS = {
    "created", "managed", "maintained", "supported", "led", "handled",
    "improved", "updated", "generated", "monitored", "configured", "tested"
}

WEAK_PASSIVE_VERBS = {
    "worked on", "assisted with", "helped", "responsible for", "participated in",
    "involved in", "contributed to", "tasked with", "handled tasks", "aided in",
    "assisted in", "did", "was responsible for"
}

# Regex patterns for metrics & measurable outcomes
METRIC_PATTERNS = [
    # Percentages (e.g. 45%, 99.9%, 15.5%)
    (re.compile(r"\b\d+(\.\d+)?%\b"), "Percentage Impact"),
    # Multipliers / factors (e.g. 10x, 3x, 2.5x)
    (re.compile(r"\b\d+(\.\d+)?x\b", re.IGNORECASE), "Multiplier Growth"),
    # Time latency (e.g. 150ms, 2.4s, 45 seconds, 5 minutes)
    (re.compile(r"\b\d+(\.\d+)?\s*(ms|milliseconds?|seconds?|mins?|minutes?|hours?)\b", re.IGNORECASE), "Latency / Time Reduction"),
    # Currency / Budget (e.g. $150k, $2.5M, €50,000)
    (re.compile(r"[\$€£]\s*\d+([,\.]\d+)?\s*([kKmMbB]|million|thousand)?\b"), "Financial Impact"),
    # Scale / Volume (e.g. 50k users, 1M requests, 500+ endpoints)
    (re.compile(r"\b\d+([,\.]\d+)?\s*([kKmMbB]|\+)?\s*(users?|requests?|queries|qps|rps|customers?|clients?|dau|mau|records?|events?|downloads?)\b", re.IGNORECASE), "Scale / Volume"),
    # Raw numeric milestones (e.g. reduced from 120 to 14, over 500 tests)
    (re.compile(r"\b(over|more than|by|from|to)\s+\d+([,\.]\d+)?\b", re.IGNORECASE), "Numeric Change"),
]

# Methodology indicator keywords ("by doing Z", "leveraging Z", "using Z")
METHODOLOGY_KEYWORDS = [
    "by", "leveraging", "using", "utilizing", "implementing", "through",
    "via", "employing", "applying", "adopting", "incorporating"
]


def analyze_bullet(bullet: str) -> Dict[str, Any]:
    """
    Score a single bullet point on Google XYZ criteria and return actionable feedback.
    """
    text = bullet.strip().lstrip("-*•").strip()
    if not text:
        return {
            "text": bullet,
            "score": 0,
            "verb_strength": "missing",
            "first_verb": None,
            "has_metrics": False,
            "metrics_found": [],
            "has_methodology": False,
            "suggestions": ["Empty bullet point."],
        }

    # 1. Action Verb Detection
    clean_lower = text.lower()
    first_two_words = " ".join(clean_lower.split()[:2])
    first_word = clean_lower.split()[0] if clean_lower.split() else ""

    first_verb = None
    verb_strength = "missing"

    # Check for weak passive phrases first
    for weak in WEAK_PASSIVE_VERBS:
        if clean_lower.startswith(weak):
            first_verb = weak
            verb_strength = "weak"
            break

    if verb_strength == "missing":
        if first_word in STRONG_ACTION_VERBS:
            first_verb = first_word.capitalize()
            verb_strength = "strong"
        elif first_word in MODERATE_VERBS:
            first_verb = first_word.capitalize()
            verb_strength = "moderate"
        elif any(first_word.endswith(suffix) for suffix in ["ed", "ted", "ded"]):
            first_verb = first_word.capitalize()
            verb_strength = "moderate"
        else:
            first_verb = first_word.capitalize()
            verb_strength = "unclear"

    # 2. Metric & Quantification Detection
    metrics_found = []
    for pattern, label in METRIC_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            metrics_found.append(label)

    has_metrics = len(metrics_found) > 0

    # 3. Methodology Detection ("by doing Z")
    has_methodology = any(rf" {kw} " in f" {clean_lower} " for kw in METHODOLOGY_KEYWORDS)

    # 4. Google XYZ Score Calculation (0 to 100)
    score = 0
    # Verb component (35 pts)
    if verb_strength == "strong":
        score += 35
    elif verb_strength == "moderate":
        score += 22
    elif verb_strength == "weak":
        score += 8
    else:
        score += 12

    # Metric component (45 pts)
    if has_metrics:
        score += 45
    else:
        score += 10  # Partial credit if descriptive

    # Methodology component (20 pts)
    if has_methodology:
        score += 20
    else:
        score += 5

    score = min(100, max(15, score))

    # 5. Actionable Feedback & Suggestions
    suggestions: List[str] = []
    if verb_strength == "weak":
        suggestions.append(f"Replace passive phrase '{first_verb}' with a power verb like 'Architected', 'Spearheaded', or 'Optimized'.")
    elif verb_strength in ("missing", "unclear"):
        suggestions.append("Start with a definitive past-tense action verb (e.g. 'Engineered', 'Built', 'Automated').")

    if not has_metrics:
        suggestions.append("Quantify the outcome (e.g. percentage improvement, latency drop, request volume, or hours saved).")

    if not has_methodology:
        suggestions.append("Specify how you accomplished it (e.g. '...by leveraging Redis caching and async queues').")

    return {
        "text": text,
        "score": score,
        "verb_strength": verb_strength,
        "first_verb": first_verb,
        "has_metrics": has_metrics,
        "metrics_found": list(set(metrics_found)),
        "has_methodology": has_methodology,
        "suggestions": suggestions,
    }


def score_bullets_batch(bullets: List[str]) -> Dict[str, Any]:
    """
    Score a batch of bullets and calculate overall document impact score.
    """
    results = [analyze_bullet(b) for b in bullets if b.strip()]
    if not results:
        return {
            "overall_score": 0,
            "bullets_analyzed": 0,
            "bullets": [],
            "quantified_ratio": 0.0,
            "strong_verbs_ratio": 0.0,
        }

    overall_score = round(sum(r["score"] for r in results) / len(results))
    quantified_count = sum(1 for r in results if r["has_metrics"])
    strong_verbs_count = sum(1 for r in results if r["verb_strength"] == "strong")

    return {
        "overall_score": overall_score,
        "bullets_analyzed": len(results),
        "bullets": results,
        "quantified_ratio": round(quantified_count / len(results), 2),
        "strong_verbs_ratio": round(strong_verbs_count / len(results), 2),
    }
