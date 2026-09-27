import { Redis } from 'ioredis';
import { EventEmitter } from 'node:events';

export const localBus = new EventEmitter();
localBus.setMaxListeners(100);

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let isRedisConnected = false;

// Single shared connection for publishing events
const publisher = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    return Math.min(times * 1000, 10000);
  },
});

publisher.on('connect', () => {
  isRedisConnected = true;
  console.log('[Redis Publisher] Connected to Redis successfully');
});

publisher.on('error', (err) => {
  isRedisConnected = false;
  // Non-crashing error handler for when Redis is offline
});

publisher.on('close', () => {
  isRedisConnected = false;
});

// Attempt background connection
publisher.connect().catch(() => {
  // Offline initially; retryStrategy will attempt reconnects in background
});

export const publishAgentEvent = (event: any) => {
  // Always emit to local event bus for in-memory listeners
  localBus.emit('agent_updates', event);

  if (isRedisConnected) {
    publisher.publish('agent_updates', JSON.stringify(event)).catch(() => {});
  }
};

export const publishDeviceEvent = (event: any) => {
  // Always emit to local event bus for in-memory listeners
  localBus.emit('device_updates', event);

  if (isRedisConnected) {
    publisher.publish('device_updates', JSON.stringify(event)).catch(() => {});
  }
};

