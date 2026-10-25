'use client';

import { useState, useMemo } from 'react';
import type { ProjectData, ResumeVariant } from '@/lib/data';
import { useMlService } from '@/hooks/use-ml-service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Target,
  Bot,
  Plus,
  ShieldCheck,
  FileText,
  Zap,
} from 'lucide-react';

export interface AtsPanelProps {
  project: ProjectData;
  activeVariant: ResumeVariant;
  onAddSkillToResume: (skillName: string, category: string) => void;
}

const SAMPLE_JDS: Record<string, { title: string; text: string }> = {
  frontend: {
    title: 'Frontend Engineer (React / Next.js / TypeScript)',
    text: `Job Title: Senior Frontend Engineer
Location: Remote / New York

We are seeking a Senior Frontend Engineer to build high-performance web applications.
Required Qualifications:
- 4+ years of professional experience with React, Next.js, and modern TypeScript.
- Strong knowledge of Tailwind CSS, CSS architecture, and responsive design systems.
- Experience with State Management (Redux, Zustand, or TanStack Query).
- Familiarity with Testing libraries (Jest, Playwright, or Cypress) and CI/CD pipelines.
- Experience collaborating with backend APIs, REST, GraphQL, and Git workflows.
- Performance optimization, Web Vitals, and accessibility (WCAG) standards.`,
  },
  fullstack: {
    title: 'Full-Stack Developer (React / Node / PostgreSQL / AWS)',
    text: `Job Title: Full-Stack Software Engineer
Company: Tech Innovations

Requirements:
- Strong experience with TypeScript, JavaScript, React, and Node.js.
- Robust backend development skills with PostgreSQL, Prisma, or TypeORM.
- Experience designing and securing RESTful and GraphQL APIs.
- Cloud architecture and DevOps experience with Docker, AWS (ECS, S3, RDS), and Linux.
- Familiarity with Microservices, Redis caching, and automated testing (Jest, PyTest).
- Experience with Agile methodologies, Git version control, and continuous integration.`,
  },
  devops: {
    title: 'DevOps / Platform Engineer (Kubernetes / Docker / Terraform)',
    text: `Job Title: Cloud & DevOps Engineer

Key Responsibilities:
- Manage cloud infrastructure on AWS using Terraform and infrastructure-as-code.
- Build and orchestrate containerized applications with Docker and Kubernetes (EKS).
- Implement robust CI/CD pipelines using GitHub Actions, GitLab CI, and Linux shell scripting.
- Monitor infrastructure health and observability with Prometheus, Grafana, and Datadog.
- Maintain high availability, zero-downtime deployments, and security compliance.`,
  },
};

