import { Ecosystem } from './types';

const REGISTRY_TIMEOUT = parseInt(process.env.REGISTRY_CHECK_TIMEOUT_MS || '5000', 10);

interface RegistryResponse {
  version: string;
}

const cache = new Map<string, { version: string; timestamp: number }>();
const CACHE_TTL = 60_000;

export async function checkRegistryVersion(name: string, ecosystem: Ecosystem): Promise<string | null> {
  const cacheKey = `${ecosystem}:${name}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.version;
  }

  try {
    let version: string | null = null;

    switch (ecosystem) {
      case 'npm':
        version = await checkNpmRegistry(name);
        break;
      case 'pypi':
        version = await checkPyPIRegistry(name);
        break;
      case 'crates':
        version = await checkCratesRegistry(name);
        break;
      case 'go':
        version = await checkGoRegistry(name);
        break;
      case 'gem':
        version = await checkGemRegistry(name);
        break;
      case 'maven':
        version = await checkMavenRegistry(name);
        break;
    }

    if (version) {
      cache.set(cacheKey, { version, timestamp: Date.now() });
    }

    return version;
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REGISTRY_TIMEOUT);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    return resp.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkNpmRegistry(name: string): Promise<string | null> {
  const data = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
  return data?.version ?? null;
}

async function checkPyPIRegistry(name: string): Promise<string | null> {
  const data = await fetchJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  return data?.info?.version ?? null;
}

async function checkCratesRegistry(name: string): Promise<string | null> {
  const data = await fetchJson(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`);
  return data?.crate?.max_stable_version ?? null;
}

async function checkGoRegistry(name: string): Promise<string | null> {
  const data = await fetchJson(`https://proxy.golang.org/${encodeURIComponent(name)}/@latest`);
  return data?.Version ?? null;
}

async function checkGemRegistry(name: string): Promise<string | null> {
  const data = await fetchJson(`https://rubygems.org/api/v1/versions/${encodeURIComponent(name)}/latest.json`);
  return data?.version ?? null;
}

async function checkMavenRegistry(name: string): Promise<string | null> {
  const [group, artifact] = name.split(':');
  if (!group || !artifact) return null;
  const groupPath = group.replace(/\./g, '/');
  const data = await fetchJson(
    `https://search.maven.org/solrsearch/select?q=g:${encodeURIComponent(group)}+AND+a:${encodeURIComponent(artifact)}&rows=1&wt=json`
  );
  return data?.response?.docs?.[0]?.latestVersion ?? null;
}
