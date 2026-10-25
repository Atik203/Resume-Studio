"""
Resume Studio — ATS Parser Simulator & Diagnostic Tool
Simulates how enterprise ATS parsers (Greenhouse, Lever, Workday) extract structured fields from resume text.
"""

import re
from typing import Dict, List, Any, Optional

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
DATE_RANGE_REGEX = re.compile(
    r"\b(20\d\d|19\d\d)\s*[-–—/]\s*(20\d\d|19\d\d|present|current)\b",
    re.IGNORECASE
)


def simulate_ats_parse(project_data: Dict[str, Any], variant_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Simulates ATS extraction on the given resume project data.
    """
    library = project_data.get("library", {})
    profile = library.get("profile", {})
    entries = library.get("entries", [])

    # Find the active variant
    variants = project_data.get("variants", [])
    active_variant = None
    if variant_id:
        active_variant = next((v for v in variants if v.get("id") == variant_id), None)
    if not active_variant and variants:
        active_variant = variants[0]

    # Apply variant overrides
    prof_overrides = active_variant.get("profileOverrides", {}) if active_variant else {}
    name = prof_overrides.get("name") or profile.get("name", "")
    title = prof_overrides.get("title") or profile.get("title", "")
    email = prof_overrides.get("email") or profile.get("email", "")
    phone = prof_overrides.get("phone") or profile.get("phone", "")
    location = prof_overrides.get("location") or profile.get("location", "")
    links = prof_overrides.get("links") or profile.get("links", [])

    warnings: List[Dict[str, str]] = []
    checks_passed = 0
    total_checks = 6

    # 1. Contact Validation
    parsed_email = EMAIL_REGEX.findall(email)
    if parsed_email:
        checks_passed += 1
    else:
        warnings.append({
            "type": "contact",
            "severity": "high",
            "message": "Valid email address was not detected or is formatted unusually.",
        })

    parsed_phone = PHONE_REGEX.findall(phone)
    if parsed_phone or len(re.findall(r"\d", phone)) >= 7:
        checks_passed += 1
    else:
        warnings.append({
            "type": "contact",
            "severity": "medium",
            "message": "Contact phone number missing or has fewer than 7 digits.",
        })

    if name.strip():
        checks_passed += 1
    else:
        warnings.append({
            "type": "identity",
            "severity": "high",
            "message": "Candidate name is blank.",
        })

    if location.strip():
        checks_passed += 1
    else:
        warnings.append({
            "type": "contact",
            "severity": "low",
            "message": "Location (City, Country) is recommended for location-filtered ATS queries.",
        })

    # 2. Work Experience Chronology Validation
    entry_overrides = active_variant.get("entryOverrides", {}) if active_variant else {}
    selected_entry_ids = set(active_variant.get("selectedEntryIds", [])) if active_variant else set(e.get("id") for e in entries)

    active_entries = [e for e in entries if e.get("id") in selected_entry_ids]
    exp_entries = [e for e in active_entries if e.get("sectionId") == "experience"]

    unparsed_dates = 0
    clean_jobs = []

    for entry in exp_entries:
        eid = entry.get("id")
        over = entry_overrides.get(eid, {})
        job_title = over.get("title") or entry.get("title", "")
        company = over.get("subtitle") or entry.get("subtitle", "")
        date_str = over.get("date") or entry.get("date", "")
        bullets = over.get("bullets") if "bullets" in over else entry.get("bullets", [])

        # Check date format
        has_standard_date = bool(DATE_RANGE_REGEX.search(date_str) or any(year in date_str for year in ["2020", "2021", "2022", "2023", "2024", "2025", "2026"]))
        if not has_standard_date and date_str:
            unparsed_dates += 1

        clean_jobs.append({
            "title": job_title,
            "company": company,
            "date": date_str,
            "bullet_count": len(bullets),
        })

    if exp_entries:
        if unparsed_dates == 0:
            checks_passed += 1
        else:
            warnings.append({
                "type": "chronology",
                "severity": "medium",
                "message": f"{unparsed_dates} job entries have non-standard date ranges (recommend 'YYYY – YYYY' or 'Month YYYY – Present').",
            })
    else:
        checks_passed += 1

    # 3. Structural Hierarchy Check
    if any(not job["title"] or not job["company"] for job in clean_jobs):
        warnings.append({
            "type": "hierarchy",
            "severity": "medium",
            "message": "Some work experience entries are missing either Job Title or Company name.",
        })
    else:
        checks_passed += 1

    # Overall Readability Score (0 to 100)
    score = round((checks_passed / total_checks) * 100)

    return {
        "ats_readability_score": score,
        "parsed_profile": {
            "name": name,
            "title": title,
            "email": email,
            "phone": phone,
            "location": location,
            "links_count": len(links),
        },
        "extracted_experience": clean_jobs,
        "warnings": warnings,
        "status": "passed" if score >= 80 else "needs_attention",
    }
