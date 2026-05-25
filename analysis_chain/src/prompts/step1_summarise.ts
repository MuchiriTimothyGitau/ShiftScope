export function buildStep1Prompt(data: {
  name: string;
  old_version: string;
  new_version: string;
  changelog_text: string;
}): string {
  return `
SYSTEM:
You are a senior software engineer summarising release notes.
Summarise what changed between versions in plain English.
Keep it concise — max 120 words.

USER:
Package: ${data.name}
From: ${data.old_version}
To:   ${data.new_version}

Changelog:
${data.changelog_text.slice(0, 8000)}

Write a plain-English summary of what changed.
`.trim();
}
