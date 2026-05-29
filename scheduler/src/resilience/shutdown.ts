// Graceful shutdown for all workers — drains jobs before exiting.

import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';

interface Shutdownable {
  close?: () => Promise<void>;
  disconnect?: () => Promise<void>;
}

const shutdownHandlers: (() => Promise<void>)[] = [];

export function registerShutdown(handler: () => Promise<void>): void {
  shutdownHandlers.push(handler);
}

export function registerWorkerShutdown(worker: Worker): void {
  registerShutdown(async () => {
    console.log(`Draining worker: ${worker.name}...`);
    await worker.close(true);
    console.log(`Worker ${worker.name} closed`);
  });
}

export function registerQueueShutdown(queue: Queue): void {
  registerShutdown(async () => {
    console.log(`Closing queue: ${queue.name}...`);
    await queue.close();
  });
}

export function registerRedisShutdown(redis: IORedis): void {
  registerShutdown(async () => {
    console.log('Disconnecting Redis...');
    await redis.quit();
  });
}

export function setupGracefulShutdown(): void {
  const handleSignal = async (signal: string) => {
    console.log(`\nReceived ${signal} — starting graceful shutdown...`);

    const timeout = setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30_000);

    try {
      for (const handler of shutdownHandlers) {
        try {
          await handler();
        } catch (err) {
          console.error('Shutdown handler error:', err);
        }
      }
      console.log('Graceful shutdown complete');
    } finally {
      clearTimeout(timeout);
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    handleSignal('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}
