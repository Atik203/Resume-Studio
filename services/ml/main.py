"""
Resume Studio — Local Python ML Service
Bound strictly to loopback (127.0.0.1:8000) for 100% offline, private AI assistance.
"""

import json
import logging
from typing import Annotated, List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, StringConstraints

from taxonomy import extract_skills, SKILL_TAXONOMY
from matcher import match_resume_to_job, cosine_similarity
from xyz_scorer import score_bullets_batch, analyze_bullet
from ats_simulator import simulate_ats_parse
from ner import extract_entities_with_ner, ner_available
from ollama_client import (
    check_ollama_status,
    polish_bullet_with_qwen,
    get_embedding,
    DEFAULT_MODEL,
    EMBEDDING_MODEL,
)

logger = logging.getLogger("resume_studio_ml")
BulletText = Annotated[str, StringConstraints(min_length=1, max_length=5_000)]

app = FastAPI(
    title="Resume Studio ML Engine",
    description="Local-first offline NLP & ATS diagnostic engine",
    version="1.0.0",
)

# CORS restricted strictly to local dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MatchRequest(BaseModel):
    resume_text: str = Field(min_length=1, max_length=100_000)
    job_description: str = Field(min_length=1, max_length=100_000)


class ScoreBulletsRequest(BaseModel):
    bullets: List[BulletText] = Field(min_length=1, max_length=200)


class SimulateAtsRequest(BaseModel):
    project: Dict[str, Any]
    variantId: Optional[str] = None


class PolishBulletRequest(BaseModel):
    bullet: BulletText
    context: Optional[Dict[str, str]] = None
    model: Optional[str] = DEFAULT_MODEL


class ExtractEntitiesRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)


@app.get("/health")
def health_check():
    ollama_stat = check_ollama_status()
    return {
        "status": "ok",
        "service": "resume-studio-ml",
        "version": "1.0.0",
        "offline_private": True,
        "skills_in_taxonomy": len(SKILL_TAXONOMY),
        "ner_available": ner_available(),
        "ollama": {
            "online": ollama_stat["online"],
            "model_available": ollama_stat["model_available"],
            "preferred_model": ollama_stat["preferred_model"],
            "embedding_model": ollama_stat.get("embedding_model", EMBEDDING_MODEL),
            "embedding_available": ollama_stat.get("embedding_available", False),
        },
    }


@app.get("/api/ollama/status")
def get_ollama_status(model: Optional[str] = DEFAULT_MODEL):
    """Check status of local Ollama service and installed models."""
    return check_ollama_status(preferred_model=model or DEFAULT_MODEL)


@app.get("/api/taxonomy")
def get_taxonomy():
    """Return list of supported skills organized by category."""
    grouped: Dict[str, List[str]] = {}
    for skill, info in SKILL_TAXONOMY.items():
        cat = info["category"]
        grouped.setdefault(cat, []).append(skill)
    return {"categories": grouped, "total_skills": len(SKILL_TAXONOMY)}


@app.post("/api/match")
def match_job(req: MatchRequest):
    """Calculate semantic relevance, skill overlap, and missing keywords."""
    try:
        resume_embedding = get_embedding(req.resume_text)
        jd_embedding = get_embedding(req.job_description)
        embedding_similarity = (
            cosine_similarity(resume_embedding, jd_embedding)
            if resume_embedding and jd_embedding
            else None
        )
        return match_resume_to_job(
            req.resume_text,
            req.job_description,
            embedding_similarity=embedding_similarity,
        )
    except Exception:
        logger.exception("Job matching failed")
        raise HTTPException(status_code=500, detail="Internal ML service error. Check the service log.")


@app.post("/api/score-bullets")
def score_bullets(req: ScoreBulletsRequest):
    """Analyze bullet points against Google XYZ impact criteria."""
    try:
        return score_bullets_batch(req.bullets)
    except Exception:
        logger.exception("Bullet scoring failed")
        raise HTTPException(status_code=500, detail="Internal ML service error. Check the service log.")