export function AtsPanel({
  project,
  activeVariant,
  onAddSkillToResume,
}: AtsPanelProps) {
  const [subTab, setSubTab] = useState<'match' | 'simulate'>('match');
  const [jobDescription, setJobDescription] = useState('');
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());

  const {
    health,
    isHealthChecking,
    checkHealth,
    matchResult,
    isMatching,
    matchError,
    matchJob,
    atsSimulation,
    isSimulating,
    simulationError,
    simulateAts,
  } = useMlService();

  // Extract full resume text from active variant and master library
  const resumeFullText = useMemo(() => {
    const parts: string[] = [];
    const prof = { ...project.library.profile, ...activeVariant.profileOverrides };
    parts.push(`${prof.name} ${prof.title} ${prof.location}`);

    for (const section of activeVariant.sections) {
      if (!section.visible) continue;
      parts.push(section.label);
      for (const entryId of section.entryIds) {
        const master = project.library.entries.find(e => e.id === entryId);
        if (!master) continue;
        const entry = { ...master, ...activeVariant.entryOverrides[entryId] };
        parts.push(`${entry.title} ${entry.subtitle} ${entry.description}`);
        parts.push(entry.bullets.join(' '));
        parts.push(entry.technologies.join(' '));
      }
    }
    return parts.join('\n');
  }, [project, activeVariant]);

  const handleRunMatch = () => {
    if (!jobDescription.trim()) return;
    matchJob(resumeFullText, jobDescription);
  };

  const handleRunSimulation = () => {
    simulateAts(project, activeVariant.id);
  };

  const handleAddSkill = (skillName: string, category: string) => {
    onAddSkillToResume(skillName, category);
    setAddedSkills(prev => new Set([...prev, skillName]));
  };

  return (
    <div className="ats-panel-container">
      {/* 1. Header Bar with ML Service Status */}
      <div className="ats-panel-header">
        <div className="ats-service-status">
          <div className="flex items-center gap-2">
            <span
              className={`status-dot ${
                health.status === 'online' ? 'status-online' : 'status-offline'
              }`}
            />
            <span className="text-xs font-semibold">
              {health.status === 'online'
                ? `Offline ML Engine Active (127.0.0.1:8000)`
                : `ML Engine Offline`}
            </span>
          </div>
          {health.status === 'online' ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>{health.skills_in_taxonomy} Tech Skills Loaded</span>
              {health.ollama?.online && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-semibold">
                  ⚡ Qwen 3.5 4B Active
                </span>
              )}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-500 font-mono">
                run services/ml/run-ml.bat
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                title="Check again"
                disabled={isHealthChecking}
                onClick={checkHealth}
              >
                <RefreshCw size={12} className={isHealthChecking ? 'animate-spin' : ''} />
              </Button>
            </div>
          )}
        </div>

        {/* Sub-tab Switcher: Job Match vs Robot Simulation */}
        <div className="ats-subtab-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'match'}
            className={`ats-subtab-btn ${subTab === 'match' ? 'active' : ''}`}
            onClick={() => setSubTab('match')}
          >
            <Target size={14} />
            <span>Job Description Matcher</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'simulate'}
            className={`ats-subtab-btn ${subTab === 'simulate' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('simulate');
              if (!atsSimulation && !isSimulating) {
                simulateAts(project, activeVariant.id);
              }
            }}
          >
            <Bot size={14} />
            <span>ATS Robot Simulator</span>
          </button>
        </div>
      </div>

      {/* 2. SUBTAB: Job Description Matcher */}
      {subTab === 'match' && (
        <div className="ats-content-section">
          {/* Quick JD Samples */}
          <div className="jd-samples-bar">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles size={12} /> Load Sample JD:
            </span>
            {Object.entries(SAMPLE_JDS).map(([key, sample]) => (
              <button
                key={key}
                type="button"
                className="sample-jd-chip"
                onClick={() => setJobDescription(sample.text)}
              >
                {sample.title.split(' ')[0]}
              </button>
            ))}
            {jobDescription && (
              <button
                type="button"
                className="sample-jd-chip text-rose-500 hover:text-rose-600"
                onClick={() => {
                  setJobDescription('');
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Job Description Input */}
          <div className="jd-input-card">
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Paste Target Job Description (Requirements & Responsibilities)
            </label>
            <Textarea
              rows={5}
              placeholder="Paste the job description here to analyze ATS match percentage, detect missing keywords, and verify core skill coverage..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              className="text-xs font-mono"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">
                Analyzing against active draft: <strong>{activeVariant.name}</strong>
              </span>
              <Button
                variant="default"
                size="sm"
                disabled={!jobDescription.trim() || isMatching}
                onClick={handleRunMatch}
                className="gap-1.5"
              >
                {isMatching ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Analyzing Keywords…</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} />
                    <span>Analyze Match & Gaps</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {matchError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{matchError}</span>
            </div>
          )}

          {/* Match Results Display */}
          {matchResult && (
            <div className="match-results-wrapper">
              {/* Top Score Banner */}
              <div className="match-score-card">
                <div className="score-radial-box">
                  <div className="score-number">{matchResult.match_score}%</div>
                  <div className="score-subtext">ATS Match Score</div>
                </div>

                <div className="score-details-box">
                  <div className="score-verdict">
                    {matchResult.match_score >= 80 ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={16} /> Strong ATS Passing Probability
                      </span>
                    ) : matchResult.match_score >= 60 ? (
                      <span className="text-amber-500 flex items-center gap-1 font-semibold">
                        <AlertTriangle size={16} /> Moderate Match · Review Skill Gaps Below
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1 font-semibold">
                        <AlertCircle size={16} /> Low Match · Critical Tech Gaps Detected
                      </span>
                    )}
                  </div>

                  <div className="metrics-row">
                    <div className="metric-pill">
                      <span className="metric-label">Core Skills Match:</span>
                      <strong className="metric-val">
                        {matchResult.skill_match_percentage}% ({matchResult.matched_skills.length}/
                        {matchResult.total_jd_skills})
                      </strong>
                    </div>
                    <div className="metric-pill">
                      <span className="metric-label">Text Context Alignment:</span>
                      <strong className="metric-val">
                        {Math.round(matchResult.semantic_similarity * 100)}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Skills Gap Section (Priority Call-To-Action) */}
              <div className="missing-skills-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-500">
                    <AlertTriangle size={14} />
                    <span>Missing Skills & Keywords ({matchResult.missing_skills.length})</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Click ＋ to automatically add to resume
                  </span>
                </div>

                {matchResult.missing_skills.length === 0 ? (
                  <p className="text-xs text-emerald-500 flex items-center gap-1.5 py-1">
                    <CheckCircle2 size={14} /> Outstanding! No missing required skills from the job description!
                  </p>
                ) : (
                  <div className="missing-skills-grid">
                    {matchResult.missing_skills.map(skill => {
                      const isAdded = addedSkills.has(skill.name);
                      return (
                        <div
                          key={skill.name}
                          className={`missing-skill-item ${isAdded ? 'skill-added' : ''}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs">{skill.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-muted rounded text-muted-foreground">
                              {skill.category}
                            </span>
                          </div>
                          <Button
                            variant={isAdded ? 'secondary' : 'outline'}
                            size="icon-xs"
                            disabled={isAdded}
                            className="h-6 px-2 text-[11px] gap-1"
                            onClick={() => handleAddSkill(skill.name, skill.category)}
                          >
                            {isAdded ? (
                              <>
                                <CheckCircle2 size={11} className="text-emerald-500" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus size={11} />
                                <span>Add</span>
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Matched Skills Section */}
              <div className="matched-skills-card">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                  <CheckCircle2 size={14} />
                  <span>Matched Tech Skills ({matchResult.matched_skills.length})</span>
                </div>
                {matchResult.matched_skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    No overlapping taxonomy skills detected yet.
                  </p>
                ) : (
                  <div className="matched-skills-flex">
                    {matchResult.matched_skills.map(skill => (
                      <span key={skill.name} className="matched-skill-badge">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-[10px] opacity-75">({skill.category})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Breakdown Bars */}
              {Object.keys(matchResult.category_breakdown).length > 0 && (
                <div className="categories-card">
                  <span className="text-xs font-semibold mb-2 block">
                    Domain Alignment Breakdown
                  </span>
                  <div className="category-bars-grid">
                    {Object.entries(matchResult.category_breakdown).map(([cat, stats]) => {
                      const pct =
                        stats.required > 0
                          ? Math.round((stats.matched / stats.required) * 100)
                          : 100;
                      return (
                        <div key={cat} className="category-bar-row">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span>{cat}</span>
                            <span className="font-mono text-muted-foreground">
                              {stats.matched}/{stats.required} ({pct}%)
                            </span>
                          </div>
                          <div className="category-progress-track">
                            <div
                              className="category-progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. SUBTAB: Enterprise ATS Robot Simulator */}
      {subTab === 'simulate' && (
        <div className="ats-content-section">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Bot size={16} /> Enterprise ATS Parser Simulation
              </h4>
              <p className="text-xs text-muted-foreground">
                Simulates how systems like Workday, Greenhouse, and Lever parse contact data, chronology, and plain-text.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isSimulating}
              onClick={handleRunSimulation}
              className="gap-1.5"
            >
              <RefreshCw size={13} className={isSimulating ? 'animate-spin' : ''} />
              <span>Re-Simulate</span>
            </Button>
          </div>

          {simulationError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg mb-3">
              {simulationError}
            </div>
          )}

          {atsSimulation && (
            <div className="simulation-results-wrapper">
              {/* Readiness Score Card */}
              <div className="match-score-card">
                <div className="score-radial-box">
                  <div className="score-number">{atsSimulation.ats_readiness_score}%</div>
                  <div className="score-subtext">ATS Parsability</div>
                </div>
                <div className="score-details-box">
                  <div className="score-verdict">
                    {atsSimulation.ats_readiness_score >= 85 ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                        <ShieldCheck size={16} /> Clean Parse · 0 Fatal Formatting Traps
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1 font-semibold">
                        <AlertTriangle size={16} /> Formatting Traps Detected · See Warnings
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Reverse Chronology Check:{' '}
                    <strong
                      className={
                        atsSimulation.chronological_order_valid
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }
                    >
                      {atsSimulation.chronological_order_valid
                        ? 'Passed (Reverse Chronological)'
                        : 'Review Chronology'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Contact Fields Audit */}
              <div className="contact-audit-card">
                <span className="text-xs font-semibold mb-2 block">
                  Candidate Contact Header Parsing
                </span>
                <div className="contact-audit-grid">
                  <div className="audit-field">
                    <span className="audit-label">Full Name:</span>
                    <strong
                      className={
                        atsSimulation.contact_fields_found.name
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }
                    >
                      {atsSimulation.contact_fields_found.name || 'Missing'}
                    </strong>
                  </div>
                  <div className="audit-field">
                    <span className="audit-label">Email:</span>
                    <strong
                      className={
                        atsSimulation.contact_fields_found.email
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }
                    >
                      {atsSimulation.contact_fields_found.email || 'Missing'}
                    </strong>
                  </div>
                  <div className="audit-field">
                    <span className="audit-label">Phone:</span>
                    <strong
                      className={
                        atsSimulation.contact_fields_found.phone
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }
                    >
                      {atsSimulation.contact_fields_found.phone || 'Missing / Incomplete'}
                    </strong>
                  </div>
                  <div className="audit-field">
                    <span className="audit-label">Location:</span>
                    <strong
                      className={
                        atsSimulation.contact_fields_found.location
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }
                    >
                      {atsSimulation.contact_fields_found.location || 'Missing'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Formatting & Parsing Warnings */}
              {atsSimulation.warnings.length > 0 && (
                <div className="warnings-card">
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={14} /> Identified ATS Traps ({atsSimulation.warnings.length})
                  </span>
                  <ul className="warnings-list">
                    {atsSimulation.warnings.map((warn, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{warn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clean Text Extraction Preview */}
              <div className="clean-text-card">
                <span className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                  <FileText size={14} /> Plain-Text Robot Extraction (Zero Mutilation Check)
                </span>
                <p className="text-[11px] text-muted-foreground mb-2">
                  This is the unformatted text stream the recruiter&apos;s system indexes. Confirm all sections and dates appear cleanly.
                </p>
                <pre className="clean-text-pre">{atsSimulation.extracted_clean_text}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
