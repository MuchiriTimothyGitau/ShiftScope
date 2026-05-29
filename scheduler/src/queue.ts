import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const scrapeQueue = new Queue('scrape', { connection });
export const analysisQueue = new Queue('analysis', { connection });
export const deliveryQueue = new Queue('delivery', { connection });

export function createWorker(
  queueName: string,
  handler: (job: any) => Promise<void>,
  concurrency = 5
): Worker {
  return new Worker(queueName, async (job) => {
    await handler(job);
  }, {
    connection,
    concurrency,
    lockDuration: 60_000,
  });
}