@app.post("/api/polish-bullet")
def polish_bullet(req: PolishBulletRequest):
    """
    Polish a resume bullet with local Qwen 3.5 4B into 3 distinct variations
    and compute before/after Google XYZ impact metrics.
    """
    clean_bullet = req.bullet.strip()
    if not clean_bullet:
        raise HTTPException(status_code=400, detail="Bullet cannot be empty.")

    original_analysis = analyze_bullet(clean_bullet)
    polish_result = polish_bullet_with_qwen(
        bullet=clean_bullet,
        context=req.context,
        model_name=req.model or DEFAULT_MODEL,
    )

    raw_variations = polish_result.get("variations", {})
    variation_cards = []

    labels = {
        "quantified": {
            "title": "Quantified Impact",
            "tag": "Google XYZ",
            "desc": "Emphasizes measurable metrics, scale, and performance outcome.",
        },
        "action": {
            "title": "Action-First Leadership",
            "tag": "Leadership",
            "desc": "Emphasizes proactive architecture, execution, and technical authority.",
        },
        "compact": {
            "title": "Compact ATS",
            "tag": "ATS Dense",
            "desc": "Keyword-dense, concise single line optimized for tight page limits.",
        },
    }

    for key in ["quantified", "action", "compact"]:
        text = raw_variations.get(key, clean_bullet)
        analysis = analyze_bullet(text)
        delta = analysis["score"] - original_analysis["score"]

        meta = labels.get(key, {"title": key.capitalize(), "tag": "Variation", "desc": ""})
        variation_cards.append({
            "key": key,
            "title": meta["title"],
            "tag": meta["tag"],
            "description": meta["desc"],
            "text": text,
            "score": analysis["score"],
            "verb_strength": analysis["verb_strength"],
            "first_verb": analysis.get("first_verb"),
            "has_metrics": analysis["has_metrics"],
            "has_methodology": analysis["has_methodology"],
            "delta_score": delta,
        })

    return {
        "success": True,
        "source": polish_result.get("source", "unknown"),
        "original": {
            "text": clean_bullet,
            "score": original_analysis["score"],
            "verb_strength": original_analysis["verb_strength"],
            "first_verb": original_analysis.get("first_verb"),
            "has_metrics": original_analysis["has_metrics"],
            "has_methodology": original_analysis["has_methodology"],
        },
        "variations": variation_cards,
    }


@app.post("/api/extract-entities")
def extract_entities(req: ExtractEntitiesRequest):
    """Extract skills and technical entities categorized by domain."""
    try:
        ner_skills = extract_entities_with_ner(req.text)
        skills = ner_skills if ner_skills is not None else extract_skills(req.text)
        source = "spacy" if ner_skills is not None else "regex"
        categorized: Dict[str, List[str]] = {}
        for s in skills:
            info = SKILL_TAXONOMY.get(s, {"category": "Other Tools"})
            cat = info.get("category", "Other Tools")
            categorized.setdefault(cat, []).append(s)

        return {
            "extracted_skills": skills,
            "categorized": categorized,
            "total_count": len(skills),
            "source": source,
        }
    except Exception:
        logger.exception("Entity extraction failed")
        raise HTTPException(status_code=500, detail="Internal ML service error. Check the service log.")


@app.post("/api/simulate-ats")
def run_ats_simulation(req: SimulateAtsRequest):
    """Simulate ATS extraction and flag potential formatting/chronology traps."""
    try:
        if len(json.dumps(req.project)) > 5_000_000:
            raise HTTPException(status_code=413, detail="Project payload is too large.")
        return simulate_ats_parse(req.project, req.variantId)
    except HTTPException:
        raise
    except Exception:
        logger.exception("ATS simulation failed")
        raise HTTPException(status_code=500, detail="Internal ML service error. Check the service log.")



if __name__ == "__main__":
    import uvicorn
    print("Starting Resume Studio Local ML Service on http://127.0.0.1:8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
