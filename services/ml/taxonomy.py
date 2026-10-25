"""
Resume Studio — Tech & Professional Skill Taxonomy
Curated open-source taxonomy covering software engineering, data science, DevOps, and systems.
"""

from typing import Dict, List, Set, Tuple
import re

# Canonical skill -> list of aliases / variants
SKILL_TAXONOMY: Dict[str, Dict[str, any]] = {
    # Programming Languages
    "Python": {"category": "Languages", "aliases": ["python", "py", "python3"]},
    "TypeScript": {"category": "Languages", "aliases": ["typescript", "ts"]},
    "JavaScript": {"category": "Languages", "aliases": ["javascript", "js", "ecmascript", "es6", "es6+"]},
    "C++": {"category": "Languages", "aliases": ["c++", "cpp"]},
    "C#": {"category": "Languages", "aliases": ["c#", "csharp", "c sharp", ".net c#"]},
    "Java": {"category": "Languages", "aliases": ["java", "core java", "java 8", "java 17", "java 21"]},
    "Go": {"category": "Languages", "aliases": ["go", "golang"]},
    "Rust": {"category": "Languages", "aliases": ["rust", "rust-lang"]},
    "SQL": {"category": "Languages", "aliases": ["sql", "tsql", "plsql", "pl-sql"]},
    "PHP": {"category": "Languages", "aliases": ["php", "php7", "php8"]},
    "Ruby": {"category": "Languages", "aliases": ["ruby"]},
    "Swift": {"category": "Languages", "aliases": ["swift", "swiftui"]},
    "Kotlin": {"category": "Languages", "aliases": ["kotlin"]},
    "HTML5": {"category": "Languages", "aliases": ["html", "html5"]},
    "CSS3": {"category": "Languages", "aliases": ["css", "css3", "sass", "scss", "less"]},
    "Bash": {"category": "Languages", "aliases": ["bash", "shell scripting", "sh", "zsh", "powershell"]},

    # Frontend Frameworks & Libraries
    "React": {"category": "Frontend", "aliases": ["react", "react.js", "reactjs"]},
    "Next.js": {"category": "Frontend", "aliases": ["next.js", "nextjs", "next 14", "next 15", "next 16"]},
    "Vue.js": {"category": "Frontend", "aliases": ["vue", "vue.js", "vuejs", "vue 3", "nuxt", "nuxtjs"]},
    "Angular": {"category": "Frontend", "aliases": ["angular", "angularjs", "angular 2+"]},
    "Tailwind CSS": {"category": "Frontend", "aliases": ["tailwind", "tailwindcss", "tailwind-css"]},
    "Redux": {"category": "Frontend", "aliases": ["redux", "redux toolkit", "rtk"]},
    "Zustand": {"category": "Frontend", "aliases": ["zustand"]},
    "GraphQL": {"category": "Frontend", "aliases": ["graphql", "apollo", "apollo client"]},
    "Webpack": {"category": "Frontend", "aliases": ["webpack", "vite", "turbopack", "rollup"]},
    "Responsive Design": {"category": "Frontend", "aliases": ["responsive design", "mobile-first", "mobile first"]},
    "Web Accessibility": {"category": "Frontend", "aliases": ["accessibility", "a11y", "wcag", "aria"]},

    # Backend & API Development
    "Node.js": {"category": "Backend", "aliases": ["node", "node.js", "nodejs"]},
    "Express.js": {"category": "Backend", "aliases": ["express", "express.js", "expressjs"]},
    "NestJS": {"category": "Backend", "aliases": ["nestjs", "nest.js"]},
    "FastAPI": {"category": "Backend", "aliases": ["fastapi", "fast-api"]},
    "Django": {"category": "Backend", "aliases": ["django", "django rest framework", "drf"]},
    "Flask": {"category": "Backend", "aliases": ["flask"]},
    "Spring Boot": {"category": "Backend", "aliases": ["spring", "spring boot", "springboot"]},
    "ASP.NET Core": {"category": "Backend", "aliases": [".net core", "asp.net", "asp.net core", "dotnet"]},
    "RESTful APIs": {"category": "Backend", "aliases": ["rest", "restful", "rest api", "rest apis", "restful api"]},
    "gRPC": {"category": "Backend", "aliases": ["grpc", "protobuf", "protocol buffers"]},
    "WebSockets": {"category": "Backend", "aliases": ["websocket", "websockets", "socket.io"]},
    "Microservices": {"category": "Backend", "aliases": ["microservices", "microservice architecture", "distributed systems"]},

    # Databases & Caching
    "PostgreSQL": {"category": "Databases", "aliases": ["postgresql", "postgres", "psql"]},
    "MySQL": {"category": "Databases", "aliases": ["mysql", "mariadb"]},
    "MongoDB": {"category": "Databases", "aliases": ["mongodb", "mongo"]},
    "Redis": {"category": "Databases", "aliases": ["redis", "redis cache"]},
    "SQLite": {"category": "Databases", "aliases": ["sqlite", "sqlite3"]},
    "DynamoDB": {"category": "Databases", "aliases": ["dynamodb", "aws dynamodb"]},
    "Elasticsearch": {"category": "Databases", "aliases": ["elasticsearch", "elastic search", "opensearch"]},
    "Prisma": {"category": "Databases", "aliases": ["prisma", "prisma orm"]},
    "TypeORM": {"category": "Databases", "aliases": ["typeorm", "hibernate", "sqlalchemy"]},

    # DevOps, Cloud & Infrastructure
    "Docker": {"category": "DevOps & Cloud", "aliases": ["docker", "containerization", "containers"]},
    "Kubernetes": {"category": "DevOps & Cloud", "aliases": ["kubernetes", "k8s"]},
    "AWS": {"category": "DevOps & Cloud", "aliases": ["aws", "amazon web services", "ec2", "s3", "lambda", "ecs", "rds"]},
    "Google Cloud": {"category": "DevOps & Cloud", "aliases": ["gcp", "google cloud", "google cloud platform", "cloud run"]},
    "Azure": {"category": "DevOps & Cloud", "aliases": ["azure", "microsoft azure"]},
    "CI/CD": {"category": "DevOps & Cloud", "aliases": ["ci/cd", "ci cd", "continuous integration", "github actions", "gitlab ci", "jenkins"]},
    "Terraform": {"category": "DevOps & Cloud", "aliases": ["terraform", "iac", "infrastructure as code"]},
    "Linux": {"category": "DevOps & Cloud", "aliases": ["linux", "ubuntu", "debian", "centos", "unix"]},
    "Nginx": {"category": "DevOps & Cloud", "aliases": ["nginx", "caddy", "apache"]},

    # Testing & Code Quality
    "Unit Testing": {"category": "Testing", "aliases": ["unit test", "unit testing", "jest", "pytest", "mocha", "vitest"]},
    "E2E Testing": {"category": "Testing", "aliases": ["e2e", "e2e testing", "cypress", "playwright", "selenium"]},
    "TDD": {"category": "Testing", "aliases": ["tdd", "test driven development", "test-driven development"]},

    # System Architecture & Methodologies
    "System Design": {"category": "Architecture", "aliases": ["system design", "software architecture", "high availability"]},
    "Agile / Scrum": {"category": "Methodologies", "aliases": ["agile", "scrum", "kanban", "sprint planning"]},
    "Git": {"category": "Tools", "aliases": ["git", "github", "gitlab", "version control"]},
}

