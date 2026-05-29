import { DependencyRecord } from '../types';

export function parseCargoLock(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  const packageRegex = /\[\[package\]\]\nname\s*=\s*"([^"]+)"\nversion\s*=\s*"([^"]+)"\n(?:.*?\n)*?source\s*=\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = packageRegex.exec(content)) !== null) {
    records.push({
      name: match[1],
      ecosystem: 'crates',
      pinned_version: match[2],
      version_spec: '',
      is_direct: false,
      is_dev: false,
      resolved_url: match[3],
    });
  }

  return records;
}
