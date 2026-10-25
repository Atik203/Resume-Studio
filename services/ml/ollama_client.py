"""
Resume Studio — Local Ollama & Qwen 3.5 4B Integration
100% offline, local inference via loopback (127.0.0.1:11434).
Zero external API calls, zero telemetry, zero data leaves the machine.
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List

OLLAMA_BASE_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "qwen3.5:4b"


def check_ollama_status(preferred_model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Check if local Ollama daemon is reachable and which models are installed."""
    try:
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/tags",
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name", "") for m in data.get("models", [])]
            is_model_present = any(
                preferred_model in m or m.startswith(preferred_model)
                for m in models
            )
            return {
                "online": True,
                "preferred_model": preferred_model,
                "model_available": is_model_present,
                "installed_models": models,
            }
    except Exception as e:
        return {
            "online": False,
            "preferred_model": preferred_model,
            "model_available": False,
            "installed_models": [],
            "error": str(e),
        }


def polish_bullet_with_qwen(
    bullet: str,
    context: Optional[Dict[str, str]] = None,
    model_name: str = DEFAULT_MODEL,
    timeout_sec: int = 25,
) -> Dict[str, Any]:
    """
    Refines a resume bullet into 3 targeted variations using local Qwen 3.5 4B:
    1. Quantified (Google XYZ: Action + Metric + Method)
    2. Action-First (leadership & architecture focus)
    3. Compact (keyword-dense single-line layout)
    """
    clean_bullet = bullet.strip()
    if not clean_bullet:
        return {
            "success": False,
            "error": "Bullet text is empty",
            "variations": None,
        }

    ctx_str = ""
    if context:
        role = context.get("title") or context.get("role")
        comp = context.get("subtitle") or context.get("company")
        if role and comp:
            ctx_str = f"Context: Role '{role}' at '{comp}'."
        elif role:
            ctx_str = f"Context: Role '{role}'."

    prompt = f"""You are an elite software engineering resume coach.
Refine this resume bullet into 3 distinct, high-impact variations:
{ctx_str}
Input bullet: "{clean_bullet}"

Instructions:
1. "quantified": Follow the Google XYZ formula: Accomplished [X] as measured by [Y], by doing [Z]. Include realistic software engineering metrics (e.g. % performance, ms latency reduction, defect reduction, test coverage, throughput, user scale).
2. "action": Emphasize technical leadership, proactive architecture, and high-agency execution (e.g. Architected, Spearheaded, Engineered, Orchestrated).
3. "compact": Dense, concise, single-line format packed with high-value technical keywords for ATS parsers.

Return strictly valid JSON with exact keys "quantified", "action", and "compact".
Do not output markdown code blocks, do not output explanations, and do not include quotes outside the JSON.
"""

    payload = {
        "model": model_name,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "think": False,
        "options": {
            "num_ctx": 2048,
            "num_predict": 350,
            "temperature": 0.35,
        },
    }

    try:
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            raw_text = res_data.get("response", "").strip()

            # Parse JSON
            parsed = json.loads(raw_text)
            return {
                "success": True,
                "source": f"ollama:{model_name}",
                "variations": {
                    "quantified": parsed.get("quantified", clean_bullet),
                    "action": parsed.get("action", clean_bullet),
                    "compact": parsed.get("compact", clean_bullet),
                },
            }
    except Exception as e:
        # Graceful fallback to deterministic rule-based template polishing
        fallback = generate_rule_based_fallback(clean_bullet, context)
        return {
            "success": True,
            "source": "rule_based_fallback",
            "fallback_reason": str(e),
            "variations": fallback,
        }


def generate_rule_based_fallback(
    bullet: str,
    context: Optional[Dict[str, str]] = None,
) -> Dict[str, str]:
    """
    Deterministic rule-based transformer when Ollama is offline or uninstalled.
    Guarantees the user always receives 3 strong actionable suggestions.
    """
    cleaned = bullet.strip().rstrip(".")
    # Replace weak verbs with power verbs
    weak_to_power = [
        ("Worked on", "Architected and delivered"),
        ("worked on", "architected and delivered"),
        ("Helped", "Spearheaded collaborative efforts to develop"),
        ("helped", "spearheaded collaborative efforts to develop"),
        ("Assisted with", "Engineered solutions for"),
        ("assisted with", "engineered solutions for"),
        ("Responsible for", "Orchestrated end-to-end execution of"),
        ("responsible for", "orchestrated end-to-end execution of"),
        ("Fixed bugs in", "Resolved critical defects and enhanced stability of"),
        ("fixed bugs in", "resolved critical defects and enhanced stability of"),
        ("Built", "Engineered and deployed scalable"),
        ("built", "engineered and deployed scalable"),
    ]

    action_text = cleaned
    for weak, strong in weak_to_power:
        if action_text.startswith(weak):
            action_text = strong + action_text[len(weak):]
            break

    # Quantified template
    quantified = f"{action_text}, improving system performance by 35% and reducing processing overhead."
    # Action template
    action = f"Spearheaded {cleaned.lower() if not cleaned[0].isupper() else cleaned}, establishing automated test suites and architectural reliability standards."
    # Compact template
    compact = f"{action_text}, boosting operational throughput and maintainability."

    return {
        "quantified": quantified,
        "action": action,
        "compact": compact,
    }
