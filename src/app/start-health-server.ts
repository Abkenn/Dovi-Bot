import { serve } from '@hono/node-server';
import { createHealthServer } from './create-health-server';

export function startHealthServer() {
  const healthServer = createHealthServer();
  const port = Number(process.env.PORT || 8000);

  serve({
    fetch: healthServer.fetch,
    port,
  });

  console.log(`Health server listening on ${port}`);
}
