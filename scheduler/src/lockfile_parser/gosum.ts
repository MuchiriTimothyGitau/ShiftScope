import { DependencyRecord } from '../types';

export function parseGoSum(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  const lineRegex = /^(\S+)\s+(v\S+)\s+(\S+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = lineRegex.exec(content)) !== null) {
    records.push({
      name: match[1],
      ecosystem: 'go',
      pinned_version: match[2],
      version_spec: '',
      is_direct: false,
      is_dev: false,
      resolved_url: match[1],
      integrity: match[3],
    });
  }

  return records;
}
