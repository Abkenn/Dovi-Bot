import { serve } from '@hono/node-server';
import { env } from '@zod-schemas/env.zod';
import { createHealthServer } from './create-health-server';

export function startHealthServer() {
  const healthServer = createHealthServer();

  serve({
    fetch: healthServer.fetch,
    port: env.PORT,
  });

  console.log(`Health server listening on ${env.PORT}`);
}
