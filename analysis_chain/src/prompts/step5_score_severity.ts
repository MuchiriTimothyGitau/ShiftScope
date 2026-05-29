export function buildStep5Prompt(data: {
  summary: string;
  fixes: any[];
  pre_cve_signals: any[];
}): string {
  return `
SYSTEM:
You are a security and impact scoring specialist.
Given a change summary, fix diffs, and pre-CVE signals,
score the overall severity of upgrading this dependency.
Respond ONLY with valid JSON. No markdown fences. No preamble.

USER:
## Summary of changes
${data.summary}

## Breaking changes with fixes:
${JSON.stringify(data.fixes, null, 2)}

## Pre-CVE signals:
${JSON.stringify(data.pre_cve_signals, null, 2)}

Respond with a single JSON object with these fields:
  - severity: 'critical' | 'high' | 'medium' | 'low'
  - estimated_fix_minutes: number
  - safe_to_upgrade: boolean
  - rationale: string — one sentence explaining the score
`.trim();
}
