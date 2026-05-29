import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export class WorkerMonitor {
  private redis: IORedis;
  private workerName: string;
  private prefix: string;

  constructor(workerName: string) {
    this.redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true });
    this.workerName = workerName;
    this.prefix = `shiftscope:monitor:${workerName}`;
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async recordJobStart(jobId: string): Promise<void> {
    const now = Date.now();
    await this.redis.hset(`${this.prefix}:active`, jobId, now);
    await this.redis.hincrby(`${this.prefix}:counters`, 'started', 1);
  }

  async recordJobComplete(jobId: string, durationMs: number): Promise<void> {
    await this.redis.hdel(`${this.prefix}:active`, jobId);
    await this.redis.hincrby(`${this.prefix}:counters`, 'completed', 1);
    await this.redis.rpush(`${this.prefix}:durations`, durationMs);
    await this.redis.ltrim(`${this.prefix}:durations`, -100, -1);
  }

  async recordJobFailed(jobId: string, error: string): Promise<void> {
    await this.redis.hdel(`${this.prefix}:active`, jobId);
    await this.redis.hincrby(`${this.prefix}:counters`, 'failed', 1);
    await this.redis.lpush(`${this.prefix}:errors`, `${Date.now()}: ${error}`);
    await this.redis.ltrim(`${this.prefix}:errors`, 0, 49);
  }

  async getStats(): Promise<{
    worker: string;
    active_jobs: number;
    started: number;
    completed: number;
    failed: number;
    recent_durations_ms: number[];
    recent_errors: string[];
    health: 'healthy' | 'degraded' | 'down';
  }> {
    const active = await this.redis.hgetall(`${this.prefix}:active`);
    const counters = await this.redis.hgetall(`${this.prefix}:counters`);
    const durations = (await this.redis.lrange(`${this.prefix}:durations`, 0, -1)).map(Number);
    const errors = await this.redis.lrange(`${this.prefix}:errors`, 0, 4);
    const failed = parseInt(counters.failed || '0', 10);
    const completed = parseInt(counters.completed || '0', 10);
    const total = failed + completed;

    let health: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (total > 10 && failed / total > 0.2) health = 'degraded';
    if (total > 0 && failed / total > 0.5) health = 'down';

    return {
      worker: this.workerName,
      active_jobs: Object.keys(active).length,
      started: parseInt(counters.started || '0', 10),
      completed,
      failed,
      recent_durations_ms: durations,
      recent_errors: errors,
      health,
    };
  }

  async getAggregateStats(): Promise<string> {
    const stats = await this.getStats();
    return [
      `[${stats.worker}]`,
      `Active: ${stats.active_jobs}`,
      `Completed: ${stats.completed}`,
      `Failed: ${stats.failed}`,
      `Health: ${stats.health}`,
      stats.recent_durations_ms.length > 0
        ? `Avg duration: ${Math.round(stats.recent_durations_ms.reduce((a, b) => a + b, 0) / stats.recent_durations_ms.length)}ms`
        : '',
    ].filter(Boolean).join(' | ');
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export async function getClusterHealth(): Promise<Record<string, any>> {
  const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true });
  await redis.connect();
  try {
    const info = await redis.info();
    const queueLengths: Record<string, number> = {};
    const queues = ['scrape', 'analysis', 'delivery'];
    for (const q of queues) {
      const len = await redis.llen(`bull:${q}:wait`);
      queueLengths[q] = len;
    }
    return { redis_info: info.slice(0, 500), queue_lengths: queueLengths };
  } finally {
    await redis.quit();
  }
}
