import { env } from '@zod-schemas/env.zod';

const MEMORY_LOG_INTERVAL_MS = 5 * 60 * 1000;

const toMegabytes = (bytes: number) => Math.round(bytes / 1024 / 1024);

const logMemoryUsage = () => {
  const memory = process.memoryUsage();

  console.log(
    [
      'Memory usage',
      `rss=${toMegabytes(memory.rss)}MB`,
      `heapUsed=${toMegabytes(memory.heapUsed)}MB`,
      `heapTotal=${toMegabytes(memory.heapTotal)}MB`,
      `external=${toMegabytes(memory.external)}MB`,
      `arrayBuffers=${toMegabytes(memory.arrayBuffers)}MB`,
    ].join(' '),
  );
};

export const startMemoryLogger = () => {
  if (!env.ENABLE_MEMORY_LOGGING) {
    return;
  }

  logMemoryUsage();

  const interval = setInterval(logMemoryUsage, MEMORY_LOG_INTERVAL_MS);
  interval.unref();
};
