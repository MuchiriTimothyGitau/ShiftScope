// Sliding-window rate limiter backed by Redis.

import IORedis from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  webhook: { windowMs: 60_000, maxRequests: 30 },
  registry: { windowMs: 60_000, maxRequests: 60 },
  api: { windowMs: 60_000, maxRequests: 100 },
};

export class RateLimiter {
  private redis: IORedis;
  private prefix = 'shiftscope:ratelimit';

  constructor(redis?: IORedis) {
    this.redis = redis || new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  async connect(): Promise<void> {
    if (this.redis.status === 'wait') await this.redis.connect();
  }

  async check(key: string, tier: keyof typeof DEFAULTS = 'api'): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const config = DEFAULTS[tier];
    const now = Date.now();
    const windowKey = `${this.prefix}:${tier}:${key}`;

    await this.redis.zremrangebyscore(windowKey, 0, now - config.windowMs);
    const count = await this.redis.zcard(windowKey);
    const allowed = count < config.maxRequests;

    if (allowed) {
      await this.redis.zadd(windowKey, now, `${now}:${Math.random()}`);
      await this.redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }

    const oldest = await this.redis.zrange(windowKey, 0, 0, 'WITHSCORES');
    const resetMs = oldest.length >= 2
      ? Math.max(0, config.windowMs - (now - parseInt(oldest[1])))
      : 0;

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - count - (allowed ? 1 : 0)),
      resetMs,
    };
  }

  async middleware(key: string, tier: keyof typeof DEFAULTS = 'api'): Promise<boolean> {
    const result = await this.check(key, tier);
    if (!result.allowed) {
      console.warn(`Rate limit exceeded for ${tier}:${key} — reset in ${result.resetMs}ms`);
    }
    return result.allowed;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
