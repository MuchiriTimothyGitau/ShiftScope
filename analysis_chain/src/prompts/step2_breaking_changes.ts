export function buildStep2Prompt(data: {
  name: string;
  old_version: string;
  new_version: string;
  summary: string;
  changelog_text: string;
  issues_text: string;
  community_snippets: string;
}): string {
  return `
SYSTEM:
You are a senior software engineer specialising in API compatibility analysis.
You read changelogs, release notes, and GitHub issues to extract breaking changes.
You respond ONLY with valid JSON. No markdown fences. No preamble.

USER:
## Package: ${data.name} — version ${data.old_version} to ${data.new_version}

## Summary of changes
${data.summary}

## Changelog
${data.changelog_text.slice(0, 10000)}

## Linked GitHub issues (titles and first comment):
${data.issues_text.slice(0, 5000)}

## Community signals:
${data.community_snippets.slice(0, 3000)}

Extract ALL breaking changes. For each, output a JSON object with these fields:
  - description: string — plain English explanation of what changed
  - affected_pattern: string — the API/option/behaviour that changed
  - migration_note: string — how to update code to the new API
  - confidence: 'confirmed' | 'likely' | 'possible'
  - source_url: string | null

Respond with a JSON array only. If no breaking changes, respond with [].
`.trim();
}
