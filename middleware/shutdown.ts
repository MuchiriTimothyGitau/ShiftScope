import type { Redis } from 'ioredis';
import type { Queue, Worker } from 'bullmq';
import type { Server } from 'http';

const shutdownHandlers: (() => Promise<void>)[] = [];

export function registerShutdown(handler: () => Promise<void>): void {
  shutdownHandlers.push(handler);
}

export function registerServerShutdown(server: Server): void {
  registerShutdown(async () => {
    console.log('Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
}

export function registerRedisShutdown(redis: Redis): void {
  registerShutdown(async () => {
    console.log('Disconnecting Redis...');
    await redis.quit();
  });
}

export function registerQueueShutdown(queue: Queue): void {
  registerShutdown(async () => {
    console.log(`Closing queue: ${queue.name}...`);
    await queue.close();
  });
}

export function registerWorkerShutdown(worker: Worker): void {
  registerShutdown(async () => {
    console.log(`Draining worker: ${worker.name}...`);
    await worker.close(true);
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
        try { await handler(); }
        catch (err) { console.error('Shutdown handler error:', err); }
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
