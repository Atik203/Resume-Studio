export interface BulletAnalysis {
  bullet: string;
  score: number;
  verb_strength: 'strong' | 'moderate' | 'weak';
  action_verb: string | null;
  has_metrics: boolean;
  metrics_found: string[];
  has_methodology: boolean;
  suggestions: string[];
  breakdown: {
    action_verb: number;
    metrics: number;
    methodology: number;
    brevity: number;
  };
}

export interface SkillMatch {
  name: string;
  category: string;
  count_in_resume: number;
  count_in_jd: number;
}

export interface MissingSkill {
  name: string;
  category: string;
  importance: 'high' | 'medium';
  count_in_jd: number;
}

export interface CategoryStats {
  required: number;
  matched: number;
}

export interface JobMatchResult {
  match_score: number;
  semantic_similarity: number;
  skill_match_percentage: number;
  matched_skills: SkillMatch[];
  missing_skills: MissingSkill[];
  resume_skills_detected: string[];
  total_jd_skills: number;
  category_breakdown: Record<string, CategoryStats>;
}

export interface AtsSimulationResult {
  ats_readiness_score: number;
  contact_fields_found: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    links_count: number;
  };
  parsed_sections: Array<{
    sectionId: string;
    heading: string;
    entry_count: number;
    bullets_count: number;
  }>;
  chronological_order_valid: boolean;
  warnings: string[];
  extracted_clean_text: string;
}

export interface MLServiceHealth {
  status: 'online' | 'offline';
  service?: string;
  version?: string;
  skills_in_taxonomy?: number;
  message?: string;
}
