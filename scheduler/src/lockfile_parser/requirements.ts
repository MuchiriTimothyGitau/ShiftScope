import { DependencyRecord } from '../types';

const VERSION_SPEC_RE = /^(?<name>[A-Za-z0-9_.-]+)(?:\[(?<extras>[^\]]+)\])?(?<spec>(?:[=!<>~^]+[0-9a-zA-Z.*+-]+,?\s*)*)?(?:\s*#.*)?$/;
const PINNED_RE = /==([0-9][^,\s]*)/;

export function parseRequirementsTxt(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('-') || line.startsWith('--')) {
      continue;
    }

    const m = VERSION_SPEC_RE.exec(line);
    if (!m || !m.groups) continue;

    let name = m.groups.name.toLowerCase().replace(/_/g, '-');
    const spec = (m.groups.spec || '').trim();

    let pinned: string | null = null;
    const pinMatch = PINNED_RE.exec(spec);
    if (pinMatch) {
      pinned = pinMatch[1];
    }

    records.push({
      name,
      ecosystem: 'pypi',
      pinned_version: pinned,
      version_spec: spec,
      is_direct: true,
      is_dev: false,
    });
  }

  return records;
}
