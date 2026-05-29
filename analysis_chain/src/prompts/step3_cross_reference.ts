export function buildStep3Prompt(data: {
  name: string;
  ecosystem: string;
  breaking_changes: any[];
  api_surface_diff: string;
}): string {
  return `
SYSTEM:
You are a senior software engineer performing API compatibility analysis.
Given a list of breaking changes and the package's API surface diff,
identify which breaking changes actually affect consumers of this package version.
Respond ONLY with valid JSON. No markdown fences. No preamble.

USER:
## Package: ${data.name} (${data.ecosystem})

## Breaking changes found:
${JSON.stringify(data.breaking_changes, null, 2)}

## API surface diff:
${data.api_surface_diff.slice(0, 5000)}

From the list above, output a JSON array of breaking changes that are relevant
to consumers of this package. Each entry must include:
  - description: string
  - affected_pattern: string
  - confidence: 'confirmed' | 'likely' | 'possible'

If none are relevant, respond with [].
`.trim();
}
