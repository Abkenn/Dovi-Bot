import { beforeEach, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  getMusicFacts: vi.fn(),
  searchMusicCatalog: vi.fn(),
}));
vi.mock('../../src/modules/music/music-search.service', () => service);

import { createMusicApi } from '../../src/app/music-api';

beforeEach(() => vi.clearAllMocks());
it('returns only facts and matching results using the command search service', async () => {
  service.getMusicFacts.mockResolvedValue({
    track: { title: 'Theme', count: 5 },
    series: null,
  });
  const api = createMusicApi();
  const facts = await api.request('/facts');
  expect(facts.headers.get('cache-control')).toBe('no-store');
  expect(await facts.json()).toEqual({
    facts: { track: { title: 'Theme', count: 5 }, series: null },
  });
  service.searchMusicCatalog.mockResolvedValue([
    {
      title: 'Theme',
      game: null,
      count: 5,
      lastDate: '2026-01-01',
      lastOffsetSeconds: 60,
      lastStream: 'D1',
      video: null,
    },
  ]);
  const result = await api.request('/search?query=Theme&game=no');
  expect(service.searchMusicCatalog).toHaveBeenCalledWith('Theme', {
    game: false,
  });
  expect(await result.json()).toEqual({
    results: [
      {
        title: 'Theme',
        game: null,
        count: 5,
        date: '2026-01-01',
        offsetSeconds: 60,
        url: null,
      },
    ],
  });
});
it.each([
  '/search',
  '/search?query=x&game=no',
  '/search?query=hello&game=maybe',
  `/search?query=${'a'.repeat(101)}&game=yes`,
])('rejects invalid input before reading the catalog: %s', async (path) => {
  expect((await createMusicApi().request(path)).status).toBe(400);
  expect(service.searchMusicCatalog).not.toHaveBeenCalled();
});
it('handles missing catalogs, no matches, and service failures without exposing details', async () => {
  const api = createMusicApi();
  service.searchMusicCatalog
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('database secret'));
  expect(
    await (await api.request('/search?query=hello&game=yes')).json(),
  ).toEqual({ results: null });
  expect(
    await (await api.request('/search?query=hello&game=yes')).json(),
  ).toEqual({ results: [] });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const failed = await api.request('/search?query=hello&game=yes');
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain('database secret');
  log.mockRestore();
});
