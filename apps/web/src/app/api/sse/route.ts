import { NextRequest } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const mcpServerUrl = process.env.AGENT_API_URL || 'http://127.0.0.1:8080';

  let subscriber: Redis | null = null;
  let heartbeat: NodeJS.Timeout | null = null;
  let mcpAbortController: AbortController | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Stream might have been closed by client
        }
      };

      // Initial connection ping
      safeEnqueue(': connected\n\n');

      // 1. Setup heartbeat to keep connection alive
      heartbeat = setInterval(() => {
        safeEnqueue(': heartbeat\n\n');
      }, 15000);

      // 2. Connect to Redis with non-crashing error handler
      try {
        subscriber = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy(times) {
            return Math.min(times * 1000, 10000);
          },
        });

        subscriber.on('error', () => {
          // Prevent unhandled error event crash when Redis is offline
        });

        subscriber.on('message', (channel, message) => {
          safeEnqueue(`event: ${channel}\ndata: ${message}\n\n`);
        });

        subscriber
          .connect()
          .then(() => {
            subscriber?.subscribe('agent_updates', 'device_updates').catch(() => {});
          })
          .catch(() => {
            // Redis offline; direct MCP server event stream handles it
          });
      } catch {
        // Safe catch
      }

      // 3. Connect to MCP Server SSE directly as fallback / local event bridge
      mcpAbortController = new AbortController();
      (async () => {
        try {
          const res = await fetch(`${mcpServerUrl}/agent/events`, {
            signal: mcpAbortController.signal,
            headers: { Accept: 'text/event-stream' },
          });

          if (res.ok && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              safeEnqueue(chunk);
            }
          }
        } catch {
          // MCP server stream ended or disconnected
        }
      })();

      const cleanup = () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (mcpAbortController) {
          mcpAbortController.abort();
          mcpAbortController = null;
        }
        if (subscriber) {
          subscriber.unsubscribe().catch(() => {});
          subscriber.disconnect(false);
          subscriber = null;
        }
      };

      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (mcpAbortController) mcpAbortController.abort();
      if (subscriber) {
        subscriber.unsubscribe().catch(() => {});
        subscriber.disconnect(false);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

