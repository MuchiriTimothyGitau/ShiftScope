export type Ecosystem = 'npm' | 'pypi' | 'crates' | 'go' | 'gem' | 'maven';

export interface DependencyRecord {
  name: string;
  ecosystem: Ecosystem;
  pinned_version: string | null;
  version_spec: string;
  is_direct: boolean;
  is_dev: boolean;
  resolved_url?: string;
  integrity?: string;
}

export interface ScrapeJobPayload {
  dep_id: string;
  dep_name: string;
  ecosystem: Ecosystem;
  old_version: string;
  new_version: string;
  risk_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  typosquat_warning?: string[];
}

export interface AnalysisJob {
  id: string;
  scrape_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface AnalysisJobPayload {
  scrape_id: string;
}

export interface DeliveryJobPayload {
  brief_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ImpactBrief {
  dep_name: string;
  old_version: string;
  new_version: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  breaking_changes: BreakingChange[];
  pre_cve_signals: PreCveSignal[];
  estimated_fix_minutes: number;
  safe_to_upgrade: boolean;
  chain_trace: ChainTrace;
  risk_assessment?: RiskAssessment;
  trend_signals?: TrendSignal[];
  upgrade_sentiment?: 'positive' | 'negative' | 'mixed' | 'unknown';
}

export interface RiskAssessment {
  overall_risk_score: number;
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
  malware_indicators: MalwareIndicator[];
  supply_chain_indicators: SupplyChainIndicator[];
  typosquat_result: {
    is_suspicious: boolean;
    lookalike_of: string | null;
    signals: string[];
  } | null;
}

export interface RiskSignal {
  category: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  score: number;
}

export interface MalwareIndicator {
  type: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface SupplyChainIndicator {
  type: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface TrendSignal {
  category: string;
  signal: string;
  frequency: string;
  sources: string[];
  extracted_at: string;
}

export interface TrendAnalysis {
  dep_name: string;
  ecosystem: string;
  community_sentiment: 'positive' | 'negative' | 'mixed' | 'unknown';
  common_issues: string[];
  migration_patterns: string[];
  risk_trend: 'improving' | 'stable' | 'deteriorating' | 'unknown';
  upgrade_recommendation: 'safe' | 'cautious' | 'avoid' | 'investigate';
  supporting_evidence: string[];
}

export interface BreakingChange {
  description: string;
  affected_pattern: string;
  before_code: string;
  after_code: string;
  fix_description: string;
  file_hint: string | null;
  estimated_minutes: number;
}

export interface PreCveSignal {
  url: string;
  title: string;
  date: string;
  credibility_score: number;
}

export interface ChainTrace {
  step1?: PromptResponse;
  step2?: PromptResponse;
  step3?: PromptResponse;
  step4?: { fixes: any[] };
  step5?: PromptResponse;
  step6?: PromptResponse;
  step7?: PromptResponse;
}

export interface PromptResponse {
  prompt: string;
  response: string;
}

export interface ScrapeBundle {
  dep_name: string;
  old_version: string;
  new_version: string;
  ecosystem: Ecosystem;
  changelog_text: string;
  issues_text: string;
  community_snippets: string;
  preCvuSignals: PreCveSignal[];
}
