import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ request: vi.fn() }));

import { musicEndpoint } from '@modules/music/music-endpoint';
import { createQueries } from 'orpc-stack/client';
import { kyTransport } from 'orpc-stack/ky';

const musicQueries = createQueries(musicEndpoint, { fetch: kyTransport });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', http.request);
});
afterEach(() => vi.unstubAllGlobals());

it('loads validated RPC facts and preserves missing catalogs', async () => {
  http.request
    .mockResolvedValueOnce(
      Response.json({ json: { track: null, series: null } }),
    )
    .mockResolvedValueOnce(Response.json({ json: null }));
  expect(await musicQueries.facts.call()).toEqual({
    track: null,
    series: null,
  });
  expect(await musicQueries.facts.call()).toBeNull();
  expect(http.request.mock.calls[0]?.[0].url).toContain('/api/music/rpc/facts');
});

it('uses the installed Ky adapter for typed RPC pages without transport retries', async () => {
  const controller = new AbortController();
  const bodies: unknown[] = [];
  http.request.mockImplementation(async (request: Request) => {
    bodies.push(await request.clone().json());
    return Response.json({ json: { results: [], total: 0, nextCursor: null } });
  });
  expect(
    await musicQueries.searchPage.call(
      { query: 'A & B', game: true, cursor: 20 },
      { signal: controller.signal },
    ),
  ).toEqual({ results: [], total: 0, nextCursor: null });
  const request: unknown = http.request.mock.calls[0]?.[0];
  expect(request).toBeInstanceOf(Request);
  if (!(request instanceof Request)) throw new Error('Expected an RPC Request');
  expect(request.url).toContain('/api/music/rpc/searchPage');
  expect(bodies[0]).toEqual({
    json: { query: 'A & B', game: true, cursor: 20 },
  });
  expect(http.request).toHaveBeenCalledOnce();
  expect(request.signal.aborted).toBe(false);
});

it('rejects malformed facts and pages at the browser boundary', async () => {
  http.request
    .mockResolvedValueOnce(Response.json({ json: 'wrong' }))
    .mockResolvedValueOnce(
      Response.json({ json: { results: [], total: -1, nextCursor: null } }),
    );
  await expect(musicQueries.facts.call()).rejects.toThrow();
  await expect(
    musicQueries.searchPage.call({ query: 'Theme', game: false, cursor: 0 }),
  ).rejects.toThrow();
});

it('propagates transport failures', async () => {
  http.request.mockRejectedValue(new Error('Unavailable'));
  await expect(musicQueries.facts.call()).rejects.toThrow('Unavailable');
  await expect(
    musicQueries.searchPage.call({ query: 'Theme', game: false, cursor: 0 }),
  ).rejects.toThrow('Unavailable');
});

it('aborts an in-flight request through the installed Ky transport', async () => {
  const controller = new AbortController();
  http.request.mockImplementation(
    (request: Request) =>
      new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener(
          'abort',
          () => reject(request.signal.reason),
          { once: true },
        );
      }),
  );
  const pending = musicQueries.facts.call(undefined, {
    signal: controller.signal,
  });
  const rejected = expect(pending).rejects.toThrow();
  await vi.waitFor(() => expect(http.request).toHaveBeenCalledOnce());
  controller.abort();
  await rejected;
  expect(http.request.mock.calls[0]?.[0].signal.aborted).toBe(true);
});

it('preserves RPC error responses without Ky HTTP throwing or retries', async () => {
  http.request.mockResolvedValue(
    Response.json(
      {
        json: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Try later',
          defined: false,
          status: 503,
        },
      },
      { status: 503 },
    ),
  );
  await expect(musicQueries.facts.call()).rejects.toThrow('Try later');
  expect(http.request).toHaveBeenCalledOnce();
});
