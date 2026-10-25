"""
Tests for Resume Studio Local ML Service
Validates taxonomy skill extraction, Google XYZ bullet scoring, and semantic matching.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "ml"))

from taxonomy import extract_skills
from xyz_scorer import analyze_bullet, score_bullets_batch
from matcher import match_resume_to_job
from ats_simulator import simulate_ats_parse
from ollama_client import check_ollama_status, polish_bullet_with_qwen, generate_rule_based_fallback
from train_ner import generate_synthetic_dataset, evaluate_ner_performance


def test_taxonomy_extraction():
    sample = "Full-Stack Engineer experienced in TypeScript, React, Next.js, and PostgreSQL with Docker."
    skills = extract_skills(sample)
    assert "TypeScript" in skills, "TypeScript should be extracted"
    assert "React" in skills, "React should be extracted"
    assert "Next.js" in skills, "Next.js should be extracted"
    assert "PostgreSQL" in skills, "PostgreSQL should be extracted"
    assert "Docker" in skills, "Docker should be extracted"
    print("[OK] Taxonomy extraction passed.")


def test_xyz_scoring():
    # Strong bullet with metric and methodology
    b1 = "Architected a real-time analytics pipeline reducing query latency by 45% using Redis caching and PostgreSQL."
    res1 = analyze_bullet(b1)
    assert res1["score"] >= 80, f"Expected high score for b1, got {res1['score']}"
    assert res1["verb_strength"] == "strong"
    assert res1["has_metrics"] is True
    assert res1["has_methodology"] is True

    # Weak passive bullet without metric
    b2 = "Worked on fixing bugs and helped the team with tests."
    res2 = analyze_bullet(b2)
    assert res2["score"] < 50, f"Expected low score for b2, got {res2['score']}"
    assert res2["verb_strength"] == "weak"
    assert res2["has_metrics"] is False

    print("[OK] XYZ bullet scoring passed.")


def test_job_matching():
    resume = "Senior Developer skilled in TypeScript, React, Next.js, PostgreSQL, Docker, and AWS."
    jd = "Looking for a Frontend Engineer with strong React, Next.js, TypeScript, and Tailwind CSS experience."
    res = match_resume_to_job(resume, jd)
    assert res["match_score"] > 60, f"Expected high match score, got {res['match_score']}"
    matched_names = {s["name"] for s in res["matched_skills"]}
    assert "React" in matched_names
    assert "Next.js" in matched_names
    assert "TypeScript" in matched_names

    missing_names = {s["name"] for s in res["missing_skills"]}
    assert "Tailwind CSS" in missing_names
    print("[OK] Job matching and keyword gap analysis passed.")


def test_ats_simulator():
    mock_project = {
        "library": {
            "profile": {
                "name": "Jane Developer",
                "title": "Software Engineer",
                "email": "jane@example.com",
                "phone": "+1 555-0199",
                "location": "New York, NY",
                "links": [{"type": "github", "label": "GitHub", "url": "https://github.com"}],
            },
            "entries": [
                {
                    "id": "e1",
                    "sectionId": "experience",
                    "title": "Software Engineer",
                    "subtitle": "Tech Corp",
                    "date": "2022 – Present",
                    "bullets": ["Engineered core APIs."],
                }
            ],
        },
        "variants": [
            {
                "id": "v1",
                "selectedEntryIds": ["e1"],
                "profileOverrides": {},
                "entryOverrides": {},
            }
        ],
    }
    ats = simulate_ats_parse(mock_project, "v1")
    assert ats["ats_readability_score"] >= 80, f"Expected >= 80 ATS score, got {ats['ats_readability_score']}"
    assert ats["parsed_profile"]["name"] == "Jane Developer"
    assert ats["parsed_profile"]["email"] == "jane@example.com"
    print("[OK] ATS parser simulator passed.")


def test_ollama_status_and_polishing():
    status = check_ollama_status()
    assert "online" in status, "Status must contain 'online' boolean"
    assert "model_available" in status, "Status must indicate if model is installed"

    # Test bullet polishing (works online with Ollama or falls back gracefully)
    bullet = "Worked on fixing bugs and helped the team with tests."
    res = polish_bullet_with_qwen(bullet, context={"title": "Software Engineer", "company": "Tech Corp"})
    assert res["success"] is True, "Polishing should succeed via Ollama or fallback"
    assert "variations" in res and res["variations"] is not None
    assert "quantified" in res["variations"]
    assert "action" in res["variations"]
    assert "compact" in res["variations"]

    # Verify rule-based fallback directly
    fallback = generate_rule_based_fallback(bullet)
    assert len(fallback["quantified"]) > 10
    assert len(fallback["action"]) > 10
    assert len(fallback["compact"]) > 10
    print("[OK] Ollama client and bullet polishing passed.")


def test_ner_dataset_and_evaluation():
    data = generate_synthetic_dataset(num_samples=20, seed=123)
    assert len(data) == 20, "Should generate 20 annotated samples"
    assert "text" in data[0] and "ground_truth" in data[0]

    metrics = evaluate_ner_performance(data)
    assert metrics["total_samples"] == 20
    assert metrics["precision"] > 0.0
    assert metrics["recall"] > 0.0
    print("[OK] NER dataset generator and evaluation benchmark passed.")


if __name__ == "__main__":
    test_taxonomy_extraction()
    test_xyz_scoring()
    test_job_matching()
    test_ats_simulator()
    test_ollama_status_and_polishing()
    test_ner_dataset_and_evaluation()
    print("\nALL PYTHON ML TESTS PASSED SUCCESSFULLY!")

