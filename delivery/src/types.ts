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
  chain_trace: Record<string, unknown>;
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
