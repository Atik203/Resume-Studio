"""
Resume Studio — Local Python ML Service
Bound strictly to loopback (127.0.0.1:8000) for 100% offline, private AI assistance.
"""

from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from taxonomy import extract_skills, SKILL_TAXONOMY
from matcher import match_resume_to_job
from xyz_scorer import score_bullets_batch, analyze_bullet
from ats_simulator import simulate_ats_parse

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
    resume_text: str
    job_description: str


class ScoreBulletsRequest(BaseModel):
    bullets: List[str]


class SimulateAtsRequest(BaseModel):
    project: Dict[str, Any]
    variantId: Optional[str] = None


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "resume-studio-ml",
        "version": "1.0.0",
        "offline_private": True,
        "skills_in_taxonomy": len(SKILL_TAXONOMY),
    }


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
        return match_resume_to_job(req.resume_text, req.job_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/score-bullets")
def score_bullets(req: ScoreBulletsRequest):
    """Analyze bullet points against Google XYZ impact criteria."""
    try:
        return score_bullets_batch(req.bullets)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulate-ats")
def run_ats_simulation(req: SimulateAtsRequest):
    """Simulate ATS extraction and flag potential formatting/chronology traps."""
    try:
        return simulate_ats_parse(req.project, req.variantId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("Starting Resume Studio Local ML Service on http://127.0.0.1:8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
