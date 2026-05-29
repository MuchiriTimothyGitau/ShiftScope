import { Ecosystem } from './types';

export class VersionComparator {
  private static parseParts(v: string): number[] {
    return v.replace(/[^0-9.]/g, '').split('.').map(Number);
  }

  private static sanitizePythonVersion(v: string): string {
    let clean = v.trim();
    clean = clean.replace(/\.post(\d+)/i, '+post$1');
    clean = clean.replace(/\.dev(\d+)/i, '-dev.$1');
    clean = clean.replace(/\.?a(\d+)/i, '-alpha.$1');
    clean = clean.replace(/\.?b(\d+)/i, '-beta.$1');
    clean = clean.replace(/\.?rc(\d+)/i, '-rc.$1');
    const parts = clean.split(/[+-]/)[0].split('.');
    if (parts.length === 2) clean = clean.replace(/^(\d+\.\d+)/, '$1.0');
    else if (parts.length === 1) clean = clean.replace(/^(\d+)/, '$1.0.0');
    return clean;
  }

  private static sanitizeMavenVersion(v: string): string {
    let clean = v.trim();
    clean = clean.replace(/\.(final|release)/i, '');
    clean = clean.replace(/-SNAPSHOT/i, '-snapshot');
    clean = clean.replace(/\.RC(\d+)/i, '-rc.$1');
    const base = clean.split('-')[0];
    const parts = base.split('.');
    if (parts.length === 2) clean = clean.replace(/^(\d+\.\d+)/, '$1.0');
    else if (parts.length === 1) clean = clean.replace(/^(\d+)/, '$1.0.0');
    return clean;
  }

  static sanitize(version: string, ecosystem: Ecosystem): string {
    try {
      const v = version.replace(/^v/, '').trim();
      switch (ecosystem) {
        case 'pypi': return this.sanitizePythonVersion(v);
        case 'maven': return this.sanitizeMavenVersion(v);
        default: {
          const parts = v.split(/[+-]/)[0].split('.');
          while (parts.length < 3) parts.push('0');
          return parts.slice(0, 3).join('.');
        }
      }
    } catch { return version; }
  }

  static isUpgrade(pinned: string, latest: string, ecosystem: Ecosystem): boolean {
    if (pinned === latest) return false;
    const a = this.parseParts(this.sanitize(pinned, ecosystem));
    const b = this.parseParts(this.sanitize(latest, ecosystem));
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const na = a[i] ?? 0;
      const nb = b[i] ?? 0;
      if (nb > na) return true;
      if (nb < na) return false;
    }
    return false;
  }

  static diffType(pinned: string, latest: string, ecosystem: Ecosystem): 'major' | 'minor' | 'patch' | 'prerelease' | 'none' {
    if (!this.isUpgrade(pinned, latest, ecosystem)) return 'none';
    const a = this.parseParts(this.sanitize(pinned, ecosystem));
    const b = this.parseParts(this.sanitize(latest, ecosystem));
    if (b[0] > a[0]) return 'major';
    if (b[1] > a[1]) return 'minor';
    if (b[2] > a[2]) return 'patch';
    return 'prerelease';
  }
}
