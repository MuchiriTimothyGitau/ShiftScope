export function buildStep4Prompt(data: {
  breaking_change: any;
  ecosystem: string;
  usage_context: string;
}): string {
  return `
SYSTEM:
You are a code migration expert. Given a breaking API change and a usage pattern,
you produce a precise before/after code diff that fixes the issue.
Respond ONLY with valid JSON. No markdown. No explanation outside the JSON fields.

USER:
## Breaking change:
${data.breaking_change.description || data.breaking_change}

## Affected pattern: ${data.breaking_change.affected_pattern || 'unknown'}

## Ecosystem: ${data.ecosystem}

## Inferred usage (from API surface diff):
${data.usage_context.slice(0, 3000)}

Generate a fix object with these fields:
  - before_code: string — the line(s) of code that need to change
  - after_code: string — the replacement line(s)
  - fix_description: string — one sentence explaining the change
  - file_hint: string | null — which file type this is most likely in
  - estimated_minutes: number — realistic fix time for a mid-level engineer

Respond with a single JSON object only.
`.trim();
}
