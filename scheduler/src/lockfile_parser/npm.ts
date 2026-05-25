import { DependencyRecord } from '../types';

export function parsePackageLock(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  try {
    const json = JSON.parse(content);
    const packages = json.packages ?? {};
    const deps = json.dependencies ?? {};

    for (const [name, info] of Object.entries(packages)) {
      if (name === '') continue;
      const pkg = info as any;
      const depName = name.startsWith('node_modules/') ? name.replace('node_modules/', '') : name;
      const isRootDep = name.startsWith('node_modules/') ? name.split('/').filter(s => s === 'node_modules').length === 1 : true;

      records.push({
        name: depName,
        ecosystem: 'npm',
        pinned_version: pkg.version || null,
        version_spec: '',
        is_direct: isRootDep,
        is_dev: pkg.dev === true,
        resolved_url: pkg.resolved,
        integrity: pkg.integrity,
      });
    }

    for (const [name, info] of Object.entries(deps)) {
      const existing = records.find(r => r.name === name);
      if (!existing) {
        const dep = info as any;
        records.push({
          name,
          ecosystem: 'npm',
          pinned_version: dep.version || null,
          version_spec: '',
          is_direct: true,
          is_dev: dep.dev === true,
          resolved_url: dep.resolved,
          integrity: dep.integrity,
        });
      }
    }
  } catch { }

  return records;
}
