import { Ecosystem } from './types';
import { registryCircuitBreaker } from './resilience/circuit-breaker';
import { RateLimiter } from './security/rate-limiter';

const REGISTRY_TIMEOUT = parseInt(process.env.REGISTRY_CHECK_TIMEOUT_MS || '5000', 10);

interface RegistryResponse {
  version: string;
}

const cache = new Map<string, { version: string; timestamp: number }>();
const CACHE_TTL = 60_000;

const rateLimiter = new RateLimiter();
rateLimiter.connect().catch(() => {});

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

const registryCheckers: Record<Ecosystem, (name: string) => Promise<string | null>> = {
  npm: checkNpmRegistry,
  pypi: checkPyPIRegistry,
  crates: checkCratesRegistry,
  go: checkGoRegistry,
  gem: checkGemRegistry,
  maven: checkMavenRegistry,
};

export async function checkRegistryVersion(name: string, ecosystem: Ecosystem): Promise<string | null> {
  const cacheKey = `${ecosystem}:${name}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.version;
  }

  const allowed = await rateLimiter.middleware(ecosystem, 'registry');
  if (!allowed) {
    console.warn(`Rate limited: ${ecosystem} registry check for ${name}`);
    return cached?.version ?? null;
  }

  const checker = registryCheckers[ecosystem];
  if (!checker) return null;

  const result = await registryCircuitBreaker.call(
    ecosystem,
    () => checker(name),
    () => {
      console.warn(`Fallback: using cached version for ${name} (${ecosystem} registry may be down)`);
      return cached?.version ?? null;
    },
  );

  if (result) {
    cache.set(cacheKey, { version: result, timestamp: Date.now() });
  }

  return result;
}

export function getRegistryMetrics(): Record<string, { state: string; failures: number; successes: number }> {
  const ecosystems: Ecosystem[] = ['npm', 'pypi', 'crates', 'go', 'gem', 'maven'];
  const metrics: Record<string, any> = {};
  for (const eco of ecosystems) {
    metrics[eco] = registryCircuitBreaker.getMetrics(eco);
  }
  return metrics;
}
