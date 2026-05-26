import IORedis from 'ioredis';

export interface CacheOptions {
  redisUrl?: string;
  defaultTtlSeconds?: number;
}

export class RegistryCache {
  private client: IORedis;
  private defaultTtl: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTtl = options.defaultTtlSeconds || 43200;
    const url = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  private buildKey(ecosystem: string, packageName: string): string {
    return `shiftscope:registry:${ecosystem.toLowerCase()}:${packageName.toLowerCase()}`;
  }

  async get<T>(ecosystem: string, packageName: string): Promise<T | null> {
    try {
      const key = this.buildKey(ecosystem, packageName);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) as T : null;
    } catch { return null; }
  }

  async set<T>(ecosystem: string, packageName: string, data: T, customTtlSeconds?: number): Promise<void> {
    try {
      const key = this.buildKey(ecosystem, packageName);
      const ttl = customTtlSeconds || this.defaultTtl;
      await this.client.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (err) {
      console.error(`Cache SET failed for ${ecosystem}:${packageName}:`, err);
    }
  }

  async invalidate(ecosystem: string, packageName: string): Promise<void> {
    try {
      const key = this.buildKey(ecosystem, packageName);
      await this.client.del(key);
    } catch (err) {
      console.error(`Cache invalidate failed for ${ecosystem}:${packageName}:`, err);
    }
  }

  async checkRateLimit(clientId: string, limit: number, windowSeconds: number): Promise<{ limited: boolean; remaining: number }> {
    try {
      const key = `shiftscope:ratelimit:${clientId}`;
      const current = await this.client.incr(key);
      if (current === 1) await this.client.expire(key, windowSeconds);
      return { limited: current > limit, remaining: Math.max(0, limit - current) };
    } catch { return { limited: false, remaining: 1 }; }
  }
}
