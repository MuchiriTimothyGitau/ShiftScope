import { createServer, IncomingMessage, ServerResponse } from 'http';
import { getClusterHealth } from './monitor';

const PORT = parseInt(process.env.HEALTH_PORT || '9090', 10);

export function startHealthServer(): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health') {
      try {
        const health = await getClusterHealth();
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), ...health }));
      } catch (err) {
        res.writeHead(503);
        res.end(JSON.stringify({ status: 'degraded', error: String(err) }));
      }
    } else if (req.url === '/metrics') {
      try {
        const health = await getClusterHealth();
        const lines: string[] = [];
        for (const [queue, len] of Object.entries(health.queue_lengths || {})) {
          lines.push(`shiftscope_queue_depth{queue="${queue}"} ${len}`);
        }
        res.writeHead(200);
        res.end(lines.join('\n'));
      } catch {
        res.writeHead(503);
        res.end('');
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'not found' }));
    }
  });

  server.listen(PORT, () => {
    console.log(`Health server listening on :${PORT}`);
  });
}
