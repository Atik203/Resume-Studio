"""
Resume Studio — Custom Resume Entity Recognition (NER) Training & Evaluation Pipeline
Fine-tunes and evaluates domain-specific developer skill & technical entity extraction.
Uses synthetic resume corpus and the curated taxonomy to train and benchmark NER patterns.
"""

import os
import json
import random
from typing import List, Dict, Tuple, Any

from taxonomy import SKILL_TAXONOMY, extract_skills


SYNTHETIC_TEMPLATES = [
    "Engineered distributed microservices using {LANG} and {FRAMEWORK} deployed on {CLOUD}.",
    "Led backend infrastructure refactor utilizing {DB} for low-latency storage and {CACHE} for caching.",
    "Built and maintained responsive web applications with {FRAMEWORK}, {STATE}, and {CSS}.",
    "Orchestrated CI/CD pipelines via {CI} and containerized workloads using {CONTAINER}.",
    "Architected event-driven architecture using {EVENT} and managed database migrations on {DB}.",
    "Implemented automated unit and end-to-end testing with {TEST} and {TEST2}.",
    "Developed high-throughput data processing workflows with {LANG} and deployed to {CLOUD}.",
    "Designed REST and GraphQL APIs using {FRAMEWORK} integrated with {DB}.",
]

SAMPLE_CATEGORIES = {
    "LANG": ["TypeScript", "Python", "Go", "Rust", "Java", "C++", "JavaScript"],
    "FRAMEWORK": ["React", "Next.js", "Node.js", "FastAPI", "NestJS", "Express.js", "Django", "Spring Boot"],
    "CLOUD": ["AWS", "Google Cloud", "Azure", "Cloudflare", "Vercel"],
    "DB": ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Cassandra", "DynamoDB"],
    "CACHE": ["Redis", "Memcached"],
    "STATE": ["Redux", "Zustand", "React Query"],
    "CSS": ["Tailwind CSS", "Sass", "CSS3"],
    "CI": ["GitHub Actions", "GitLab CI", "Jenkins"],
    "CONTAINER": ["Docker", "Kubernetes", "Helm"],
    "EVENT": ["Kafka", "RabbitMQ"],
    "TEST": ["Jest", "Vitest", "Playwright", "Cypress", "PyTest"],
    "TEST2": ["Supertest", "Mocha"],
}


def generate_synthetic_dataset(num_samples: int = 50, seed: int = 42) -> List[Dict[str, Any]]:
    """Generate annotated synthetic resume bullet points with ground-truth skill entities."""
    random.seed(seed)
    dataset = []

    for _ in range(num_samples):
        template = random.choice(SYNTHETIC_TEMPLATES)
        chosen_skills = {}
        for placeholder, candidates in SAMPLE_CATEGORIES.items():
            if f"{{{placeholder}}}" in template:
                chosen_skills[placeholder] = random.choice(candidates)

        text = template.format(**chosen_skills)
        ground_truth_skills = list(set(chosen_skills.values()))

        # Locate character offsets for NER training formats (BILUO/BIO)
        entities = []
        for s in ground_truth_skills:
            start = text.find(s)
            if start != -1:
                end = start + len(s)
                cat = SKILL_TAXONOMY.get(s, {}).get("category", "Skill")
                entities.append((start, end, cat))

        dataset.append({
            "text": text,
            "ground_truth": ground_truth_skills,
            "entities": entities,
        })

    return dataset


def evaluate_ner_performance(dataset: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Evaluates current taxonomy-based entity extraction against annotated dataset.
    Computes Precision, Recall, and F1 Score.
    """
    total_true_positives = 0
    total_false_positives = 0
    total_false_negatives = 0

    for sample in dataset:
        predicted = set(extract_skills(sample["text"]))
        ground_truth = set(sample["ground_truth"])

        tp = len(predicted & ground_truth)
        fp = len(predicted - ground_truth)
        fn = len(ground_truth - predicted)

        total_true_positives += tp
        total_false_positives += fp
        total_false_negatives += fn

    precision = total_true_positives / (total_true_positives + total_false_positives) if (total_true_positives + total_false_positives) > 0 else 0.0
    recall = total_true_positives / (total_true_positives + total_false_negatives) if (total_true_positives + total_false_negatives) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "total_samples": len(dataset),
        "true_positives": total_true_positives,
        "false_positives": total_false_positives,
        "false_negatives": total_false_negatives,
    }


def save_training_data(dataset: List[Dict[str, Any]], filepath: str):
    """Saves synthetic dataset to disk in JSON Lines format for spaCy or HuggingFace training."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        for item in dataset:
            f.write(json.dumps(item) + "\n")
    print(f"Saved {len(dataset)} annotated training samples to {filepath}")


if __name__ == "__main__":
    print("Generating synthetic resume NER training dataset...")
    data = generate_synthetic_dataset(num_samples=100)
    metrics = evaluate_ner_performance(data)
    print("\nNER Extraction Benchmark Results:")
    print(f"  Samples:   {metrics['total_samples']}")
    print(f"  Precision: {metrics['precision'] * 100:.2f}%")
    print(f"  Recall:    {metrics['recall'] * 100:.2f}%")
    print(f"  F1 Score:  {metrics['f1'] * 100:.2f}%")

    out_path = os.path.join(os.path.dirname(__file__), "data", "synthetic_ner_train.jsonl")
    save_training_data(data, out_path)
