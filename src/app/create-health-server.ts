import { Hono } from 'hono';

export function createHealthServer() {
  const app = new Hono();

  app.get('/', (c) => c.text('ok'));
  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
}
