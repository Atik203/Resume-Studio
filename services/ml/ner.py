"""
Optional spaCy NER path with a guaranteed regex fallback.

Install `services/ml/requirements-ner.txt` and run the service again to enable
it. The module never imports spaCy at runtime unless it is installed, and the
existing taxonomy extractor remains the default.
"""

from typing import Dict, Optional

try:
    import spacy
except Exception:
    spacy = None

from taxonomy import SKILL_TAXONOMY

_nlp = None


def ner_available() -> bool:
    return spacy is not None


def _build_pipeline():
    nlp = spacy.blank("en")
    ruler = nlp.add_pipe("entity_ruler")
    patterns = []
    for skill, info in SKILL_TAXONOMY.items():
        names = [skill, *info.get("aliases", [])]
        for name in names:
            patterns.append({
                "label": info.get("category", "SKILL"),
                "pattern": name,
                "id": skill,
            })
    ruler.add_patterns(patterns)
    return nlp


def extract_entities_with_ner(text: str) -> Optional[Dict[str, int]]:
    """Return canonical skill counts via spaCy, or None when spaCy is absent."""
    if spacy is None:
        return None
    global _nlp
    if _nlp is None:
        _nlp = _build_pipeline()
    doc = _nlp(text)
    found: Dict[str, int] = {}
    for entity in doc.ents:
        name = entity.ent_id_ or entity.text
        found[name] = found.get(name, 0) + 1
    return found
