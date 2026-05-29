import { DependencyRecord, Ecosystem } from '../types';
import { parsePackageLock } from './npm';
import { parseRequirementsTxt } from './requirements';
import { parseCargoLock } from './cargo';
import { parseGoSum } from './gosum';

export function parseLockfile(content: string, filename: string): DependencyRecord[] {
  const name = filename.toLowerCase();

  if (name === 'package-lock.json') return parsePackageLock(content);
  if (name === 'requirements.txt') return parseRequirementsTxt(content);
  if (name === 'cargo.lock') return parseCargoLock(content);
  if (name === 'go.sum') return parseGoSum(content);
  if (name === 'yarn.lock') return parseYarnLock(content);
  if (name === 'pnpm-lock.yaml') return parsePnpmLock(content);
  if (name === 'pipfile.lock') return parsePipfileLock(content);
  if (name === 'poetry.lock') return parsePoetryLock(content);
  if (name.endsWith('.gemspec')) return parseGemSpec(content);
  if (name === 'pom.xml' || name.endsWith('pom.xml')) return parsePomXml(content);

  return [];
}

function parseYarnLock(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  const blockRegex = /^"?(.+?)@[^,]+?:\n\s+version\s"?([^"\s]+)"?/gm;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(content)) !== null) {
    const name = match[1].split('@')[0]?.trim() || match[1].trim();
    records.push({
      name,
      ecosystem: 'npm',
      pinned_version: match[2],
      version_spec: '',
      is_direct: !name.includes('/'),
      is_dev: false,
    });
  }
  return records;
}

function parsePnpmLock(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  const depRegex = /^\s+['"](.+?)['"]:\s*\n\s+version:\s(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = depRegex.exec(content)) !== null) {
    const name = match[1].split('/')[0]?.replace(/^@/, '') || match[1];
    records.push({
      name,
      ecosystem: 'npm',
      pinned_version: match[2],
      version_spec: '',
      is_direct: false,
      is_dev: false,
    });
  }
  return records;
}

function parsePipfileLock(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  try {
    const json = JSON.parse(content);
    for (const section of ['default', 'develop']) {
      const deps = json[section] ?? {};
      for (const [name, info] of Object.entries(deps)) {
        records.push({
          name,
          ecosystem: 'pypi',
          pinned_version: (info as any)?.version?.replace(/^==/, '') || null,
          version_spec: (info as any)?.version || '',
          is_direct: true,
          is_dev: section === 'develop',
        });
      }
    }
  } catch { }
  return records;
}

function parsePoetryLock(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  const packageRegex = /\n\[\[package\]\]\nname\s*=\s*"([^"]+)"\nversion\s*=\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = packageRegex.exec(content)) !== null) {
    records.push({
      name: match[1],
      ecosystem: 'pypi',
      pinned_version: match[2],
      version_spec: '',
      is_direct: false,
      is_dev: false,
    });
  }
  return records;
}

function parseGemSpec(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  const depRegex = /\s+s\.add_(?:runtime_|development_)?dependency\s+['"]([^'"]+)['"].*?,?\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = depRegex.exec(content)) !== null) {
    records.push({
      name: match[1],
      ecosystem: 'gem',
      pinned_version: match[2].replace(/^[~>=]+\s*/, ''),
      version_spec: match[2],
      is_direct: true,
      is_dev: content.indexOf('development_dependency') > -1,
    });
  }
  return records;
}

function parsePomXml(content: string): DependencyRecord[] {
  const records: DependencyRecord[] = [];
  const depRegex = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?(?:<version>([^<]*)<\/version>)?[\s\S]*?<scope>([^<]*)<\/scope>[\s\S]*?<\/dependency>/g;
  let match: RegExpExecArray | null;
  while ((match = depRegex.exec(content)) !== null) {
    const scope = match[4] || 'compile';
    records.push({
      name: `${match[1]}:${match[2]}`,
      ecosystem: 'maven',
      pinned_version: match[3] || null,
      version_spec: match[3] || '',
      is_direct: true,
      is_dev: scope === 'test',
    });
  }
  return records;
}
