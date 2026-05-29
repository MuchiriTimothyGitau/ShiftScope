import { describe, it, expect } from 'vitest';
import { parseLockfile } from '../src/lockfile_parser';

describe('Lockfile Parser', () => {
  it('parses package-lock.json v3 correctly', () => {
    const raw = JSON.stringify({
      packages: {
        '': { name: 'test' },
        'node_modules/axios': { version: '1.6.8', dev: false, resolved: 'https://registry.npmjs.org/axios/-/axios-1.6.8.tgz', integrity: 'sha512-...' },
      },
      dependencies: {
        axios: { version: '1.6.8', resolved: 'https://registry.npmjs.org/axios/-/axios-1.6.8.tgz', integrity: 'sha512-...' },
      },
    });
    const result = parseLockfile(raw, 'package-lock.json');
    expect(result).toContainEqual(expect.objectContaining({
      name: 'axios', ecosystem: 'npm', pinned_version: '1.6.8', is_direct: true
    }));
  });

  it('parses requirements.txt with pinned and unpinned deps', () => {
    const raw = 'requests==2.31.0\nflask>=3.0.0\n# comment\n-r other.txt\n';
    const result = parseLockfile(raw, 'requirements.txt');
    expect(result.find(d => d.name === 'requests')?.pinned_version).toBe('2.31.0');
    expect(result.find(d => d.name === 'flask')?.pinned_version).toBeNull();
  });

  it('handles empty lockfile without throwing', () => {
    expect(() => parseLockfile('', 'package-lock.json')).not.toThrow();
    expect(() => parseLockfile('', 'requirements.txt')).not.toThrow();
  });

  it('parses Cargo.lock correctly', () => {
    const raw = `[[package]]
name = "serde"
version = "1.0.197"
source = "registry+https://github.com/rust-lang/crates.io-index"`;
    const result = parseLockfile(raw, 'Cargo.lock');
    expect(result).toContainEqual(expect.objectContaining({
      name: 'serde', ecosystem: 'crates', pinned_version: '1.0.197'
    }));
  });

  it('parses go.sum correctly', () => {
    const raw = `golang.org/x/text v0.3.0 h1:g61tztE5qeGQ89tm6NTjjM9VPIm088V1QmR6ZQwA1WI=
golang.org/x/tools v0.1.0 h1:po9/4sTYwEW9gQ5qP9R1dM2U+rQ6WzV3U6UjWX4iFN0=`;
    const result = parseLockfile(raw, 'go.sum');
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('golang.org/x/text');
    expect(result[0].ecosystem).toBe('go');
  });

  it('returns empty array for unknown format', () => {
    const result = parseLockfile('some content', 'unknown.file');
    expect(result).toEqual([]);
  });
});
