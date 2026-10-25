"""
Resume Studio — Semantic ATS Matcher & Keyword Gap Analyzer
Computes semantic relevance, skill overlap, and missing keyword telemetry between resume and JD.
"""

from collections import Counter
import math
import re
from typing import Dict, List, Set, Any
from taxonomy import extract_skills, SKILL_TAXONOMY


STOPWORDS: Set[str] = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "by", "of",
    "from", "as", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "will", "would", "shall", "should", "may", "might",
    "must", "can", "could", "this", "that", "these", "those", "it", "its", "we", "you",
    "they", "our", "their", "such", "than", "too", "very", "into", "through", "about"
}


def tokenize_text(text: str) -> List[str]:
    """Tokenize text into lowercase words, filtering out common stopwords."""
    raw_tokens = re.findall(r"\b[a-zA-Z0-9_\+#\.]+\b", text.lower())
    return [t for t in raw_tokens if t not in STOPWORDS and len(t) > 1]


def compute_tf_idf_cosine(doc1: str, doc2: str) -> float:
    """
    High-performance vector cosine similarity between content keywords.
    Fast, deterministic, and requires 0 heavy external binary wheels.
    """
    tokens1 = tokenize_text(doc1)
    tokens2 = tokenize_text(doc2)

    if not tokens1 or not tokens2:
        return 0.0

    tf1 = Counter(tokens1)
    tf2 = Counter(tokens2)

    dot_product = sum(tf1[term] * tf2[term] for term in tf1 if term in tf2)
    norm1 = math.sqrt(sum(cnt * cnt for cnt in tf1.values()))
    norm2 = math.sqrt(sum(cnt * cnt for cnt in tf2.values()))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    return dot_product / (norm1 * norm2)


def match_resume_to_job(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Analyze resume alignment against a job description.
    Returns composite match score (0-100), matched skills, missing skills, and category statistics.
    """
    if not job_description or not job_description.strip():
        return {
            "match_score": 0,
            "semantic_similarity": 0.0,
            "skill_match_percentage": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "resume_skills_detected": [],
            "total_jd_skills": 0,
            "category_breakdown": {},
        }

    # Extract structured taxonomy skills
    jd_skills_dict = extract_skills(job_description)
    resume_skills_dict = extract_skills(resume_text)

    jd_skill_names = set(jd_skills_dict.keys())
    resume_skill_names = set(resume_skills_dict.keys())

    matched_names = jd_skill_names.intersection(resume_skill_names)
    missing_names = jd_skill_names - resume_skill_names
    extra_names = resume_skill_names - jd_skill_names

    # Skill match ratio
    total_jd_skills = len(jd_skill_names)
    skill_match_percentage = (
        round((len(matched_names) / total_jd_skills) * 100, 1)
        if total_jd_skills > 0
        else 100.0
    )

    # Semantic full-text similarity (Vector Cosine)
    semantic_sim = compute_tf_idf_cosine(resume_text, job_description)
    semantic_score = min(100.0, max(0.0, semantic_sim * 200.0))

    # Composite ATS Score:
    # 70% weighted on explicit core tech skill matches + 30% on full contextual keyword similarity
    if total_jd_skills > 0:
        composite_score = round((0.70 * skill_match_percentage) + (0.30 * semantic_score))
    else:
        composite_score = round(semantic_score)

    composite_score = min(100, max(0, composite_score))

    # Category breakdown for radar/diagnostic display
    categories: Dict[str, Dict[str, int]] = {}
    for skill in jd_skills_dict.values():
        cat = skill["category"]
        if cat not in categories:
            categories[cat] = {"required": 0, "matched": 0}
        categories[cat]["required"] += 1
        if skill["name"] in matched_names:
            categories[cat]["matched"] += 1

    # Formatted skill cards
    matched_skills = [
        {
            "name": name,
            "category": jd_skills_dict[name]["category"],
            "count_in_resume": resume_skills_dict[name]["count"],
            "count_in_jd": jd_skills_dict[name]["count"],
        }
        for name in sorted(matched_names)
    ]

    missing_skills = [
        {
            "name": name,
            "category": jd_skills_dict[name]["category"],
            "importance": "high" if jd_skills_dict[name]["count"] >= 2 else "medium",
            "count_in_jd": jd_skills_dict[name]["count"],
        }
        for name in sorted(missing_names, key=lambda n: jd_skills_dict[n]["count"], reverse=True)
    ]

    return {
        "match_score": composite_score,
        "semantic_similarity": round(semantic_sim, 3),
        "skill_match_percentage": skill_match_percentage,
        "total_jd_skills": total_jd_skills,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "resume_skills_detected": sorted(list(resume_skill_names)),
        "category_breakdown": categories,
    }
