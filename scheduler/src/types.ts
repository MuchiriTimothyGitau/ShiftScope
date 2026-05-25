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
