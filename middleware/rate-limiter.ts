import { Redis } from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  analyze: { windowMs: 60_000, maxRequests: 30 },
  agent: { windowMs: 60_000, maxRequests: 20 },
  admin: { windowMs: 60_000, maxRequests: 10 },
};

export class RateLimiter {
  private redis: Redis;
  private prefix = 'shiftscope:ratelimit';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async check(key: string, tier: keyof typeof DEFAULTS = 'analyze'): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
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

  async middleware(ip: string, tier: keyof typeof DEFAULTS = 'analyze'): Promise<boolean> {
    const result = await this.check(ip, tier);
    if (!result.allowed) {
      console.warn(`Rate limit exceeded for ${tier}:${ip} — reset in ${result.resetMs}ms`);
    }
    return result.allowed;
  }
}
