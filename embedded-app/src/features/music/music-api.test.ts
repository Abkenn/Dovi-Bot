import { beforeEach, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('ky', () => ({ default: http.request }));

import { loadMusicFacts, searchMusicPage } from './music-api';

beforeEach(() => vi.resetAllMocks());

it('loads validated RPC facts and preserves missing catalogs', async () => {
  http.request
    .mockResolvedValueOnce(
      Response.json({ json: { facts: { track: null, series: null } } }),
    )
    .mockResolvedValueOnce(Response.json({ json: { facts: null } }));
  expect(await loadMusicFacts()).toEqual({ track: null, series: null });
  expect(await loadMusicFacts()).toBeNull();
  expect(http.request.mock.calls[0]?.[0].url).toContain('/api/music/rpc/facts');
});

it('uses Ky for typed RPC pages and preserves cancellation without transport retries', async () => {
  const controller = new AbortController();
  http.request.mockResolvedValue(
    Response.json({ json: { results: [], total: 0, nextCursor: null } }),
  );
  expect(
    await searchMusicPage(
      { query: 'A & B', game: true, cursor: 20 },
      controller.signal,
    ),
  ).toEqual({ results: [], total: 0, nextCursor: null });
  const request: unknown = http.request.mock.calls[0]?.[0];
  expect(request).toBeInstanceOf(Request);
  if (!(request instanceof Request)) throw new Error('Expected an RPC Request');
  expect(request.url).toContain('/api/music/rpc/searchPage');
  expect(await request.json()).toEqual({
    json: { query: 'A & B', game: true, cursor: 20 },
  });
  expect(http.request).toHaveBeenCalledWith(
    expect.any(Request),
    expect.objectContaining({ retry: 0, throwHttpErrors: false }),
  );
  controller.abort();
  expect(request.signal.aborted).toBe(true);
});

it('rejects malformed facts and pages at the browser boundary', async () => {
  http.request
    .mockResolvedValueOnce(Response.json({ json: { facts: 'wrong' } }))
    .mockResolvedValueOnce(
      Response.json({ json: { results: [], total: -1, nextCursor: null } }),
    );
  await expect(loadMusicFacts()).rejects.toThrow();
  await expect(
    searchMusicPage({ query: 'Theme', game: false, cursor: 0 }),
  ).rejects.toThrow();
});

it('propagates transport failures', async () => {
  http.request.mockRejectedValue(new Error('Unavailable'));
  await expect(loadMusicFacts()).rejects.toThrow('Unavailable');
  await expect(
    searchMusicPage({ query: 'Theme', game: false, cursor: 0 }),
  ).rejects.toThrow('Unavailable');
});
