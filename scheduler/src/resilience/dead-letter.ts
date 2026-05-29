// Dead letter queue — collects failed jobs for inspection and replay.

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const deadLetterQueue = new Queue('dead-letter', { connection });

export interface DeadLetterEntry {
  originalQueue: string;
  originalJobId: string;
  data: any;
  error: string;
  failedAt: string;
  retryCount: number;
}

export async function sendToDeadLetter(
  originalQueue: string,
  jobId: string | undefined,
  data: any,
  error: Error,
  retryCount: number = 0,
): Promise<void> {
  const entry: DeadLetterEntry = {
    originalQueue,
    originalJobId: jobId || 'unknown',
    data,
    error: error.message,
    failedAt: new Date().toISOString(),
    retryCount,
  };

  await deadLetterQueue.add('failed-job', entry, {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  });

  console.warn(`[Dead Letter] ${originalQueue}/${jobId} — ${error.message}`);
}

export async function replayDeadLetter(jobId: string, targetQueue: Queue): Promise<void> {
  const job = await deadLetterQueue.getJob(jobId);
  if (!job) throw new Error(`Dead letter job ${jobId} not found`);

  const entry = job.data as DeadLetterEntry;
  await targetQueue.add(entry.originalQueue, entry.data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

  await job.remove();
  console.log(`Replayed ${entry.originalQueue}/${entry.originalJobId} to ${targetQueue.name}`);
}