# Precompile regex map for fast, word-boundary skill matching
SKILL_REGEX_MAP: List[Tuple[str, str, re.Pattern]] = []

for canonical_name, info in SKILL_TAXONOMY.items():
    category = info["category"]
    all_terms = [canonical_name] + info["aliases"]
    # Sort terms by length descending so longer phrases match first
    all_terms.sort(key=lambda s: len(s), reverse=True)
    pattern_parts = []
    for term in all_terms:
        escaped = re.escape(term)
        # Handle word boundaries safely (supporting symbols like C++, C#, .NET)
        if term.endswith("++") or term.endswith("#"):
            pattern_parts.append(rf"(?:\b|\s|^){escaped}(?:\b|\s|$)")
        elif term.startswith("."):
            pattern_parts.append(rf"(?:\b|\s|^){escaped}\b")
        else:
            pattern_parts.append(rf"\b{escaped}\b")

    combined_pattern = re.compile("|".join(pattern_parts), re.IGNORECASE)
    SKILL_REGEX_MAP.append((canonical_name, category, combined_pattern))


def extract_skills(text: str) -> Dict[str, Dict[str, any]]:
    """
    Extract canonical skills found within text, returning skill name, category, and match count.
    """
    if not text:
        return {}

    found: Dict[str, Dict[str, any]] = {}
    for canonical_name, category, pattern in SKILL_REGEX_MAP:
        matches = pattern.findall(text)
        if matches:
            found[canonical_name] = {
                "name": canonical_name,
                "category": category,
                "count": len(matches),
            }

    return found
