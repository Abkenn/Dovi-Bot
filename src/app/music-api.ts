import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { routePath } from 'hono/route';
import { musicRouter } from './music-rpc';

export const createMusicApi = () => {
  const api = new Hono();
  api.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    await next();
  });
  api.onError((error, c) => {
    console.error('Music activity request failed.', error);
    return c.json(
      { error: 'Music is unavailable right now. Try again shortly.' },
      503,
    );
  });
  const rpc = new RPCHandler(musicRouter);
  api.all('/rpc/*', async (c) => {
    const prefix = `/${routePath(c).slice(1, -2)}` as const;
    const result = await rpc.handle(c.req.raw, { prefix });
    if (result.matched)
      return c.newResponse(result.response.body, result.response);
    return c.notFound();
  });
  return api;
};
