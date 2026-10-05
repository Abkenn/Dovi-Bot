import { beforeEach, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), json: vi.fn() }));
vi.mock('ky', () => ({ default: { get: http.get } }));

import { loadMusicFacts, searchMusic } from './music-api';

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockReturnValue({ json: http.json });
});
it('uses Ky with typed facts/results, mode parameters, and cancellation', async () => {
  const signal = new AbortController().signal;
  http.json
    .mockResolvedValueOnce({ facts: { track: null, series: null } })
    .mockResolvedValueOnce({ results: [] })
    .mockResolvedValueOnce({ results: null });
  expect(await loadMusicFacts(signal)).toEqual({ track: null, series: null });
  expect(http.get).toHaveBeenCalledWith('/api/music/facts', { signal });
  expect(await searchMusic({ query: 'A & B', game: true }, signal)).toEqual([]);
  expect(http.get).toHaveBeenCalledWith('/api/music/search', {
    searchParams: { query: 'A & B', game: 'yes' },
    signal,
  });
  expect(await searchMusic({ query: 'Theme', game: false }, signal)).toBeNull();
  expect(http.get).toHaveBeenLastCalledWith('/api/music/search', {
    searchParams: { query: 'Theme', game: 'no' },
    signal,
  });
});
it('rejects invalid responses and propagates transport failures', async () => {
  const signal = new AbortController().signal;
  http.json
    .mockResolvedValueOnce({ facts: 'wrong' })
    .mockRejectedValueOnce(new Error('Unavailable'));
  await expect(loadMusicFacts(signal)).rejects.toThrow();
  await expect(
    searchMusic({ query: 'Theme', game: false }, signal),
  ).rejects.toThrow('Unavailable');
});
